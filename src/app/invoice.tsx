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
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BusinessProfile, loadBusinessProfile } from "@/services/business-profile";
import {
  calculateDocumentTotals,
  DocumentType,
  generateNextDocumentNumber,
  getDocumentLabel,
  getDocumentTitle,
  getLineAmount,
  InvoiceItem,
  InvoiceRecord,
  loadInvoiceById,
  loadInvoices,
  saveInvoice,
} from "@/services/invoices";
import { Colors } from "@/theme/colors";

const documentOptions: { type: DocumentType; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    type: "tax_invoice",
    title: "Tax Invoice",
    description: "Create an invoice with applicable tax details.",
    icon: "receipt-outline",
  },
  {
    type: "bill_of_supply",
    title: "Bill of Supply",
    description: "Create a bill without charging GST/tax separately.",
    icon: "document-text-outline",
  },
];

const previousFilters: { type: DocumentType; label: string }[] = [
  { type: "tax_invoice", label: "Previous Tax Invoices" },
  { type: "bill_of_supply", label: "Previous Bills of Supply" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dueDateISO() {
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
  const parts = [
    profile?.address,
    profile?.city,
    profile?.stateProvince,
    profile?.zipCode,
    profile?.country,
  ].filter(Boolean);

  return parts.join(", ");
}

function getMetaValue(profile: BusinessProfile | null, key: string) {
  return profile?.taxFields?.[key] || profile?.countryMeta?.taxIdentifiers?.[key] || "";
}

function getBankValue(profile: BusinessProfile | null, keys: string[]) {
  const details = profile?.countryMeta?.bankDetails || {};
  const match = keys.find((key) => details[key]);
  return match ? String(details[match]) : "";
}

function createInitialItems(documentType: DocumentType): InvoiceItem[] {
  return [
    {
      id: `${Date.now()}`,
      item: documentType === "bill_of_supply" ? "Supply" : "Service",
      description: "Description of goods / services",
      ssnCode: "",
      hsnSac: "9983",
      quantity: "1",
      rate: "0",
      discount: "0",
      tax: documentType === "tax_invoice" ? "0" : undefined,
    },
  ];
}

function buildDraftDocument(documentType: DocumentType, profile: BusinessProfile | null, invoices: InvoiceRecord[]): InvoiceRecord {
  const currency = profile?.defaultCurrency || profile?.currencyCode || "INR";
  const { documentNumber, numberingSequence } = generateNextDocumentNumber(documentType, invoices);
  const isTaxInvoice = documentType === "tax_invoice";
  const defaultTerms = profile?.countryMeta?.documentDefaults?.terms || "Payment is due as per the agreed terms.";

  return {
    documentType,
    documentNumber,
    invoiceNumber: documentNumber,
    numberingSequence,
    invoiceTitle: getDocumentTitle(documentType),
    invoiceDate: todayISO(),
    dueDate: dueDateISO(),
    status: "draft",
    taxMode: isTaxInvoice ? "CGST + SGST" : "No GST",
    businessProfileSnapshot: profile,
    company: {
      logoUrl: profile?.branding?.logoUrl || null,
      name: profile?.name || "Your Company Name",
      address: getCompanyAddress(profile) || "Company address",
      email: profile?.email || "business@example.com",
      phone: profile?.phone || "Business phone",
      website: profile?.website || "",
      country: profile?.country || "India",
      state: profile?.stateProvince || "",
      stateCode: getMetaValue(profile, "stateCode"),
      pin: profile?.zipCode || "",
      currency,
      taxRegistrationNumber: profile?.taxRegistrationNumber || getMetaValue(profile, "gstin"),
      pan: getMetaValue(profile, "pan"),
      stampUrl: profile?.branding?.stampUrl || null,
      signatureUrl: profile?.branding?.signatureUrl || null,
    },
    customer: {
      name: "",
      phone: "",
      email: "",
      address: "",
      state: "",
      stateCode: "",
      pin: "",
      gstin: "",
    },
    bank: {
      bankName: getBankValue(profile, ["bankName", "bank_name", "name"]),
      accountNumber: getBankValue(profile, ["accountNumber", "account_number", "account"]),
      ifscCode: getBankValue(profile, ["ifscCode", "ifsc", "ifsc_code"]),
      branchAddress: getBankValue(profile, ["branchAddress", "branch", "branch_address"]),
    },
    items: createInitialItems(documentType),
    notes: "",
    terms: defaultTerms,
    discount: 0,
    freightCharges: 0,
    cgstPercent: isTaxInvoice ? 9 : 0,
    sgstPercent: isTaxInvoice ? 9 : 0,
    igstPercent: isTaxInvoice ? 18 : 0,
    subtotal: 0,
    taxableValue: 0,
    taxTotal: 0,
    grandTotal: 0,
    amountInWords: getNumberWords(0, currency),
  };
}

function getStatusLabel(status: InvoiceRecord["status"]) {
  if (status === "paid") return "Paid";
  if (status === "pending") return "Pending";
  return "Draft";
}

export default function InvoiceScreen() {
  const router = useRouter();
  const { editInvoiceId } = useLocalSearchParams<{ editInvoiceId?: string }>();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [allDocuments, setAllDocuments] = useState<InvoiceRecord[]>([]);
  const [previousDocuments, setPreviousDocuments] = useState<InvoiceRecord[]>([]);
  const [previousFilter, setPreviousFilter] = useState<DocumentType>("tax_invoice");
  const [draftDocument, setDraftDocument] = useState<InvoiceRecord | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const { width, isWebsite, isDesktop, isAppPreview } = useResponsiveLayout();
  const isPhone = width < 640;

  const currency = draftDocument?.company.currency || profile?.defaultCurrency || "INR";
  const isTaxDocument = draftDocument?.documentType === "tax_invoice";
  const totals = useMemo(() => (
    draftDocument ? calculateDocumentTotals(draftDocument) : null
  ), [draftDocument]);

  function appRoute(pathname: string, params?: Record<string, string>) {
    if (!isAppPreview) {
      return params ? { pathname, params } : pathname;
    }

    return { pathname, params: { ...params, appPreview: "1" } };
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateInvoiceModule() {
      const savedProfile = await loadBusinessProfile(auth.currentUser);
      const [savedDocuments, selectedDocuments] = await Promise.all([
        loadInvoices(auth.currentUser, savedProfile, undefined, 500),
        loadInvoices(auth.currentUser, savedProfile, "tax_invoice", 50),
      ]);
      const editingDocument = editInvoiceId
        ? await loadInvoiceById(auth.currentUser, savedProfile, editInvoiceId)
        : null;

      if (isMounted) {
        setProfile(savedProfile);
        setAllDocuments(savedDocuments);
        setPreviousDocuments(selectedDocuments);
        if (editingDocument?.status === "draft") {
          setDraftDocument(editingDocument);
        }
        setLoading(false);
      }
    }

    hydrateInvoiceModule();

    return () => {
      isMounted = false;
    };
  }, [editInvoiceId]);

  useEffect(() => {
    let isMounted = true;

    async function loadFilteredHistory() {
      if (loading) return;

      setHistoryLoading(true);
      const documents = await loadInvoices(auth.currentUser, profile, previousFilter, 50);
      if (isMounted) {
        setPreviousDocuments(documents);
        setHistoryLoading(false);
      }
    }

    loadFilteredHistory();

    return () => {
      isMounted = false;
    };
  }, [loading, previousFilter, profile]);

  function startDocument(documentType: DocumentType) {
    setSelectorVisible(false);
    setFieldErrors([]);
    setDraftDocument(buildDraftDocument(documentType, profile, allDocuments));
  }

  function updateDocumentField(field: keyof InvoiceRecord, value: string | number) {
    setDraftDocument((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateCompanyField(field: keyof InvoiceRecord["company"], value: string) {
    setDraftDocument((current) => (
      current ? { ...current, company: { ...current.company, [field]: value } } : current
    ));
  }

  function updateCustomerField(field: keyof InvoiceRecord["customer"], value: string) {
    setDraftDocument((current) => (
      current ? { ...current, customer: { ...current.customer, [field]: value } } : current
    ));
  }

  function updateBankField(field: keyof InvoiceRecord["bank"], value: string) {
    setDraftDocument((current) => (
      current ? { ...current, bank: { ...current.bank, [field]: value } } : current
    ));
  }

  function updateNumberField(field: "discount" | "freightCharges" | "cgstPercent" | "sgstPercent" | "igstPercent", value: string) {
    setDraftDocument((current) => (current ? { ...current, [field]: toNumber(value) } : current));
  }

  function updateItem(itemId: string, field: keyof InvoiceItem, value: string) {
    setDraftDocument((current) => {
      if (!current) return current;

      return {
        ...current,
        items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
      };
    });
  }

  function addRow() {
    setDraftDocument((current) => {
      if (!current) return current;

      return {
        ...current,
        items: [
          ...current.items,
          {
            id: `${Date.now()}-${current.items.length}`,
            item: "New Item",
            description: "Description",
            ssnCode: "",
            quantity: "1",
            rate: "0",
            discount: "0",
            tax: current.documentType === "tax_invoice" ? "0" : undefined,
            hsnSac: "",
          },
        ],
      };
    });
  }

  function deleteRow(itemId: string) {
    setDraftDocument((current) => {
      if (!current || current.items.length === 1) return current;

      return {
        ...current,
        items: current.items.filter((item) => item.id !== itemId),
      };
    });
  }

  function moveRow(itemId: string, direction: -1 | 1) {
    setDraftDocument((current) => {
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

  function validateDocument(document: InvoiceRecord) {
    const errors: string[] = [];

    if (!document.documentNumber.trim()) errors.push("Document number is required.");
    if (!document.invoiceDate.trim()) errors.push("Document date is required.");
    if (!document.company.name.trim()) errors.push("Business name is required.");
    if (!document.company.address.trim()) errors.push("Business address is required.");
    if (!document.customer.name.trim()) errors.push("Recipient name is required.");
    if (!document.items.length) errors.push("Add at least one item row.");

    document.items.forEach((item, index) => {
      if (!item.description.trim() && !item.item.trim()) errors.push(`Item ${index + 1} needs a description.`);
      if (toNumber(item.quantity) <= 0) errors.push(`Item ${index + 1} quantity must be greater than 0.`);
      if (toNumber(item.rate) < 0) errors.push(`Item ${index + 1} rate cannot be negative.`);
    });

    if (document.documentType === "tax_invoice") {
      if (document.taxMode === "CGST + SGST" && (document.cgstPercent < 0 || document.sgstPercent < 0)) {
        errors.push("CGST and SGST values must be valid.");
      }
      if (document.taxMode === "IGST" && document.igstPercent < 0) {
        errors.push("IGST value must be valid.");
      }
    }

    return errors;
  }

  function buildSavableDocument(status: InvoiceRecord["status"] = "draft") {
    if (!draftDocument || !totals) return null;

    return {
      ...draftDocument,
      status,
      invoiceNumber: draftDocument.documentNumber,
      subtotal: totals.subtotal,
      taxableValue: totals.taxableValue,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      amountInWords: getNumberWords(totals.grandTotal, currency),
    };
  }

  async function persistDraft({ goToPreview }: { goToPreview: boolean }) {
    const documentToSave = buildSavableDocument("draft");
    if (!documentToSave) return;

    const errors = validateDocument(documentToSave);
    setFieldErrors(errors);
    if (errors.length) return;

    try {
      setSaving(true);
      const result = await saveInvoice(auth.currentUser, profile, documentToSave);
      const [documents, selectedDocuments] = await Promise.all([
        loadInvoices(auth.currentUser, profile, undefined, 500),
        loadInvoices(auth.currentUser, profile, previousFilter, 50),
      ]);

      setAllDocuments(documents.length ? documents : [result.invoice, ...allDocuments]);
      setPreviousDocuments(selectedDocuments.length ? selectedDocuments : [result.invoice, ...previousDocuments]);
      setDraftDocument(goToPreview ? draftDocument : null);

      if (goToPreview) {
        router.push(appRoute("/preview", { type: "invoice", invoiceId: result.invoice.id || "" }) as never);
      } else {
        Alert.alert(
          `${getDocumentLabel(result.invoice.documentType)} Saved`,
          result.source === "firebase"
            ? "Your draft has been saved."
            : result.warning || "Your draft has been saved locally on this device."
        );
      }
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "We could not save this document. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function printDocument(document: InvoiceRecord) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
      return;
    }

    Alert.alert("Print", `${getDocumentLabel(document.documentType)} printing is available from the web preview in this build.`);
  }

  function editDocument(document: InvoiceRecord) {
    setFieldErrors([]);
    setDraftDocument(document);
  }

  if (draftDocument && totals) {
    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.editorHeader}>
            <Pressable style={styles.headerButton} onPress={() => setDraftDocument(null)} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.editorTitle}>{getDocumentLabel(draftDocument.documentType)}</Text>
            <View style={styles.editorActions}>
              <Pressable style={[styles.secondaryButton, saving && styles.disabledButton]} onPress={() => persistDraft({ goToPreview: false })} disabled={saving}>
                <Text style={styles.secondaryButtonText}>Save Draft</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, saving && styles.disabledButton]} onPress={() => persistDraft({ goToPreview: true })} disabled={saving}>
                <Text style={styles.saveButtonText}>Preview</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            horizontal={isPhone}
            contentContainerStyle={isPhone ? styles.phoneHorizontalWorkspace : undefined}
            showsHorizontalScrollIndicator={isPhone}
          >
            <ScrollView contentContainerStyle={[styles.editorContent, isWebsite && styles.webEditorContent]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {fieldErrors.length ? (
                <View style={styles.errorBox}>
                  {fieldErrors.map((error) => (
                    <Text key={error} style={styles.errorText}>{error}</Text>
                  ))}
                </View>
              ) : null}

              <View style={[styles.a4Paper, isDesktop && styles.webA4Paper]}>
                <View style={styles.topStrip}>
                  <View style={styles.stripBlock}>
                    <InlineInput value={`GSTIN: ${draftDocument.company.taxRegistrationNumber}`} onChangeText={(value) => updateCompanyField("taxRegistrationNumber", value.replace(/^GSTIN:\s*/i, ""))} textStyle={styles.stripText} />
                    <InlineInput value={`PAN: ${draftDocument.company.pan || ""}`} onChangeText={(value) => updateCompanyField("pan", value.replace(/^PAN:\s*/i, ""))} textStyle={styles.stripText} />
                  </View>
                  <Text style={styles.documentTitle}>{getDocumentTitle(draftDocument.documentType)}</Text>
                  <View style={styles.stripBlockRight}>
                    <InlineInput value={draftDocument.company.phone} onChangeText={(value) => updateCompanyField("phone", value)} textStyle={styles.stripTextRight} />
                    <InlineInput value={draftDocument.company.email} onChangeText={(value) => updateCompanyField("email", value)} textStyle={styles.stripTextRight} />
                  </View>
                </View>

                <View style={styles.companyPanel}>
                  {draftDocument.company.logoUrl ? (
                    <View style={styles.logoBox}>
                      <Image source={{ uri: draftDocument.company.logoUrl }} style={styles.logoImage} contentFit="contain" />
                    </View>
                  ) : null}
                  <View style={styles.companyBlock}>
                    <InlineInput value={draftDocument.company.name} onChangeText={(value) => updateCompanyField("name", value)} textStyle={styles.companyName} />
                    <InlineInput value={`Office : ${draftDocument.company.address}`} onChangeText={(value) => updateCompanyField("address", value.replace(/^Office\s*:\s*/i, ""))} multiline textStyle={styles.companyAddress} />
                    <InlineInput value={`Email: ${draftDocument.company.email}`} onChangeText={(value) => updateCompanyField("email", value.replace(/^Email:\s*/i, ""))} textStyle={styles.companyEmail} />
                  </View>
                </View>

                <View style={styles.partiesGrid}>
                  <View style={styles.partyBox}>
                    <Text style={styles.sectionLabel}>Recipient Detail :</Text>
                    <DottedField label="Name" value={draftDocument.customer.name} onChangeText={(value) => updateCustomerField("name", value)} />
                    <DottedField label="Address" value={draftDocument.customer.address} onChangeText={(value) => updateCustomerField("address", value)} />
                    <View style={styles.recipientLine}>
                      <DottedField label="State" value={draftDocument.customer.state || ""} onChangeText={(value) => updateCustomerField("state", value)} compact />
                      <DottedField label="State Code" value={draftDocument.customer.stateCode || ""} onChangeText={(value) => updateCustomerField("stateCode", value)} compact />
                      <DottedField label="PIN" value={draftDocument.customer.pin || ""} onChangeText={(value) => updateCustomerField("pin", value)} compact />
                    </View>
                    {isTaxDocument ? <BoxedGstinField value={draftDocument.customer.gstin || ""} onChangeText={(value) => updateCustomerField("gstin", value)} /> : null}
                  </View>
                  <View style={styles.invoiceInfoBox}>
                    <DottedField label={isTaxDocument ? "Invoice Serial No." : "Bill Serial No."} value={draftDocument.documentNumber} onChangeText={(value) => updateDocumentField("documentNumber", value)} />
                    <DottedField label="Invoice Date" value={draftDocument.invoiceDate} onChangeText={(value) => updateDocumentField("invoiceDate", value)} />
                    <DottedField label="Time" value={new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} onChangeText={() => undefined} />
                    <DottedField label="Currency" value={draftDocument.company.currency} onChangeText={(value) => updateCompanyField("currency", value.toUpperCase())} />
                  </View>
                </View>

                {isTaxDocument ? (
                  <View style={styles.taxModeRow}>
                    {(["No GST", "CGST + SGST", "IGST"] as const).map((taxMode) => (
                      <Pressable
                        key={taxMode}
                        style={[styles.taxModePill, draftDocument.taxMode === taxMode && styles.taxModePillActive]}
                        onPress={() => setDraftDocument((current) => (current ? { ...current, taxMode } : current))}
                      >
                        <Text style={[styles.taxModeText, draftDocument.taxMode === taxMode && styles.taxModeTextActive]}>{taxMode}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <View style={styles.tableToolbar}>
                  <Text style={styles.sectionLabel}>Line Items</Text>
                  <Pressable style={styles.addRowButton} onPress={addRow}>
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.addRowText}>Add Row</Text>
                  </Pressable>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.itemTable}>
                    <View style={[styles.itemRow, styles.itemHeaderRow]}>
                      <Text style={[styles.tableCell, styles.serialCell]}>S.No.</Text>
                      <Text style={[styles.tableCell, styles.itemCell]}>Description of Goods / Services</Text>
                      <Text style={[styles.tableCell, styles.codeCell]}>SSN{"\n"}CODE</Text>
                      <Text style={[styles.tableCell, styles.codeCell]}>HSN{"\n"}CODE</Text>
                      <Text style={[styles.tableCell, styles.smallCell]}>Qty</Text>
                      <Text style={[styles.tableCell, styles.smallCell]}>Rate</Text>
                      <Text style={[styles.tableCell, styles.amountCell]}>VALUE{"\n"}Rs.        P.</Text>
                      <Text style={[styles.tableCell, styles.actionCell]} />
                    </View>

                    {draftDocument.items.map((item, index) => (
                      <View key={item.id} style={styles.itemRow}>
                        <Text style={[styles.tableCell, styles.serialCell]}>{index + 1}</Text>
                        <CellInput value={item.description} onChangeText={(value) => updateItem(item.id, "description", value)} style={styles.itemCell} />
                        <CellInput value={item.ssnCode || ""} onChangeText={(value) => updateItem(item.id, "ssnCode", value)} style={styles.codeCell} />
                        <CellInput value={item.hsnSac || ""} onChangeText={(value) => updateItem(item.id, "hsnSac", value)} style={styles.codeCell} />
                        <CellInput value={item.quantity} onChangeText={(value) => updateItem(item.id, "quantity", value)} style={styles.smallCell} keyboardType="decimal-pad" />
                        <CellInput value={item.rate} onChangeText={(value) => updateItem(item.id, "rate", value)} style={styles.smallCell} keyboardType="decimal-pad" />
                        <Text style={[styles.tableCell, styles.amountCell, styles.amountText]}>{formatMoney(getLineAmount(item), currency)}</Text>
                        <View style={[styles.tableCell, styles.actionCell, styles.rowActions]}>
                          <Pressable onPress={() => moveRow(item.id, -1)} disabled={index === 0}>
                            <Ionicons name="chevron-up" size={15} color={index === 0 ? "#CFCFCF" : Colors.textSecondary} />
                          </Pressable>
                          <Pressable onPress={() => moveRow(item.id, 1)} disabled={index === draftDocument.items.length - 1}>
                            <Ionicons name="chevron-down" size={15} color={index === draftDocument.items.length - 1 ? "#CFCFCF" : Colors.textSecondary} />
                          </Pressable>
                          <Pressable onPress={() => deleteRow(item.id)}>
                            <Ionicons name="trash-outline" size={16} color={Colors.error} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                    {Array.from({ length: Math.max(0, 12 - draftDocument.items.length) }).map((_, index) => (
                      <View key={`blank-${index}`} style={styles.itemRow}>
                        <Text style={[styles.tableCell, styles.serialCell]} />
                        <Text style={[styles.tableCell, styles.itemCell]} />
                        <Text style={[styles.tableCell, styles.codeCell]} />
                        <Text style={[styles.tableCell, styles.codeCell]} />
                        <Text style={[styles.tableCell, styles.smallCell]} />
                        <Text style={[styles.tableCell, styles.smallCell]} />
                        <Text style={[styles.tableCell, styles.amountCell]} />
                        <Text style={[styles.tableCell, styles.actionCell]} />
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.summaryArea}>
                  <View style={styles.bankTermsColumn}>
                    <View style={styles.bankBox}>
                      <Text style={styles.sectionLabel}>Bank Details</Text>
                      <MetaField label="Bank Name" value={draftDocument.bank.bankName} onChangeText={(value) => updateBankField("bankName", value)} />
                      <MetaField label="Account Number" value={draftDocument.bank.accountNumber} onChangeText={(value) => updateBankField("accountNumber", value)} />
                      <MetaField label="IFSC" value={draftDocument.bank.ifscCode} onChangeText={(value) => updateBankField("ifscCode", value)} />
                      <MetaField label="Branch" value={draftDocument.bank.branchAddress} onChangeText={(value) => updateBankField("branchAddress", value)} />
                    </View>
                    <View style={styles.textAreaBlock}>
                      <Text style={styles.sectionLabel}>Terms & Conditions</Text>
                      <TextInput style={styles.textArea} value={draftDocument.terms} onChangeText={(value) => updateDocumentField("terms", value)} multiline />
                    </View>
                  </View>

                  <View style={styles.totalsBox}>
                    <TotalRow label={isTaxDocument ? "Total Value Before Tax" : "Subtotal"} value={formatMoney(totals.subtotal, currency)} />
                    <EditableAmountRow label="Discount" value={String(draftDocument.discount)} onChangeText={(value) => updateNumberField("discount", value)} currency={currency} />
                    <EditableAmountRow label="Freight / Other Charges" value={String(draftDocument.freightCharges)} onChangeText={(value) => updateNumberField("freightCharges", value)} currency={currency} />
                    <TotalRow label={isTaxDocument ? "Taxable Value" : "Total"} value={formatMoney(totals.taxableValue, currency)} />
                    {isTaxDocument && draftDocument.taxMode === "CGST + SGST" ? (
                      <>
                        <EditablePercentRow label="CGST %" value={String(draftDocument.cgstPercent)} onChangeText={(value) => updateNumberField("cgstPercent", value)} amount={formatMoney(totals.cgstAmount, currency)} />
                        <EditablePercentRow label="SGST %" value={String(draftDocument.sgstPercent)} onChangeText={(value) => updateNumberField("sgstPercent", value)} amount={formatMoney(totals.sgstAmount, currency)} />
                      </>
                    ) : null}
                    {isTaxDocument && draftDocument.taxMode === "IGST" ? (
                      <EditablePercentRow label="IGST %" value={String(draftDocument.igstPercent)} onChangeText={(value) => updateNumberField("igstPercent", value)} amount={formatMoney(totals.igstAmount, currency)} />
                    ) : null}
                    <View style={styles.totalDivider} />
                    <TotalRow label={isTaxDocument ? "Gross Total Value" : "Grand Total"} value={formatMoney(totals.grandTotal, currency)} strong />
                    <View style={styles.wordsBox}>
                      <Text style={styles.wordsLabel}>Amount in Words</Text>
                      <TextInput
                        style={styles.wordsInput}
                        value={draftDocument.amountInWords || getNumberWords(totals.grandTotal, currency)}
                        onChangeText={(value) => updateDocumentField("amountInWords", value)}
                        multiline
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.signatureArea}>
                  <View style={styles.noteBox}>
                    <Text style={styles.sectionLabel}>Notes</Text>
                    <TextInput style={styles.textArea} value={draftDocument.notes} onChangeText={(value) => updateDocumentField("notes", value)} multiline />
                  </View>
                  <View style={styles.signBox}>
                    <Text style={styles.signFor}>For {draftDocument.company.name}</Text>
                    <View style={styles.assetRow}>
                      <AssetPreview label="Stamp" uri={draftDocument.company.stampUrl} />
                      <AssetPreview label="Signature" uri={draftDocument.company.signatureUrl} />
                    </View>
                    <Text style={styles.signLabel}>Authorized Signatory</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
      <ScrollView contentContainerStyle={[styles.moduleContent, isWebsite && styles.webModuleContent]} showsVerticalScrollIndicator={false}>
        <View style={styles.moduleHeader}>
          <Pressable style={styles.headerButton} onPress={() => router.push(appRoute("/dashboard") as never)} accessibilityRole="button" accessibilityLabel="Dashboard">
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.moduleTitle}>Tax Invoice</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Pressable style={styles.createInvoiceButton} onPress={() => setSelectorVisible(true)}>
          <View style={styles.createInvoiceIcon}>
            <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.createInvoiceText}>Create Tax Invoice</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <View style={styles.previousCard}>
          <View style={styles.previousHeader}>
            <Text style={styles.previousTitle}>Previous Documents</Text>
            <Pressable style={styles.filterButton} onPress={() => setFilterOpen((value) => !value)}>
              <Text style={styles.filterButtonText}>{previousFilters.find((item) => item.type === previousFilter)?.label}</Text>
              <Ionicons name={filterOpen ? "chevron-up" : "chevron-down"} size={16} color={Colors.text} />
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
                  <Text style={[styles.filterOptionText, previousFilter === filter.type && styles.filterOptionTextActive]}>{filter.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {loading || historyLoading ? (
            <Text style={styles.emptyText}>Loading documents...</Text>
          ) : previousDocuments.length ? (
            previousDocuments.map((document) => (
              <View key={document.id || document.documentNumber} style={styles.previousRow}>
                <Pressable
                  style={styles.previousMain}
                  onPress={() => router.push(appRoute("/preview", { type: "invoice", invoiceId: document.id || "" }) as never)}
                >
                  <View style={styles.previousIcon}>
                    <Ionicons name={document.documentType === "bill_of_supply" ? "document-text-outline" : "receipt-outline"} size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.previousCopy}>
                    <Text style={styles.previousNumber}>{document.documentNumber}</Text>
                    <Text style={styles.previousMeta}>
                      {document.invoiceDate} • {document.customer.name || "Recipient"} • {getStatusLabel(document.status)}
                    </Text>
                  </View>
                  <Text style={styles.previousAmount}>{formatMoney(document.grandTotal, document.company.currency)}</Text>
                </Pressable>
                <View style={styles.previousActions}>
                  <Pressable style={styles.rowIconButton} onPress={() => router.push(appRoute("/preview", { type: "invoice", invoiceId: document.id || "" }) as never)}>
                    <Ionicons name="eye-outline" size={17} color={Colors.textSecondary} />
                  </Pressable>
                  {document.status === "draft" ? (
                    <Pressable style={styles.rowIconButton} onPress={() => editDocument(document)}>
                      <Ionicons name="create-outline" size={17} color={Colors.textSecondary} />
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.rowIconButton} onPress={() => printDocument(document)}>
                    <Ionicons name="print-outline" size={17} color={Colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No saved documents yet</Text>
              <Text style={styles.emptyText}>Saved {getDocumentLabel(previousFilter).toLowerCase()} records will appear here with number, date, recipient, amount, and status.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal transparent visible={selectorVisible} animationType={isPhone ? "slide" : "fade"} onRequestClose={() => setSelectorVisible(false)}>
        <View style={[styles.selectorOverlay, isPhone && styles.selectorOverlayPhone]}>
          <View style={[styles.selectorModal, isPhone && styles.selectorSheet]}>
            <View style={styles.selectorHeader}>
              <View>
                <Text style={styles.selectorTitle}>Create New Document</Text>
                <Text style={styles.selectorSubtitle}>Choose the document type you want to create.</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </Pressable>
            </View>
            {documentOptions.map((option) => (
              <Pressable key={option.type} style={styles.selectorOption} onPress={() => startDocument(option.type)}>
                <View style={styles.selectorIcon}>
                  <Ionicons name={option.icon} size={22} color={Colors.primary} />
                </View>
                <View style={styles.selectorCopy}>
                  <Text style={styles.selectorOptionTitle}>{option.title}</Text>
                  <Text style={styles.selectorOptionText}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InlineInput({
  value,
  onChangeText,
  multiline,
  textStyle,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  textStyle?: object;
  placeholder?: string;
}) {
  return (
    <TextInput
      style={[styles.inlineInput, textStyle]}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor="#A0A0A0"
    />
  );
}

function MetaField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.metaField}>
      <Text style={styles.metaLabel}>{label}</Text>
      <TextInput style={styles.metaInput} value={value} onChangeText={onChangeText} placeholderTextColor="#A0A0A0" />
    </View>
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
    <View style={[styles.dottedField, compact && styles.dottedFieldCompact]}>
      <Text style={styles.dottedLabel}>{label}</Text>
      <TextInput style={styles.dottedInput} value={value} onChangeText={onChangeText} />
    </View>
  );
}

function BoxedGstinField({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.gstinField}>
      <Text style={styles.dottedLabel}>GSTIN :</Text>
      <TextInput
        style={styles.gstinInput}
        value={value}
        onChangeText={(nextValue) => onChangeText(nextValue.toUpperCase())}
        autoCapitalize="characters"
        maxLength={15}
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
  style: object;
  keyboardType?: "default" | "decimal-pad";
}) {
  return (
    <TextInput
      style={[styles.tableCell, styles.cellInput, style]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
    />
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, strong && styles.totalStrong]}>{label}</Text>
      <Text style={[styles.totalValue, strong && styles.totalStrong]}>{value}</Text>
    </View>
  );
}

function EditableAmountRow({
  label,
  value,
  onChangeText,
  currency,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  currency: string;
}) {
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

function EditablePercentRow({
  label,
  value,
  onChangeText,
  amount,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  amount: string;
}) {
  return (
    <View style={styles.totalRow}>
      <View style={styles.percentInputWrap}>
        <Text style={styles.totalLabel}>{label}</Text>
        <TextInput style={styles.percentInput} value={value} onChangeText={onChangeText} keyboardType="decimal-pad" />
      </View>
      <Text style={styles.totalValue}>{amount}</Text>
    </View>
  );
}

function AssetPreview({ label, uri }: { label: string; uri?: string | null }) {
  return (
    <View style={styles.assetBox}>
      <Text style={styles.assetLabel}>{label}</Text>
      {uri ? (
        <Image source={{ uri }} style={styles.assetImage} contentFit="contain" />
      ) : (
        <Text style={styles.assetPlaceholder}>Not uploaded</Text>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  webSafeArea: { backgroundColor: Colors.surface },
  keyboardView: { flex: 1 },
  moduleContent: { alignSelf: "center", maxWidth: 520, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, width: "100%" },
  webModuleContent: { maxWidth: 1040, paddingHorizontal: 40, paddingTop: 28, paddingBottom: 52 },
  moduleHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  headerButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#EFEFEF", borderRadius: 18, borderWidth: 1, height: 40, justifyContent: "center", width: 40, ...shadow },
  headerSpacer: { width: 40 },
  moduleTitle: { color: Colors.text, fontSize: 22, fontWeight: "800" },
  createInvoiceButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    padding: 18,
    elevation: 5,
    ...Platform.select({
      web: {
        boxShadow: "0px 12px 20px rgba(255, 122, 0, 0.22)",
      },
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
      },
    }),
  },
  createInvoiceIcon: { alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.22)", borderRadius: 16, height: 44, justifyContent: "center", width: 44 },
  createInvoiceText: { color: "#FFFFFF", flex: 1, fontSize: 17, fontWeight: "800" },
  previousCard: { backgroundColor: "#FFFFFF", borderColor: "#EFEFEF", borderRadius: 20, borderWidth: 1, padding: 18, ...shadow },
  previousHeader: { alignItems: "flex-start", gap: 10, marginBottom: 12 },
  previousTitle: { color: Colors.text, fontSize: 18, fontWeight: "800" },
  filterButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: "#FAFAFA", borderColor: "#EAEAEA", borderRadius: 12, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  filterButtonText: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  filterMenu: { borderColor: "#EAEAEA", borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  filterOption: { paddingHorizontal: 12, paddingVertical: 11 },
  filterOptionActive: { backgroundColor: "#FFF4E3" },
  filterOptionText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "700" },
  filterOptionTextActive: { color: Colors.primaryDark },
  previousRow: { borderTopColor: "#EFEFEF", borderTopWidth: 1, paddingVertical: 12 },
  previousMain: { alignItems: "center", flexDirection: "row" },
  previousIcon: { alignItems: "center", backgroundColor: "#FFF4E3", borderRadius: 14, height: 40, justifyContent: "center", marginRight: 12, width: 40 },
  previousCopy: { flex: 1 },
  previousNumber: { color: Colors.text, fontSize: 14, fontWeight: "800", marginBottom: 3 },
  previousMeta: { color: Colors.textSecondary, fontSize: 12 },
  previousAmount: { color: Colors.text, fontSize: 13, fontWeight: "800", marginLeft: 10 },
  previousActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 10 },
  rowIconButton: { alignItems: "center", backgroundColor: "#FAFAFA", borderColor: "#EEEEEE", borderRadius: 12, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
  emptyState: { alignItems: "center", borderColor: "#F1F1F1", borderRadius: 18, borderStyle: "dashed", borderWidth: 1, paddingHorizontal: 18, paddingVertical: 34 },
  emptyIcon: { alignItems: "center", backgroundColor: "#FFF4E3", borderRadius: 22, height: 56, justifyContent: "center", marginBottom: 14, width: 56 },
  emptyTitle: { color: Colors.text, fontSize: 17, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  emptyText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: "center" },
  editorHeader: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#EFEFEF", borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  editorTitle: { color: Colors.text, flex: 1, fontSize: 18, fontWeight: "800", textAlign: "center" },
  editorActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  saveButton: { backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 },
  saveButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  secondaryButton: { backgroundColor: "#FFFFFF", borderColor: "#EAEAEA", borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  secondaryButtonText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  disabledButton: { opacity: 0.7 },
  phoneHorizontalWorkspace: { minWidth: 860 },
  editorContent: { alignSelf: "center", minWidth: 820, paddingHorizontal: 14, paddingBottom: 96, paddingTop: 14, width: "100%" },
  webEditorContent: { maxWidth: 1120, paddingHorizontal: 40, paddingTop: 24 },
  errorBox: { alignSelf: "center", backgroundColor: "#FFF2F0", borderColor: "#FFD2CC", borderRadius: 12, borderWidth: 1, marginBottom: 12, maxWidth: 794, padding: 12, width: "100%" },
  errorText: { color: Colors.error, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  a4Paper: { alignSelf: "center", aspectRatio: 210 / 297, backgroundColor: "#FFFFFF", borderColor: "#8A8A8A", borderRadius: 1, borderWidth: 1.5, maxWidth: 794, minHeight: 1123, padding: 0, width: 794, ...shadow },
  webA4Paper: { width: 794 },
  topStrip: { alignItems: "flex-start", borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 4, paddingTop: 10 },
  stripBlock: { flex: 1 },
  stripBlockRight: { flex: 1, alignItems: "flex-end" },
  stripText: { color: "#4D4D4D", fontSize: 14, fontWeight: "700" },
  stripTextRight: { color: "#4D4D4D", fontSize: 14, fontWeight: "700", textAlign: "right" },
  documentTitle: { color: "#4A4A4A", flex: 1.1, fontSize: 18, fontWeight: "800", textAlign: "center", textDecorationLine: "underline" },
  companyPanel: { alignItems: "center", borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, flexDirection: "row", gap: 10, minHeight: 118, paddingHorizontal: 16, paddingVertical: 4 },
  logoBox: { alignItems: "center", borderColor: "#DADADA", borderRadius: 4, borderWidth: 1, height: 62, justifyContent: "center", overflow: "hidden", width: 74 },
  logoImage: { height: "100%", width: "100%" },
  logoInitials: { color: Colors.primaryDark, fontSize: 20, fontWeight: "900" },
  companyBlock: { flex: 1 },
  inlineInput: { color: Colors.text, padding: 0 },
  companyName: { color: "#4A4A4A", fontSize: 44, fontWeight: "900", lineHeight: 52, textAlign: "center" },
  companyAddress: { color: "#4A4A4A", fontSize: 18, fontWeight: "800", lineHeight: 24, textAlign: "center" },
  companyEmail: { color: "#4A4A4A", fontSize: 16, fontWeight: "800", textAlign: "center" },
  companyMiniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  partiesGrid: { borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, flexDirection: "row", minHeight: 145 },
  partyBox: { borderRightColor: "#8A8A8A", borderRightWidth: 1.3, flex: 1.55, paddingHorizontal: 16, paddingVertical: 8 },
  invoiceInfoBox: { flex: 1, gap: 13, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 8 },
  sectionLabel: { color: "#606060", fontSize: 13, fontWeight: "800", marginBottom: 8 },
  customerName: { color: "#111111", fontSize: 16, fontWeight: "900", marginBottom: 4 },
  mutedInput: { color: "#333333", fontSize: 11, lineHeight: 16 },
  recipientLine: { flexDirection: "row", gap: 8 },
  dottedField: { alignItems: "center", flexDirection: "row", minHeight: 25 },
  dottedFieldCompact: { flex: 1 },
  dottedLabel: { color: "#666666", fontSize: 13, fontWeight: "700", marginRight: 4 },
  dottedInput: { borderBottomColor: "#B7B7B7", borderBottomWidth: 1, color: "#111111", flex: 1, fontSize: 13, fontWeight: "700", minHeight: 22, padding: 0 },
  gstinField: { alignItems: "center", flexDirection: "row", marginTop: 4 },
  gstinInput: { borderColor: "#8A8A8A", borderWidth: 1.4, color: "#111111", fontSize: 15, fontWeight: "800", height: 32, letterSpacing: 9, paddingHorizontal: 6, width: 374 },
  metaField: { flexGrow: 1, minWidth: 92 },
  metaLabel: { color: "#555555", fontSize: 9, fontWeight: "800", marginBottom: 3, textTransform: "uppercase" },
  metaInput: { borderColor: "#DDDDDD", borderRadius: 4, borderWidth: 1, color: "#111111", fontSize: 11, fontWeight: "700", minHeight: 28, paddingHorizontal: 6, paddingVertical: 4 },
  taxModeRow: { alignItems: "center", borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  taxModePill: { borderColor: "#D8D8D8", borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  taxModePillActive: { backgroundColor: "#FFF4E3", borderColor: Colors.primary },
  taxModeText: { color: Colors.textSecondary, fontSize: 11, fontWeight: "800" },
  taxModeTextActive: { color: Colors.primaryDark },
  tableToolbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 6 },
  addRowButton: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  addRowText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  itemTable: { borderColor: "#8A8A8A", borderLeftWidth: 0, borderRightWidth: 0, borderTopWidth: 0, minWidth: 792 },
  itemRow: { flexDirection: "row" },
  itemHeaderRow: { backgroundColor: "#F6F6F6" },
  tableCell: { borderRightColor: "#8A8A8A", borderRightWidth: 1.2, borderTopColor: "#8A8A8A", borderTopWidth: 1.2, color: "#555555", fontSize: 13, fontWeight: "700", minHeight: 28, padding: 5 },
  serialCell: { textAlign: "center", width: 44 },
  itemCell: { width: 270 },
  codeCell: { textAlign: "center", width: 64 },
  hsnCell: { width: 64 },
  smallCell: { textAlign: "center", width: 98 },
  amountCell: { width: 132 },
  actionCell: { borderRightWidth: 0, width: 56 },
  cellInput: { paddingVertical: 0 },
  amountText: { fontWeight: "800", textAlign: "right" },
  rowActions: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", paddingHorizontal: 4 },
  summaryArea: { borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, flexDirection: "row", gap: 0, paddingVertical: 0 },
  bankTermsColumn: { borderRightColor: "#8A8A8A", borderRightWidth: 1.3, flex: 1.18 },
  bankBox: { borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, minHeight: 92, paddingHorizontal: 12, paddingVertical: 10 },
  textAreaBlock: { borderColor: "#DADADA", borderRadius: 4, borderWidth: 1, padding: 9 },
  textArea: { color: "#333333", fontSize: 11, lineHeight: 16, minHeight: 62, padding: 0, textAlignVertical: "top" },
  totalsBox: { flex: 0.95, paddingHorizontal: 12, paddingVertical: 4 },
  totalRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalLabel: { color: "#333333", flex: 1, fontSize: 11, fontWeight: "700" },
  totalValue: { color: "#111111", fontSize: 11, fontWeight: "900", textAlign: "right" },
  totalStrong: { fontSize: 14, fontWeight: "900" },
  editableTotalValue: { alignItems: "center", flexDirection: "row", justifyContent: "flex-end" },
  currencyPrefix: { color: "#777777", fontSize: 10, fontWeight: "800", marginRight: 4 },
  totalInput: { borderBottomColor: "#BBBBBB", borderBottomWidth: 1, color: "#111111", fontSize: 11, fontWeight: "800", minWidth: 58, padding: 0, textAlign: "right" },
  percentInputWrap: { alignItems: "center", flexDirection: "row", gap: 5 },
  percentInput: { borderBottomColor: "#BBBBBB", borderBottomWidth: 1, color: "#111111", fontSize: 11, fontWeight: "800", minWidth: 34, padding: 0, textAlign: "center" },
  totalDivider: { backgroundColor: "#222222", height: 1, marginVertical: 5 },
  wordsBox: { borderTopColor: "#DDDDDD", borderTopWidth: 1, marginTop: 8, paddingTop: 8 },
  wordsLabel: { color: "#555555", fontSize: 9, fontWeight: "900", marginBottom: 4, textTransform: "uppercase" },
  wordsInput: { color: "#222222", fontSize: 11, fontWeight: "700", minHeight: 34, padding: 0, textAlignVertical: "top" },
  signatureArea: { flexDirection: "row", gap: 0, minHeight: 93 },
  noteBox: { borderRightColor: "#8A8A8A", borderRightWidth: 1.3, flex: 1.2, padding: 9 },
  signBox: { alignItems: "flex-end", flex: 1, justifyContent: "space-between", minHeight: 93, padding: 12 },
  signFor: { color: "#4A4A4A", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  assetRow: { flexDirection: "row", gap: 8, width: "100%" },
  assetBox: { alignItems: "center", borderColor: "#EEEEEE", borderRadius: 4, borderWidth: 1, flex: 1, minHeight: 58, padding: 6 },
  assetLabel: { color: "#777777", fontSize: 9, fontWeight: "800", marginBottom: 3 },
  assetImage: { height: 38, width: "100%" },
  assetPlaceholder: { color: Colors.textSecondary, fontSize: 9 },
  signLabel: { color: "#4A4A4A", fontSize: 16, fontWeight: "500", marginTop: 10 },
  selectorOverlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.34)", flex: 1, justifyContent: "center", padding: 22 },
  selectorOverlayPhone: { justifyContent: "flex-end", padding: 0 },
  selectorModal: { backgroundColor: "#FFFFFF", borderRadius: 18, maxWidth: 460, padding: 18, width: "100%", ...shadow },
  selectorSheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxWidth: "100%", paddingBottom: 26 },
  selectorHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  selectorTitle: { color: Colors.text, fontSize: 20, fontWeight: "900", marginBottom: 4 },
  selectorSubtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  closeButton: { alignItems: "center", backgroundColor: "#FAFAFA", borderColor: "#EEEEEE", borderRadius: 14, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
  selectorOption: { alignItems: "center", borderColor: "#EEEEEE", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 10, padding: 14 },
  selectorIcon: { alignItems: "center", backgroundColor: "#FFF4E3", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  selectorCopy: { flex: 1 },
  selectorOptionTitle: { color: Colors.text, fontSize: 15, fontWeight: "900", marginBottom: 3 },
  selectorOptionText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
});
