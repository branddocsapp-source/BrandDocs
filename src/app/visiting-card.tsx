import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { launchImageLibraryAsync, MediaTypeOptions, requestMediaLibraryPermissionsAsync } from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import {
  AppCard,
  AppShell,
  ConfirmationModal,
  EmptyState,
  ErrorState,
  InputField,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SearchField,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui/branddocs";
import { VisitingCardPreview } from "@/components/visiting-card/VisitingCardPreview";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BusinessProfile, getCompanyInitials, loadBusinessProfile } from "@/services/business-profile";
import {
  buildQrPayload,
  buildVisitingCardFromProfile,
  deleteVisitingCard,
  duplicateVisitingCardRecord,
  formatVisitingCardDate,
  getCardPhysicalSize,
  getVisitingCardTemplate,
  loadVisitingCardById,
  loadVisitingCards,
  sanitizeVisitingCardFilename,
  saveVisitingCard,
  validateVisitingCard,
  VISITING_CARD_TEMPLATES,
  VisitingCardAssetInput,
  VisitingCardQrType,
  VisitingCardRecord,
  VisitingCardSize,
  VisitingCardStatus,
  VisitingCardTemplateId,
} from "@/services/visiting-cards";
import { BrandColors, BrandRadius, BrandShadows, BrandSpacing, BrandTypography } from "@/theme/tokens";

type Step = 1 | 2 | 3 | 4 | 5;
type ViewMode = "grid" | "list";
type SideMode = "front" | "back";
type SortMode = "updated" | "created" | "name" | "template";

const stepLabels = ["Business", "Template", "Details", "Preview", "Save"];
const statusFilters: ("all" | VisitingCardStatus)[] = ["all", "draft", "final"];
const templateFilters = ["all", ...VISITING_CARD_TEMPLATES.map((template) => template.templateId)] as ("all" | VisitingCardTemplateId)[];
const sortOptions: { value: SortMode; label: string }[] = [
  { value: "updated", label: "Recently Updated" },
  { value: "created", label: "Recently Created" },
  { value: "name", label: "Name A-Z" },
  { value: "template", label: "Template" },
];
const qrTypes: { value: VisitingCardQrType; label: string }[] = [
  { value: "vcard", label: "vCard" },
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "maps", label: "Maps" },
  { value: "custom", label: "Custom URL" },
];
const cardSizes: { value: VisitingCardSize; label: string }[] = [
  { value: "us_standard", label: "Standard US 3.5 x 2 in" },
  { value: "metric_standard", label: "Standard Metric 90 x 54 mm" },
];

type ImageSelection = VisitingCardAssetInput | null;

export default function VisitingCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editCardId?: string; duplicateCardId?: string; appPreview?: string }>();
  const { isAppPreview, isDesktop, usesSidebar, width } = useResponsiveLayout();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [cards, setCards] = useState<VisitingCardRecord[]>([]);
  const [draft, setDraft] = useState<VisitingCardRecord | null>(null);
  const [profilePhotoAsset, setProfilePhotoAsset] = useState<ImageSelection>(null);
  const [step, setStep] = useState<Step>(1);
  const [sideMode, setSideMode] = useState<SideMode>("front");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VisitingCardStatus>("all");
  const [templateFilter, setTemplateFilter] = useState<"all" | VisitingCardTemplateId>("all");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [deleteTarget, setDeleteTarget] = useState<VisitingCardRecord | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(12);
  const autoSaveDirtyRef = useRef(false);
  const hydratedEditRef = useRef<string | undefined>(undefined);
  const isCompact = width < 760;
  const useSplitEditor = usesSidebar || width >= 900;
  const profileInitials = getCompanyInitials(profile?.name);

  const appRoute = useCallback((pathname: string, routeParams?: Record<string, string>) => {
    if (!isAppPreview) return routeParams ? { pathname, params: routeParams } : pathname;
    return { pathname, params: { ...routeParams, appPreview: "1" } };
  }, [isAppPreview]);

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return cards
      .filter((card) => {
        if (statusFilter !== "all" && card.status !== statusFilter) return false;
        if (templateFilter !== "all" && card.templateId !== templateFilter) return false;
        if (!normalizedSearch) return true;
        return [card.fullName, card.jobTitle, card.businessName, card.templateName, card.email, card.mobileNumber]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (sortMode === "name") return left.fullName.localeCompare(right.fullName);
        if (sortMode === "template") return left.templateName.localeCompare(right.templateName);
        const leftDate = sortMode === "created" ? left.createdAt : left.updatedAt;
        const rightDate = sortMode === "created" ? right.createdAt : right.updatedAt;
        return new Date(rightDate || 0).getTime() - new Date(leftDate || 0).getTime();
      });
  }, [cards, search, sortMode, statusFilter, templateFilter]);

  const visibleCards = filteredCards.slice(0, visibleLimit);

  async function hydrate({ silent }: { silent?: boolean } = {}) {
    if (!silent) setLoading(true);
    setError("");

    try {
      const savedProfile = await loadBusinessProfile(auth.currentUser);
      const savedCards = await loadVisitingCards(auth.currentUser, savedProfile, 500);
      setProfile(savedProfile);
      setCards(savedCards);

      const requestedId = params.editCardId || params.duplicateCardId;
      if (requestedId && hydratedEditRef.current !== `${requestedId}-${params.duplicateCardId ? "duplicate" : "edit"}`) {
        const savedCard = await loadVisitingCardById(auth.currentUser, savedProfile, requestedId);
        if (!savedCard) throw new Error("The requested visiting card was not found for this user and business.");
        const nextDraft = params.duplicateCardId ? duplicateVisitingCardRecord(savedCard, savedCards) : savedCard;
        hydratedEditRef.current = `${requestedId}-${params.duplicateCardId ? "duplicate" : "edit"}`;
        setDraft(nextDraft);
        setStep(params.duplicateCardId ? 2 : 3);
        setSideMode("front");
      }
    } catch (failure: any) {
      console.error("BrandDocs visiting card hydrate failed.", failure);
      setError(failure?.message || "We could not load visiting cards.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void hydrate();
    }, 0);

    return () => clearTimeout(timer);
    // Hydrate is intentionally driven by route ids only; it reads the current auth/profile state on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.editCardId, params.duplicateCardId]);

  useEffect(() => {
    if (!draft?.id || saving || !autoSaveDirtyRef.current) return;

    const timer = setTimeout(async () => {
      const errors = validateVisitingCard(draft, false);
      if (errors.fullName || errors.email || errors.mobileNumber || errors.website) return;

      try {
        setAutoSaveState("saving");
        const result = await saveVisitingCard(auth.currentUser, profile, { ...draft, status: "draft" });
        setDraft(result.card);
        setCards((current) => upsertCard(current, result.card));
        autoSaveDirtyRef.current = false;
        setAutoSaveState("saved");
      } catch (failure: any) {
        console.error("BrandDocs visiting card autosave failed.", failure);
        setAutoSaveState("failed");
        setToast(failure?.message || "Autosave failed. Use Save Draft to retry.");
      }
    }, 1400);

    return () => clearTimeout(timer);
  }, [draft, profile, saving]);

  function startCreate() {
    const nextDraft = buildVisitingCardFromProfile(profile, cards);
    setDraft(nextDraft);
    setProfilePhotoAsset(null);
    setFieldErrors({});
    setToast("");
    setStep(1);
    setSideMode("front");
  }

  function cancelEditor() {
    setDraft(null);
    setProfilePhotoAsset(null);
    setFieldErrors({});
    setToast("");
    setAutoSaveState("idle");
    hydratedEditRef.current = undefined;
    if (params.editCardId || params.duplicateCardId) router.replace(appRoute("/visiting-card") as never);
  }

  function updateDraft(patch: Partial<VisitingCardRecord>) {
    setDraft((current) => {
      if (!current) return current;
      autoSaveDirtyRef.current = true;
      return { ...current, ...patch, updatedAt: new Date().toISOString() };
    });
  }

  function updateDesign(patch: Partial<VisitingCardRecord["designSettings"]>) {
    if (!draft) return;
    updateDraft({ designSettings: { ...draft.designSettings, ...patch } });
  }

  function updateSocial(key: keyof VisitingCardRecord["socialLinks"], value: string) {
    if (!draft) return;
    updateDraft({ socialLinks: { ...draft.socialLinks, [key]: value } });
  }

  function refreshFromProfile() {
    if (!draft) return;
    const fresh = buildVisitingCardFromProfile(profile, cards, draft.templateId);
    updateDraft({
      useBusinessProfileDetails: true,
      mobileNumber: fresh.mobileNumber,
      email: fresh.email,
      website: fresh.website,
      address: fresh.address,
      businessName: fresh.businessName,
      logoUrl: fresh.logoUrl,
      logoStoragePath: fresh.logoStoragePath,
      profilePhotoUrl: fresh.profilePhotoUrl,
      profilePhotoStoragePath: fresh.profilePhotoStoragePath,
      taxId: fresh.taxId,
      designSettings: {
        ...draft.designSettings,
        accentColor: fresh.designSettings.accentColor,
      },
    });
    setToast("Business profile details refreshed for this card only.");
  }

  async function pickProfilePhoto() {
    const permission = await requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission Needed", "Please allow photo access to add a profile photo.");
      return;
    }

    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const selectedAsset = {
          uri: asset.uri,
          base64: asset.base64 ?? null,
          mimeType: asset.mimeType ?? "image/jpeg",
          fileName: asset.fileName ?? "profile-photo.jpg",
        };
        setProfilePhotoAsset(selectedAsset);
        updateDraft({ profilePhotoUrl: selectedAsset.uri });
      }
    } catch (failure: any) {
      console.error("BrandDocs profile photo picker failed.", failure);
      Alert.alert("Photo Failed", failure?.message || "We could not access the selected photo.");
    }
  }

  async function saveDraft(status: VisitingCardStatus = "draft", shouldPreview = false) {
    if (!draft || saving) return;

    const errors = validateVisitingCard(draft, status === "final");
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const firstReason = Object.values(errors)[0];
      setToast(firstReason);
      Alert.alert("Check Visiting Card", firstReason);
      return;
    }

    try {
      setSaving(true);
      setToast("");
      const result = await saveVisitingCard(auth.currentUser, profile, { ...draft, status }, { profilePhoto: profilePhotoAsset });
      setDraft(result.card);
      setProfilePhotoAsset(null);
      setCards((current) => upsertCard(current, result.card));
      autoSaveDirtyRef.current = false;
      setAutoSaveState("saved");

      if (result.warning) {
        console.warn("BrandDocs visiting card saved with warning.", result.warning);
        setToast(result.warning);
      } else if (result.verifiedFirestorePath) {
        console.log(`[BrandDocs] Visiting card verified in Firestore at ${result.verifiedFirestorePath}.`);
        setToast(`Saved and verified at ${result.verifiedFirestorePath}.`);
      } else {
        setToast("Visiting card saved.");
      }

      if (shouldPreview) {
        router.push(appRoute("/preview", { type: "visitingCard", visitingCardId: result.card.id || "" }) as never);
      } else if (status === "final") {
        setStep(5);
      }
    } catch (failure: any) {
      console.error("BrandDocs visiting card save failed.", failure);
      const reason = failure?.message || "We could not save this visiting card.";
      setToast(reason);
      Alert.alert("Save Failed", reason);
    } finally {
      setSaving(false);
    }
  }

  async function duplicateCard(card: VisitingCardRecord) {
    try {
      const duplicate = duplicateVisitingCardRecord(card, cards);
      setDraft(duplicate);
      setStep(2);
      setToast("Duplicate opened as an unsaved draft.");
      setSideMode("front");
    } catch (failure: any) {
      Alert.alert("Duplicate Failed", failure?.message || "We could not duplicate this card.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      setSaving(true);
      await deleteVisitingCard(auth.currentUser, profile, deleteTarget);
      setCards((current) => current.filter((card) => card.id !== deleteTarget.id && card.cardNumber !== deleteTarget.cardNumber));
      setDeleteTarget(null);
      setToast("Visiting card deleted.");
    } catch (failure: any) {
      console.error("BrandDocs visiting card delete failed.", failure);
      Alert.alert("Delete Failed", failure?.message || "We could not delete this visiting card.");
    } finally {
      setSaving(false);
    }
  }

  function openPreview(card: VisitingCardRecord) {
    if (!card.id) {
      setDraft(card);
      setStep(4);
      return;
    }
    router.push(appRoute("/preview", { type: "visitingCard", visitingCardId: card.id }) as never);
  }

  function handlePrintOrPdf(card?: VisitingCardRecord | null) {
    const target = card || draft;
    if (!target) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
      return;
    }
    Alert.alert("Export Requires Expo Print", "Native PDF export needs expo-print, which is not installed in this project. The card is saved and web print/PDF is available.");
  }

  function handlePngExport() {
    Alert.alert("PNG Export Requires Capture Support", "PNG export needs a view-capture/image export dependency that is not installed in this project. No fake image was generated.");
  }

  function handleShare(card?: VisitingCardRecord | null) {
    const target = card || draft;
    if (!target) return;
    const text = `${target.fullName} - ${target.businessName}\n${target.mobileNumber}\n${target.email}\n${target.website}`.trim();
    if (Platform.OS === "web" && typeof navigator !== "undefined" && "share" in navigator) {
      void (navigator as any).share({ title: "Visiting Card", text }).catch((failure: any) => {
        console.error("BrandDocs web share failed.", failure);
        setToast(failure?.message || "Share was cancelled or failed.");
      });
      return;
    }
    Alert.alert("Share Requires Native Sharing", "System sharing needs expo-sharing, which is not installed in this project.");
  }

  async function onRefresh() {
    setRefreshing(true);
    await hydrate({ silent: true });
  }

  if (loading) {
    return (
      <AppShell profileInitials={profileInitials} profileLogoUrl={profile?.branding?.logoUrl}>
        <LoadingState message="Loading visiting cards..." />
      </AppShell>
    );
  }

  if (error && !draft) {
    return (
      <AppShell profileInitials={profileInitials} profileLogoUrl={profile?.branding?.logoUrl}>
        <ErrorState title="Visiting Cards Failed" message={error} />
        <SecondaryButton label="Retry" icon="refresh-outline" onPress={() => hydrate()} style={styles.retryButton} />
      </AppShell>
    );
  }

  return (
    <AppShell profileInitials={profileInitials} profileLogoUrl={profile?.branding?.logoUrl} scroll={!draft}>
      {draft ? (
        <ScrollView
          contentContainerStyle={styles.editorScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={!isDesktop ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        >
          <EditorHeader
            draft={draft}
            step={step}
            saving={saving}
            autoSaveState={autoSaveState}
            toast={toast}
            onBack={step > 1 ? () => setStep((current) => Math.max(1, current - 1) as Step) : cancelEditor}
            onCancel={cancelEditor}
            onSave={() => saveDraft("draft")}
            onPreview={() => saveDraft("draft", true)}
            onFinal={() => saveDraft("final")}
          />

          <View style={[styles.editorLayout, useSplitEditor && styles.editorLayoutSplit]}>
            <View style={[styles.editorPanel, useSplitEditor && styles.editorPanelSplit]}>
              <StepIndicator step={step} setStep={setStep} />
              {step === 1 ? (
                <BusinessStep profile={profile} draft={draft} updateDraft={updateDraft} refreshFromProfile={refreshFromProfile} />
              ) : null}
              {step === 2 ? (
                <TemplateStep draft={draft} updateDraft={updateDraft} />
              ) : null}
              {step === 3 ? (
                <DetailsStep
                  draft={draft}
                  errors={fieldErrors}
                  updateDraft={updateDraft}
                  updateSocial={updateSocial}
                  pickProfilePhoto={pickProfilePhoto}
                  removeProfilePhoto={() => {
                    setProfilePhotoAsset(null);
                    updateDraft({ profilePhotoUrl: null, profilePhotoStoragePath: null });
                  }}
                />
              ) : null}
              {step === 4 ? (
                <DesignStep
                  draft={draft}
                  sideMode={sideMode}
                  setSideMode={setSideMode}
                  updateDraft={updateDraft}
                  updateDesign={updateDesign}
                  handlePngExport={handlePngExport}
                  handlePrintOrPdf={() => handlePrintOrPdf(draft)}
                />
              ) : null}
              {step === 5 ? (
                <SaveStep
                  draft={draft}
                  saving={saving}
                  onSaveDraft={() => saveDraft("draft")}
                  onSaveFinal={() => saveDraft("final")}
                  onPreview={() => saveDraft("draft", true)}
                  onPrint={() => handlePrintOrPdf(draft)}
                  onPng={handlePngExport}
                  onShare={() => handleShare(draft)}
                />
              ) : null}

              <View style={styles.stepActions}>
                <SecondaryButton label={step === 1 ? "Close" : "Back"} icon="arrow-back-outline" onPress={step === 1 ? cancelEditor : () => setStep((current) => Math.max(1, current - 1) as Step)} />
                {step < 5 ? (
                  <PrimaryButton label="Continue" icon="arrow-forward-outline" onPress={() => setStep((current) => Math.min(5, current + 1) as Step)} />
                ) : null}
              </View>
            </View>

            <View style={[styles.previewPanel, useSplitEditor && styles.previewPanelSplit]}>
              <View style={styles.previewToolbar}>
                <Text style={styles.panelTitle}>Live Preview</Text>
                <SegmentedControl
                  options={[
                    { value: "front", label: "Front" },
                    { value: "back", label: "Back" },
                  ]}
                  value={sideMode}
                  onChange={(value) => setSideMode(value as SideMode)}
                  disabledValues={draft.backEnabled ? [] : ["back"]}
                />
              </View>
              <VisitingCardPreview card={draft} side={sideMode} showActualSizeLabel />
              {draft.backEnabled ? (
                <View style={styles.previewPair}>
                  <VisitingCardPreview card={draft} side="front" compact />
                  <VisitingCardPreview card={draft} side="back" compact />
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          <PageHeader
            title="Visiting Cards"
            subtitle="Create, save, edit, preview, print and manage professional contact cards for the selected business profile."
            action={<PrimaryButton label="Create Visiting Card" icon="add-outline" onPress={startCreate} />}
          />

          {toast ? <ToastMessage message={toast} onClose={() => setToast("")} /> : null}

          <AppCard style={styles.filterCard}>
            <View style={styles.filterTop}>
              <View style={styles.searchWrap}>
                <SearchField value={search} onChangeText={setSearch} placeholder="Search by name, business, template, email..." />
              </View>
              <View style={styles.viewToggle}>
                <IconToggle icon="grid-outline" active={viewMode === "grid"} label="Grid view" onPress={() => setViewMode("grid")} />
                <IconToggle icon="list-outline" active={viewMode === "list"} label="List view" onPress={() => setViewMode("list")} />
              </View>
            </View>
            <View style={styles.filterRows}>
              <FilterGroup label="Business">
                <Pill label={profile?.name || "Current Business"} active />
              </FilterGroup>
              <FilterGroup label="Status">
                {statusFilters.map((value) => <Pill key={value} label={value === "all" ? "All" : titleCase(value)} active={statusFilter === value} onPress={() => setStatusFilter(value)} />)}
              </FilterGroup>
              <FilterGroup label="Template">
                {templateFilters.slice(0, isCompact ? 4 : templateFilters.length).map((value) => (
                  <Pill
                    key={value}
                    label={value === "all" ? "All" : getVisitingCardTemplate(value).templateName}
                    active={templateFilter === value}
                    onPress={() => setTemplateFilter(value)}
                  />
                ))}
              </FilterGroup>
              <FilterGroup label="Sort">
                {sortOptions.map((option) => <Pill key={option.value} label={option.label} active={sortMode === option.value} onPress={() => setSortMode(option.value)} />)}
              </FilterGroup>
            </View>
          </AppCard>

          <ScrollView
            contentContainerStyle={styles.listRefreshContent}
            refreshControl={!isDesktop ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
          >
            {visibleCards.length ? (
              <View style={[styles.cardGrid, viewMode === "list" && styles.cardList]}>
                {visibleCards.map((card) => (
                  <SavedCardRow
                    key={card.id || card.cardNumber}
                    card={card}
                    viewMode={viewMode}
                    onOpen={() => openPreview(card)}
                    onEdit={() => {
                      setDraft(card);
                      setStep(3);
                    }}
                    onPreview={() => openPreview(card)}
                    onDuplicate={() => duplicateCard(card)}
                    onDelete={() => setDeleteTarget(card)}
                    onDownload={() => handlePrintOrPdf(card)}
                    onShare={() => handleShare(card)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                title="No visiting cards yet"
                message="Create your first visiting card from the selected business profile. Saved cards will appear here with thumbnails and actions."
                action={<PrimaryButton label="Create Visiting Card" icon="add-outline" onPress={startCreate} />}
              />
            )}
            {filteredCards.length > visibleCards.length ? (
              <SecondaryButton label="Load More" icon="chevron-down-outline" onPress={() => setVisibleLimit((current) => current + 12)} style={styles.loadMoreButton} />
            ) : null}
          </ScrollView>
        </>
      )}

      <ConfirmationModal
        visible={Boolean(deleteTarget)}
        title="Delete Visiting Card"
        message={`Delete ${deleteTarget?.fullName || "this visiting card"}? This removes it from the active list.`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}

function EditorHeader({
  draft,
  step,
  saving,
  autoSaveState,
  toast,
  onBack,
  onCancel,
  onSave,
  onPreview,
  onFinal,
}: {
  draft: VisitingCardRecord;
  step: Step;
  saving: boolean;
  autoSaveState: "idle" | "saving" | "saved" | "failed";
  toast: string;
  onBack: () => void;
  onCancel: () => void;
  onSave: () => void;
  onPreview: () => void;
  onFinal: () => void;
}) {
  const saveLabel = autoSaveState === "saving" ? "Saving..." : autoSaveState === "saved" ? "Saved" : autoSaveState === "failed" ? "Save failed" : "Not saved";

  return (
    <View style={styles.editorHeader}>
      <View style={styles.editorTitleRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.roundIconButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={BrandColors.text} />
        </Pressable>
        <View style={styles.editorTitleCopy}>
          <Text style={styles.editorTitle}>{draft.fullName || "New Visiting Card"}</Text>
          <Text style={styles.editorSubtitle}>{draft.cardNumber} • Step {step} of 5 • {saveLabel}</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <SecondaryButton label="Close" onPress={onCancel} />
        <SecondaryButton label="Preview" icon="eye-outline" onPress={onPreview} disabled={saving} />
        <SecondaryButton label="Save Draft" icon="save-outline" onPress={onSave} loading={saving} />
        <PrimaryButton label="Save as Final" icon="checkmark-circle-outline" onPress={onFinal} disabled={saving} />
      </View>
      {toast ? <ToastMessage message={toast} /> : null}
    </View>
  );
}

function StepIndicator({ step, setStep }: { step: Step; setStep: (step: Step) => void }) {
  return (
    <View style={styles.stepIndicator}>
      {stepLabels.map((label, index) => {
        const currentStep = (index + 1) as Step;
        const active = step === currentStep;
        const complete = step > currentStep;
        return (
          <Pressable key={label} style={[styles.stepPill, active && styles.stepPillActive, complete && styles.stepPillComplete]} onPress={() => setStep(currentStep)}>
            <Text style={[styles.stepNumber, (active || complete) && styles.stepNumberActive]}>{index + 1}</Text>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BusinessStep({
  profile,
  draft,
  updateDraft,
  refreshFromProfile,
}: {
  profile: BusinessProfile | null;
  draft: VisitingCardRecord;
  updateDraft: (patch: Partial<VisitingCardRecord>) => void;
  refreshFromProfile: () => void;
}) {
  return (
    <AppCard style={styles.stepCard}>
      <Text style={styles.panelTitle}>Select Business</Text>
      {profile ? (
        <View style={styles.businessSummary}>
          <View style={styles.businessAvatar}>
            {profile.branding?.logoUrl ? <Image source={{ uri: profile.branding.logoUrl }} style={styles.businessAvatarImage} contentFit="contain" /> : <Text style={styles.businessAvatarText}>{getCompanyInitials(profile.name)}</Text>}
          </View>
          <View style={styles.businessCopy}>
            <Text style={styles.businessTitle}>{profile.name}</Text>
            <Text style={styles.businessMeta}>{[profile.email, profile.phone, profile.website].filter(Boolean).join(" • ") || "Business profile details will auto-fill this card."}</Text>
          </View>
        </View>
      ) : (
        <ErrorState title="No Business Profile" message="Create a company profile before saving private visiting cards." />
      )}
      <ToggleRow
        label="Use Business Profile Details"
        description="Initialize this card from the selected business, while keeping card edits separate from the main profile."
        value={draft.useBusinessProfileDetails}
        onValueChange={(value) => updateDraft({ useBusinessProfileDetails: value })}
      />
      <SecondaryButton label="Refresh from Business Profile" icon="refresh-outline" onPress={refreshFromProfile} disabled={!profile} />
    </AppCard>
  );
}

function TemplateStep({ draft, updateDraft }: { draft: VisitingCardRecord; updateDraft: (patch: Partial<VisitingCardRecord>) => void }) {
  return (
    <AppCard style={styles.stepCard}>
      <Text style={styles.panelTitle}>Choose Template</Text>
      <View style={styles.templateGrid}>
        {VISITING_CARD_TEMPLATES.map((template) => {
          const active = draft.templateId === template.templateId;
          return (
            <Pressable
              key={template.templateId}
              accessibilityRole="button"
              accessibilityLabel={`Select ${template.templateName}`}
              style={({ pressed }) => [styles.templateOption, active && styles.templateOptionActive, pressed && styles.pressed]}
              onPress={() => updateDraft({
                templateId: template.templateId,
                templateName: template.templateName,
                orientation: template.orientation,
                backEnabled: template.backEnabled,
                designSettings: {
                  ...template.defaultColors,
                  accentColor: draft.designSettings.accentColor,
                },
              })}
            >
              <View style={[styles.templateSwatch, { backgroundColor: template.defaultColors.backgroundColor, borderColor: template.defaultColors.accentColor }]}>
                <View style={[styles.templateAccent, { backgroundColor: template.defaultColors.accentColor }]} />
              </View>
              <Text style={styles.templateName}>{template.templateName}</Text>
              <Text style={styles.templateDescription}>{template.previewThumbnail}</Text>
              <Text style={styles.templateMeta}>{titleCase(template.orientation)} • Front{template.backEnabled ? " + Back" : ""}</Text>
            </Pressable>
          );
        })}
      </View>
    </AppCard>
  );
}

function DetailsStep({
  draft,
  errors,
  updateDraft,
  updateSocial,
  pickProfilePhoto,
  removeProfilePhoto,
}: {
  draft: VisitingCardRecord;
  errors: Record<string, string>;
  updateDraft: (patch: Partial<VisitingCardRecord>) => void;
  updateSocial: (key: keyof VisitingCardRecord["socialLinks"], value: string) => void;
  pickProfilePhoto: () => void;
  removeProfilePhoto: () => void;
}) {
  return (
    <View style={styles.stepStack}>
      <AppCard style={styles.stepCard}>
        <Text style={styles.panelTitle}>Personal Contact Details</Text>
        <View style={styles.formGrid}>
          <InputField label="Full Name" value={draft.fullName} onChangeText={(fullName) => updateDraft({ fullName })} errorText={errors.fullName} maxLength={70} />
          <InputField label="Job Title" value={draft.jobTitle} onChangeText={(jobTitle) => updateDraft({ jobTitle })} errorText={errors.jobTitle} maxLength={60} />
          <InputField label="Department" value={draft.department} onChangeText={(department) => updateDraft({ department })} errorText={errors.department} maxLength={60} />
          <InputField label="Mobile Number" value={draft.mobileNumber} onChangeText={(mobileNumber) => updateDraft({ mobileNumber })} keyboardType="phone-pad" errorText={errors.mobileNumber} />
          <InputField label="Alternate Phone" value={draft.alternatePhone} onChangeText={(alternatePhone) => updateDraft({ alternatePhone })} keyboardType="phone-pad" errorText={errors.alternatePhone} />
          <InputField label="Email" value={draft.email} onChangeText={(email) => updateDraft({ email })} keyboardType="email-address" autoCapitalize="none" errorText={errors.email} />
          <InputField label="Website" value={draft.website} onChangeText={(website) => updateDraft({ website })} autoCapitalize="none" errorText={errors.website} />
          <InputField label="Business Name" value={draft.businessName} onChangeText={(businessName) => updateDraft({ businessName })} />
          <InputField label="Address" value={draft.address} onChangeText={(address) => updateDraft({ address })} multiline />
          <InputField label="Company Tagline" value={draft.companyTagline} onChangeText={(companyTagline) => updateDraft({ companyTagline })} errorText={errors.companyTagline} maxLength={90} />
          <InputField label="Short Professional Line" value={draft.professionalLine} onChangeText={(professionalLine) => updateDraft({ professionalLine })} errorText={errors.professionalLine} maxLength={120} />
          <InputField label="Tax ID / GSTIN" value={draft.taxId} onChangeText={(taxId) => updateDraft({ taxId })} />
        </View>
        <ToggleRow label="Show Tax ID on card" value={draft.showTaxId} onValueChange={(showTaxId) => updateDraft({ showTaxId })} />
        <ToggleRow label="Enable Back Side" value={draft.backEnabled} onValueChange={(backEnabled) => updateDraft({ backEnabled })} />
      </AppCard>

      <AppCard style={styles.stepCard}>
        <Text style={styles.panelTitle}>Logo and Profile Photo</Text>
        <View style={styles.mediaRow}>
          <View style={styles.mediaPreview}>
            {draft.logoUrl ? <Image source={{ uri: draft.logoUrl }} style={styles.mediaImage} contentFit="contain" /> : <Text style={styles.mediaInitials}>{getCompanyInitials(draft.businessName)}</Text>}
          </View>
          <View style={styles.mediaCopy}>
            <Text style={styles.mediaTitle}>Business Logo</Text>
            <Text style={styles.mediaText}>Loaded from Business Profile. Remove it for this card without changing the company profile.</Text>
            <View style={styles.inlineActions}>
              <SecondaryButton label="Remove Logo" icon="close-outline" onPress={() => updateDraft({ logoUrl: null, logoStoragePath: null })} disabled={!draft.logoUrl} />
              <SecondaryButton label="Logo Only" icon="aperture-outline" onPress={() => updateDraft({ iconOnlyMode: !draft.iconOnlyMode })} />
            </View>
          </View>
        </View>
        <View style={styles.mediaRow}>
          <View style={styles.mediaPreview}>
            {draft.profilePhotoUrl ? <Image source={{ uri: draft.profilePhotoUrl }} style={styles.mediaPhoto} contentFit="cover" /> : <Ionicons name="person-outline" size={26} color={BrandColors.textSecondary} />}
          </View>
          <View style={styles.mediaCopy}>
            <Text style={styles.mediaTitle}>Profile Photo</Text>
            <Text style={styles.mediaText}>Optional square photo. It uploads to Firebase Storage when the card is saved.</Text>
            <View style={styles.inlineActions}>
              <SecondaryButton label="Choose Photo" icon="image-outline" onPress={pickProfilePhoto} />
              <SecondaryButton label="Remove" icon="trash-outline" onPress={removeProfilePhoto} disabled={!draft.profilePhotoUrl} />
            </View>
          </View>
        </View>
      </AppCard>

      <AppCard style={styles.stepCard}>
        <Text style={styles.panelTitle}>Social Links</Text>
        <View style={styles.formGrid}>
          <InputField label="WhatsApp Number" value={draft.socialLinks.whatsapp} onChangeText={(value) => updateSocial("whatsapp", value)} />
          <InputField label="LinkedIn URL" value={draft.socialLinks.linkedIn} onChangeText={(value) => updateSocial("linkedIn", value)} errorText={errors["social.linkedIn"]} />
          <InputField label="Instagram URL" value={draft.socialLinks.instagram} onChangeText={(value) => updateSocial("instagram", value)} errorText={errors["social.instagram"]} />
          <InputField label="Facebook URL" value={draft.socialLinks.facebook} onChangeText={(value) => updateSocial("facebook", value)} errorText={errors["social.facebook"]} />
          <InputField label="X/Twitter URL" value={draft.socialLinks.x} onChangeText={(value) => updateSocial("x", value)} errorText={errors["social.x"]} />
          <InputField label="YouTube URL" value={draft.socialLinks.youtube} onChangeText={(value) => updateSocial("youtube", value)} errorText={errors["social.youtube"]} />
          <InputField label="Custom Social Link" value={draft.socialLinks.custom} onChangeText={(value) => updateSocial("custom", value)} errorText={errors["social.custom"]} />
        </View>
      </AppCard>
    </View>
  );
}

function DesignStep({
  draft,
  sideMode,
  setSideMode,
  updateDraft,
  updateDesign,
  handlePngExport,
  handlePrintOrPdf,
}: {
  draft: VisitingCardRecord;
  sideMode: SideMode;
  setSideMode: (value: SideMode) => void;
  updateDraft: (patch: Partial<VisitingCardRecord>) => void;
  updateDesign: (patch: Partial<VisitingCardRecord["designSettings"]>) => void;
  handlePngExport: () => void;
  handlePrintOrPdf: () => void;
}) {
  const physicalSize = getCardPhysicalSize(draft.cardSize, draft.orientation);
  const contrastWarning = hasContrastWarning(draft.designSettings.backgroundColor, draft.designSettings.textColor);

  return (
    <View style={styles.stepStack}>
      <AppCard style={styles.stepCard}>
        <Text style={styles.panelTitle}>Card Size and Sides</Text>
        <SegmentedControl
          options={cardSizes}
          value={draft.cardSize}
          onChange={(value) => updateDraft({ cardSize: value as VisitingCardSize })}
        />
        <Text style={styles.helperLine}>{physicalSize.label} • {physicalSize.widthMm} x {physicalSize.heightMm} mm • Safe margin 3-4 mm</Text>
        <ToggleRow label="Enable Back Side" value={draft.backEnabled} onValueChange={(backEnabled) => updateDraft({ backEnabled })} />
        <SegmentedControl
          options={[
            { value: "front", label: "Front" },
            { value: "back", label: "Back" },
          ]}
          value={sideMode}
          onChange={(value) => setSideMode(value as SideMode)}
          disabledValues={draft.backEnabled ? [] : ["back"]}
        />
      </AppCard>

      <AppCard style={styles.stepCard}>
        <Text style={styles.panelTitle}>Colors and Typography</Text>
        {contrastWarning ? <WarningText message="Text contrast may be too low for print. Choose darker text or a lighter background." /> : null}
        <View style={styles.formGrid}>
          <InputField label="Background Hex" value={draft.designSettings.backgroundColor} onChangeText={(backgroundColor) => updateDesign({ backgroundColor })} autoCapitalize="none" />
          <InputField label="Accent Hex" value={draft.designSettings.accentColor} onChangeText={(accentColor) => updateDesign({ accentColor })} autoCapitalize="none" />
          <InputField label="Main Text Hex" value={draft.designSettings.textColor} onChangeText={(textColor) => updateDesign({ textColor })} autoCapitalize="none" />
          <InputField label="Secondary Text Hex" value={draft.designSettings.secondaryTextColor} onChangeText={(secondaryTextColor) => updateDesign({ secondaryTextColor })} autoCapitalize="none" />
        </View>
        <View style={styles.colorSwatches}>
          {[BrandColors.primary, "#232323", "#2563EB", "#0F766E", "#64748B", "#FFFFFF"].map((color) => (
            <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Use ${color}`} style={[styles.colorSwatch, { backgroundColor: color }]} onPress={() => updateDesign({ accentColor: color })} />
          ))}
        </View>
        <View style={styles.controlRows}>
          <NumberControl label="Name Size" value={draft.designSettings.nameSize} min={13} max={26} onChange={(nameSize) => updateDesign({ nameSize })} />
          <NumberControl label="Title Size" value={draft.designSettings.jobTitleSize} min={8} max={16} onChange={(jobTitleSize) => updateDesign({ jobTitleSize })} />
          <NumberControl label="Contact Size" value={draft.designSettings.contactSize} min={7} max={12} onChange={(contactSize) => updateDesign({ contactSize })} />
          <NumberControl label="Logo Size" value={draft.designSettings.logoSize} min={24} max={80} onChange={(logoSize) => updateDesign({ logoSize })} />
          <NumberControl label="Photo Size" value={draft.designSettings.photoSize} min={28} max={80} onChange={(photoSize) => updateDesign({ photoSize })} />
          <NumberControl label="QR Size" value={draft.designSettings.qrSize} min={32} max={72} onChange={(qrSize) => updateDesign({ qrSize })} />
        </View>
        <SegmentedControl
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
          value={draft.designSettings.textAlign}
          onChange={(textAlign) => updateDesign({ textAlign: textAlign as "left" | "center" | "right" })}
        />
        <View style={styles.inlineActions}>
          <SecondaryButton label="Reset Brand Colors" icon="refresh-outline" onPress={() => updateDesign({ backgroundColor: "#FFFFFF", accentColor: BrandColors.primary, textColor: BrandColors.text, secondaryTextColor: BrandColors.textSecondary })} />
          <SecondaryButton label="Template Defaults" icon="sparkles-outline" onPress={() => updateDesign(getVisitingCardTemplate(draft.templateId).defaultColors)} />
        </View>
      </AppCard>

      <AppCard style={styles.stepCard}>
        <Text style={styles.panelTitle}>QR Code Data</Text>
        <ToggleRow label="Enable QR" value={draft.qrEnabled} onValueChange={(qrEnabled) => updateDraft({ qrEnabled })} />
        <SegmentedControl options={qrTypes} value={draft.qrType} onChange={(qrType) => updateDraft({ qrType: qrType as VisitingCardQrType })} />
        {draft.qrType === "custom" ? <InputField label="Custom QR URL/Data" value={draft.qrPayload} onChangeText={(qrPayload) => updateDraft({ qrPayload })} multiline /> : null}
        <View style={styles.qrPayloadBox}>
          <Text style={styles.qrPayloadTitle}>Generated QR Payload</Text>
          <Text style={styles.qrPayloadText} numberOfLines={8}>{buildQrPayload(draft) || "QR is disabled or missing data."}</Text>
        </View>
      </AppCard>

      <AppCard style={styles.stepCard}>
        <Text style={styles.panelTitle}>Preview Tools</Text>
        <ToggleRow label="Show Safe Area" value={draft.designSettings.showSafeArea} onValueChange={(showSafeArea) => updateDesign({ showSafeArea })} />
        <ToggleRow label="Show Bleed Guide" value={draft.designSettings.showBleed} onValueChange={(showBleed) => updateDesign({ showBleed })} />
        <InputField label="Back-side Message" value={draft.customMessage} onChangeText={(customMessage) => updateDraft({ customMessage })} multiline />
        <View style={styles.inlineActions}>
          <SecondaryButton label="Download PNG" icon="image-outline" onPress={handlePngExport} />
          <SecondaryButton label="Print / Save PDF" icon="print-outline" onPress={handlePrintOrPdf} />
        </View>
      </AppCard>
    </View>
  );
}

function SaveStep({
  draft,
  saving,
  onSaveDraft,
  onSaveFinal,
  onPreview,
  onPrint,
  onPng,
  onShare,
}: {
  draft: VisitingCardRecord;
  saving: boolean;
  onSaveDraft: () => void;
  onSaveFinal: () => void;
  onPreview: () => void;
  onPrint: () => void;
  onPng: () => void;
  onShare: () => void;
}) {
  const filename = sanitizeVisitingCardFilename(draft);

  return (
    <AppCard style={styles.stepCard}>
      <Text style={styles.panelTitle}>Save / Export / Share</Text>
      <Text style={styles.helperLine}>Filename base: {filename}</Text>
      <View style={styles.saveGrid}>
        <SecondaryButton label="Save Draft" icon="save-outline" onPress={onSaveDraft} loading={saving} />
        <PrimaryButton label="Save as Final" icon="checkmark-circle-outline" onPress={onSaveFinal} disabled={saving} />
        <SecondaryButton label="Preview" icon="eye-outline" onPress={onPreview} disabled={saving} />
        <SecondaryButton label="Print / Save PDF" icon="print-outline" onPress={onPrint} />
        <SecondaryButton label="Download PNG" icon="image-outline" onPress={onPng} />
        <SecondaryButton label="Share" icon="share-outline" onPress={onShare} />
      </View>
      <WarningText message="Native PDF, PNG capture and system share require export/share dependencies that are not installed. Web print can save as PDF from the browser." />
    </AppCard>
  );
}

function SavedCardRow({
  card,
  viewMode,
  onOpen,
  onEdit,
  onPreview,
  onDuplicate,
  onDownload,
  onShare,
  onDelete,
}: {
  card: VisitingCardRecord;
  viewMode: ViewMode;
  onOpen: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const isList = viewMode === "list";
  return (
    <AppCard style={[styles.savedCard, isList && styles.savedCardList]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${card.fullName}`} onPress={onOpen} style={[styles.thumbnailArea, isList && styles.thumbnailAreaList]}>
        <VisitingCardPreview card={card} side="front" compact />
        {card.backEnabled ? <VisitingCardPreview card={card} side="back" compact /> : null}
      </Pressable>
      <View style={styles.savedCardCopy}>
        <View style={styles.savedTitleRow}>
          <View style={styles.savedTitleCopy}>
            <Text style={styles.savedName} numberOfLines={1}>{card.fullName || "Untitled Card"}</Text>
            <Text style={styles.savedMeta} numberOfLines={2}>{card.jobTitle || "No job title"} • {card.businessName || "No business"}</Text>
          </View>
          <StatusBadge status={titleCase(card.status)} />
        </View>
        <Text style={styles.savedMeta}>{card.templateName} • Updated {formatVisitingCardDate(card.updatedAt)}</Text>
        <View style={styles.cardActions}>
          <ActionButton icon="open-outline" label="Open" onPress={onOpen} />
          <ActionButton icon="create-outline" label="Edit" onPress={onEdit} />
          <ActionButton icon="eye-outline" label="Preview" onPress={onPreview} />
          <ActionButton icon="copy-outline" label="Duplicate" onPress={onDuplicate} />
          <ActionButton icon="document-attach-outline" label="Download PDF" onPress={onDownload} />
          <ActionButton icon="share-outline" label="Share" onPress={onShare} />
          <ActionButton icon="trash-outline" label="Delete" destructive onPress={onDelete} />
        </View>
      </View>
    </AppCard>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDescription}>{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: BrandColors.borderStrong, true: BrandColors.primarySubtle }} thumbColor={value ? BrandColors.primary : BrandColors.background} />
    </View>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
  disabledValues = [],
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabledValues?: string[];
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = value === option.value;
        const disabled = disabledValues.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.segment, active && styles.segmentActive, disabled && styles.disabledSegment, pressed && styles.pressed]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive, disabled && styles.disabledText]} numberOfLines={1}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NumberControl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.numberControl}>
      <Text style={styles.numberLabel}>{label}</Text>
      <View style={styles.numberStepper}>
        <IconToggle icon="remove-outline" label={`Decrease ${label}`} onPress={() => onChange(Math.max(min, value - 1))} />
        <Text style={styles.numberValue}>{value}</Text>
        <IconToggle icon="add-outline" label={`Increase ${label}`} onPress={() => onChange(Math.min(max, value + 1))} />
      </View>
    </View>
  );
}

function ToastMessage({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <View style={styles.toast}>
      <Ionicons name="information-circle-outline" size={18} color={BrandColors.primary} />
      <Text style={styles.toastText}>{message}</Text>
      {onClose ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={onClose}><Ionicons name="close-outline" size={18} color={BrandColors.textSecondary} /></Pressable> : null}
    </View>
  );
}

function WarningText({ message }: { message: string }) {
  return (
    <View style={styles.warningBox}>
      <Ionicons name="warning-outline" size={17} color={BrandColors.warning} />
      <Text style={styles.warningText}>{message}</Text>
    </View>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.pillRow}>{children}</View>
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && styles.pressed]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function IconToggle({ icon, active, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; active?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconToggle, active && styles.iconToggleActive, pressed && styles.pressed]}>
      <Ionicons name={icon} size={18} color={active ? BrandColors.primary : BrandColors.textSecondary} />
    </Pressable>
  );
}

function ActionButton({ icon, label, destructive, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; destructive?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={16} color={destructive ? BrandColors.error : BrandColors.textSecondary} />
      <Text style={[styles.actionText, destructive && styles.destructiveActionText]}>{label}</Text>
    </Pressable>
  );
}

function upsertCard(cards: VisitingCardRecord[], nextCard: VisitingCardRecord) {
  const withoutCurrent = cards.filter((card) => card.id !== nextCard.id && card.cardNumber !== nextCard.cardNumber);
  return [nextCard, ...withoutCurrent].sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime());
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hasContrastWarning(background: string, text: string) {
  const backgroundValue = parseHexBrightness(background);
  const textValue = parseHexBrightness(text);
  if (backgroundValue === null || textValue === null) return false;
  return Math.abs(backgroundValue - textValue) < 82;
}

function parseHexBrightness(value: string) {
  const match = value.trim().match(/^#?([a-f\d]{6})$/i);
  if (!match) return null;
  const hex = match[1];
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000;
}

const styles = StyleSheet.create({
  retryButton: {
    alignSelf: "center",
    marginTop: BrandSpacing.lg,
  },
  editorScroll: {
    paddingBottom: BrandSpacing["5xl"],
  },
  editorHeader: {
    gap: BrandSpacing.md,
    marginBottom: BrandSpacing.lg,
  },
  editorTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.md,
  },
  roundIconButton: {
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  editorTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  editorTitle: {
    ...BrandTypography.pageHeading,
    color: BrandColors.text,
  },
  editorSubtitle: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
  },
  editorLayout: {
    gap: BrandSpacing.lg,
  },
  editorLayoutSplit: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  editorPanel: {
    gap: BrandSpacing.md,
  },
  editorPanelSplit: {
    flex: 0.95,
    minWidth: 0,
  },
  previewPanel: {
    gap: BrandSpacing.md,
  },
  previewPanelSplit: {
    flex: 0.85,
    minWidth: 330,
    position: "sticky" as never,
    top: 18,
  },
  previewToolbar: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
    justifyContent: "space-between",
  },
  previewPair: {
    flexDirection: "row",
    gap: BrandSpacing.md,
  },
  stepIndicator: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
  },
  stepPill: {
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.xs,
    minHeight: 38,
    paddingHorizontal: BrandSpacing.md,
  },
  stepPillActive: {
    backgroundColor: BrandColors.primarySoft,
    borderColor: BrandColors.primarySubtle,
  },
  stepPillComplete: {
    borderColor: BrandColors.success,
  },
  stepNumber: {
    color: BrandColors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  stepNumberActive: {
    color: BrandColors.primary,
  },
  stepLabel: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
  },
  stepLabelActive: {
    color: BrandColors.primary,
  },
  stepStack: {
    gap: BrandSpacing.md,
  },
  stepCard: {
    gap: BrandSpacing.md,
  },
  panelTitle: {
    ...BrandTypography.sectionHeading,
    color: BrandColors.text,
  },
  businessSummary: {
    alignItems: "center",
    backgroundColor: BrandColors.surface,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.md,
    padding: BrandSpacing.md,
  },
  businessAvatar: {
    alignItems: "center",
    backgroundColor: BrandColors.primarySoft,
    borderRadius: BrandRadius.medium,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  businessAvatarImage: {
    height: 44,
    width: 44,
  },
  businessAvatarText: {
    color: BrandColors.primary,
    fontSize: 16,
    fontWeight: "900",
  },
  businessCopy: {
    flex: 1,
    minWidth: 0,
  },
  businessTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  businessMeta: {
    ...BrandTypography.helperText,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  templateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
  },
  templateOption: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    flexGrow: 1,
    gap: BrandSpacing.sm,
    minWidth: 220,
    padding: BrandSpacing.md,
    width: "31%",
  },
  templateOptionActive: {
    borderColor: BrandColors.primary,
    backgroundColor: BrandColors.primarySoft,
  },
  templateSwatch: {
    aspectRatio: 3.5 / 2,
    borderRadius: BrandRadius.small,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
  },
  templateAccent: {
    height: "100%",
    marginLeft: "72%",
  },
  templateName: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  templateDescription: {
    ...BrandTypography.helperText,
    color: BrandColors.textSecondary,
  },
  templateMeta: {
    ...BrandTypography.caption,
    color: BrandColors.primary,
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
  },
  mediaRow: {
    alignItems: "center",
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.md,
    padding: BrandSpacing.md,
  },
  mediaPreview: {
    alignItems: "center",
    backgroundColor: BrandColors.surface,
    borderRadius: BrandRadius.medium,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  mediaImage: {
    height: 62,
    width: 62,
  },
  mediaPhoto: {
    borderRadius: BrandRadius.pill,
    height: 62,
    width: 62,
  },
  mediaInitials: {
    color: BrandColors.primary,
    fontSize: 16,
    fontWeight: "900",
  },
  mediaCopy: {
    flex: 1,
    gap: BrandSpacing.sm,
    minWidth: 0,
  },
  mediaTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  mediaText: {
    ...BrandTypography.helperText,
    color: BrandColors.textSecondary,
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
  },
  toggleRow: {
    alignItems: "center",
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.md,
    justifyContent: "space-between",
    padding: BrandSpacing.md,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleLabel: {
    ...BrandTypography.formLabel,
    color: BrandColors.text,
  },
  toggleDescription: {
    ...BrandTypography.helperText,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  segmented: {
    backgroundColor: BrandColors.surface,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.xs,
    padding: BrandSpacing.xs,
  },
  segment: {
    alignItems: "center",
    borderRadius: BrandRadius.small,
    flexGrow: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: BrandSpacing.md,
  },
  segmentActive: {
    backgroundColor: BrandColors.background,
    ...BrandShadows.subtle,
  },
  segmentText: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
  },
  segmentTextActive: {
    color: BrandColors.primary,
  },
  disabledSegment: {
    opacity: 0.45,
  },
  disabledText: {
    color: BrandColors.textMuted,
  },
  helperLine: {
    ...BrandTypography.helperText,
    color: BrandColors.textSecondary,
  },
  colorSwatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
  },
  colorSwatch: {
    borderColor: BrandColors.borderStrong,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    height: 34,
    width: 34,
  },
  controlRows: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
  },
  numberControl: {
    backgroundColor: BrandColors.surface,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    gap: BrandSpacing.sm,
    minWidth: 150,
    padding: BrandSpacing.md,
  },
  numberLabel: {
    ...BrandTypography.formLabel,
    color: BrandColors.text,
  },
  numberStepper: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  numberValue: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  iconToggle: {
    alignItems: "center",
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.small,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconToggleActive: {
    backgroundColor: BrandColors.primarySoft,
    borderColor: BrandColors.primarySubtle,
  },
  qrPayloadBox: {
    backgroundColor: BrandColors.surface,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    padding: BrandSpacing.md,
  },
  qrPayloadTitle: {
    ...BrandTypography.formLabel,
    color: BrandColors.text,
    marginBottom: BrandSpacing.xs,
  },
  qrPayloadText: {
    ...BrandTypography.helperText,
    color: BrandColors.textSecondary,
  },
  saveGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
  },
  stepActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
    justifyContent: "space-between",
  },
  filterCard: {
    gap: BrandSpacing.md,
    marginBottom: BrandSpacing.lg,
  },
  filterTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.md,
  },
  searchWrap: {
    flex: 1,
    minWidth: 220,
  },
  viewToggle: {
    flexDirection: "row",
    gap: BrandSpacing.xs,
  },
  filterRows: {
    gap: BrandSpacing.md,
  },
  filterGroup: {
    gap: BrandSpacing.sm,
  },
  filterLabel: {
    ...BrandTypography.formLabel,
    color: BrandColors.text,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
  },
  pill: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
  },
  pillActive: {
    backgroundColor: BrandColors.primarySoft,
    borderColor: BrandColors.primarySubtle,
  },
  pillText: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
  },
  pillTextActive: {
    color: BrandColors.primary,
  },
  listRefreshContent: {
    paddingBottom: BrandSpacing["4xl"],
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
  },
  cardList: {
    flexDirection: "column",
  },
  savedCard: {
    flexGrow: 1,
    gap: BrandSpacing.md,
    minWidth: 300,
    width: "31%",
  },
  savedCardList: {
    alignItems: "center",
    flexDirection: "row",
    width: "100%",
  },
  thumbnailArea: {
    gap: BrandSpacing.sm,
  },
  thumbnailAreaList: {
    maxWidth: 240,
    width: "32%",
  },
  savedCardCopy: {
    flex: 1,
    gap: BrandSpacing.sm,
  },
  savedTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: BrandSpacing.sm,
    justifyContent: "space-between",
  },
  savedTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  savedName: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  savedMeta: {
    ...BrandTypography.helperText,
    color: BrandColors.textSecondary,
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.xs,
  },
  actionButton: {
    alignItems: "center",
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 32,
    paddingHorizontal: BrandSpacing.sm,
  },
  actionText: {
    color: BrandColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  destructiveActionText: {
    color: BrandColors.error,
  },
  loadMoreButton: {
    alignSelf: "center",
    marginTop: BrandSpacing.lg,
  },
  toast: {
    alignItems: "center",
    backgroundColor: BrandColors.primarySoft,
    borderColor: BrandColors.primarySubtle,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.sm,
    marginBottom: BrandSpacing.md,
    padding: BrandSpacing.md,
  },
  toastText: {
    ...BrandTypography.helperText,
    color: BrandColors.text,
    flex: 1,
  },
  warningBox: {
    alignItems: "center",
    backgroundColor: BrandColors.warningSoft,
    borderColor: "#FBD38D",
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.sm,
    padding: BrandSpacing.md,
  },
  warningText: {
    ...BrandTypography.helperText,
    color: BrandColors.text,
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
