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
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BusinessProfile, getCompanyInitials, loadBusinessProfile } from "@/services/business-profile";
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
  QuotationDocumentType,
  QuotationItem,
  QuotationRecord,
  saveQuotation,
} from "@/services/quotations";
import { useAppTheme, ThemePalette } from "@/theme/theme-context";
import { Colors } from "@/theme/colors";
import { BrandColors, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";
import {
  DocumentBrandHeader,
  DocumentColors,
  DocumentFooter,
  DocumentSectionTitle,
  DocumentTaxBar,
} from "@/components/document-template";
import { CustomerInlineField } from "@/components/customer-suggest-field";
import { SavedCustomerProfile } from "@/services/customer-directory";
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

const quotationOptions: { type: QuotationDocumentType; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    type: "standard_quotation",
    title: "Standard Quotation",
    description: "Create a professional letter-style quotation with detailed terms and scope.",
    icon: "reader-outline",
  },
  {
    type: "table_quotation",
    title: "Table Quotation",
    description: "Create an itemized quotation in a structured table format.",
    icon: "grid-outline",
  },
];

const previousFilters: { type: QuotationDocumentType; label: string }[] = [
  { type: "standard_quotation", label: "Previous Standard Quotations" },
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
  const parsed = typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(amount: number, currency: string) {
  return `${currency || "INR"} ${amount.toFixed(2)}`;
}

function getNumberWords(amount: number, currency: string) {
  return `${currency || "INR"} ${amount.toFixed(2)} only`;
}

function getCompanyAddress(profile: BusinessProfile | null) {
  return [profile?.address, profile?.city, profile?.stateProvince, profile?.zipCode, profile?.country]
    .filter(Boolean)
    .join(", ");
}

function getStatusLabel(status: QuotationRecord["status"]) {
  if (status === "final") return "Final";
  if (status === "cancelled") return "Cancelled";
  return "Draft";
}

function createInitialItems(): QuotationItem[] {
  return [
    {
      id: `${Date.now()}`,
      description: "Goods / services description",
      itemCode: "",
      quantity: "1",
      unit: "Nos",
      rate: "0",
      discount: "0",
    },
  ];
}

function buildDraftQuotation(documentType: QuotationDocumentType, profile: BusinessProfile | null, quotations: QuotationRecord[]): QuotationRecord {
  const currency = profile?.defaultCurrency || profile?.currencyCode || "INR";
  const { quotationNumber, numberingSequence } = generateNextQuotationNumber(documentType, profile?.name, quotations);
  const defaultTerms = profile?.countryMeta?.documentDefaults?.terms || "This quotation is valid until the date mentioned above.";

  return {
    documentType,
    quotationNumber,
    numberingSequence,
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
      signatureUrl: profile?.branding?.signatureUrl || null,
      stampUrl: profile?.branding?.stampUrl || null,
    },
    client: {
      name: "",
      companyName: "",
      address: "",
      email: "",
      phone: "",
    },
    subject: documentType === "table_quotation" ? "Itemized quotation" : "Quotation for services",
    greeting: "Dear Client,",
    intro: "Thank you for giving us the opportunity to submit this quotation.",
    scope: "Scope of work / services can be edited directly here.",
    milestones: "Deliverables and milestones can be listed here.",
    closing: "We look forward to working with you.",
    items: createInitialItems(),
    subtotal: 0,
    discount: 0,
    otherCharges: 0,
    grandTotal: 0,
    amountInWords: getNumberWords(0, currency),
    notes: "",
    terms: defaultTerms,
  };
}

function useQuotationStyles() {
  const { theme, isDark } = useAppTheme();
  const styles = createStyles(theme, isDark);
  return { theme, styles, isDark };
}

export default function QuotationScreen() {
  const { theme, styles } = useQuotationStyles();
  const router = useRouter();
  const { editQuotationId, startType } = useLocalSearchParams<{ editQuotationId?: string; startType?: QuotationDocumentType }>();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [allQuotations, setAllQuotations] = useState<QuotationRecord[]>([]);
  const [previousQuotations, setPreviousQuotations] = useState<QuotationRecord[]>([]);
  const [previousFilter, setPreviousFilter] = useState<QuotationDocumentType>("standard_quotation");
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
  const totals = useMemo(() => (draftQuotation ? calculateQuotationTotals(draftQuotation) : null), [draftQuotation]);

  function appRoute(pathname: string, params?: Record<string, string>) {
    if (!isAppPreview) return params ? { pathname, params } : pathname;
    return { pathname, params: { ...params, appPreview: "1" } };
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateQuotationModule() {
      const savedProfile = await loadBusinessProfile(auth.currentUser);
      const [savedQuotations, selectedQuotations] = await Promise.all([
        loadQuotations(auth.currentUser, savedProfile, undefined, 500),
        loadQuotations(auth.currentUser, savedProfile, "standard_quotation", 50),
      ]);
      const editingQuotation = editQuotationId ? await loadQuotationById(auth.currentUser, savedProfile, editQuotationId) : null;

      if (isMounted) {
        setProfile(savedProfile);
        setAllQuotations(savedQuotations);
        setPreviousQuotations(selectedQuotations);
        if (editingQuotation?.status === "draft") setDraftQuotation(editingQuotation);
        if (!editingQuotation && (startType === "standard_quotation" || startType === "table_quotation")) {
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
      const quotations = await loadQuotations(auth.currentUser, profile, previousFilter, 50);
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

  function startQuotation(documentType: QuotationDocumentType) {
    setSelectorVisible(false);
    setFieldErrors([]);
    setDraftQuotation(buildDraftQuotation(documentType, profile, allQuotations));
  }

  function updateQuotationField<K extends keyof QuotationRecord>(field: K, value: QuotationRecord[K]) {
    setDraftQuotation((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateCompanyField<K extends keyof QuotationRecord["company"]>(field: K, value: QuotationRecord["company"][K]) {
    setDraftQuotation((current) => (current ? { ...current, company: { ...current.company, [field]: value } } : current));
  }

  function updateClientField<K extends keyof QuotationRecord["client"]>(field: K, value: QuotationRecord["client"][K]) {
    setDraftQuotation((current) => (current ? { ...current, client: { ...current.client, [field]: value } } : current));
  }

  function applySavedCustomer(customer: SavedCustomerProfile) {
    setDraftQuotation((current) => {
      if (!current) return current;
      return {
        ...current,
        client: {
          ...current.client,
          name: customer.name || current.client.name,
          companyName: customer.companyName || current.client.companyName,
          address: customer.address || current.client.address,
          phone: customer.phone || current.client.phone,
          email: customer.email || current.client.email,
        },
      };
    });
  }

  function addRow() {
    setDraftQuotation((current) => {
      if (!current) return current;
      return {
        ...current,
        items: [
          ...current.items,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            description: "",
            itemCode: "",
            quantity: "1",
            unit: "Nos",
            rate: "0",
            discount: "0",
          },
        ],
      };
    });
  }

  function updateRow(itemId: string, field: keyof QuotationItem, value: string) {
    setDraftQuotation((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
      };
    });
  }

  function deleteRow(itemId: string) {
    setDraftQuotation((current) => {
      if (!current || current.items.length === 1) return current;
      return { ...current, items: current.items.filter((item) => item.id !== itemId) };
    });
  }

  function moveRow(itemId: string, direction: -1 | 1) {
    setDraftQuotation((current) => {
      if (!current) return current;
      const index = current.items.findIndex((item) => item.id === itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.items.length) return current;
      const nextItems = [...current.items];
      const [item] = nextItems.splice(index, 1);
      nextItems.splice(nextIndex, 0, item);
      return { ...current, items: nextItems };
    });
  }

  function validateQuotation(quotation: QuotationRecord) {
    const errors: string[] = [];
    if (!quotation.quotationNumber.trim()) errors.push("Quotation number is required.");
    if (!quotation.quotationDate.trim()) errors.push("Quotation date is required.");
    if (!quotation.validUntil.trim()) errors.push("Valid-until date is required.");
    if (!quotation.client.name.trim()) errors.push("Client name is required.");
    if (!quotation.subject.trim() && !quotation.scope.trim()) errors.push("Subject or quotation description is required.");

    if (quotation.documentType === "table_quotation") {
      if (!quotation.items.length) errors.push("Add at least one item row.");
      quotation.items.forEach((item, index) => {
        if (!item.description.trim()) errors.push(`Item ${index + 1} needs a description.`);
        if (toNumber(item.quantity) <= 0) errors.push(`Item ${index + 1} quantity must be greater than 0.`);
        if (toNumber(item.rate) < 0) errors.push(`Item ${index + 1} rate cannot be negative.`);
      });
    }

    const nextTotals = calculateQuotationTotals(quotation);
    if (nextTotals.grandTotal < 0) errors.push("Grand total must be valid.");
    return errors;
  }

  function buildSavableQuotation(status: QuotationRecord["status"] = "draft") {
    if (!draftQuotation || !totals) return null;
    return {
      ...draftQuotation,
      status,
      subtotal: totals.subtotal,
      grandTotal: totals.grandTotal,
      amountInWords: getNumberWords(totals.grandTotal, currency),
    };
  }

  async function persistDraft({ goToPreview }: { goToPreview: boolean }) {
    const quotationToSave = buildSavableQuotation("draft");
    if (!quotationToSave) return;
    const errors = validateQuotation(quotationToSave);
    setFieldErrors(errors);
    if (errors.length) return;

    try {
      setSaving(true);
      const result = await saveQuotation(auth.currentUser, profile, quotationToSave);
      const [quotations, selectedQuotations] = await Promise.all([
        loadQuotations(auth.currentUser, profile, undefined, 500),
        loadQuotations(auth.currentUser, profile, previousFilter, 50),
      ]);
      setAllQuotations(quotations.length ? quotations : [result.quotation, ...allQuotations]);
      setPreviousQuotations(selectedQuotations.length ? selectedQuotations : [result.quotation, ...previousQuotations]);
      setDraftQuotation(goToPreview ? draftQuotation : null);

      if (goToPreview) {
        router.push(appRoute("/preview", { type: "quotation", quotationId: result.quotation.id || "" }) as never);
      } else {
        Alert.alert(`${getQuotationLabel(result.quotation.documentType)} Saved`, result.warning || "Your draft has been saved.");
      }
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "We could not save this quotation. Please try again.");
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
      Alert.alert("Quotation Finalized", `${getQuotationLabel(result.quotation.documentType)} is now final.`);
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
      setAllQuotations(quotations.length ? quotations : allQuotations.map((q) => (q.id === result.quotation.id ? result.quotation : q)));
      setPreviousQuotations(selectedQuotations.length ? selectedQuotations : previousQuotations.map((q) => (q.id === result.quotation.id ? result.quotation : q)));
      setShowCancelModal(null);
      Alert.alert("Quotation Cancelled", "This quotation has been marked as cancelled.");
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
      Alert.alert("Draft Deleted", "Quotation draft was deleted.");
    } catch (error: any) {
      Alert.alert("Delete Failed", error?.message || "Could not delete this draft.");
    } finally {
      setSaving(false);
    }
  }

  function handleDuplicate(quotation: QuotationRecord) {
    const copy = duplicateQuotationAsDraft(quotation, allQuotations, profile?.name);
    setDraftQuotation(copy);
  }

  function printQuotation() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
      return;
    }
    Alert.alert("Print", "Native PDF/print requires Expo print support; web print is available in this build.");
  }

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
              <ScrollView contentContainerStyle={[styles.editorContent, isWebsite && styles.webEditorContent, width < 820 && { minWidth: 0 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {fieldErrors.length ? (
                  <View style={styles.errorBox}>
                    {fieldErrors.map((error) => <Text key={error} style={styles.errorText}>{error}</Text>)}
                  </View>
                ) : null}

                <View style={
                  width < 820 ? {
                    width: baseWidth * scale,
                    height: baseHeight * scale,
                    overflow: "hidden",
                    justifyContent: "center",
                    alignItems: "center",
                    alignSelf: "center",
                  } : undefined
                }>
                  <View style={[
                    styles.a4Paper,
                    isDesktop && styles.webA4Paper,
                    width < 820 && {
                      transform: [{ scale: scale }],
                      transformOrigin: "top left",
                      width: baseWidth,
                      minHeight: baseHeight,
                    },
                  ]}>
                    <QuotationHeader quotation={draftQuotation} updateCompanyField={updateCompanyField} updateQuotationField={updateQuotationField} />

                    <View style={styles.recipientCard}>
                      <Text style={styles.cardTitle}>Client Information</Text>
                      <CustomerInlineField
                        label="Client Name"
                        value={draftQuotation.client.name}
                        onChangeText={(v) => updateClientField("name", v)}
                        onSelectCustomer={applySavedCustomer}
                        placeholder="Search or enter client name"
                      />
                      <InlineInput value={draftQuotation.client.companyName} onChangeText={(v) => updateClientField("companyName", v)} placeholder="Company Name (optional)" />
                      <InlineInput value={draftQuotation.client.address} onChangeText={(v) => updateClientField("address", v)} placeholder="Client Address" multiline />
                      <View style={styles.splitRow}>
                        <InlineInput value={draftQuotation.client.email} onChangeText={(v) => updateClientField("email", v)} placeholder="Email Address" textStyle={{ flex: 1 }} />
                        <InlineInput value={draftQuotation.client.phone} onChangeText={(v) => updateClientField("phone", v)} placeholder="Phone Number" textStyle={{ flex: 1 }} />
                      </View>
                    </View>

                    <View style={styles.sectionBlock}>
                      <Text style={styles.fieldLabel}>Subject / Title</Text>
                      <TextInput style={styles.subjectInput} value={draftQuotation.subject} onChangeText={(v) => updateQuotationField("subject", v)} placeholder="Quotation Subject" />
                    </View>

                    {!isTableQuotation ? (
                      <>
                        <View style={styles.sectionBlock}>
                          <Text style={styles.fieldLabel}>Greeting</Text>
                          <TextInput style={styles.standardInput} value={draftQuotation.greeting} onChangeText={(v) => updateQuotationField("greeting", v)} />
                        </View>
                        <View style={styles.sectionBlock}>
                          <Text style={styles.fieldLabel}>Introduction</Text>
                          <TextInput style={[styles.standardInput, styles.multilineInput]} value={draftQuotation.intro} onChangeText={(v) => updateQuotationField("intro", v)} multiline />
                        </View>
                        <View style={styles.sectionBlock}>
                          <Text style={styles.fieldLabel}>Scope of Work</Text>
                          <TextInput style={[styles.standardInput, styles.multilineInput]} value={draftQuotation.scope} onChangeText={(v) => updateQuotationField("scope", v)} multiline />
                        </View>
                        <View style={styles.sectionBlock}>
                          <Text style={styles.fieldLabel}>Milestones / Deliverables</Text>
                          <TextInput style={[styles.standardInput, styles.multilineInput]} value={draftQuotation.milestones} onChangeText={(v) => updateQuotationField("milestones", v)} multiline />
                        </View>
                      </>
                    ) : null}

                    {isTableQuotation ? (
                      <View style={styles.tableCard}>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableCol, { flex: 3 }]}>Item & Description</Text>
                          <Text style={[styles.tableCol, { width: 50, textAlign: "center" }]}>Qty</Text>
                          <Text style={[styles.tableCol, { width: 50, textAlign: "center" }]}>Unit</Text>
                          <Text style={[styles.tableCol, { width: 70, textAlign: "right" }]}>Rate</Text>
                          <Text style={[styles.tableCol, { width: 60, textAlign: "right" }]}>Disc.</Text>
                          <Text style={[styles.tableCol, { width: 80, textAlign: "right" }]}>Amount</Text>
                          <Text style={[styles.tableCol, { width: 40 }]} />
                        </View>
                        {draftQuotation.items.map((item, index) => (
                          <View key={item.id} style={styles.tableRow}>
                            <View style={{ flex: 3 }}>
                              <TextInput style={styles.rowInput} value={item.description} onChangeText={(v) => updateRow(item.id, "description", v)} placeholder="Description" />
                            </View>
                            <TextInput style={[styles.rowInput, { width: 50, textAlign: "center" }]} value={item.quantity} onChangeText={(v) => updateRow(item.id, "quantity", v)} keyboardType="decimal-pad" />
                            <TextInput style={[styles.rowInput, { width: 50, textAlign: "center" }]} value={item.unit} onChangeText={(v) => updateRow(item.id, "unit", v)} />
                            <TextInput style={[styles.rowInput, { width: 70, textAlign: "right" }]} value={item.rate} onChangeText={(v) => updateRow(item.id, "rate", v)} keyboardType="decimal-pad" />
                            <TextInput style={[styles.rowInput, { width: 60, textAlign: "right" }]} value={item.discount} onChangeText={(v) => updateRow(item.id, "discount", v)} keyboardType="decimal-pad" />
                            <Text style={[styles.rowAmount, { width: 80 }]}>{formatMoney(getQuotationItemAmount(item), currency)}</Text>
                            <Pressable style={styles.deleteRowBtn} onPress={() => deleteRow(item.id)}>
                              <Ionicons name="trash-outline" size={16} color={Colors.error} />
                            </Pressable>
                          </View>
                        ))}
                        <Pressable style={styles.addRowBtn} onPress={addRow}>
                          <Ionicons name="add" size={16} color={theme.orange} />
                          <Text style={{ color: theme.orange, fontWeight: "700", fontSize: 13 }}>Add Item</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    <View style={styles.totalsCard}>
                      <TotalRow label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
                      <EditableAmountRow label="Discount" value={`${draftQuotation.discount || ""}`} onChangeText={(v) => updateQuotationField("discount", toNumber(v))} currency={currency} />
                      <EditableAmountRow label="Other Charges" value={`${draftQuotation.otherCharges || ""}`} onChangeText={(v) => updateQuotationField("otherCharges", toNumber(v))} currency={currency} />
                      <TotalRow label="Grand Total" value={formatMoney(totals.grandTotal, currency)} strong />
                    </View>

                    <View style={styles.termsCard}>
                      <Text style={styles.cardTitle}>Terms & Conditions</Text>
                      <TextInput style={[styles.standardInput, styles.multilineInput]} value={draftQuotation.terms} onChangeText={(v) => updateQuotationField("terms", v)} multiline />
                    </View>

                    <DocumentFooter
                      phone={draftQuotation.company.phone}
                      email={draftQuotation.company.email}
                      website={draftQuotation.company.website}
                    />
                  </View>
                </View>
              </ScrollView>
            </View>

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

  return (
    <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.moduleContent, isWebsite && styles.webModuleContent]} showsVerticalScrollIndicator={false}>
          <View style={styles.moduleHeader}>
            <Pressable style={styles.headerButton} onPress={() => router.push(appRoute("/dashboard") as never)} accessibilityRole="button" accessibilityLabel="Dashboard">
              <Ionicons name="chevron-back" size={22} color={theme.ink} />
            </Pressable>
            <Text style={styles.moduleTitle}>Quotation</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Pressable style={styles.createButton} onPress={() => setSelectorVisible(true)}>
            <View style={styles.createIcon}><Ionicons name="reader-outline" size={24} color="#FFFFFF" /></View>
            <Text style={styles.createText}>Create New Quotation</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={styles.previousCard}>
            <View style={styles.previousHeader}>
              <Text style={styles.previousTitle}>Previous Quotations</Text>
              <Pressable style={styles.filterButton} onPress={() => setFilterOpen((value) => !value)}>
                <Text style={styles.filterButtonText}>{previousFilters.find((item) => item.type === previousFilter)?.label}</Text>
                <Ionicons name={filterOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.ink} />
              </Pressable>
            </View>

            {filterOpen ? (
              <View style={styles.filterMenu}>
                {previousFilters.map((filter) => (
                  <Pressable key={filter.type} style={[styles.filterOption, previousFilter === filter.type && styles.filterOptionActive]} onPress={() => { setPreviousFilter(filter.type); setFilterOpen(false); }}>
                    <Text style={[styles.filterOptionText, previousFilter === filter.type && styles.filterOptionTextActive]}>{filter.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {loading || historyLoading ? (
              <Text style={styles.emptyText}>Loading quotations...</Text>
            ) : previousQuotations.length ? (
              previousQuotations.map((quotation) => (
                <View key={quotation.id || quotation.quotationNumber} style={styles.previousRow}>
                  <Pressable style={styles.previousMain} onPress={() => router.push(appRoute("/preview", { type: "quotation", quotationId: quotation.id || "" }) as never)}>
                    <View style={styles.previousIcon}><Ionicons name={quotation.documentType === "table_quotation" ? "grid-outline" : "reader-outline"} size={18} color={theme.orange} /></View>
                    <View style={styles.previousCopy}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.previousNumber}>{quotation.quotationNumber}</Text>
                        <DocStatusBadge status={quotation.status} />
                      </View>
                      <Text style={styles.previousMeta}>{quotation.quotationDate} • Valid {quotation.validUntil} • {quotation.client.name || "Client"}</Text>
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
                <View style={styles.emptyIcon}><Ionicons name="reader-outline" size={28} color={theme.orange} /></View>
                <Text style={styles.emptyTitle}>No quotations created yet</Text>
                <Text style={styles.emptyText}>Saved {getQuotationLabel(previousFilter).toLowerCase()} records will appear here with number, client, amount, and status.</Text>
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
                <Pressable style={styles.closeButton} onPress={() => setSelectorVisible(false)}><Ionicons name="close" size={20} color={theme.ink} /></Pressable>
              </View>
              {quotationOptions.map((option) => (
                <Pressable key={option.type} style={styles.selectorOption} onPress={() => startQuotation(option.type)}>
                  <View style={styles.selectorIcon}><Ionicons name={option.icon} size={22} color={theme.orange} /></View>
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

function QuotationHeader({
  quotation,
  updateCompanyField,
  updateQuotationField,
}: {
  quotation: QuotationRecord;
  updateCompanyField: (field: keyof QuotationRecord["company"], value: string) => void;
  updateQuotationField: (field: keyof QuotationRecord, value: string | number) => void;
}) {
  return (
    <DocumentBrandHeader
      company={{
        name: quotation.company.name,
        address: quotation.company.address,
        phone: quotation.company.phone,
        email: quotation.company.email,
        website: quotation.company.website,
        logoUrl: quotation.company.logoUrl,
      }}
      documentTitle={getQuotationTitle(quotation.documentType).toUpperCase()}
      metaRows={[
        { label: "Quotation No.", value: quotation.quotationNumber, onChange: (v) => updateQuotationField("quotationNumber", v) },
        { label: "Date", value: quotation.quotationDate, onChange: (v) => updateQuotationField("quotationDate", v) },
        { label: "Valid Till", value: quotation.validUntil, onChange: (v) => updateQuotationField("validUntil", v) },
        { label: "Currency", value: quotation.currency, onChange: (v) => updateQuotationField("currency", v.toUpperCase()) },
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
  );
}

function InlineInput({ value, onChangeText, multiline, textStyle, placeholder }: { value: string; onChangeText: (value: string) => void; multiline?: boolean; textStyle?: object; placeholder?: string }) {
  const { styles } = useQuotationStyles();
  return <TextInput style={[styles.inlineInput, textStyle]} value={value} onChangeText={onChangeText} multiline={multiline} placeholder={placeholder} placeholderTextColor="#A0A0A0" />;
}

function MetaField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  const { styles } = useQuotationStyles();
  return (
    <View style={styles.metaField}>
      <Text style={styles.metaLabel}>{label}</Text>
      <TextInput style={styles.metaInput} value={value} onChangeText={onChangeText} />
    </View>
  );
}

function CellInput({ value, onChangeText, style, keyboardType }: { value: string; onChangeText: (value: string) => void; style: object; keyboardType?: "default" | "decimal-pad" }) {
  const { styles } = useQuotationStyles();
  return <TextInput style={[styles.tableCell, styles.cellInput, style]} value={value} onChangeText={onChangeText} keyboardType={keyboardType} />;
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { styles } = useQuotationStyles();
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, strong && styles.totalStrong]}>{label}</Text>
      <Text style={[styles.totalValue, strong && styles.totalStrong]}>{value}</Text>
    </View>
  );
}

function EditableAmountRow({ label, value, onChangeText, currency }: { label: string; value: string; onChangeText: (value: string) => void; currency: string }) {
  const { styles } = useQuotationStyles();
  return (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>{label}</Text>
      <View style={styles.editableTotalValue}>
        <Text style={styles.currencyPrefix}>{currency}</Text>
        <TextInput style={styles.totalInput} value={value} onChangeText={onChangeText} keyboardType="decimal-pad" />
      </View>
    </View>
  );
}

function AssetPreview({ label, uri }: { label: string; uri?: string | null }) {
  const { theme, styles } = useQuotationStyles();
  return (
    <View style={styles.assetBox}>
      <Text style={styles.assetLabel}>{label}</Text>
      {uri ? <Image source={{ uri }} style={styles.assetImage} contentFit="contain" /> : <Text style={styles.assetPlaceholder}>Not uploaded</Text>}
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

const createStyles = (theme: ThemePalette, isDark: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  webSafeArea: { backgroundColor: theme.wash },
  keyboardView: { flex: 1 },
  moduleContent: { alignSelf: "center", maxWidth: 680, padding: 18, width: "100%" },
  webModuleContent: { maxWidth: 1040, paddingHorizontal: 40, paddingBottom: 56, paddingTop: 38 },
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
  rowIconButton: { alignItems: "center", backgroundColor: theme.wash, borderColor: theme.line, borderRadius: 12, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
  disabledRowButton: { opacity: 0.65 },
  emptyState: { alignItems: "center", borderColor: theme.line, borderRadius: 18, borderStyle: "dashed", borderWidth: 1, paddingHorizontal: 18, paddingVertical: 34 },
  emptyIcon: { alignItems: "center", backgroundColor: theme.orangeSoft, borderRadius: 22, height: 56, justifyContent: "center", marginBottom: 14, width: 56 },
  emptyTitle: { color: theme.ink, fontSize: 17, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  emptyText: { color: theme.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  editorHeader: { alignItems: "center", backgroundColor: theme.card, borderBottomColor: theme.line, borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  editorTitle: { color: theme.ink, flex: 1, fontSize: 18, fontWeight: "800", textAlign: "center" },
  editorActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  saveButton: { backgroundColor: theme.orange, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 },
  saveButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  secondaryButton: { backgroundColor: theme.card, borderColor: theme.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  secondaryButtonText: { color: theme.ink, fontSize: 12, fontWeight: "800" },
  disabledButton: { opacity: 0.7 },
  phoneHorizontalWorkspace: { minWidth: 860 },
  editorContent: { alignSelf: "center", minWidth: 820, paddingHorizontal: 14, paddingBottom: 96, paddingTop: 14, width: "100%", backgroundColor: theme.background },
  webEditorContent: { maxWidth: 1120, paddingHorizontal: 40, paddingTop: 24 },
  errorBox: { alignSelf: "center", backgroundColor: "#FFF2F0", borderColor: "#FFD2CC", borderRadius: 12, borderWidth: 1, marginBottom: 12, maxWidth: 794, padding: 12, width: "100%" },
  errorText: { color: theme.orangeDark, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  a4Paper: { alignSelf: "center", aspectRatio: 210 / 297, backgroundColor: DocumentColors.paper, borderColor: DocumentColors.line, borderRadius: 2, borderWidth: 1, maxWidth: 794, minHeight: 1123, padding: 32, width: 794, ...shadow },
  webA4Paper: { width: 794 },
  clientGrid: { borderBottomColor: DocumentColors.line, borderBottomWidth: 1, flexDirection: "row", gap: 14, marginVertical: 12, paddingBottom: 12 },
  clientBox: { flex: 1 },
  metaBox: { gap: 8, width: 260 },
  sectionLabel: { color: DocumentColors.accent, fontSize: 11, fontWeight: "800", marginBottom: 7 },
  clientName: { color: DocumentColors.ink, fontSize: 14, fontWeight: "800", marginBottom: 4 },
  mutedInput: { color: DocumentColors.muted, fontSize: 11, lineHeight: 16 },
  metaField: { minWidth: 92 },
  metaLabel: { color: DocumentColors.muted, fontSize: 9, fontWeight: "800", marginBottom: 3, textTransform: "uppercase" },
  metaInput: { borderColor: DocumentColors.line, borderRadius: 4, borderWidth: 1, color: DocumentColors.ink, fontSize: 11, fontWeight: "700", minHeight: 28, paddingHorizontal: 6, paddingVertical: 4 },
  subjectBox: { borderBottomColor: DocumentColors.line, borderBottomWidth: 1, paddingVertical: 12 },
  subjectInput: { color: DocumentColors.ink, fontSize: 13, fontWeight: "700" },
  letterBody: { gap: 10, minHeight: 360, paddingVertical: 14 },
  bodyLine: { color: DocumentColors.ink, fontSize: 14, fontWeight: "800" },
  bodyParagraph: { color: DocumentColors.muted, fontSize: 13, lineHeight: 20 },
  inlineInput: { color: DocumentColors.ink, fontSize: 13, padding: 0 },
  textArea: { borderColor: DocumentColors.line, borderRadius: 4, borderWidth: 1, color: DocumentColors.muted, fontSize: 11, minHeight: 48, padding: 6, textAlignVertical: "top" },
  richTextArea: { borderColor: DocumentColors.line, borderRadius: 8, borderWidth: 1, color: DocumentColors.muted, fontSize: 13, lineHeight: 19, minHeight: 86, padding: 10, textAlignVertical: "top" },
  tableToolbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  addRowButton: { alignItems: "center", backgroundColor: DocumentColors.accent, borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  addRowText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  itemTable: { borderColor: DocumentColors.accent, borderRadius: 8, borderWidth: 1, minWidth: 728, overflow: "hidden" },
  itemRow: { flexDirection: "row" },
  itemHeaderRow: { backgroundColor: DocumentColors.accent },
  headerCell: { color: DocumentColors.tableHeaderText },
  tableCell: { borderRightColor: DocumentColors.line, borderRightWidth: 1, borderTopColor: DocumentColors.line, borderTopWidth: 1, color: DocumentColors.muted, fontSize: 10, fontWeight: "800", minHeight: 28, padding: 5 },
  serialCell: { textAlign: "center", width: 44 },
  descriptionCell: { width: 236 },
  codeCell: { width: 94 },
  smallCell: { textAlign: "center", width: 94 },
  amountCell: { width: 132 },
  actionCell: { borderRightWidth: 0, width: 56 },
  cellInput: { paddingVertical: 0 },
  amountText: { fontWeight: "800", textAlign: "right" },
  rowActions: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", paddingHorizontal: 4 },
  summaryArea: { borderBottomColor: "#222222", borderBottomWidth: 1.2, flexDirection: "row", gap: 0, paddingVertical: 0 },
  notesColumn: { borderRightColor: "#222222", borderRightWidth: 1.2, flex: 1.2, minHeight: 92, paddingHorizontal: 12, paddingVertical: 10 },
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
  closingBox: { borderRightColor: "#222222", borderRightWidth: 1.2, flex: 1.2, padding: 9 },
  signBox: { alignItems: "flex-end", flex: 1, justifyContent: "space-between", minHeight: 93, padding: 12 },
  signFor: { color: "#4A4A4A", fontSize: 14, fontWeight: "800", marginBottom: 8 },
  assetRow: { flexDirection: "row", gap: 8, width: "100%" },
  assetBox: { alignItems: "center", borderColor: "#EEEEEE", borderRadius: 4, borderWidth: 1, flex: 1, minHeight: 58, padding: 6 },
  assetLabel: { color: "#777777", fontSize: 9, fontWeight: "800", marginBottom: 3 },
  assetImage: { height: 38, width: "100%" },
  assetPlaceholder: { color: theme.muted, fontSize: 9 },
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
