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
  generateNextQuotationNumber,
  getQuotationItemAmount,
  getQuotationLabel,
  getQuotationTitle,
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
  if (status === "sent") return "Sent";
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
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
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
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

  function updateQuotationField(field: keyof QuotationRecord, value: string | number) {
    setDraftQuotation((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateCompanyField(field: keyof QuotationRecord["company"], value: string) {
    setDraftQuotation((current) => (current ? { ...current, company: { ...current.company, [field]: value } } : current));
  }

  function updateClientField(field: keyof QuotationRecord["client"], value: string) {
    setDraftQuotation((current) => (current ? { ...current, client: { ...current.client, [field]: value } } : current));
  }

  function updateItem(itemId: string, field: keyof QuotationItem, value: string) {
    setDraftQuotation((current) => {
      if (!current) return current;
      return { ...current, items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)) };
    });
  }

  function addRow() {
    setDraftQuotation((current) => {
      if (!current) return current;
      return { ...current, items: [...current.items, { ...createInitialItems()[0], id: `${Date.now()}-${current.items.length}` }] };
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

  function duplicateQuotation(quotation: QuotationRecord) {
    const { quotationNumber, numberingSequence } = generateNextQuotationNumber(quotation.documentType, profile?.name, allQuotations);
    setFieldErrors([]);
    setDraftQuotation({
      ...quotation,
      id: undefined,
      quotationNumber,
      numberingSequence,
      status: "draft",
      quotationDate: todayISO(),
      validUntil: validUntilISO(),
      createdAt: undefined,
      updatedAt: undefined,
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
              <View style={styles.editorActions}>
                <Pressable style={[styles.secondaryButton, saving && styles.disabledButton]} onPress={() => persistDraft({ goToPreview: false })} disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Save Draft</Text>
                </Pressable>
                <Pressable style={[styles.saveButton, saving && styles.disabledButton]} onPress={() => persistDraft({ goToPreview: true })} disabled={saving}>
                  <Text style={styles.saveButtonText}>Preview</Text>
                </Pressable>
              </View>
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
                      position: "absolute",
                    }
                  ]}>
                  <QuotationHeader quotation={draftQuotation} updateCompanyField={updateCompanyField} updateQuotationField={updateQuotationField} />
                  <View style={styles.clientGrid}>
                    <View style={styles.clientBox}>
                      <Text style={styles.sectionLabel}>Client Details</Text>
                      <InlineInput value={draftQuotation.client.name} onChangeText={(value) => updateClientField("name", value)} textStyle={styles.clientName} placeholder="Client Name" />
                      <InlineInput value={draftQuotation.client.companyName} onChangeText={(value) => updateClientField("companyName", value)} textStyle={styles.mutedInput} placeholder="Client Company" />
                      <InlineInput value={draftQuotation.client.address} onChangeText={(value) => updateClientField("address", value)} textStyle={styles.mutedInput} multiline placeholder="Client Address" />
                      <InlineInput value={draftQuotation.client.email} onChangeText={(value) => updateClientField("email", value)} textStyle={styles.mutedInput} placeholder="Client Email" />
                      <InlineInput value={draftQuotation.client.phone} onChangeText={(value) => updateClientField("phone", value)} textStyle={styles.mutedInput} placeholder="Client Phone" />
                    </View>
                    <View style={styles.metaBox}>
                      <MetaField label={`${getQuotationLabel(draftQuotation.documentType)} Number`} value={draftQuotation.quotationNumber} onChangeText={(value) => updateQuotationField("quotationNumber", value)} />
                      <MetaField label="Quotation Date" value={draftQuotation.quotationDate} onChangeText={(value) => updateQuotationField("quotationDate", value)} />
                      <MetaField label="Valid Until" value={draftQuotation.validUntil} onChangeText={(value) => updateQuotationField("validUntil", value)} />
                      <MetaField label="Currency" value={draftQuotation.currency} onChangeText={(value) => updateQuotationField("currency", value.toUpperCase())} />
                    </View>
                  </View>

                  <View style={styles.subjectBox}>
                    <Text style={styles.sectionLabel}>Subject / Reference</Text>
                    <InlineInput value={draftQuotation.subject} onChangeText={(value) => updateQuotationField("subject", value)} textStyle={styles.subjectInput} />
                  </View>

                  {isTableQuotation ? (
                    <>
                      <View style={styles.tableToolbar}>
                        <Text style={styles.sectionLabel}>Itemized Quotation</Text>
                        <Pressable style={styles.addRowButton} onPress={addRow}>
                          <Ionicons name="add" size={16} color="#FFFFFF" />
                          <Text style={styles.addRowText}>Add Row</Text>
                        </Pressable>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.itemTable}>
                          <View style={[styles.itemRow, styles.itemHeaderRow]}>
                            <Text style={[styles.tableCell, styles.serialCell]}>S.No.</Text>
                            <Text style={[styles.tableCell, styles.descriptionCell]}>Description of Goods / Services</Text>
                            <Text style={[styles.tableCell, styles.codeCell]}>Item Code</Text>
                            <Text style={[styles.tableCell, styles.smallCell]}>Qty</Text>
                            <Text style={[styles.tableCell, styles.smallCell]}>Unit</Text>
                            <Text style={[styles.tableCell, styles.smallCell]}>Rate</Text>
                            <Text style={[styles.tableCell, styles.smallCell]}>Discount</Text>
                            <Text style={[styles.tableCell, styles.amountCell]}>Amount</Text>
                            <Text style={[styles.tableCell, styles.actionCell]} />
                          </View>
                          {draftQuotation.items.map((item, index) => (
                            <View key={item.id} style={styles.itemRow}>
                              <Text style={[styles.tableCell, styles.serialCell]}>{index + 1}</Text>
                              <CellInput value={item.description} onChangeText={(value) => updateItem(item.id, "description", value)} style={styles.descriptionCell} />
                              <CellInput value={item.itemCode || ""} onChangeText={(value) => updateItem(item.id, "itemCode", value)} style={styles.codeCell} />
                              <CellInput value={item.quantity} onChangeText={(value) => updateItem(item.id, "quantity", value)} style={styles.smallCell} keyboardType="decimal-pad" />
                              <CellInput value={item.unit} onChangeText={(value) => updateItem(item.id, "unit", value)} style={styles.smallCell} />
                              <CellInput value={item.rate} onChangeText={(value) => updateItem(item.id, "rate", value)} style={styles.smallCell} keyboardType="decimal-pad" />
                              <CellInput value={item.discount} onChangeText={(value) => updateItem(item.id, "discount", value)} style={styles.smallCell} keyboardType="decimal-pad" />
                              <Text style={[styles.tableCell, styles.amountCell, styles.amountText]}>{formatMoney(getQuotationItemAmount(item), currency)}</Text>
                              <View style={[styles.tableCell, styles.actionCell, styles.rowActions]}>
                                <Pressable onPress={() => moveRow(item.id, -1)} disabled={index === 0}><Ionicons name="chevron-up" size={15} color={index === 0 ? "#CFCFCF" : theme.muted} /></Pressable>
                                <Pressable onPress={() => moveRow(item.id, 1)} disabled={index === draftQuotation.items.length - 1}><Ionicons name="chevron-down" size={15} color={index === draftQuotation.items.length - 1 ? "#CFCFCF" : theme.muted} /></Pressable>
                                <Pressable onPress={() => deleteRow(item.id)}><Ionicons name="trash-outline" size={16} color={theme.error} /></Pressable>
                              </View>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </>
                  ) : (
                    <View style={styles.letterBody}>
                      <InlineInput value={draftQuotation.greeting} onChangeText={(value) => updateQuotationField("greeting", value)} textStyle={styles.bodyLine} />
                      <InlineInput value={draftQuotation.intro} onChangeText={(value) => updateQuotationField("intro", value)} textStyle={styles.bodyParagraph} multiline />
                      <Text style={styles.sectionLabel}>Scope of Work / Services</Text>
                      <TextInput style={styles.richTextArea} value={draftQuotation.scope} onChangeText={(value) => updateQuotationField("scope", value)} multiline />
                      <Text style={styles.sectionLabel}>Milestones / Deliverables</Text>
                      <TextInput style={styles.richTextArea} value={draftQuotation.milestones} onChangeText={(value) => updateQuotationField("milestones", value)} multiline />
                    </View>
                  )}

                  <View style={styles.summaryArea}>
                    <View style={styles.notesColumn}>
                      <Text style={styles.sectionLabel}>Notes</Text>
                      <TextInput style={styles.textArea} value={draftQuotation.notes} onChangeText={(value) => updateQuotationField("notes", value)} multiline />
                      <Text style={styles.sectionLabel}>Terms & Conditions</Text>
                      <TextInput style={styles.textArea} value={draftQuotation.terms} onChangeText={(value) => updateQuotationField("terms", value)} multiline />
                    </View>
                    <View style={styles.totalsBox}>
                      <TotalRow label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
                      <EditableAmountRow label="Discount" value={String(draftQuotation.discount)} onChangeText={(value) => updateQuotationField("discount", toNumber(value))} currency={currency} />
                      <EditableAmountRow label="Other Charges" value={String(draftQuotation.otherCharges)} onChangeText={(value) => updateQuotationField("otherCharges", toNumber(value))} currency={currency} />
                      <View style={styles.totalDivider} />
                      <TotalRow label="Grand Total" value={formatMoney(totals.grandTotal, currency)} strong />
                      <Text style={styles.wordsLabel}>Amount in Words</Text>
                      <TextInput style={styles.wordsInput} value={draftQuotation.amountInWords || getNumberWords(totals.grandTotal, currency)} onChangeText={(value) => updateQuotationField("amountInWords", value)} multiline />
                    </View>
                  </View>

                  <View style={styles.signatureArea}>
                    <View style={styles.closingBox}>
                      <TextInput style={styles.textArea} value={draftQuotation.closing} onChangeText={(value) => updateQuotationField("closing", value)} multiline />
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
                </View>
              </View>
              </ScrollView>
            </View>
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
                      <Text style={styles.previousNumber}>{quotation.quotationNumber}</Text>
                      <Text style={styles.previousMeta}>{quotation.quotationDate} • Valid {quotation.validUntil} • {quotation.client.name || "Client"} • {getStatusLabel(quotation.status)}</Text>
                    </View>
                    <Text style={styles.previousAmount}>{formatMoney(quotation.grandTotal, quotation.currency)}</Text>
                  </Pressable>
                  <View style={styles.previousActions}>
                    <Pressable style={styles.rowIconButton} onPress={() => router.push(appRoute("/preview", { type: "quotation", quotationId: quotation.id || "" }) as never)}><Ionicons name="eye-outline" size={17} color={theme.muted} /></Pressable>
                    {quotation.status === "draft" ? <Pressable style={styles.rowIconButton} onPress={() => setDraftQuotation(quotation)}><Ionicons name="create-outline" size={17} color={theme.muted} /></Pressable> : null}
                    <Pressable style={styles.rowIconButton} onPress={() => duplicateQuotation(quotation)}><Ionicons name="copy-outline" size={17} color={theme.muted} /></Pressable>
                    {quotation.status === "accepted" ? <Pressable style={[styles.rowIconButton, styles.disabledRowButton]} disabled><Ionicons name="swap-horizontal-outline" size={17} color="#B8B8B8" /></Pressable> : null}
                    <Pressable style={styles.rowIconButton} onPress={printQuotation}><Ionicons name="print-outline" size={17} color={theme.muted} /></Pressable>
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

        <Modal transparent visible={selectorVisible} animationType={isPhone ? "slide" : "fade"} onRequestClose={() => setSelectorVisible(false)}>
          <View style={[styles.selectorOverlay, isPhone && styles.selectorOverlayPhone]}>
            <View style={[styles.selectorModal, isPhone && styles.selectorSheet]}>
              <View style={styles.selectorHeader}>
                <View>
                  <Text style={styles.selectorTitle}>Create New Quotation</Text>
                  <Text style={styles.selectorSubtitle}>Choose the quotation format you want to create.</Text>
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
  const { styles } = useQuotationStyles();
  return (
    <View style={styles.quotationHeader}>
      <View style={styles.logoBox}>
        {quotation.company.logoUrl ? <Image source={{ uri: quotation.company.logoUrl }} style={styles.logoImage} contentFit="contain" /> : <Text style={styles.logoInitials}>{getCompanyInitials(quotation.company.name)}</Text>}
      </View>
      <View style={styles.companyBlock}>
        <InlineInput value={quotation.company.name} onChangeText={(value) => updateCompanyField("name", value)} textStyle={styles.companyName} />
        <InlineInput value={quotation.company.address} onChangeText={(value) => updateCompanyField("address", value)} textStyle={styles.companyAddress} multiline />
        <InlineInput value={quotation.company.email} onChangeText={(value) => updateCompanyField("email", value)} textStyle={styles.companyMeta} />
        <InlineInput value={quotation.company.phone} onChangeText={(value) => updateCompanyField("phone", value)} textStyle={styles.companyMeta} />
        <InlineInput value={quotation.company.website} onChangeText={(value) => updateCompanyField("website", value)} textStyle={styles.companyMeta} />
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.documentTitle}>{getQuotationTitle(quotation.documentType)}</Text>
        <TextInput style={styles.validityMiniInput} value={quotation.validUntil} onChangeText={(value) => updateQuotationField("validUntil", value)} />
      </View>
    </View>
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
});
