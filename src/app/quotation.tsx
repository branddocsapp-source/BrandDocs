import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomerDottedField } from "@/components/customer-suggest-field";
import {
  CancelConfirmModal,
  DeleteConfirmModal,
  DocStatusBadge,
  DraftActionBar,
  FinalizeConfirmModal,
  ThreeDotMenu,
  getCancelledMenuItems,
  getDraftMenuItems,
  getFinalMenuItems,
} from "@/components/doc-status-actions";
import {
  DocumentBrandHeader,
  DocumentColors,
  DocumentFooter,
  DocumentSectionTitle,
} from "@/components/document-template";
import { useToast } from "@/components/ui/toast-context";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  BusinessProfile,
  loadBusinessProfile,
} from "@/services/business-profile";
import { SavedCustomerProfile } from "@/services/customer-directory";
import {
  calculateQuotationTotals,
  cancelQuotation,
  deleteQuotation,
  duplicateQuotationAsDraft,
  finalizeQuotation,
  generateNextQuotationNumber,
  getQuotationItemAmount,
  getQuotationLabel,
  getQuotationTitle,
  isQuotationLocked,
  loadQuotationById,
  loadQuotations,
  QuotationItem,
  QuotationRecord,
  QuotationStatus,
  QuotationType,
  saveQuotation,
} from "@/services/quotations";
import { Colors } from "@/theme/colors";
import { ThemePalette, useAppTheme } from "@/theme/theme-context";

const quotationOptions: {
  type: QuotationType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    type: "proposal_quotation",
    title: "Standard Quotation",
    description: "Detailed proposal with scope of work, deliverables, and total pricing.",
    icon: "document-text-outline",
  },
  {
    type: "table_quotation",
    title: "Table Quotation",
    description: "Itemized quotation with product/service table, rates, and calculations.",
    icon: "grid-outline",
  },
];

const previousFilters: { type: QuotationType; label: string }[] = [
  { type: "proposal_quotation", label: "Previous Quotations" },
  { type: "table_quotation", label: "Previous Table Quotations" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function validUntilISO() {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return date.toISOString().slice(0, 10);
}

function toNumber(value: string | number | undefined) {
  const parsed =
    typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(amount: number, currency: string) {
  return `${currency || "INR"} ${amount.toFixed(2)}`;
}

function getNumberWords(amount: number, currency: string) {
  return `${currency || "INR"} ${amount.toFixed(2)} only`;
}

function getCompanyAddress(profile: BusinessProfile | null) {
  const parts = [
    profile?.address,
    profile?.city,
    profile?.stateProvince,
    profile?.zipCode,
    profile?.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function buildDraftQuotation(
  documentType: QuotationType,
  profile: BusinessProfile | null,
  quotations: QuotationRecord[]
): QuotationRecord {
  const currency = profile?.defaultCurrency || profile?.currencyCode || "INR";
  const { quotationNumber, numberingSequence } = generateNextQuotationNumber(
    documentType,
    quotations,
    profile?.name
  );
  const defaultTerms =
    profile?.countryMeta?.documentDefaults?.terms ||
    "This quotation is valid until the date mentioned above.";

  return {
    documentType,
    quotationNumber,
    numberingSequence,
    quotationTitle: getQuotationTitle(documentType),
    quotationDate: todayISO(),
    validUntil: validUntilISO(),
    status: "draft",
    currency,
    businessProfileSnapshot: profile,
    company: {
      logoUrl: profile?.branding?.logoUrl || null,
      name: profile?.name || "Your Company Name",
      address: getCompanyAddress(profile) || "Company address",
      email: profile?.email || "business@example.com",
      phone: profile?.phone || "Business phone",
      website: profile?.website || "",
      currency,
      stampUrl: profile?.branding?.stampUrl || null,
      signatureUrl: profile?.branding?.signatureUrl || null,
    },
    client: {
      name: "",
      companyName: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    subject: documentType === "table_quotation" ? "Itemized quotation" : "Quotation for services",
    greeting: "Dear Client,",
    intro: "Thank you for giving us the opportunity to submit this quotation.",
    scope: "Scope of work / services can be edited directly here.",
    milestones: "Deliverables and milestones can be listed here.",
    terms: defaultTerms,
    items:
      documentType === "table_quotation"
        ? [
            {
              id: "item-1",
              description: "Goods / services description",
              quantity: "1",
              unit: "Nos",
              rate: "0",
              discount: "0",
              amount: 0,
            },
          ]
        : [],
    subtotal: 0,
    discount: 0,
    otherCharges: 0,
    grandTotal: 0,
    amountInWords: getNumberWords(0, currency),
  };
}

export default function QuotationScreen() {
  const { theme, isDark } = useAppTheme();
  const styles = createStyles(theme, isDark);
  const router = useRouter();
  const { editQuotationId, startType } = useLocalSearchParams<{
    editQuotationId?: string;
    startType?: QuotationType;
  }>();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [allQuotations, setAllQuotations] = useState<QuotationRecord[]>([]);
  const [previousQuotations, setPreviousQuotations] = useState<QuotationRecord[]>([]);
  const [previousFilter, setPreviousFilter] = useState<QuotationType>("proposal_quotation");
  const [draftQuotation, setDraftQuotation] = useState<QuotationRecord | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState<QuotationRecord | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<QuotationRecord | null>(null);

  const { width, isWebsite, isDesktop, isAppPreview } = useResponsiveLayout();
  const isPhone = width < 640;
  const baseWidth = 794;
  const baseHeight = 1123;
  const scale = width < 820 ? (width - 28) / baseWidth : 1;

  const currency = draftQuotation?.currency || profile?.defaultCurrency || "INR";
  const totals = useMemo(
    () => (draftQuotation ? calculateQuotationTotals(draftQuotation) : null),
    [draftQuotation]
  );

  function appRoute(pathname: string, params?: Record<string, string>) {
    if (!isAppPreview) {
      return params ? { pathname, params } : pathname;
    }
    return { pathname, params: { ...params, appPreview: "1" } };
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateQuotationModule() {
      const savedProfile = await loadBusinessProfile(auth.currentUser);
      const [savedQuotations, selectedQuotations] = await Promise.all([
        loadQuotations(auth.currentUser, savedProfile, undefined, 500),
        loadQuotations(auth.currentUser, savedProfile, previousFilter, 50),
      ]);
      const editingQuotation = editQuotationId
        ? await loadQuotationById(auth.currentUser, savedProfile, editQuotationId)
        : null;

      if (isMounted) {
        setProfile(savedProfile);
        setAllQuotations(savedQuotations);
        setPreviousQuotations(selectedQuotations);
        if (editingQuotation?.status === "draft") {
          setDraftQuotation(editingQuotation);
        } else if (startType) {
          setDraftQuotation(buildDraftQuotation(startType, savedProfile, savedQuotations));
        }
        setLoading(false);
      }
    }

    hydrateQuotationModule();
    return () => {
      isMounted = false;
    };
  }, [editQuotationId, startType]);

  useEffect(() => {
    let isMounted = true;

    async function loadFilteredHistory() {
      if (loading) return;
      setHistoryLoading(true);
      const quotations = await loadQuotations(
        auth.currentUser,
        profile,
        previousFilter,
        50
      );
      if (isMounted) {
        setPreviousQuotations(quotations);
        setHistoryLoading(false);
      }
    }

    loadFilteredHistory();
    return () => {
      isMounted = false;
    };
  }, [loading, previousFilter, profile]);

  function startQuotation(documentType: QuotationType) {
    setSelectorVisible(false);
    setFieldErrors([]);
    setDraftQuotation(buildDraftQuotation(documentType, profile, allQuotations));
  }

  function updateQuotationField(field: keyof QuotationRecord, value: any) {
    setDraftQuotation((current) =>
      current ? { ...current, [field]: value } : current
    );
  }

  function updateCompanyField(field: keyof QuotationRecord["company"], value: string) {
    setDraftQuotation((current) =>
      current ? { ...current, company: { ...current.company, [field]: value } } : current
    );
  }

  function updateClientField(field: keyof QuotationRecord["client"], value: string) {
    setDraftQuotation((current) =>
      current ? { ...current, client: { ...current.client, [field]: value } } : current
    );
  }

  function applySavedCustomer(customer: SavedCustomerProfile) {
    setDraftQuotation((current) => {
      if (!current) return current;
      return {
        ...current,
        client: {
          ...current.client,
          name: customer.name || current.client.name,
          phone: customer.phone || current.client.phone,
          email: customer.email || current.client.email,
          address: customer.address || current.client.address,
        },
      };
    });
  }

  function updateItem(id: string, field: keyof QuotationItem, value: string) {
    setDraftQuotation((current) => {
      if (!current) return current;
      const nextItems = current.items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        return {
          ...updated,
          amount: getQuotationItemAmount(updated),
        };
      });
      return { ...current, items: nextItems };
    });
  }

  function addRow() {
    setDraftQuotation((current) => {
      if (!current) return current;
      const newItem: QuotationItem = {
        id: `item-${Date.now()}`,
        description: "",
        quantity: "1",
        unit: "Nos",
        rate: "0",
        discount: "0",
        amount: 0,
      };
      return { ...current, items: [...current.items, newItem] };
    });
  }

  function deleteRow(id: string) {
    setDraftQuotation((current) => {
      if (!current) return current;
      const nextItems = current.items.filter((item) => item.id !== id);
      return { ...current, items: nextItems.length ? nextItems : [] };
    });
  }

  function moveRow(id: string, direction: -1 | 1) {
    setDraftQuotation((current) => {
      if (!current) return current;
      const index = current.items.findIndex((item) => item.id === id);
      if (index < 0) return current;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.items.length) return current;
      const nextItems = [...current.items];
      const [removed] = nextItems.splice(index, 1);
      nextItems.splice(targetIndex, 0, removed);
      return { ...current, items: nextItems };
    });
  }

  function validateQuotation(quotation: QuotationRecord): string[] {
    const errors: string[] = [];
    if (!quotation.quotationNumber.trim()) errors.push("Quotation number is required.");
    if (!quotation.client.name.trim()) errors.push("Client name is required.");
    if (!quotation.company.name.trim()) errors.push("Company name is required.");
    return errors;
  }

  function buildSavableQuotation(status: QuotationStatus = "draft"): QuotationRecord | null {
    if (!draftQuotation || !totals) return null;
    return {
      ...draftQuotation,
      status,
      currency,
      subtotal: totals.subtotal,
      discount: totals.discount,
      otherCharges: totals.otherCharges,
      grandTotal: totals.grandTotal,
      amountInWords: getNumberWords(totals.grandTotal, currency),
    };
  }

  async function persistDraft({ goToPreview = false }: { goToPreview?: boolean }) {
    const quotationToSave = buildSavableQuotation("draft");
    if (!quotationToSave) return;
    const errors = validateQuotation(quotationToSave);
    setFieldErrors(errors);
    if (errors.length) return;

    try {
      setSaving(true);
      const result = await saveQuotation(auth.currentUser, profile, quotationToSave);
      setDraftQuotation(result.quotation);
      const [quotations, selectedQuotations] = await Promise.all([
        loadQuotations(auth.currentUser, profile, undefined, 500),
        loadQuotations(auth.currentUser, profile, previousFilter, 50),
      ]);
      setAllQuotations(quotations.length ? quotations : [result.quotation, ...allQuotations]);
      setPreviousQuotations(selectedQuotations.length ? selectedQuotations : [result.quotation, ...previousQuotations]);

      if (goToPreview) {
        router.push(appRoute("/preview", { type: "quotation", quotationId: result.quotation.id || "" }) as never);
      } else {
        showToast({ title: "Draft Saved", message: "Quotation draft saved successfully." });
      }
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "Could not save quotation draft.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    const quotationToSave = buildSavableQuotation("draft");
    if (!quotationToSave) return;
    const errors = validateQuotation(quotationToSave);
    setFieldErrors(errors);
    if (errors.length) {
      setShowFinalizeModal(false);
      return;
    }

    try {
      setSaving(true);
      const draftResult = await saveQuotation(auth.currentUser, profile, quotationToSave);
      const result = await finalizeQuotation(auth.currentUser, profile, draftResult.quotation);
      const [quotations, selectedQuotations] = await Promise.all([
        loadQuotations(auth.currentUser, profile, undefined, 500),
        loadQuotations(auth.currentUser, profile, previousFilter, 50),
      ]);
      setAllQuotations(quotations.length ? quotations : [result.quotation, ...allQuotations]);
      setPreviousQuotations(selectedQuotations.length ? selectedQuotations : [result.quotation, ...previousQuotations]);
      setDraftQuotation(null);
      setShowFinalizeModal(false);
      showToast({ title: "Finalized", message: `${getQuotationLabel(result.quotation.documentType)} finalized successfully.` });
    } catch (error: any) {
      Alert.alert("Finalize Failed", error?.message || "Could not finalize quotation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelQuotation(quotation: QuotationRecord, reason: string) {
    try {
      setSaving(true);
      const result = await cancelQuotation(auth.currentUser, profile, quotation, reason);
      const [quotations, selectedQuotations] = await Promise.all([
        loadQuotations(auth.currentUser, profile, undefined, 500),
        loadQuotations(auth.currentUser, profile, previousFilter, 50),
      ]);
      setAllQuotations(quotations);
      setPreviousQuotations(selectedQuotations);
      setShowCancelModal(null);
      showToast({ title: "Cancelled", message: "Quotation has been cancelled." });
    } catch (error: any) {
      Alert.alert("Cancel Failed", error?.message || "Could not cancel quotation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDraft(quotation: QuotationRecord) {
    try {
      setSaving(true);
      await deleteQuotation(auth.currentUser, profile, quotation);
      const [quotations, selectedQuotations] = await Promise.all([
        loadQuotations(auth.currentUser, profile, undefined, 500),
        loadQuotations(auth.currentUser, profile, previousFilter, 50),
      ]);
      setAllQuotations(quotations);
      setPreviousQuotations(selectedQuotations);
      setShowDeleteModal(null);
      if (draftQuotation?.id === quotation.id) setDraftQuotation(null);
      showToast({ title: "Draft Deleted", message: "Draft was deleted." });
    } catch (error: any) {
      Alert.alert("Delete Failed", error?.message || "Could not delete draft.");
    } finally {
      setSaving(false);
    }
  }

  function handleDuplicate(quotation: QuotationRecord) {
    const copy = duplicateQuotationAsDraft(quotation, allQuotations, profile?.name);
    setDraftQuotation(copy);
  }

  // ─── Render Editor Sheet ────────────────────────────────────
  if (draftQuotation && totals) {
    const isTableQuotation = draftQuotation.documentType === "table_quotation";

    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.editorHeader}>
              <Pressable style={styles.headerButton} onPress={() => setDraftQuotation(null)} accessibilityRole="button" accessibilityLabel="Back">
                <Ionicons name="chevron-back" size={22} color={theme.ink} />
              </Pressable>
              <Text style={styles.editorTitle}>{getQuotationLabel(draftQuotation.documentType)}</Text>
              <ThreeDotMenu
                items={getDraftMenuItems({
                  onEdit: () => {},
                  onPreview: () => persistDraft({ goToPreview: true }),
                  onDelete: () => setShowDeleteModal(draftQuotation),
                })}
              />
            </View>

            <View style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={[
                  styles.editorContent,
                  (isWebsite || isDesktop) && styles.webEditorContent,
                  width < 820 && { minWidth: 0 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {fieldErrors.length ? (
                  <View style={styles.errorBox}>
                    {fieldErrors.map((error) => (
                      <Text key={error} style={styles.errorText}>
                        {error}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View
                  style={
                    width < 820
                      ? {
                          width: baseWidth * scale,
                          height: baseHeight * scale,
                          overflow: "hidden",
                          justifyContent: "center",
                          alignItems: "center",
                          alignSelf: "center",
                        }
                      : undefined
                  }
                >
                  <View
                    style={[
                      styles.a4Paper,
                      isDesktop && styles.webA4Paper,
                      width < 820 && {
                        transform: [{ scale: scale }],
                        transformOrigin: "top left",
                        width: baseWidth,
                        minHeight: baseHeight,
                      },
                    ]}
                  >
                    {/* Header */}
                    <DocumentBrandHeader
                      company={{
                        name: draftQuotation.company.name,
                        address: draftQuotation.company.address,
                        phone: draftQuotation.company.phone,
                        email: draftQuotation.company.email,
                        website: draftQuotation.company.website,
                        logoUrl: draftQuotation.company.logoUrl,
                      }}
                      documentTitle={getQuotationTitle(draftQuotation.documentType).toUpperCase()}
                      metaRows={[
                        {
                          label: "Quotation No.",
                          value: draftQuotation.quotationNumber,
                          onChange: (v) => updateQuotationField("quotationNumber", v),
                        },
                        {
                          label: "Date",
                          value: draftQuotation.quotationDate,
                          onChange: (v) => updateQuotationField("quotationDate", v),
                        },
                        {
                          label: "Valid Till",
                          value: draftQuotation.validUntil,
                          onChange: (v) => updateQuotationField("validUntil", v),
                        },
                        {
                          label: "Currency",
                          value: draftQuotation.currency,
                          onChange: (v) => updateQuotationField("currency", v.toUpperCase()),
                        },
                      ]}
                      editable
                      onCompanyChange={(field, value) => {
                        if (field === "name") updateCompanyField("name", value);
                        if (field === "address") updateCompanyField("address", value);
                        if (field === "phone") updateCompanyField("phone", value);
                        if (field === "email") updateCompanyField("email", value);
                        if (field === "website") updateCompanyField("website", value);
                      }}
                    />

                    {/* Client Info Grid */}
                    <View style={styles.clientGrid}>
                      <View style={styles.clientBox}>
                        <Text style={styles.sectionLabel}>Client Information :</Text>
                        <CustomerDottedField
                          label="Client Name"
                          value={draftQuotation.client.name}
                          onChangeText={(value) => updateClientField("name", value)}
                          onSelectCustomer={applySavedCustomer}
                          placeholder="Search or enter client name"
                        />
                        <DottedField
                          label="Company"
                          value={draftQuotation.client.companyName || ""}
                          onChangeText={(value) => updateClientField("companyName", value)}
                        />
                        <DottedField
                          label="Address"
                          value={draftQuotation.client.address || ""}
                          onChangeText={(value) => updateClientField("address", value)}
                        />
                        <View style={{ flexDirection: "row", gap: 12 }}>
                          <DottedField
                            label="Phone"
                            value={draftQuotation.client.phone || ""}
                            onChangeText={(value) => updateClientField("phone", value)}
                            compact
                          />
                          <DottedField
                            label="Email"
                            value={draftQuotation.client.email || ""}
                            onChangeText={(value) => updateClientField("email", value)}
                            compact
                          />
                        </View>
                      </View>
                    </View>

                    {/* Subject / Title Section */}
                    <DocumentSectionTitle title="Subject / Title" />
                    <View style={styles.subjectBox}>
                      <TextInput
                        style={styles.subjectInput}
                        value={draftQuotation.subject}
                        onChangeText={(value) => updateQuotationField("subject", value)}
                        placeholder="Enter quotation subject..."
                      />
                    </View>

                    {/* Proposal / Standard Body */}
                    {!isTableQuotation ? (
                      <View style={styles.letterBody}>
                        <View style={{ gap: 4 }}>
                          <Text style={styles.sectionLabel}>Greeting :</Text>
                          <TextInput
                            style={styles.inlineInput}
                            value={draftQuotation.greeting}
                            onChangeText={(value) => updateQuotationField("greeting", value)}
                          />
                        </View>

                        <View style={{ gap: 4 }}>
                          <Text style={styles.sectionLabel}>Introduction :</Text>
                          <TextInput
                            style={styles.textArea}
                            value={draftQuotation.intro}
                            onChangeText={(value) => updateQuotationField("intro", value)}
                            multiline
                          />
                        </View>

                        <View style={{ gap: 4 }}>
                          <Text style={styles.sectionLabel}>Scope of Work :</Text>
                          <TextInput
                            style={styles.richTextArea}
                            value={draftQuotation.scope}
                            onChangeText={(value) => updateQuotationField("scope", value)}
                            multiline
                          />
                        </View>

                        <View style={{ gap: 4 }}>
                          <Text style={styles.sectionLabel}>Milestones / Deliverables :</Text>
                          <TextInput
                            style={styles.richTextArea}
                            value={draftQuotation.milestones}
                            onChangeText={(value) => updateQuotationField("milestones", value)}
                            multiline
                          />
                        </View>
                      </View>
                    ) : null}

                    {/* Table Quotation Item Table */}
                    {isTableQuotation ? (
                      <View style={{ marginVertical: 8 }}>
                        <View style={styles.tableToolbar}>
                          <Text style={styles.sectionLabel}>Itemized Products / Services</Text>
                          <Pressable style={styles.addRowButton} onPress={addRow}>
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                            <Text style={styles.addRowText}>Add Row</Text>
                          </Pressable>
                        </View>

                        <View style={styles.itemTable}>
                          <View style={[styles.itemRow, styles.itemHeaderRow]}>
                            <Text style={[styles.tableCell, styles.headerCell, styles.serialCell]}>#</Text>
                            <Text style={[styles.tableCell, styles.headerCell, styles.descriptionCell]}>
                              Description of Goods / Services
                            </Text>
                            <Text style={[styles.tableCell, styles.headerCell, styles.smallCell]}>Qty</Text>
                            <Text style={[styles.tableCell, styles.headerCell, styles.smallCell]}>Unit</Text>
                            <Text style={[styles.tableCell, styles.headerCell, styles.smallCell]}>Rate</Text>
                            <Text style={[styles.tableCell, styles.headerCell, styles.smallCell]}>Disc.</Text>
                            <Text style={[styles.tableCell, styles.headerCell, styles.amountCell]}>Amount</Text>
                            <Text style={[styles.tableCell, styles.headerCell, styles.actionCell]} />
                          </View>

                          {draftQuotation.items.map((item, index) => (
                            <View key={item.id} style={styles.itemRow}>
                              <Text style={[styles.tableCell, styles.serialCell]}>{index + 1}</Text>
                              <CellInput
                                value={item.description}
                                onChangeText={(value) => updateItem(item.id, "description", value)}
                                style={styles.descriptionCell}
                              />
                              <CellInput
                                value={item.quantity}
                                onChangeText={(value) => updateItem(item.id, "quantity", value)}
                                style={styles.smallCell}
                                keyboardType="decimal-pad"
                              />
                              <CellInput
                                value={item.unit || "Nos"}
                                onChangeText={(value) => updateItem(item.id, "unit", value)}
                                style={styles.smallCell}
                              />
                              <CellInput
                                value={item.rate}
                                onChangeText={(value) => updateItem(item.id, "rate", value)}
                                style={styles.smallCell}
                                keyboardType="decimal-pad"
                              />
                              <CellInput
                                value={item.discount || "0"}
                                onChangeText={(value) => updateItem(item.id, "discount", value)}
                                style={styles.smallCell}
                                keyboardType="decimal-pad"
                              />
                              <Text style={[styles.tableCell, styles.amountCell, styles.amountText]}>
                                {formatMoney(getQuotationItemAmount(item), currency)}
                              </Text>
                              <View style={[styles.tableCell, styles.actionCell, styles.rowActions]}>
                                <Pressable onPress={() => moveRow(item.id, -1)} disabled={index === 0}>
                                  <Ionicons name="chevron-up" size={15} color={index === 0 ? "#CFCFCF" : theme.muted} />
                                </Pressable>
                                <Pressable
                                  onPress={() => moveRow(item.id, 1)}
                                  disabled={index === draftQuotation.items.length - 1}
                                >
                                  <Ionicons
                                    name="chevron-down"
                                    size={15}
                                    color={index === draftQuotation.items.length - 1 ? "#CFCFCF" : theme.muted}
                                  />
                                </Pressable>
                                <Pressable onPress={() => deleteRow(item.id)}>
                                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                                </Pressable>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {/* Summary & Totals Area */}
                    <View style={styles.summaryArea}>
                      <View style={styles.notesColumn}>
                        <Text style={styles.sectionLabel}>Terms & Conditions :</Text>
                        <TextInput
                          value={draftQuotation.terms}
                          onChangeText={(value) => updateQuotationField("terms", value)}
                          multiline
                          style={styles.textArea}
                        />
                      </View>

                      <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Subtotal</Text>
                          <Text style={styles.totalValue}>{formatMoney(totals.subtotal, currency)}</Text>
                        </View>

                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Discount</Text>
                          <View style={styles.editableTotalValue}>
                            <Text style={styles.currencyPrefix}>{currency}</Text>
                            <TextInput
                              value={`${draftQuotation.discount || ""}`}
                              onChangeText={(value) => updateQuotationField("discount", toNumber(value))}
                              keyboardType="decimal-pad"
                              style={styles.totalInput}
                            />
                          </View>
                        </View>

                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Other Charges</Text>
                          <View style={styles.editableTotalValue}>
                            <Text style={styles.currencyPrefix}>{currency}</Text>
                            <TextInput
                              value={`${draftQuotation.otherCharges || ""}`}
                              onChangeText={(value) => updateQuotationField("otherCharges", toNumber(value))}
                              keyboardType="decimal-pad"
                              style={styles.totalInput}
                            />
                          </View>
                        </View>

                        <View style={styles.totalDivider} />

                        <View style={styles.totalRow}>
                          <Text style={[styles.totalLabel, styles.totalStrong]}>Grand Total</Text>
                          <Text style={[styles.totalValue, styles.totalStrong, { color: theme.orange }]}>
                            {formatMoney(totals.grandTotal, currency)}
                          </Text>
                        </View>

                        <Text style={styles.wordsLabel}>Amount in Words :</Text>
                        <TextInput
                          value={getNumberWords(totals.grandTotal, currency)}
                          style={styles.wordsInput}
                          multiline
                          editable={false}
                        />
                      </View>
                    </View>

                    {/* Signature Area */}
                    <View style={styles.signatureArea}>
                      <View style={styles.closingBox}>
                        <Text style={styles.sectionLabel}>Closing Note :</Text>
                        <Text style={{ fontSize: 11, color: DocumentColors.muted, fontStyle: "italic", marginTop: 4 }}>
                          We look forward to working with you. Please feel free to contact us for any clarification.
                        </Text>
                      </View>
                      <View style={styles.signBox}>
                        <Text style={styles.signFor}>For {draftQuotation.company.name}</Text>
                        <View style={styles.assetRow}>
                          <AssetPreview label="Stamp" uri={draftQuotation.company.stampUrl} />
                          <AssetPreview label="Signature" uri={draftQuotation.company.signatureUrl} />
                        </View>
                        <Text style={styles.signLabel}>Authorized Signatory</Text>
                      </View>
                    </View>

                    {/* Document Footer */}
                    <DocumentFooter
                      phone={draftQuotation.company.phone}
                      email={draftQuotation.company.email}
                      website={draftQuotation.company.website}
                    />
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Bottom Actions */}
            <DraftActionBar
              saving={saving}
              onSaveDraft={() => persistDraft({ goToPreview: false })}
              onPreview={() => persistDraft({ goToPreview: true })}
              onFinalize={() => setShowFinalizeModal(true)}
            />

            <FinalizeConfirmModal
              visible={showFinalizeModal}
              documentLabel={getQuotationLabel(draftQuotation.documentType)}
              onGoBack={() => setShowFinalizeModal(false)}
              onConfirm={handleFinalize}
              loading={saving}
            />

            <DeleteConfirmModal
              visible={!!showDeleteModal}
              documentLabel={showDeleteModal ? getQuotationLabel(showDeleteModal.documentType) : ""}
              documentNumber={showDeleteModal?.quotationNumber || ""}
              onGoBack={() => setShowDeleteModal(null)}
              onConfirm={() => showDeleteModal && handleDeleteDraft(showDeleteModal)}
              loading={saving}
            />
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ─── Render Quotation List / Dashboard ───────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.moduleContent,
            (isWebsite || isDesktop) && styles.webModuleContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.moduleHeader}>
            <Pressable style={styles.headerButton} onPress={() => router.push(appRoute("/dashboard") as never)} accessibilityRole="button" accessibilityLabel="Dashboard">
              <Ionicons name="chevron-back" size={22} color={theme.ink} />
            </Pressable>
            <Text style={styles.moduleTitle}>Quotation</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Pressable style={styles.createButton} onPress={() => setSelectorVisible(true)}>
            <View style={styles.createIcon}>
              <Ionicons name="reader-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.createText}>Create New Quotation</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={styles.previousCard}>
            <View style={styles.previousHeader}>
              <Text style={styles.previousTitle}>Previous Quotations</Text>
              <Pressable style={styles.filterButton} onPress={() => setFilterOpen((value) => !value)}>
                <Text style={styles.filterButtonText}>
                  {previousFilters.find((item) => item.type === previousFilter)?.label}
                </Text>
                <Ionicons name={filterOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.ink} />
              </Pressable>
            </View>

            {filterOpen ? (
              <View style={styles.filterMenu}>
                {previousFilters.map((filter) => (
                  <Pressable
                    key={filter.type}
                    style={[styles.filterOption, previousFilter === filter.type && styles.filterOptionActive]}
                    onPress={() => {
                      setPreviousFilter(filter.type);
                      setFilterOpen(false);
                    }}
                  >
                    <Text style={[styles.filterOptionText, previousFilter === filter.type && styles.filterOptionTextActive]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {loading || historyLoading ? (
              <Text style={styles.emptyText}>Loading quotations...</Text>
            ) : previousQuotations.length ? (
              previousQuotations.map((quotation) => (
                <View key={quotation.id || quotation.quotationNumber} style={styles.previousRow}>
                  <Pressable
                    style={styles.previousMain}
                    onPress={() => router.push(appRoute("/preview", { type: "quotation", quotationId: quotation.id || "" }) as never)}
                  >
                    <View style={styles.previousIcon}>
                      <Ionicons
                        name={quotation.documentType === "table_quotation" ? "grid-outline" : "reader-outline"}
                        size={18}
                        color={theme.orange}
                      />
                    </View>
                    <View style={styles.previousCopy}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.previousNumber}>{quotation.quotationNumber}</Text>
                        <DocStatusBadge status={quotation.status} />
                      </View>
                      <Text style={styles.previousMeta}>
                        {quotation.quotationDate} • Valid {quotation.validUntil} • {quotation.client.name || "Client"}
                      </Text>
                    </View>
                    <Text style={styles.previousAmount}>{formatMoney(quotation.grandTotal, quotation.currency)}</Text>
                  </Pressable>
                  <View style={styles.previousActions}>
                    <ThreeDotMenu
                      items={
                        quotation.status === "draft"
                          ? getDraftMenuItems({
                              onEdit: () => setDraftQuotation(quotation),
                              onPreview: () => router.push(appRoute("/preview", { type: "quotation", quotationId: quotation.id || "" }) as never),
                              onDelete: () => setShowDeleteModal(quotation),
                            })
                          : quotation.status === "final"
                            ? getFinalMenuItems({
                                onView: () => router.push(appRoute("/preview", { type: "quotation", quotationId: quotation.id || "" }) as never),
                                onDuplicate: () => handleDuplicate(quotation),
                                onCancel: () => setShowCancelModal(quotation),
                              })
                            : getCancelledMenuItems({
                                onView: () => router.push(appRoute("/preview", { type: "quotation", quotationId: quotation.id || "" }) as never),
                                onDuplicate: () => handleDuplicate(quotation),
                              })
                      }
                    />
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="reader-outline" size={28} color={theme.orange} />
                </View>
                <Text style={styles.emptyTitle}>No quotations created yet</Text>
                <Text style={styles.emptyText}>
                  Saved {getQuotationLabel(previousFilter).toLowerCase()} records will appear here with number, client, amount, and status.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <CancelConfirmModal
          visible={!!showCancelModal}
          documentLabel={showCancelModal ? getQuotationLabel(showCancelModal.documentType) : ""}
          onGoBack={() => setShowCancelModal(null)}
          onConfirm={(reason) => showCancelModal && handleCancelQuotation(showCancelModal, reason)}
          loading={saving}
        />

        <DeleteConfirmModal
          visible={!!showDeleteModal}
          documentLabel={showDeleteModal ? getQuotationLabel(showDeleteModal.documentType) : ""}
          documentNumber={showDeleteModal?.quotationNumber || ""}
          onGoBack={() => setShowDeleteModal(null)}
          onConfirm={() => showDeleteModal && handleDeleteDraft(showDeleteModal)}
          loading={saving}
        />

        <Modal transparent visible={selectorVisible} animationType={isPhone ? "slide" : "fade"} onRequestClose={() => setSelectorVisible(false)}>
          <View style={[styles.selectorOverlay, isPhone && styles.selectorOverlayPhone]}>
            <View style={[styles.selectorModal, isPhone && styles.selectorSheet]}>
              <View style={styles.selectorHeader}>
                <View>
                  <Text style={styles.selectorTitle}>Create New Quotation</Text>
                  <Text style={styles.selectorSubtitle}>Choose the quotation format you want to create.</Text>
                </View>
                <Pressable style={styles.closeButton} onPress={() => setSelectorVisible(false)}>
                  <Ionicons name="close" size={20} color={theme.ink} />
                </Pressable>
              </View>
              {quotationOptions.map((option) => (
                <Pressable key={option.type} style={styles.selectorOption} onPress={() => startQuotation(option.type)}>
                  <View style={styles.selectorIcon}>
                    <Ionicons name={option.icon} size={22} color={theme.orange} />
                  </View>
                  <View style={styles.selectorCopy}>
                    <Text style={styles.selectorOptionTitle}>{option.title}</Text>
                    <Text style={styles.selectorOptionText}>{option.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
}

function DottedField({
  label,
  value,
  onChangeText,
  compact,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <View style={[{ alignItems: "center", flexDirection: "row", minHeight: 25 }, compact && { flex: 1 }]}>
      <Text style={{ color: DocumentColors.muted, fontSize: 12, fontWeight: "700", marginRight: 4 }}>
        {label} :
      </Text>
      <TextInput
        style={{
          borderBottomColor: DocumentColors.lineStrong,
          borderBottomWidth: 1,
          color: DocumentColors.ink,
          flex: 1,
          fontSize: 12,
          fontWeight: "600",
          minHeight: 22,
          padding: 0,
        }}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function CellInput({
  value,
  onChangeText,
  style,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  style?: object;
  keyboardType?: "default" | "decimal-pad";
}) {
  return (
    <TextInput
      style={[
        {
          borderRightColor: "#8A8A8A",
          borderRightWidth: 1.2,
          borderTopColor: "#8A8A8A",
          borderTopWidth: 1.2,
          color: "#555555",
          fontSize: 10,
          fontWeight: "700",
          minHeight: 28,
          paddingHorizontal: 4,
          paddingVertical: 4,
        },
        style,
      ]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      multiline={false}
    />
  );
}

function AssetPreview({ label, uri }: { label: string; uri?: string | null }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ alignItems: "center", borderColor: "#EEEEEE", borderRadius: 4, borderWidth: 1, flex: 1, minHeight: 58, padding: 6 }}>
      <Text style={{ color: "#777777", fontSize: 9, fontWeight: "800", marginBottom: 3 }}>{label}</Text>
      {uri ? (
        <Image source={{ uri }} style={{ height: 38, width: "100%" }} contentFit="contain" />
      ) : (
        <Text style={{ color: theme.muted, fontSize: 9 }}>Not added</Text>
      )}
    </View>
  );
}

const shadow = Platform.select({
  web: {
    boxShadow: "0px 8px 18px rgba(0, 0, 0, 0.07)",
  },
  default: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
});

const createStyles = (theme: ThemePalette, isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    webSafeArea: { backgroundColor: theme.wash },
    keyboardView: { flex: 1 },
    moduleContent: { alignSelf: "center", maxWidth: 920, padding: 20, width: "100%" },
    webModuleContent: { maxWidth: 960, paddingHorizontal: 32, paddingBottom: 56, paddingTop: 32 },
    moduleHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    headerButton: { alignItems: "center", backgroundColor: theme.card, borderColor: theme.line, borderRadius: 14, borderWidth: 1, height: 40, justifyContent: "center", width: 40, ...shadow },
    headerSpacer: { width: 44 },
    moduleTitle: { color: theme.ink, fontSize: 24, fontWeight: "900" },
    createButton: { alignItems: "center", backgroundColor: theme.orange, borderRadius: 20, flexDirection: "row", gap: 12, marginBottom: 18, padding: 18 },
    createIcon: { alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.18)", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
    createText: { color: "#FFFFFF", flex: 1, fontSize: 17, fontWeight: "800" },
    previousCard: { backgroundColor: theme.card, borderColor: theme.line, borderRadius: 20, borderWidth: 1, padding: 18, ...shadow },
    previousHeader: { alignItems: "flex-start", gap: 10, marginBottom: 12 },
    previousTitle: { color: theme.ink, fontSize: 18, fontWeight: "800" },
    filterButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: theme.wash, borderColor: theme.line, borderRadius: 12, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
    filterButtonText: { color: theme.ink, fontSize: 13, fontWeight: "800" },
    filterMenu: { borderColor: theme.line, borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
    filterOption: { paddingHorizontal: 12, paddingVertical: 11 },
    filterOptionActive: { backgroundColor: theme.orangeSoft },
    filterOptionText: { color: theme.muted, fontSize: 13, fontWeight: "700" },
    filterOptionTextActive: { color: theme.orangeDark },
    previousRow: { borderTopColor: theme.line, borderTopWidth: 1, paddingVertical: 12 },
    previousMain: { alignItems: "center", flexDirection: "row" },
    previousIcon: { alignItems: "center", backgroundColor: theme.orangeSoft, borderRadius: 14, height: 40, justifyContent: "center", marginRight: 12, width: 40 },
    previousCopy: { flex: 1 },
    previousNumber: { color: theme.ink, fontSize: 14, fontWeight: "800", marginBottom: 3 },
    previousMeta: { color: theme.muted, fontSize: 12 },
    previousAmount: { color: theme.ink, fontSize: 13, fontWeight: "800", marginLeft: 10 },
    previousActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 10 },
    emptyState: { alignItems: "center", borderColor: theme.line, borderRadius: 18, borderStyle: "dashed", borderWidth: 1, paddingHorizontal: 18, paddingVertical: 34 },
    emptyIcon: { alignItems: "center", backgroundColor: theme.orangeSoft, borderRadius: 22, height: 56, justifyContent: "center", marginBottom: 14, width: 56 },
    emptyTitle: { color: theme.ink, fontSize: 17, fontWeight: "800", marginBottom: 6, textAlign: "center" },
    emptyText: { color: theme.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
    editorHeader: { alignItems: "center", backgroundColor: theme.card, borderBottomColor: theme.line, borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
    editorTitle: { color: theme.ink, flex: 1, fontSize: 18, fontWeight: "800", textAlign: "center" },
    editorContent: { alignSelf: "center", minWidth: 820, paddingHorizontal: 14, paddingBottom: 96, paddingTop: 14, width: "100%", backgroundColor: theme.background },
    webEditorContent: { maxWidth: 1120, paddingHorizontal: 40, paddingTop: 24 },
    errorBox: { alignSelf: "center", backgroundColor: "#FFF2F0", borderColor: "#FFD2CC", borderRadius: 12, borderWidth: 1, marginBottom: 12, maxWidth: 794, padding: 12, width: "100%" },
    errorText: { color: theme.orangeDark, fontSize: 12, fontWeight: "700", lineHeight: 18 },
    a4Paper: { alignSelf: "center", aspectRatio: 210 / 297, backgroundColor: DocumentColors.paper, borderColor: DocumentColors.line, borderRadius: 2, borderWidth: 1, maxWidth: 794, minHeight: 1123, padding: 32, width: 794, ...shadow },
    webA4Paper: { width: 794 },
    clientGrid: { borderBottomColor: DocumentColors.line, borderBottomWidth: 1, flexDirection: "row", gap: 14, marginVertical: 12, paddingBottom: 12 },
    clientBox: { flex: 1, gap: 4 },
    sectionLabel: { color: DocumentColors.accent, fontSize: 11, fontWeight: "800", marginBottom: 4 },
    subjectBox: { borderBottomColor: DocumentColors.line, borderBottomWidth: 1, paddingVertical: 8, marginBottom: 10 },
    subjectInput: { color: DocumentColors.ink, fontSize: 13, fontWeight: "700" },
    letterBody: { gap: 12, minHeight: 320, paddingVertical: 10 },
    inlineInput: { borderBottomColor: DocumentColors.line, borderBottomWidth: 1, color: DocumentColors.ink, fontSize: 12, fontWeight: "600", paddingVertical: 4 },
    textArea: { borderColor: DocumentColors.line, borderRadius: 4, borderWidth: 1, color: DocumentColors.muted, fontSize: 11, minHeight: 52, padding: 8, textAlignVertical: "top" },
    richTextArea: { borderColor: DocumentColors.line, borderRadius: 6, borderWidth: 1, color: DocumentColors.muted, fontSize: 12, lineHeight: 18, minHeight: 80, padding: 8, textAlignVertical: "top" },
    tableToolbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
    addRowButton: { alignItems: "center", backgroundColor: DocumentColors.accent, borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
    addRowText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
    itemTable: { borderColor: "#8A8A8A", borderRadius: 0, borderWidth: 1.2, width: "100%", overflow: "hidden" },
    itemRow: { flexDirection: "row", width: "100%" },
    itemHeaderRow: { backgroundColor: DocumentColors.accent },
    headerCell: { color: DocumentColors.tableHeaderText, fontWeight: "900" },
    tableCell: { borderRightColor: "#8A8A8A", borderRightWidth: 1.2, borderTopColor: "#8A8A8A", borderTopWidth: 1.2, color: "#555555", fontSize: 10, fontWeight: "700", minHeight: 28, padding: 5 },
    serialCell: { textAlign: "center", width: 35 },
    descriptionCell: { flex: 1, minWidth: 160 },
    smallCell: { textAlign: "center", width: 62 },
    amountCell: { textAlign: "right", width: 88, fontWeight: "800" },
    actionCell: { borderRightWidth: 0, width: 52 },
    amountText: { fontWeight: "800", textAlign: "right" },
    rowActions: { alignItems: "center", flexDirection: "row", gap: 2, justifyContent: "center", paddingHorizontal: 2 },
    summaryArea: { borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, flexDirection: "row", gap: 0, paddingVertical: 0 },
    notesColumn: { borderRightColor: "#8A8A8A", borderRightWidth: 1.3, flex: 1.18, minHeight: 92, paddingHorizontal: 12, paddingVertical: 10 },
    totalsBox: { flex: 0.95, paddingHorizontal: 12, paddingVertical: 4 },
    totalRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
    totalLabel: { color: "#333333", flex: 1, fontSize: 11, fontWeight: "700" },
    totalValue: { color: "#111111", fontSize: 11, fontWeight: "900", textAlign: "right" },
    totalStrong: { fontSize: 14, fontWeight: "900" },
    editableTotalValue: { alignItems: "center", flexDirection: "row", justifyContent: "flex-end" },
    currencyPrefix: { color: "#777777", fontSize: 10, fontWeight: "800", marginRight: 4 },
    totalInput: { borderBottomColor: "#BBBBBB", borderBottomWidth: 1, color: "#111111", fontSize: 11, fontWeight: "800", minWidth: 58, padding: 0, textAlign: "right" },
    totalDivider: { backgroundColor: "#222222", height: 1, marginVertical: 5 },
    wordsLabel: { color: "#555555", fontSize: 9, fontWeight: "900", marginBottom: 4, marginTop: 8, textTransform: "uppercase" },
    wordsInput: { color: "#222222", fontSize: 11, fontWeight: "700", minHeight: 34, padding: 0, textAlignVertical: "top" },
    signatureArea: { flexDirection: "row", gap: 0, minHeight: 93 },
    closingBox: { borderRightColor: "#8A8A8A", borderRightWidth: 1.3, flex: 1.2, padding: 10 },
    signBox: { alignItems: "flex-end", flex: 1, justifyContent: "space-between", minHeight: 93, padding: 12 },
    signFor: { color: "#4A4A4A", fontSize: 14, fontWeight: "800", marginBottom: 8 },
    assetRow: { flexDirection: "row", gap: 8, width: "100%" },
    signLabel: { color: "#4A4A4A", fontSize: 14, fontWeight: "500", marginTop: 10 },
    selectorOverlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.34)", flex: 1, justifyContent: "center", padding: 22 },
    selectorOverlayPhone: { justifyContent: "flex-end", padding: 0 },
    selectorModal: { backgroundColor: theme.card, borderRadius: 18, maxWidth: 460, padding: 18, width: "100%", ...shadow },
    selectorSheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxWidth: "100%", paddingBottom: 26 },
    selectorHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
    selectorTitle: { color: theme.ink, fontSize: 20, fontWeight: "900", marginBottom: 4 },
    selectorSubtitle: { color: theme.muted, fontSize: 13, lineHeight: 18 },
    closeButton: { alignItems: "center", backgroundColor: theme.wash, borderColor: theme.line, borderRadius: 14, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
    selectorOption: { alignItems: "center", borderColor: theme.line, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 10, padding: 14 },
    selectorIcon: { alignItems: "center", backgroundColor: theme.orangeSoft, borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
    selectorCopy: { flex: 1 },
    selectorOptionTitle: { color: theme.ink, fontSize: 15, fontWeight: "900", marginBottom: 3 },
    selectorOptionText: { color: theme.muted, fontSize: 12, lineHeight: 17 },
  });
