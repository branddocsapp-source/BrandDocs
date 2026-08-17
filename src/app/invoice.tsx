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

import {
  CustomerDottedField,
  CustomerGstinField,
} from "@/components/customer-suggest-field";
import {
  DocumentBrandHeader,
  DocumentColors,
  DocumentFooter,
  DocumentSectionTitle,
  DocumentTaxBar,
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
  calculateDocumentTotals,
  DocumentType,
  generateNextDocumentNumber,
  getDocumentLabel,
  getDocumentTitle,
  getInvoiceTaxSummaryRows,
  getLineAmount,
  InvoiceItem,
  InvoiceRecord,
  loadInvoiceById,
  loadInvoices,
  saveInvoice,
} from "@/services/invoices";
import { Colors } from "@/theme/colors";
import { ThemePalette, useAppTheme } from "@/theme/theme-context";

const documentOptions: {
  type: DocumentType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
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

function getMetaValue(profile: BusinessProfile | null, key: string) {
  return (
    profile?.taxFields?.[key] ||
    profile?.countryMeta?.taxIdentifiers?.[key] ||
    ""
  );
}

function getBankValue(profile: BusinessProfile | null, keys: string[]) {
  const details = profile?.countryMeta?.bankDetails || {};
  const match = keys.find((key) => details[key]);
  return match ? String(details[match]) : "";
}

function createInitialItems(documentType: DocumentType): InvoiceItem[] {
  const baseItem = (
    id: string,
    description: string,
    hsnSac: string,
    quantity: string,
    rate: string,
  ): InvoiceItem => ({
    id,
    item: documentType === "bill_of_supply" ? "Supply" : "Service",
    description,
    ssnCode: "",
    hsnSac,
    quantity,
    rate,
    discount: "0",
    tax: documentType === "tax_invoice" ? "0" : undefined,
  });

  return [
    baseItem(
      `${Date.now()}-1`,
      "Description of goods / services",
      "9983",
      "1",
      "0",
    ),
    baseItem(
      `${Date.now()}-2`,
      "Description of goods / services",
      "9983",
      "1",
      "0",
    ),
    baseItem(
      `${Date.now()}-3`,
      "Description of goods / services",
      "9983",
      "1",
      "0",
    ),
    baseItem(
      `${Date.now()}-4`,
      "Description of goods / services",
      "9983",
      "1",
      "0",
    ),
  ];
}

function buildDraftDocument(
  documentType: DocumentType,
  profile: BusinessProfile | null,
  invoices: InvoiceRecord[],
): InvoiceRecord {
  const currency = profile?.defaultCurrency || profile?.currencyCode || "INR";
  const { documentNumber, numberingSequence } = generateNextDocumentNumber(
    documentType,
    invoices,
  );
  const isTaxInvoice = documentType === "tax_invoice";
  const defaultTerms =
    profile?.countryMeta?.documentDefaults?.terms ||
    "Payment is due as per the agreed terms.";

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
      taxRegistrationNumber:
        profile?.taxRegistrationNumber || getMetaValue(profile, "gstin"),
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
      accountNumber: getBankValue(profile, [
        "accountNumber",
        "account_number",
        "account",
      ]),
      ifscCode: getBankValue(profile, ["ifscCode", "ifsc", "ifsc_code"]),
      branchAddress: getBankValue(profile, [
        "branchAddress",
        "branch",
        "branch_address",
      ]),
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
  const { theme, isDark } = useAppTheme();
  const styles = createStyles(theme, isDark);
  const router = useRouter();
  const { editInvoiceId } = useLocalSearchParams<{ editInvoiceId?: string }>();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [allDocuments, setAllDocuments] = useState<InvoiceRecord[]>([]);
  const [previousDocuments, setPreviousDocuments] = useState<InvoiceRecord[]>(
    [],
  );
  const [previousFilter, setPreviousFilter] =
    useState<DocumentType>("tax_invoice");
  const [draftDocument, setDraftDocument] = useState<InvoiceRecord | null>(
    null,
  );
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

  const currency =
    draftDocument?.company.currency || profile?.defaultCurrency || "INR";
  const isTaxDocument = draftDocument?.documentType === "tax_invoice";
  const totals = useMemo(
    () => (draftDocument ? calculateDocumentTotals(draftDocument) : null),
    [draftDocument],
  );
  const taxSummaryRows = useMemo(
    () => (draftDocument ? getInvoiceTaxSummaryRows(draftDocument) : []),
    [draftDocument],
  );

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
      const documents = await loadInvoices(
        auth.currentUser,
        profile,
        previousFilter,
        50,
      );
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

  function updateDocumentField(
    field: keyof InvoiceRecord,
    value: string | number,
  ) {
    setDraftDocument((current) =>
      current ? { ...current, [field]: value } : current,
    );
  }

  function updateCompanyField(
    field: keyof InvoiceRecord["company"],
    value: string,
  ) {
    setDraftDocument((current) =>
      current
        ? { ...current, company: { ...current.company, [field]: value } }
        : current,
    );
  }

  function updateCustomerField(
    field: keyof InvoiceRecord["customer"],
    value: string,
  ) {
    setDraftDocument((current) =>
      current
        ? { ...current, customer: { ...current.customer, [field]: value } }
        : current,
    );
  }

  function applySavedCustomer(customer: SavedCustomerProfile) {
    setDraftDocument((current) => {
      if (!current) return current;
      return {
        ...current,
        customer: {
          ...current.customer,
          name: customer.name || current.customer.name,
          phone: customer.phone || current.customer.phone,
          email: customer.email || current.customer.email,
          address: customer.address || current.customer.address,
          state: customer.state || current.customer.state,
          stateCode: customer.stateCode || current.customer.stateCode,
          pin: customer.pin || current.customer.pin,
          gstin: customer.gstin || current.customer.gstin,
        },
      };
    });
  }

  function updateBankField(field: keyof InvoiceRecord["bank"], value: string) {
    setDraftDocument((current) =>
      current
        ? { ...current, bank: { ...current.bank, [field]: value } }
        : current,
    );
  }

  function updateNumberField(
    field:
      | "discount"
      | "freightCharges"
      | "cgstPercent"
      | "sgstPercent"
      | "igstPercent",
    value: string,
  ) {
    setDraftDocument((current) =>
      current ? { ...current, [field]: toNumber(value) } : current,
    );
  }

  function updateItem(itemId: string, field: keyof InvoiceItem, value: string) {
    setDraftDocument((current) => {
      if (!current) return current;

      return {
        ...current,
        items: current.items.map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item,
        ),
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
      if (index < 0 || nextIndex < 0 || nextIndex >= current.items.length)
        return current;

      const nextItems = [...current.items];
      const [item] = nextItems.splice(index, 1);
      nextItems.splice(nextIndex, 0, item);
      return { ...current, items: nextItems };
    });
  }

  function validateDocument(document: InvoiceRecord) {
    const errors: string[] = [];

    if (!document.documentNumber.trim())
      errors.push("Document number is required.");
    if (!document.invoiceDate.trim()) errors.push("Document date is required.");
    if (!document.company.name.trim())
      errors.push("Business name is required.");
    if (!document.company.address.trim())
      errors.push("Business address is required.");
    if (!document.customer.name.trim())
      errors.push("Recipient name is required.");
    if (!document.items.length) errors.push("Add at least one item row.");

    document.items.forEach((item, index) => {
      if (!item.description.trim() && !item.item.trim())
        errors.push(`Item ${index + 1} needs a description.`);
      if (toNumber(item.quantity) <= 0)
        errors.push(`Item ${index + 1} quantity must be greater than 0.`);
      if (toNumber(item.rate) < 0)
        errors.push(`Item ${index + 1} rate cannot be negative.`);
    });

    if (document.documentType === "tax_invoice") {
      if (
        document.taxMode === "CGST + SGST" &&
        (document.cgstPercent < 0 || document.sgstPercent < 0)
      ) {
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
      const result = await saveInvoice(
        auth.currentUser,
        profile,
        documentToSave,
      );
      const [documents, selectedDocuments] = await Promise.all([
        loadInvoices(auth.currentUser, profile, undefined, 500),
        loadInvoices(auth.currentUser, profile, previousFilter, 50),
      ]);

      setAllDocuments(
        documents.length ? documents : [result.invoice, ...allDocuments],
      );
      setPreviousDocuments(
        selectedDocuments.length
          ? selectedDocuments
          : [result.invoice, ...previousDocuments],
      );
      setDraftDocument(goToPreview ? draftDocument : null);

      if (goToPreview) {
        showToast({
          message: `${getDocumentLabel(result.invoice.documentType)} saved! Opening preview...`,
          type: "success",
        });
        router.push(
          appRoute("/preview", {
            type: "invoice",
            invoiceId: result.invoice.id || "",
          }) as never,
        );
      } else {
        showToast({
          message: `${getDocumentLabel(result.invoice.documentType)} saved successfully!`,
          type: "success",
        });
        Alert.alert(
          `${getDocumentLabel(result.invoice.documentType)} Saved`,
          result.source === "firebase"
            ? "Your draft has been saved."
            : result.warning ||
                "Your draft has been saved locally on this device.",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Save Failed",
        error?.message || "We could not save this document. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function printDocument(document: InvoiceRecord) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
      return;
    }

    Alert.alert(
      "Print",
      `${getDocumentLabel(document.documentType)} printing is available from the web preview in this build.`,
    );
  }

  function editDocument(document: InvoiceRecord) {
    setFieldErrors([]);
    setDraftDocument(document);
  }

  if (draftDocument && totals) {
    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.editorHeader}>
              <Pressable
                style={styles.headerButton}
                onPress={() => setDraftDocument(null)}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="chevron-back" size={22} color={theme.ink} />
              </Pressable>
              <Text style={styles.editorTitle}>
                {getDocumentLabel(draftDocument.documentType)}
              </Text>
              <View style={styles.editorActions}>
                <Pressable
                  style={[
                    styles.secondaryButton,
                    saving && styles.disabledButton,
                  ]}
                  onPress={() => persistDraft({ goToPreview: false })}
                  disabled={saving}
                >
                  <Text style={styles.secondaryButtonText}>Save Draft</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, saving && styles.disabledButton]}
                  onPress={() => persistDraft({ goToPreview: true })}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>Preview</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={[
                  styles.editorContent,
                  isWebsite && styles.webEditorContent,
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
                        position: "absolute",
                      },
                    ]}
                  >
                    <DocumentBrandHeader
                      company={{
                        name: draftDocument.company.name,
                        tagline: "Documents that build your business",
                        address: draftDocument.company.address,
                        phone: draftDocument.company.phone,
                        email: draftDocument.company.email,
                        website: draftDocument.company.website,
                        logoUrl: draftDocument.company.logoUrl,
                      }}
                      documentTitle={getDocumentTitle(
                        draftDocument.documentType,
                      ).toUpperCase()}
                      metaRows={[
                        {
                          label: isTaxDocument ? "Invoice No." : "Bill No.",
                          value: draftDocument.documentNumber,
                          onChange: (v) =>
                            updateDocumentField("documentNumber", v),
                        },
                        {
                          label: "Date",
                          value: draftDocument.invoiceDate,
                          onChange: (v) =>
                            updateDocumentField("invoiceDate", v),
                        },
                        {
                          label: "Due Date",
                          value: draftDocument.dueDate,
                          onChange: (v) => updateDocumentField("dueDate", v),
                        },
                        {
                          label: "Place of Supply",
                          value: draftDocument.company.state || "—",
                          onChange: (v) => updateCompanyField("state", v),
                        },
                        {
                          label: "Currency",
                          value: draftDocument.company.currency,
                          onChange: (v) =>
                            updateCompanyField("currency", v.toUpperCase()),
                        },
                      ]}
                      editable
                      onCompanyChange={(field, value) => {
                        if (field === "name") updateCompanyField("name", value);
                        if (field === "address")
                          updateCompanyField("address", value);
                        if (field === "phone")
                          updateCompanyField("phone", value);
                        if (field === "email")
                          updateCompanyField("email", value);
                        if (field === "website")
                          updateCompanyField("website", value);
                      }}
                    />

                    <DocumentTaxBar
                      gstin={draftDocument.company.taxRegistrationNumber}
                      pan={draftDocument.company.pan}
                      editable
                      onGstinChange={(v) =>
                        updateCompanyField("taxRegistrationNumber", v)
                      }
                      onPanChange={(v) => updateCompanyField("pan", v)}
                    />

                    <View style={styles.partiesGrid}>
                      <View style={styles.partyBox}>
                        <DocumentSectionTitle
                          icon="person-outline"
                          title="BILL TO"
                        />
                        <CustomerDottedField
                          label="Name"
                          value={draftDocument.customer.name}
                          onChangeText={(value) =>
                            updateCustomerField("name", value)
                          }
                          onSelectCustomer={applySavedCustomer}
                        />
                        <DottedField
                          label="Address"
                          value={draftDocument.customer.address}
                          onChangeText={(value) =>
                            updateCustomerField("address", value)
                          }
                        />
                        <View style={styles.recipientLine}>
                          <DottedField
                            label="State"
                            value={draftDocument.customer.state || ""}
                            onChangeText={(value) =>
                              updateCustomerField("state", value)
                            }
                            compact
                          />
                          <DottedField
                            label="State Code"
                            value={draftDocument.customer.stateCode || ""}
                            onChangeText={(value) =>
                              updateCustomerField("stateCode", value)
                            }
                            compact
                          />
                          <DottedField
                            label="PIN"
                            value={draftDocument.customer.pin || ""}
                            onChangeText={(value) =>
                              updateCustomerField("pin", value)
                            }
                            compact
                          />
                        </View>
                        {isTaxDocument ? (
                          <CustomerGstinField
                            value={draftDocument.customer.gstin || ""}
                            onChangeText={(value) =>
                              updateCustomerField("gstin", value)
                            }
                            onSelectCustomer={applySavedCustomer}
                          />
                        ) : null}
                      </View>
                      <View style={styles.partyBox}>
                        <DocumentSectionTitle
                          icon="car-outline"
                          title="SHIP TO"
                        />
                        <DottedField
                          label="Name"
                          value={draftDocument.customer.name}
                          onChangeText={(value) =>
                            updateCustomerField("name", value)
                          }
                        />
                        <DottedField
                          label="Address"
                          value={draftDocument.customer.address}
                          onChangeText={(value) =>
                            updateCustomerField("address", value)
                          }
                        />
                        <View style={styles.recipientLine}>
                          <DottedField
                            label="State"
                            value={draftDocument.customer.state || ""}
                            onChangeText={(value) =>
                              updateCustomerField("state", value)
                            }
                            compact
                          />
                          <DottedField
                            label="State Code"
                            value={draftDocument.customer.stateCode || ""}
                            onChangeText={(value) =>
                              updateCustomerField("stateCode", value)
                            }
                            compact
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.tableToolbar}>
                      <Text style={styles.sectionLabel}>Line Items</Text>
                      <Pressable style={styles.addRowButton} onPress={addRow}>
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                        <Text style={styles.addRowText}>Add Row</Text>
                      </Pressable>
                    </View>

                    <View style={styles.itemTable}>
                      <View style={[styles.itemRow, styles.itemHeaderRow]}>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.headerCell,
                            styles.serialCell,
                          ]}
                        >
                          S.No.
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.headerCell,
                            styles.itemCell,
                          ]}
                        >
                          Description of Goods / Services
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.headerCell,
                            styles.codeCell,
                          ]}
                        >
                          SSN{"\n"}CODE
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.headerCell,
                            styles.codeCell,
                          ]}
                        >
                          HSN{"\n"}CODE
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.headerCell,
                            styles.smallCell,
                          ]}
                        >
                          Qty
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.headerCell,
                            styles.smallCell,
                          ]}
                        >
                          Rate
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.headerCell,
                            styles.amountCell,
                          ]}
                        >
                          VALUE{"\n"}Rs. P.
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.headerCell,
                            styles.actionCell,
                          ]}
                        />
                      </View>

                      {draftDocument.items.map((item, index) => (
                        <View key={item.id} style={styles.itemRow}>
                          <Text style={[styles.tableCell, styles.serialCell]}>
                            {index + 1}
                          </Text>
                          <CellInput
                            value={item.description}
                            onChangeText={(value) =>
                              updateItem(item.id, "description", value)
                            }
                            style={styles.itemCell}
                          />
                          <CellInput
                            value={item.ssnCode || ""}
                            onChangeText={(value) =>
                              updateItem(item.id, "ssnCode", value)
                            }
                            style={styles.codeCell}
                          />
                          <CellInput
                            value={item.hsnSac || ""}
                            onChangeText={(value) =>
                              updateItem(item.id, "hsnSac", value)
                            }
                            style={styles.codeCell}
                          />
                          <CellInput
                            value={item.quantity}
                            onChangeText={(value) =>
                              updateItem(item.id, "quantity", value)
                            }
                            style={styles.smallCell}
                            keyboardType="decimal-pad"
                          />
                          <CellInput
                            value={item.rate}
                            onChangeText={(value) =>
                              updateItem(item.id, "rate", value)
                            }
                            style={styles.smallCell}
                            keyboardType="decimal-pad"
                          />
                          <Text
                            style={[
                              styles.tableCell,
                              styles.amountCell,
                              styles.amountText,
                            ]}
                          >
                            {formatMoney(getLineAmount(item), currency)}
                          </Text>
                          <View
                            style={[
                              styles.tableCell,
                              styles.actionCell,
                              styles.rowActions,
                            ]}
                          >
                            <Pressable
                              onPress={() => moveRow(item.id, -1)}
                              disabled={index === 0}
                            >
                              <Ionicons
                                name="chevron-up"
                                size={15}
                                color={index === 0 ? "#CFCFCF" : theme.muted}
                              />
                            </Pressable>
                            <Pressable
                              onPress={() => moveRow(item.id, 1)}
                              disabled={
                                index === draftDocument.items.length - 1
                              }
                            >
                              <Ionicons
                                name="chevron-down"
                                size={15}
                                color={
                                  index === draftDocument.items.length - 1
                                    ? "#CFCFCF"
                                    : theme.muted
                                }
                              />
                            </Pressable>
                            <Pressable onPress={() => deleteRow(item.id)}>
                              <Ionicons
                                name="trash-outline"
                                size={16}
                                color={Colors.error}
                              />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>

                    <View style={styles.summaryArea}>
                      <View style={styles.bankTermsColumn}>
                        <View style={styles.bankBox}>
                          <Text style={styles.sectionLabel}>
                            Bank Details :
                          </Text>
                          <DottedField
                            label="Bank Name"
                            value={draftDocument.bank.bankName}
                            onChangeText={(value) =>
                              updateBankField("bankName", value)
                            }
                          />
                          <DottedField
                            label="A/c No."
                            value={draftDocument.bank.accountNumber}
                            onChangeText={(value) =>
                              updateBankField("accountNumber", value)
                            }
                          />
                          <DottedField
                            label="IFSC Code"
                            value={draftDocument.bank.ifscCode}
                            onChangeText={(value) =>
                              updateBankField("ifscCode", value)
                            }
                          />
                          <DottedField
                            label="Branch"
                            value={draftDocument.bank.branchAddress}
                            onChangeText={(value) =>
                              updateBankField("branchAddress", value)
                            }
                          />
                        </View>
                        <View style={styles.noteBox}>
                          <Text style={styles.sectionLabel}>
                            Terms & Conditions :
                          </Text>
                          <View style={styles.textAreaBlock}>
                            <TextInput
                              value={draftDocument.terms}
                              onChangeText={(value) =>
                                updateDocumentField("terms", value)
                              }
                              multiline
                              style={styles.textArea}
                            />
                          </View>
                        </View>
                      </View>

                      <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Subtotal</Text>
                          <Text style={styles.totalValue}>
                            {formatMoney(totals.subtotal, currency)}
                          </Text>
                        </View>

                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>CGST</Text>
                          <View style={styles.percentInputWrap}>
                            <TextInput
                              value={`${draftDocument.cgstPercent}`}
                              onChangeText={(value) =>
                                updateNumberField("cgstPercent", value)
                              }
                              keyboardType="decimal-pad"
                              style={styles.percentInput}
                            />
                            <Text style={styles.totalLabel}>%</Text>
                          </View>
                          <Text style={styles.totalValue}>
                            {formatMoney(
                              taxSummaryRows[0]?.amount ?? 0,
                              currency,
                            )}
                          </Text>
                        </View>

                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>SGST</Text>
                          <View style={styles.percentInputWrap}>
                            <TextInput
                              value={`${draftDocument.sgstPercent}`}
                              onChangeText={(value) =>
                                updateNumberField("sgstPercent", value)
                              }
                              keyboardType="decimal-pad"
                              style={styles.percentInput}
                            />
                            <Text style={styles.totalLabel}>%</Text>
                          </View>
                          <Text style={styles.totalValue}>
                            {formatMoney(
                              taxSummaryRows[1]?.amount ?? 0,
                              currency,
                            )}
                          </Text>
                        </View>

                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>IGST</Text>
                          <View style={styles.percentInputWrap}>
                            <TextInput
                              value={`${draftDocument.igstPercent}`}
                              onChangeText={(value) =>
                                updateNumberField("igstPercent", value)
                              }
                              keyboardType="decimal-pad"
                              style={styles.percentInput}
                            />
                            <Text style={styles.totalLabel}>%</Text>
                          </View>
                          <Text style={styles.totalValue}>
                            {formatMoney(
                              taxSummaryRows[2]?.amount ?? 0,
                              currency,
                            )}
                          </Text>
                        </View>

                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Freight Charges</Text>
                          <View style={styles.editableTotalValue}>
                            <Text style={styles.currencyPrefix}>
                              {currency}
                            </Text>
                            <TextInput
                              value={`${draftDocument.freightCharges || ""}`}
                              onChangeText={(value) =>
                                updateNumberField("freightCharges", value)
                              }
                              keyboardType="decimal-pad"
                              style={styles.totalInput}
                            />
                          </View>
                        </View>

                        <View style={styles.totalDivider} />

                        <View style={styles.totalRow}>
                          <Text style={[styles.totalLabel, styles.totalStrong]}>
                            Grand Total
                          </Text>
                          <Text
                            style={[
                              styles.totalValue,
                              styles.totalStrong,
                              { color: theme.orange },
                            ]}
                          >
                            {formatMoney(totals.grandTotal, currency)}
                          </Text>
                        </View>

                        <View style={styles.wordsBox}>
                          <Text style={styles.wordsLabel}>
                            Amount in Words :
                          </Text>
                          <TextInput
                            value={getNumberWords(totals.grandTotal, currency)}
                            style={styles.wordsInput}
                            multiline
                            editable={false}
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.signatureArea}>
                      <View style={styles.noteBox}>
                        <Text style={styles.sectionLabel}>Notes :</Text>
                        <View style={styles.textAreaBlock}>
                          <TextInput
                            value={draftDocument.notes}
                            onChangeText={(value) =>
                              updateDocumentField("notes", value)
                            }
                            multiline
                            style={styles.textArea}
                            placeholder="Add any specific notes for client here..."
                          />
                        </View>
                      </View>

                      <View style={styles.signBox}>
                        <Text style={styles.signFor}>
                          For {draftDocument.company.name}
                        </Text>
                        <View style={styles.assetRow}>
                          <AssetPreview
                            label="Stamp"
                            uri={draftDocument.company.stampUrl}
                          />
                          <AssetPreview
                            label="Signature"
                            uri={draftDocument.company.signatureUrl}
                          />
                        </View>
                        <Text style={styles.signLabel}>
                          Authorized Signatory
                        </Text>
                      </View>
                    </View>

                    <DocumentFooter
                      phone={draftDocument.company.phone}
                      email={draftDocument.company.email}
                      website={draftDocument.company.website}
                    />
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
        <ScrollView
          contentContainerStyle={[
            styles.moduleContent,
            isWebsite && styles.webModuleContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.moduleHeader}>
            <Pressable
              style={styles.headerButton}
              onPress={() => router.push(appRoute("/dashboard") as never)}
              accessibilityRole="button"
              accessibilityLabel="Dashboard"
            >
              <Ionicons name="chevron-back" size={22} color={theme.ink} />
            </Pressable>
            <Text style={styles.moduleTitle}>Tax Invoice</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Pressable
            style={styles.createInvoiceButton}
            onPress={() => setSelectorVisible(true)}
          >
            <View style={styles.createInvoiceIcon}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.createInvoiceText}>Create Tax Invoice</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={styles.previousCard}>
            <View style={styles.previousHeader}>
              <Text style={styles.previousTitle}>Previous Documents</Text>
              <Pressable
                style={styles.filterButton}
                onPress={() => setFilterOpen((value) => !value)}
              >
                <Text style={styles.filterButtonText}>
                  {
                    previousFilters.find((item) => item.type === previousFilter)
                      ?.label
                  }
                </Text>
                <Ionicons
                  name={filterOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.ink}
                />
              </Pressable>
            </View>

            {filterOpen ? (
              <View style={styles.filterMenu}>
                {previousFilters.map((filter) => (
                  <Pressable
                    key={filter.type}
                    style={[
                      styles.filterOption,
                      previousFilter === filter.type &&
                        styles.filterOptionActive,
                    ]}
                    onPress={() => {
                      setPreviousFilter(filter.type);
                      setFilterOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        previousFilter === filter.type &&
                          styles.filterOptionTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {loading || historyLoading ? (
              <Text style={styles.emptyText}>Loading documents...</Text>
            ) : previousDocuments.length ? (
              previousDocuments.map((document) => (
                <View
                  key={document.id || document.documentNumber}
                  style={styles.previousRow}
                >
                  <Pressable
                    style={styles.previousMain}
                    onPress={() =>
                      router.push(
                        appRoute("/preview", {
                          type: "invoice",
                          invoiceId: document.id || "",
                        }) as never,
                      )
                    }
                  >
                    <View style={styles.previousIcon}>
                      <Ionicons
                        name={
                          document.documentType === "bill_of_supply"
                            ? "document-text-outline"
                            : "receipt-outline"
                        }
                        size={18}
                        color={theme.orange}
                      />
                    </View>
                    <View style={styles.previousCopy}>
                      <Text style={styles.previousNumber}>
                        {document.documentNumber}
                      </Text>
                      <Text style={styles.previousMeta}>
                        {document.invoiceDate} •{" "}
                        {document.customer.name || "Recipient"} •{" "}
                        {getStatusLabel(document.status)}
                      </Text>
                    </View>
                    <Text style={styles.previousAmount}>
                      {formatMoney(
                        document.grandTotal,
                        document.company.currency,
                      )}
                    </Text>
                  </Pressable>
                  <View style={styles.previousActions}>
                    <Pressable
                      style={styles.rowIconButton}
                      onPress={() =>
                        router.push(
                          appRoute("/preview", {
                            type: "invoice",
                            invoiceId: document.id || "",
                          }) as never,
                        )
                      }
                    >
                      <Ionicons
                        name="eye-outline"
                        size={17}
                        color={theme.muted}
                      />
                    </Pressable>
                    {document.status === "draft" ? (
                      <Pressable
                        style={styles.rowIconButton}
                        onPress={() => editDocument(document)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={17}
                          color={theme.muted}
                        />
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={styles.rowIconButton}
                      onPress={() => printDocument(document)}
                    >
                      <Ionicons
                        name="print-outline"
                        size={17}
                        color={theme.muted}
                      />
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="document-text-outline"
                    size={28}
                    color={theme.orange}
                  />
                </View>
                <Text style={styles.emptyTitle}>No saved documents yet</Text>
                <Text style={styles.emptyText}>
                  Saved {getDocumentLabel(previousFilter).toLowerCase()} records
                  will appear here with number, date, recipient, amount, and
                  status.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <Modal
          transparent
          visible={selectorVisible}
          animationType={isPhone ? "slide" : "fade"}
          onRequestClose={() => setSelectorVisible(false)}
        >
          <View
            style={[
              styles.selectorOverlay,
              isPhone && styles.selectorOverlayPhone,
            ]}
          >
            <View
              style={[styles.selectorModal, isPhone && styles.selectorSheet]}
            >
              <View style={styles.selectorHeader}>
                <View>
                  <Text style={styles.selectorTitle}>Create New Document</Text>
                  <Text style={styles.selectorSubtitle}>
                    Choose the document type you want to create.
                  </Text>
                </View>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setSelectorVisible(false)}
                >
                  <Ionicons name="close" size={20} color={theme.ink} />
                </Pressable>
              </View>
              {documentOptions.map((option) => (
                <Pressable
                  key={option.type}
                  style={styles.selectorOption}
                  onPress={() => startDocument(option.type)}
                >
                  <View style={styles.selectorIcon}>
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={theme.orange}
                    />
                  </View>
                  <View style={styles.selectorCopy}>
                    <Text style={styles.selectorOptionTitle}>
                      {option.title}
                    </Text>
                    <Text style={styles.selectorOptionText}>
                      {option.description}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.muted}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
      </Animated.View>
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
      style={textStyle}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor="#A0A0A0"
    />
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
    <View
      style={[
        { alignItems: "center", flexDirection: "row", minHeight: 25 },
        compact && { flex: 1 },
      ]}
    >
      <Text
        style={{
          color: DocumentColors.muted,
          fontSize: 12,
          fontWeight: "700",
          marginRight: 4,
        }}
      >
        {label}
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

function BoxedGstinField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", marginTop: 4 }}>
      <Text
        style={{
          color: DocumentColors.accent,
          fontSize: 12,
          fontWeight: "700",
          marginRight: 4,
        }}
      >
        GSTIN :
      </Text>
      <TextInput
        style={{
          borderColor: DocumentColors.accent,
          borderWidth: 1.4,
          color: DocumentColors.ink,
          fontSize: 14,
          fontWeight: "800",
          height: 32,
          letterSpacing: 4,
          paddingHorizontal: 6,
          width: 280,
        }}
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
    <View
      style={{
        alignItems: "center",
        borderColor: "#EEEEEE",
        borderRadius: 4,
        borderWidth: 1,
        flex: 1,
        minHeight: 58,
        padding: 6,
      }}
    >
      <Text
        style={{
          color: "#777777",
          fontSize: 9,
          fontWeight: "800",
          marginBottom: 3,
        }}
      >
        {label}
      </Text>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ height: 38, width: "100%" }}
          contentFit="contain"
        />
      ) : (
        <Text style={{ color: theme.muted, fontSize: 9 }}>Not uploaded</Text>
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
    moduleContent: {
      alignSelf: "center",
      maxWidth: 680,
      padding: 18,
      width: "100%",
    },
    webModuleContent: {
      maxWidth: 1040,
      paddingHorizontal: 40,
      paddingBottom: 56,
      paddingTop: 38,
    },
    moduleHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    moduleTitle: { color: theme.ink, fontSize: 24, fontWeight: "900" },
    headerSpacer: { width: 44 },
    headerButton: {
      alignItems: "center",
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderRadius: 14,
      borderWidth: 1,
      height: 40,
      justifyContent: "center",
      width: 40,
      ...shadow,
    },
    createInvoiceButton: {
      alignItems: "center",
      backgroundColor: theme.orange,
      borderRadius: 20,
      flexDirection: "row",
      gap: 12,
      marginBottom: 18,
      padding: 18,
    },
    createInvoiceIcon: {
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      borderRadius: 14,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    createInvoiceText: {
      color: "#FFFFFF",
      flex: 1,
      fontSize: 17,
      fontWeight: "800",
    },
    previousCard: {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderRadius: 20,
      borderWidth: 1,
      padding: 18,
      ...shadow,
    },
    previousHeader: { alignItems: "flex-start", gap: 10, marginBottom: 12 },
    previousTitle: { color: theme.ink, fontSize: 18, fontWeight: "800" },
    filterButton: {
      alignItems: "center",
      alignSelf: "stretch",
      backgroundColor: theme.wash,
      borderColor: theme.line,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    filterButtonText: { color: theme.ink, fontSize: 13, fontWeight: "800" },
    filterMenu: {
      borderColor: theme.line,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
      overflow: "hidden",
    },
    filterOption: { paddingHorizontal: 12, paddingVertical: 11 },
    filterOptionActive: { backgroundColor: theme.orangeSoft },
    filterOptionText: { color: theme.muted, fontSize: 13, fontWeight: "700" },
    filterOptionTextActive: { color: theme.orangeDark },
    previousRow: {
      borderTopColor: theme.line,
      borderTopWidth: 1,
      paddingVertical: 12,
    },
    previousMain: { alignItems: "center", flexDirection: "row" },
    previousIcon: {
      alignItems: "center",
      backgroundColor: theme.orangeSoft,
      borderRadius: 14,
      height: 40,
      justifyContent: "center",
      marginRight: 12,
      width: 40,
    },
    previousCopy: { flex: 1 },
    previousNumber: {
      color: theme.ink,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 3,
    },
    previousMeta: { color: theme.muted, fontSize: 12 },
    previousAmount: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: "800",
      marginLeft: 10,
    },
    previousActions: {
      flexDirection: "row",
      gap: 8,
      justifyContent: "flex-end",
      marginTop: 10,
    },
    rowIconButton: {
      alignItems: "center",
      backgroundColor: theme.wash,
      borderColor: theme.line,
      borderRadius: 12,
      borderWidth: 1,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    emptyState: {
      alignItems: "center",
      borderColor: theme.line,
      borderRadius: 18,
      borderStyle: "dashed",
      borderWidth: 1,
      paddingHorizontal: 18,
      paddingVertical: 34,
    },
    emptyIcon: {
      alignItems: "center",
      backgroundColor: theme.orangeSoft,
      borderRadius: 22,
      height: 56,
      justifyContent: "center",
      marginBottom: 14,
      width: 56,
    },
    emptyTitle: {
      color: theme.ink,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 6,
      textAlign: "center",
    },
    emptyText: {
      color: theme.muted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
    },
    editorHeader: {
      alignItems: "center",
      backgroundColor: theme.card,
      borderBottomColor: theme.line,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    editorTitle: {
      color: theme.ink,
      flex: 1,
      fontSize: 18,
      fontWeight: "800",
      textAlign: "center",
    },
    editorActions: { alignItems: "center", flexDirection: "row", gap: 8 },
    saveButton: {
      backgroundColor: theme.orange,
      borderRadius: 999,
      paddingHorizontal: 15,
      paddingVertical: 10,
    },
    saveButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    secondaryButton: {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    secondaryButtonText: { color: theme.ink, fontSize: 12, fontWeight: "800" },
    disabledButton: { opacity: 0.7 },
    phoneHorizontalWorkspace: { minWidth: 860 },
    editorContent: {
      alignSelf: "center",
      minWidth: 820,
      paddingHorizontal: 14,
      paddingBottom: 96,
      paddingTop: 14,
      width: "100%",
      backgroundColor: theme.background,
    },
    webEditorContent: { maxWidth: 1120, paddingHorizontal: 40, paddingTop: 24 },
    errorBox: {
      alignSelf: "center",
      backgroundColor: "#FFF2F0",
      borderColor: "#FFD2CC",
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
      maxWidth: 794,
      padding: 12,
      width: "100%",
    },
    errorText: {
      color: theme.orangeDark,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 18,
    },
    a4Paper: {
      alignSelf: "center",
      aspectRatio: 210 / 297,
      backgroundColor: DocumentColors.paper,
      borderColor: DocumentColors.line,
      borderRadius: 2,
      borderWidth: 1,
      maxWidth: 794,
      minHeight: 1123,
      padding: 32,
      width: 794,
      ...shadow,
    },
    webA4Paper: { width: 794 },
    partiesGrid: {
      borderBottomColor: DocumentColors.line,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 16,
      marginVertical: 12,
      minHeight: 130,
      paddingBottom: 12,
    },
    partyBox: { flex: 1, gap: 4 },
    sectionLabel: {
      color: DocumentColors.accent,
      fontSize: 11,
      fontWeight: "800",
      marginBottom: 8,
    },
    recipientLine: { flexDirection: "row", gap: 8 },
    taxModeRow: {
      alignItems: "center",
      borderBottomColor: DocumentColors.line,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 8,
      paddingVertical: 8,
    },
    taxModePill: {
      borderColor: DocumentColors.line,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    taxModePillActive: {
      backgroundColor: DocumentColors.accentSoft,
      borderColor: DocumentColors.accent,
    },
    taxModeText: { color: theme.muted, fontSize: 11, fontWeight: "800" },
    taxModeTextActive: { color: DocumentColors.accentDark },
    tableToolbar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    addRowButton: {
      alignItems: "center",
      backgroundColor: DocumentColors.accent,
      borderRadius: 999,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    addRowText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
    itemTable: {
      borderColor: DocumentColors.accent,
      borderRadius: 8,
      borderWidth: 1,
      overflow: "hidden",
      width: "100%",
    },
    itemRow: { flexDirection: "row" },
    itemHeaderRow: { backgroundColor: DocumentColors.accent },
    headerCell: { color: DocumentColors.tableHeaderText },
    tableCell: {
      borderRightColor: DocumentColors.line,
      borderRightWidth: 1,
      borderTopColor: DocumentColors.line,
      borderTopWidth: 1,
      color: DocumentColors.muted,
      flexShrink: 1,
      fontSize: 9,
      fontWeight: "800",
      minHeight: 28,
      paddingHorizontal: 4,
      paddingVertical: 5,
    },
    serialCell: { textAlign: "center", width: 35 },
    itemCell: { flex: 1, minWidth: 110, width: 140 },
    codeCell: { textAlign: "center", width: 42 },
    smallCell: { textAlign: "center", width: 52 },
    amountCell: { width: 78 },
    actionCell: { borderRightWidth: 0, width: 52 },
    amountText: { fontWeight: "800", textAlign: "right" },
    rowActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 2,
      justifyContent: "center",
      paddingHorizontal: 2,
      paddingVertical: 2,
    },
    summaryArea: {
      borderBottomColor: "#8A8A8A",
      borderBottomWidth: 1.3,
      flexDirection: "row",
      gap: 0,
      paddingVertical: 0,
    },
    bankTermsColumn: {
      borderRightColor: "#8A8A8A",
      borderRightWidth: 1.3,
      flex: 1.18,
    },
    bankBox: {
      borderBottomColor: "#8A8A8A",
      borderBottomWidth: 1.3,
      minHeight: 92,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    textAreaBlock: {
      borderColor: "#DADADA",
      borderRadius: 4,
      borderWidth: 1,
      padding: 9,
    },
    textArea: {
      color: "#333333",
      fontSize: 11,
      lineHeight: 16,
      minHeight: 62,
      padding: 0,
      textAlignVertical: "top",
    },
    totalsBox: { flex: 0.95, paddingHorizontal: 12, paddingVertical: 4 },
    totalRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 5,
    },
    totalLabel: { color: "#333333", flex: 1, fontSize: 11, fontWeight: "700" },
    totalValue: {
      color: "#111111",
      fontSize: 11,
      fontWeight: "900",
      textAlign: "right",
    },
    totalStrong: { fontSize: 14, fontWeight: "900" },
    editableTotalValue: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    currencyPrefix: {
      color: "#777777",
      fontSize: 10,
      fontWeight: "800",
      marginRight: 4,
    },
    totalInput: {
      borderBottomColor: "#BBBBBB",
      borderBottomWidth: 1,
      color: "#111111",
      fontSize: 11,
      fontWeight: "800",
      minWidth: 58,
      padding: 0,
      textAlign: "right",
    },
    percentInputWrap: { alignItems: "center", flexDirection: "row", gap: 5 },
    percentInput: {
      borderBottomColor: "#BBBBBB",
      borderBottomWidth: 1,
      color: "#111111",
      fontSize: 11,
      fontWeight: "800",
      minWidth: 34,
      padding: 0,
      textAlign: "center",
    },
    totalDivider: { backgroundColor: "#222222", height: 1, marginVertical: 5 },
    wordsBox: {
      borderTopColor: "#DDDDDD",
      borderTopWidth: 1,
      marginTop: 8,
      paddingTop: 8,
    },
    wordsLabel: {
      color: "#555555",
      fontSize: 9,
      fontWeight: "900",
      marginBottom: 4,
      textTransform: "uppercase",
    },
    wordsInput: {
      color: "#222222",
      fontSize: 11,
      fontWeight: "700",
      minHeight: 34,
      padding: 0,
      textAlignVertical: "top",
    },
    signatureArea: { flexDirection: "row", gap: 0, minHeight: 93 },
    noteBox: {
      borderRightColor: "#8A8A8A",
      borderRightWidth: 1.3,
      flex: 1.2,
      padding: 9,
    },
    signBox: {
      alignItems: "flex-end",
      flex: 1,
      justifyContent: "space-between",
      minHeight: 93,
      padding: 12,
    },
    signFor: {
      color: "#4A4A4A",
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 8,
    },
    assetRow: { flexDirection: "row", gap: 8, width: "100%" },
    signLabel: {
      color: "#4A4A4A",
      fontSize: 16,
      fontWeight: "500",
      marginTop: 10,
    },
    selectorOverlay: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.34)",
      flex: 1,
      justifyContent: "center",
      padding: 22,
    },
    selectorOverlayPhone: { justifyContent: "flex-end", padding: 0 },
    selectorModal: {
      backgroundColor: theme.card,
      borderRadius: 18,
      maxWidth: 460,
      padding: 18,
      width: "100%",
      ...shadow,
    },
    selectorSheet: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      maxWidth: "100%",
      paddingBottom: 26,
    },
    selectorHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    selectorTitle: {
      color: theme.ink,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 4,
    },
    selectorSubtitle: { color: theme.muted, fontSize: 13, lineHeight: 18 },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.wash,
      borderColor: theme.line,
      borderRadius: 14,
      borderWidth: 1,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    selectorOption: {
      alignItems: "center",
      borderColor: theme.line,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      marginTop: 10,
      padding: 14,
    },
    selectorIcon: {
      alignItems: "center",
      backgroundColor: theme.orangeSoft,
      borderRadius: 14,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    selectorCopy: { flex: 1 },
    selectorOptionTitle: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: "900",
      marginBottom: 3,
    },
    selectorOptionText: { color: theme.muted, fontSize: 12, lineHeight: 17 },
  });
