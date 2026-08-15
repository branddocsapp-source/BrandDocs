import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { loadBusinessProfile } from "@/services/business-profile";
import {
  calculateDocumentTotals,
  getDocumentLabel,
  getDocumentTitle,
  getLineAmount,
  InvoiceRecord,
  InvoiceStatus,
  loadInvoiceById,
  saveInvoice,
} from "@/services/invoices";
import {
  calculateQuotationTotals,
  getQuotationItemAmount,
  getQuotationLabel,
  getQuotationTitle,
  loadQuotationById,
  QuotationRecord,
  QuotationStatus,
  saveQuotation,
} from "@/services/quotations";
import {
  LetterheadRecord,
  LetterheadStatus,
  loadLetterheadById,
  saveLetterhead,
} from "@/services/letterheads";
import {
  ReceiptRecord,
  ReceiptStatus,
  loadReceiptById,
  saveReceipt,
  getPaymentMethodLabel,
} from "@/services/receipts";
import { VisitingCardPreview } from "@/components/visiting-card/VisitingCardPreview";
import { ReceiptPaper } from "@/components/document-template/ReceiptPaper";
import {
  DocumentBrandHeader,
  DocumentColors,
  DocumentFooter,
  DocumentGrandTotalRow,
  DocumentPaperShell,
  DocumentSectionTitle,
  DocumentTableHeader,
  DocumentTaxBar,
} from "@/components/document-template";
import {
  duplicateVisitingCardRecord,
  loadVisitingCardById,
  saveVisitingCard,
  VisitingCardRecord,
  VisitingCardStatus,
} from "@/services/visiting-cards";
import { useAppTheme, ThemePalette } from "@/theme/theme-context";
import { Colors } from "@/theme/colors";
import { BrandColors, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";

const statusOptions: { value: InvoiceStatus; label: string; description: string }[] = [
  { value: "draft", label: "Draft", description: "Still editable" },
  { value: "pending", label: "Pending", description: "Payment outstanding" },
  { value: "paid", label: "Paid", description: "Payment received" },
];

const quotationStatusOptions: { value: QuotationStatus; label: string; description: string }[] = [
  { value: "draft", label: "Draft", description: "Still editable" },
  { value: "sent", label: "Sent", description: "Awaiting response" },
  { value: "accepted", label: "Accepted", description: "Approved by client" },
  { value: "rejected", label: "Rejected", description: "Declined by client" },
];

const letterheadStatusOptions: { value: LetterheadStatus; label: string; description: string }[] = [
  { value: "draft", label: "Draft", description: "Still editable" },
  { value: "final", label: "Final", description: "Ready to share" },
];

const visitingCardStatusOptions: { value: VisitingCardStatus; label: string; description: string }[] = [
  { value: "draft", label: "Draft", description: "Still editable" },
  { value: "final", label: "Final", description: "Ready to share" },
];

const receiptStatusOptions: { value: ReceiptStatus; label: string; description: string }[] = [
  { value: "draft", label: "Draft", description: "Still editable" },
  { value: "final", label: "Final", description: "Ready to share" },
];

function toNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(amount: number, currency: string) {
  return `${currency || "INR"} ${amount.toFixed(2)}`;
}

function getStatusLabel(status: InvoiceStatus) {
  if (status === "paid") return "Paid";
  if (status === "pending") return "Pending";
  return "Draft";
}

function getQuotationStatusLabel(status: QuotationStatus) {
  if (status === "sent") return "Sent";
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
  return "Draft";
}

function getLetterheadStatusLabel(status: LetterheadStatus) {
  return status === "final" ? "Final" : "Draft";
}

function getVisitingCardStatusLabel(status: VisitingCardStatus) {
  return status === "final" ? "Final" : "Draft";
}

export default function PreviewScreen() {
  const { theme, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const router = useRouter();
  const { content, type, invoiceId, quotationId, letterheadId, visitingCardId, receiptId, action } = useLocalSearchParams<{
    content?: string;
    type?: string;
    invoiceId?: string;
    quotationId?: string;
    letterheadId?: string;
    visitingCardId?: string;
    receiptId?: string;
    action?: string;
  }>();
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [letterhead, setLetterhead] = useState<LetterheadRecord | null>(null);
  const [visitingCard, setVisitingCard] = useState<VisitingCardRecord | null>(null);
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>("draft");
  const [selectedQuotationStatus, setSelectedQuotationStatus] = useState<QuotationStatus>("draft");
  const [selectedLetterheadStatus, setSelectedLetterheadStatus] = useState<LetterheadStatus>("draft");
  const [selectedVisitingCardStatus, setSelectedVisitingCardStatus] = useState<VisitingCardStatus>("draft");
  const [selectedReceiptStatus, setSelectedReceiptStatus] = useState<ReceiptStatus>("draft");
  const [loading, setLoading] = useState(type === "invoice" || type === "quotation" || type === "letterhead" || type === "visitingCard" || type === "receipt");
  const [saving, setSaving] = useState(false);
  const { width, isWebsite, isDesktop, isAppPreview } = useResponsiveLayout();
  const isPhone = width < 640;
  const baseWidth = 794;
  const baseHeight = 1123;
  const scale = width < 820 ? (width - 28) / baseWidth : 1;

  function appRoute(pathname: string, params?: Record<string, string>) {
    if (!isAppPreview) return params ? { pathname, params } : pathname;
    return { pathname, params: { ...params, appPreview: "1" } };
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateInvoicePreview() {
      if (type !== "invoice" || !invoiceId) return;

      const profile = await loadBusinessProfile(auth.currentUser);
      const savedInvoice = await loadInvoiceById(auth.currentUser, profile, invoiceId);

      if (isMounted) {
        setInvoice(savedInvoice);
        setSelectedStatus(savedInvoice?.status || "draft");
        setLoading(false);
      }
    }

    async function hydrateQuotationPreview() {
      if (type !== "quotation" || !quotationId) return;

      const profile = await loadBusinessProfile(auth.currentUser);
      const savedQuotation = await loadQuotationById(auth.currentUser, profile, quotationId);

      if (isMounted) {
        setQuotation(savedQuotation);
        setSelectedQuotationStatus(savedQuotation?.status || "draft");
        setLoading(false);
      }
    }

    async function hydrateLetterheadPreview() {
      if (type !== "letterhead" || !letterheadId) return;

      const profile = await loadBusinessProfile(auth.currentUser);
      const savedLetterhead = await loadLetterheadById(auth.currentUser, profile, letterheadId);

      if (isMounted) {
        setLetterhead(savedLetterhead);
        setSelectedLetterheadStatus(savedLetterhead?.status || "draft");
        setLoading(false);
      }
    }

    async function hydrateVisitingCardPreview() {
      if (type !== "visitingCard" || !visitingCardId) return;

      const profile = await loadBusinessProfile(auth.currentUser);
      const savedVisitingCard = await loadVisitingCardById(auth.currentUser, profile, visitingCardId);

      if (isMounted) {
        setVisitingCard(savedVisitingCard);
        setSelectedVisitingCardStatus(savedVisitingCard?.status || "draft");
        setLoading(false);
      }
    }

    async function hydrateReceiptPreview() {
      if (type !== "receipt" || !receiptId) return;

      const profile = await loadBusinessProfile(auth.currentUser);
      const savedReceipt = await loadReceiptById(auth.currentUser, profile, receiptId);

      if (isMounted) {
        setReceipt(savedReceipt);
        setSelectedReceiptStatus(savedReceipt?.status || "draft");
        setLoading(false);
      }
    }

    hydrateInvoicePreview();
    hydrateQuotationPreview();
    hydrateLetterheadPreview();
    hydrateVisitingCardPreview();
    hydrateReceiptPreview();

    return () => {
      isMounted = false;
    };
  }, [invoiceId, quotationId, letterheadId, visitingCardId, receiptId, type]);

  useEffect(() => {
    if (type !== "letterhead" || !letterhead || (action !== "print" && action !== "pdf")) return;

    const timer = setTimeout(() => {
      handlePrint();
    }, 300);

    return () => clearTimeout(timer);
  }, [action, letterhead, type]);

  async function handleFinalSave() {
    if (!invoice) return;

    try {
      setSaving(true);
      const profile = await loadBusinessProfile(auth.currentUser);
      const result = await saveInvoice(auth.currentUser, profile, { ...invoice, status: selectedStatus });
      setInvoice(result.invoice);

      Alert.alert(
        `${getDocumentLabel(result.invoice.documentType)} Saved`,
        `${result.invoice.documentNumber} is saved as ${getStatusLabel(result.invoice.status)}.`
      );
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "We could not save this document status. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuotationFinalSave() {
    if (!quotation) return;

    try {
      setSaving(true);
      const profile = await loadBusinessProfile(auth.currentUser);
      const result = await saveQuotation(auth.currentUser, profile, { ...quotation, status: selectedQuotationStatus });
      setQuotation(result.quotation);

      Alert.alert(
        `${getQuotationLabel(result.quotation.documentType)} Saved`,
        `${result.quotation.quotationNumber} is saved as ${getQuotationStatusLabel(result.quotation.status)}.`
      );
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "We could not save this quotation status. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLetterheadFinalSave() {
    if (!letterhead) return;

    try {
      setSaving(true);
      const profile = await loadBusinessProfile(auth.currentUser);
      const result = await saveLetterhead(auth.currentUser, profile, { ...letterhead, status: selectedLetterheadStatus });
      setLetterhead(result.letterhead);

      Alert.alert(
        "Letterhead Saved",
        `${result.letterhead.letterheadNumber} is saved as ${getLetterheadStatusLabel(result.letterhead.status)}.`
      );
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "We could not save this letterhead status. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVisitingCardFinalSave() {
    if (!visitingCard) return;

    try {
      setSaving(true);
      const profile = await loadBusinessProfile(auth.currentUser);
      const result = await saveVisitingCard(auth.currentUser, profile, { ...visitingCard, status: selectedVisitingCardStatus });
      setVisitingCard(result.card);

      Alert.alert(
        "Visiting Card Saved",
        `${result.card.fullName || result.card.cardNumber} is saved as ${getVisitingCardStatusLabel(result.card.status)}.`
      );
    } catch (error: any) {
      console.error("BrandDocs visiting card preview save failed.", error);
      Alert.alert("Save Failed", error?.message || "We could not save this visiting card status. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReceiptFinalSave() {
    if (!receipt) return;

    try {
      setSaving(true);
      const profile = await loadBusinessProfile(auth.currentUser);
      const result = await saveReceipt(auth.currentUser, profile, { ...receipt, status: selectedReceiptStatus });
      setReceipt(result.receipt);

      Alert.alert(
        "Receipt Saved",
        `${result.receipt.receiptNumber} is saved as ${result.receipt.status === "final" ? "Final" : "Draft"}.`
      );
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "We could not save this receipt status. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVisitingCardDuplicate() {
    if (!visitingCard) return;

    try {
      setSaving(true);
      const profile = await loadBusinessProfile(auth.currentUser);
      const duplicate = duplicateVisitingCardRecord(visitingCard, [visitingCard]);
      const result = await saveVisitingCard(auth.currentUser, profile, duplicate);
      Alert.alert("Visiting Card Duplicated", `${result.card.fullName} was duplicated as a draft.`, [
        { text: "Edit", onPress: () => router.replace(appRoute("/visiting-card", { editCardId: result.card.id || "" }) as never) },
        { text: "Stay" },
      ]);
    } catch (error: any) {
      console.error("BrandDocs visiting card duplicate failed.", error);
      Alert.alert("Duplicate Failed", error?.message || "We could not duplicate this visiting card.");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
      return;
    }

    Alert.alert("Print", "Native print/PDF export needs the Expo print package; web print is available in this build.");
  }

  function handleShare() {
    if (!visitingCard) return;
    const text = `${visitingCard.fullName} - ${visitingCard.businessName}\n${visitingCard.mobileNumber}\n${visitingCard.email}\n${visitingCard.website}`.trim();
    if (Platform.OS === "web" && typeof navigator !== "undefined" && "share" in navigator) {
      void (navigator as any).share({ title: "Visiting Card", text }).catch((error: any) => {
        console.error("BrandDocs visiting card web share failed.", error);
        Alert.alert("Share Failed", error?.message || "Share was cancelled or failed.");
      });
      return;
    }

    Alert.alert("Share", "Native share needs expo-sharing, which is not installed in this project.");
  }

  if (type === "invoice") {
    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <View style={[styles.header, isWebsite && styles.webHeader]}>
            <Pressable style={styles.backButton} onPress={() => router.replace(appRoute("/invoice") as never)}>
              <Ionicons name="chevron-back" size={22} color={theme.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>{invoice ? `${getDocumentLabel(invoice.documentType)} Preview` : "Document Preview"}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.container, isWebsite && styles.webContainer, width < 820 && { minWidth: 0 }]} showsVerticalScrollIndicator={false}>
              {loading ? (
                <Text style={styles.loadingText}>Loading document...</Text>
              ) : invoice ? (
                <>
                  <View style={styles.workflowBar}>
                    <Text style={styles.workflowTitle}>Set Status</Text>
                    <View style={styles.statusGrid}>
                      {statusOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          style={[styles.statusBox, selectedStatus === option.value && styles.statusBoxActive]}
                          onPress={() => setSelectedStatus(option.value)}
                        >
                          <Text style={[styles.statusLabel, selectedStatus === option.value && styles.statusLabelActive]}>{option.label}</Text>
                          <Text style={styles.statusDescription}>{option.description}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.previewActions}>
                      {selectedStatus === "draft" ? (
                        <Pressable style={styles.secondaryAction} onPress={() => router.replace(appRoute("/invoice", { editInvoiceId: invoice.id || "" }) as never)}>
                          <Ionicons name="create-outline" size={16} color={theme.ink} />
                          <Text style={styles.secondaryActionText}>Edit</Text>
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="print-outline" size={16} color={theme.ink} />
                        <Text style={styles.secondaryActionText}>Print</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="document-attach-outline" size={16} color={theme.ink} />
                        <Text style={styles.secondaryActionText}>PDF</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryAction, saving && styles.disabledButton]} onPress={handleFinalSave} disabled={saving}>
                        <Text style={styles.primaryActionText}>{saving ? "Saving" : "Final Save"}</Text>
                      </Pressable>
                    </View>
                  </View>
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
                    <View style={
                      width < 820 ? {
                        transform: [{ scale: scale }],
                        position: "absolute",
                      } : undefined
                    }>
                      <InvoicePreview invoice={{ ...invoice, status: selectedStatus }} isDesktop={isDesktop} />
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Document not found</Text>
                  <Text style={styles.emptyText}>We could not load this saved document.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (type === "quotation") {
    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <View style={[styles.header, isWebsite && styles.webHeader]}>
            <Pressable style={styles.backButton} onPress={() => router.replace(appRoute("/quotation") as never)}>
              <Ionicons name="chevron-back" size={22} color={theme.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>{quotation ? `${getQuotationLabel(quotation.documentType)} Preview` : "Quotation Preview"}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.container, isWebsite && styles.webContainer, width < 820 && { minWidth: 0 }]} showsVerticalScrollIndicator={false}>
              {loading ? (
                <Text style={styles.loadingText}>Loading quotation...</Text>
              ) : quotation ? (
                <>
                  <View style={styles.workflowBar}>
                    <Text style={styles.workflowTitle}>Set Status</Text>
                    <View style={styles.statusGrid}>
                      {quotationStatusOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          style={[styles.statusBox, selectedQuotationStatus === option.value && styles.statusBoxActive]}
                          onPress={() => setSelectedQuotationStatus(option.value)}
                        >
                          <Text style={[styles.statusLabel, selectedQuotationStatus === option.value && styles.statusLabelActive]}>{option.label}</Text>
                          <Text style={styles.statusDescription}>{option.description}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.previewActions}>
                      {selectedQuotationStatus === "draft" ? (
                        <Pressable style={styles.secondaryAction} onPress={() => router.replace(appRoute("/quotation", { editQuotationId: quotation.id || "" }) as never)}>
                          <Ionicons name="create-outline" size={16} color={theme.ink} />
                          <Text style={styles.secondaryActionText}>Edit</Text>
                        </Pressable>
                      ) : null}
                      {selectedQuotationStatus === "accepted" ? (
                        <Pressable style={[styles.secondaryAction, styles.disabledButton]} disabled>
                          <Ionicons name="swap-horizontal-outline" size={16} color={theme.muted} />
                          <Text style={styles.secondaryActionText}>Convert to Tax Invoice</Text>
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="print-outline" size={16} color={theme.ink} />
                        <Text style={styles.secondaryActionText}>Print</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="document-attach-outline" size={16} color={theme.ink} />
                        <Text style={styles.secondaryActionText}>PDF</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryAction, saving && styles.disabledButton]} onPress={handleQuotationFinalSave} disabled={saving}>
                        <Text style={styles.primaryActionText}>{saving ? "Saving" : "Final Save"}</Text>
                      </Pressable>
                    </View>
                  </View>
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
                    <View style={
                      width < 820 ? {
                        transform: [{ scale: scale }],
                        position: "absolute",
                      } : undefined
                    }>
                      <QuotationPreview quotation={{ ...quotation, status: selectedQuotationStatus }} isDesktop={isDesktop} />
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Quotation not found</Text>
                  <Text style={styles.emptyText}>We could not load this saved quotation.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (type === "letterhead") {
    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <View style={[styles.header, isWebsite && styles.webHeader]}>
            <Pressable style={styles.backButton} onPress={() => router.replace(appRoute("/letterhead") as never)}>
              <Ionicons name="chevron-back" size={22} color={theme.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>{letterhead ? "Letterhead Preview" : "Letterhead"}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.container, isWebsite && styles.webContainer, width < 820 && { minWidth: 0 }]} showsVerticalScrollIndicator={false}>
              {loading ? (
                <Text style={styles.loadingText}>Loading letterhead...</Text>
              ) : letterhead ? (
                <>
                  <View style={styles.workflowBar}>
                    <Text style={styles.workflowTitle}>Set Status</Text>
                    <View style={styles.statusGrid}>
                      {letterheadStatusOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          style={[styles.statusBox, selectedLetterheadStatus === option.value && styles.statusBoxActive]}
                          onPress={() => setSelectedLetterheadStatus(option.value)}
                        >
                          <Text style={[styles.statusLabel, selectedLetterheadStatus === option.value && styles.statusLabelActive]}>{option.label}</Text>
                          <Text style={styles.statusDescription}>{option.description}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.previewActions}>
                      {selectedLetterheadStatus === "bold" || selectedLetterheadStatus === "draft" ? (
                        <Pressable style={styles.secondaryAction} onPress={() => router.replace(appRoute("/letterhead", { editLetterheadId: letterhead.id || "" }) as never)}>
                          <Ionicons name="create-outline" size={16} color={theme.ink} />
                          <Text style={styles.secondaryActionText}>Edit</Text>
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="print-outline" size={16} color={theme.ink} />
                        <Text style={styles.secondaryActionText}>Print</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="document-attach-outline" size={16} color={theme.ink} />
                        <Text style={styles.secondaryActionText}>PDF</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryAction, saving && styles.disabledButton]} onPress={handleLetterheadFinalSave} disabled={saving}>
                        <Text style={styles.primaryActionText}>{saving ? "Saving" : "Final Save"}</Text>
                      </Pressable>
                    </View>
                  </View>
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
                    <View style={
                      width < 820 ? {
                        transform: [{ scale: scale }],
                        position: "absolute",
                      } : undefined
                    }>
                      <LetterheadPreview letterhead={{ ...letterhead, status: selectedLetterheadStatus }} isDesktop={isDesktop} />
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Letterhead not found</Text>
                  <Text style={styles.emptyText}>We could not load this saved letterhead.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (type === "visitingCard") {
    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <View style={[styles.header, isWebsite && styles.webHeader]}>
            <Pressable style={styles.backButton} onPress={() => router.replace(appRoute("/visiting-card") as never)}>
              <Ionicons name="chevron-back" size={22} color={theme.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>{visitingCard ? "Visiting Card Preview" : "Visiting Card"}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.container, isWebsite && styles.webContainer]} showsVerticalScrollIndicator={false}>
              {loading ? (
              <Text style={styles.loadingText}>Loading visiting card...</Text>
            ) : visitingCard ? (
              <>
                <View style={styles.workflowBar}>
                  <Text style={styles.workflowTitle}>Set Status</Text>
                  <View style={styles.statusGrid}>
                    {visitingCardStatusOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        style={[styles.statusBox, selectedVisitingCardStatus === option.value && styles.statusBoxActive]}
                        onPress={() => setSelectedVisitingCardStatus(option.value)}
                      >
                        <Text style={[styles.statusLabel, selectedVisitingCardStatus === option.value && styles.statusLabelActive]}>{option.label}</Text>
                        <Text style={styles.statusDescription}>{option.description}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.previewActions}>
                    <Pressable style={styles.secondaryAction} onPress={() => router.replace(appRoute("/visiting-card", { editCardId: visitingCard.id || "" }) as never)}>
                      <Ionicons name="create-outline" size={16} color={theme.ink} />
                      <Text style={styles.secondaryActionText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryAction} onPress={handleVisitingCardDuplicate}>
                      <Ionicons name="copy-outline" size={16} color={theme.ink} />
                      <Text style={styles.secondaryActionText}>Duplicate</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                      <Ionicons name="print-outline" size={16} color={theme.ink} />
                      <Text style={styles.secondaryActionText}>Print A4</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                      <Ionicons name="document-attach-outline" size={16} color={theme.ink} />
                      <Text style={styles.secondaryActionText}>PDF</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryAction} onPress={handleShare}>
                      <Ionicons name="share-outline" size={16} color={theme.ink} />
                      <Text style={styles.secondaryActionText}>Share</Text>
                    </Pressable>
                    <Pressable style={[styles.primaryAction, saving && styles.disabledButton]} onPress={handleVisitingCardFinalSave} disabled={saving}>
                      <Text style={styles.primaryActionText}>{saving ? "Saving" : "Save Status"}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.visitingCardPreviewGrid, isDesktop && styles.visitingCardPreviewGridDesktop]}>
                  <View style={styles.visitingCardPreviewPane}>
                    <Text style={styles.workflowTitle}>Front</Text>
                    <VisitingCardPreview card={{ ...visitingCard, status: selectedVisitingCardStatus }} side="front" showActualSizeLabel />
                  </View>
                  {visitingCard.backEnabled ? (
                    <View style={styles.visitingCardPreviewPane}>
                      <Text style={styles.workflowTitle}>Back</Text>
                      <VisitingCardPreview card={{ ...visitingCard, status: selectedVisitingCardStatus }} side="back" showActualSizeLabel />
                    </View>
                  ) : null}
                </View>
              </>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Visiting card not found</Text>
                <Text style={styles.emptyText}>We could not load this saved visiting card.</Text>
              </View>
            )}
            </ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (type === "receipt") {
    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <View style={[styles.header, isWebsite && styles.webHeader]}>
            <Pressable style={styles.backButton} onPress={() => router.replace(appRoute("/receipt") as never)}>
              <Ionicons name="chevron-back" size={22} color={theme.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>{receipt ? "Receipt Preview" : "Receipt"}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.container, isWebsite && styles.webContainer, width < 820 && { minWidth: 0 }]} showsVerticalScrollIndicator={false}>
              {loading ? (
                <Text style={styles.loadingText}>Loading receipt...</Text>
              ) : receipt ? (
                <>
                  <View style={styles.workflowBar}>
                    <Text style={styles.workflowTitle}>Set Status</Text>
                    <View style={styles.statusGrid}>
                      {receiptStatusOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          style={[styles.statusBox, selectedReceiptStatus === option.value && styles.statusBoxActive]}
                          onPress={() => setSelectedReceiptStatus(option.value)}
                        >
                          <Text style={[styles.statusLabel, selectedReceiptStatus === option.value && styles.statusLabelActive]}>{option.label}</Text>
                          <Text style={styles.statusDescription}>{option.description}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.previewActions}>
                      {selectedReceiptStatus === "draft" ? (
                        <Pressable style={styles.secondaryAction} onPress={() => router.replace(appRoute("/receipt", { editReceiptId: receipt.id || "" }) as never)}>
                          <Ionicons name="create-outline" size={16} color={theme.ink} />
                          <Text style={styles.secondaryActionText}>Edit</Text>
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="print-outline" size={16} color={theme.ink} />
                        <Text style={styles.secondaryActionText}>Print</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="document-attach-outline" size={16} color={theme.ink} />
                        <Text style={styles.secondaryActionText}>PDF</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryAction, saving && styles.disabledButton]} onPress={handleReceiptFinalSave} disabled={saving}>
                        <Text style={styles.primaryActionText}>{saving ? "Saving" : "Final Save"}</Text>
                      </Pressable>
                    </View>
                  </View>
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
                    <View style={
                      width < 820 ? {
                        transform: [{ scale: scale }],
                        position: "absolute",
                      } : undefined
                    }>
                      <ReceiptPaper receipt={{ ...receipt, status: selectedReceiptStatus }} isDesktop={isDesktop} />
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Receipt not found</Text>
                  <Text style={styles.emptyText}>We could not load this saved receipt.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.container, isWebsite && styles.webContainer]}>
          <View style={styles.document}>
            <Text style={styles.title}>Document Preview</Text>
            <View style={styles.divider} />
            <Text style={styles.content}>{content || "No content generated yet."}</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function HexagonLogo({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="document-text" size={size * 0.7} color={DocumentColors.accent} />
    </View>
  );
}

function HexagonBadge({ text }: { text: string }) {
  return (
    <View style={{ borderWidth: 1.5, borderColor: DocumentColors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 14, fontWeight: "800", color: DocumentColors.accent }}>{text}</Text>
    </View>
  );
}

function ReceiptPreview({ receipt, isDesktop }: { receipt: ReceiptRecord; isDesktop: boolean }) {
  const isPaidReceipt = (receipt.receiptTitle || "").toUpperCase().includes("PAID") || (receipt as any).receiptType === "paid";
  const currencySymbol = receipt.company.currency === "INR" || !receipt.company.currency ? "₹" : receipt.company.currency;

  if (isPaidReceipt) {
    // Screenshot 1: MONEY PAID RECEIPT (Payment Made)
    return (
      <View style={[previewDocStyles.letterheadPaper, isDesktop && previewDocStyles.webLetterheadPaper, { padding: 32, minHeight: 1100, backgroundColor: "#FFFFFF" }]}>
        {/* Top Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
            <HexagonLogo size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A", letterSpacing: -0.3 }}>{receipt.company.name || "ABC ENTERPRISES PVT. LTD."}</Text>
              <Text style={{ fontSize: 11, fontWeight: "500", color: "#64748B", marginTop: 2 }}>Documents that build your business</Text>
              <Text style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>📍 {receipt.company.address || "123, Business Park, Andheri East, Mumbai"}</Text>
              <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>📞 {receipt.company.phone || "+91 98765 43210"}</Text>
              <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>✉️ {receipt.company.email || "info@abcenterprises.com"}</Text>
              <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>🌐 {receipt.company.website || "www.abcenterprises.com"}</Text>
            </View>
          </View>
          <View style={{ width: 1, backgroundColor: "#E2E8F0", marginHorizontal: 16 }} />
          <View style={{ width: 220, gap: 4 }}>
            <Text style={{ fontSize: 11, color: DocumentColors.accent, fontWeight: "700" }}>GSTIN : <Text style={{ color: "#0F172A" }}>{receipt.company.taxRegistrationNumber || "27ABCDE1234F1Z5"}</Text></Text>
            <Text style={{ fontSize: 11, color: DocumentColors.accent, fontWeight: "700" }}>PAN    : <Text style={{ color: "#0F172A" }}>{(receipt.company as any).pan || "ABCDE1234F"}</Text></Text>
            <Text style={{ fontSize: 11, color: DocumentColors.accent, fontWeight: "700" }}>CIN    : <Text style={{ color: "#0F172A" }}>{(receipt.company as any).cin || "U74999MH2020PTC123456"}</Text></Text>
            
            <View style={{ marginTop: 16, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }}>MONEY PAID</Text>
              <Text style={{ fontSize: 26, fontWeight: "900", color: DocumentColors.accent, letterSpacing: -0.5 }}>RECEIPT</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#475569", marginTop: 2 }}>(Payment Made)</Text>
              <View style={{ marginTop: 6 }}>
                <HexagonBadge text={currencySymbol} />
              </View>
            </View>
          </View>
        </View>

        {/* Details Row */}
        <View style={{ flexDirection: "row", marginTop: 20, gap: 20 }}>
          {/* Metadata Left */}
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>📄 Receipt No.</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>: {receipt.receiptNumber}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>📅 Receipt Date</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>: {receipt.receiptDate}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>👤 Paid To</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>: {receipt.receivedFrom.name || "Ramesh Kumar"}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>📞 Mobile No.</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>: {receipt.receivedFrom.phone || "+91 98765 67890"}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>📍 Address</Text>
              <Text style={{ flex: 1, fontSize: 12, color: "#334155" }}>: {receipt.receivedFrom.address || "Civil Work, Building No. 5, Site Area..."}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>💳 Payment Mode</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>: {getPaymentMethodLabel(receipt.paymentMethod)}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>🛍️ Paid For</Text>
              <Text style={{ flex: 1, fontSize: 12, color: "#334155" }}>: {receipt.notes || "Labour Payment (Construction Work)"}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>📝 Reference / Note</Text>
              <Text style={{ flex: 1, fontSize: 12, color: "#334155" }}>: {receipt.paymentReference || "Daily Labour Payment"}</Text>
            </View>
          </View>

          {/* Amount Box Right */}
          <View style={{ width: 280, gap: 12 }}>
            <View style={{ backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FFEDD5", borderRadius: 16, padding: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent, textTransform: "uppercase" }}>PAID THE SUM OF</Text>
              <Text style={{ fontSize: 32, fontWeight: "900", color: "#0F172A", marginVertical: 8 }}>{currencySymbol} {receipt.amount.toFixed(2)}</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", textAlign: "center" }}>({receipt.amountInWords || "Rupees Five Thousand Only"})</Text>
            </View>

            {/* Payment Details Table */}
            <View style={{ borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, overflow: "hidden" }}>
              <View style={{ backgroundColor: "#FFF7ED", padding: 8, alignItems: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent }}>PAYMENT DETAILS</Text>
              </View>
              <View style={{ padding: 10, gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, color: "#475569" }}>Amount</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>{currencySymbol} {receipt.amount.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, color: "#475569" }}>Less: TDS (If any)</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>{currencySymbol} 0.00</Text>
                </View>
                <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: DocumentColors.accent }}>TOTAL AMOUNT PAID</Text>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: DocumentColors.accent }}>{currencySymbol} {receipt.amount.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Confirmation Statement Box */}
        <View style={{ marginTop: 20, backgroundColor: "#FAFAFA", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, padding: 14 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent, marginBottom: 4 }}>📜 RECEIVED WITH THANKS</Text>
          <Text style={{ fontSize: 12, color: "#334155", lineHeight: 18 }}>
            I, the undersigned, hereby confirm that I have received the sum of {currencySymbol} {receipt.amount.toFixed(2)} ({receipt.amountInWords || "Rupees Five Thousand Only"}) from {receipt.company.name} towards {receipt.notes || "Labour Payment"} on the date mentioned above.
          </Text>
        </View>

        {/* Signatures & Notes */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 24, alignItems: "flex-end" }}>
          {/* Company Signatory */}
          <View style={{ width: 220 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>For {receipt.company.name}</Text>
            {receipt.company.signatureUrl ? (
              <Image source={{ uri: receipt.company.signatureUrl }} style={{ width: 120, height: 44, marginVertical: 4 }} contentFit="contain" />
            ) : (
              <View style={{ height: 44, borderBottomWidth: 1, borderBottomColor: "#CBD5E1", marginVertical: 4 }} />
            )}
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#0F172A" }}>Authorized Signatory</Text>
            <Text style={{ fontSize: 11, color: "#64748B" }}>Name : Amit Kumar</Text>
            <Text style={{ fontSize: 11, color: "#64748B" }}>Designation : Director</Text>
          </View>

          {/* Receiver Signature */}
          <View style={{ width: 200, alignItems: "flex-end" }}>
            <View style={{ width: 140, borderBottomWidth: 1, borderBottomColor: "#CBD5E1", borderStyle: "dashed", marginBottom: 6 }} />
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#0F172A" }}>Receiver Signature</Text>
            <Text style={{ fontSize: 11, color: "#64748B" }}>Receiver Name : {receipt.receivedFrom.name || "Ramesh Kumar"}</Text>
            <Text style={{ fontSize: 11, color: "#64748B" }}>Date : {receipt.receiptDate}</Text>
          </View>
        </View>

        {/* Notes Box */}
        <View style={{ marginTop: 20, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent, marginBottom: 4 }}>NOTES:</Text>
          <Text style={{ fontSize: 11, color: "#7C2D12" }}>• This is a payment made receipt.</Text>
          <Text style={{ fontSize: 11, color: "#7C2D12" }}>• This does not require any stamp or signature.</Text>
          <Text style={{ fontSize: 11, color: "#7C2D12" }}>• Keep this receipt safely for your records.</Text>
        </View>

        {/* Bottom Footer Bar */}
        <View style={{ marginTop: "auto", borderTopWidth: 1, borderTopColor: DocumentColors.accent, paddingTop: 12, alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 11, color: "#475569" }}>📞 {receipt.company.phone}   |   ✉️ {receipt.company.email}   |   🌐 {receipt.company.website}</Text>
          <Text style={{ fontSize: 12, fontWeight: "800", color: DocumentColors.accent }}>Thank you for your business!</Text>
        </View>
      </View>
    );
  }

  // Screenshot 2: MONEY RECEIVED RECEIPT (Payment Received)
  return (
    <View style={[previewDocStyles.letterheadPaper, isDesktop && previewDocStyles.webLetterheadPaper, { padding: 32, minHeight: 1100, backgroundColor: "#FFFFFF" }]}>
      {/* Top Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
          <HexagonLogo size={52} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A", letterSpacing: -0.3 }}>{receipt.company.name || "ABC ENTERPRISES PVT. LTD."}</Text>
            <Text style={{ fontSize: 11, fontWeight: "500", color: "#64748B", marginTop: 2 }}>Documents that build your business</Text>
            <Text style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>📍 {receipt.company.address || "123, Business Park, Andheri East, Mumbai"}</Text>
            <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>📞 {receipt.company.phone || "+91 98765 43210"}</Text>
            <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>✉️ {receipt.company.email || "info@abcenterprises.com"}</Text>
            <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>🌐 {receipt.company.website || "www.abcenterprises.com"}</Text>
          </View>
        </View>
        <View style={{ width: 1, backgroundColor: "#E2E8F0", marginHorizontal: 16 }} />
        <View style={{ width: 220, gap: 4 }}>
          <Text style={{ fontSize: 11, color: DocumentColors.accent, fontWeight: "700" }}>GSTIN : <Text style={{ color: "#0F172A" }}>{receipt.company.taxRegistrationNumber || "27ABCDE1234F1Z5"}</Text></Text>
          <Text style={{ fontSize: 11, color: DocumentColors.accent, fontWeight: "700" }}>PAN    : <Text style={{ color: "#0F172A" }}>{(receipt.company as any).pan || "ABCDE1234F"}</Text></Text>
          <Text style={{ fontSize: 11, color: DocumentColors.accent, fontWeight: "700" }}>CIN    : <Text style={{ color: "#0F172A" }}>{(receipt.company as any).cin || "U74999MH2020PTC123456"}</Text></Text>

          <View style={{ marginTop: 16, alignItems: "flex-end" }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }}>MONEY RECEIVED</Text>
            <Text style={{ fontSize: 26, fontWeight: "900", color: DocumentColors.accent, letterSpacing: -0.5 }}>RECEIPT</Text>
            <View style={{ marginTop: 6 }}>
              <HexagonBadge text={currencySymbol} />
            </View>
          </View>
        </View>
      </View>

      {/* Details Grid */}
      <View style={{ flexDirection: "row", marginTop: 20, gap: 20 }}>
        {/* Left Info */}
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: "row" }}>
            <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>📄 Receipt No.</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>: {receipt.receiptNumber}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>📅 Receipt Date</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>: {receipt.receiptDate}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>👤 Received From</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>: {receipt.receivedFrom.name || "Rahul Traders"}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>📍 Address</Text>
            <Text style={{ flex: 1, fontSize: 12, color: "#334155" }}>: {receipt.receivedFrom.address || "456, Market Road, Pune - 411001"}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>🏢 GSTIN</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>: 27ABCDE1234F1Z5</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>💳 Payment Mode</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>: {getPaymentMethodLabel(receipt.paymentMethod)}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>📝 Reference</Text>
            <Text style={{ flex: 1, fontSize: 12, color: "#334155" }}>: {receipt.paymentReference || "Against Invoice No. INV-2024-0158"}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={{ width: 120, fontSize: 12, fontWeight: "700", color: "#0F172A" }}>💬 Remarks</Text>
            <Text style={{ flex: 1, fontSize: 12, color: "#334155" }}>: {receipt.notes || "Full & Final Payment"}</Text>
          </View>
        </View>

        {/* Right Highlight & Breakdown Box */}
        <View style={{ width: 280, gap: 12 }}>
          <View style={{ backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FFEDD5", borderRadius: 16, padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent, textTransform: "uppercase" }}>RECEIVED THE SUM OF</Text>
            <Text style={{ fontSize: 30, fontWeight: "900", color: "#0F172A", marginVertical: 8 }}>{currencySymbol} {receipt.amount.toFixed(2)}</Text>
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#475569", textAlign: "center" }}>({receipt.amountInWords || "Rupees Fifteen Thousand Three Hundred Only"})</Text>
          </View>

          {/* Payment Breakdown Table */}
          <View style={{ borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, overflow: "hidden" }}>
            <View style={{ backgroundColor: "#FFF7ED", padding: 8, alignItems: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent }}>DETAILS OF PAYMENT</Text>
            </View>
            <View style={{ padding: 10, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#475569" }}>Amount Before Tax</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>{currencySymbol} {(receipt.amount * 0.85).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#475569" }}>CGST @ 9%</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>{currencySymbol} {(receipt.amount * 0.075).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#475569" }}>SGST @ 9%</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>{currencySymbol} {(receipt.amount * 0.075).toFixed(2)}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent }}>TOTAL AMOUNT RECEIVED</Text>
                <Text style={{ fontSize: 13, fontWeight: "900", color: DocumentColors.accent }}>{currencySymbol} {receipt.amount.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* On Account Of Box */}
      <View style={{ marginTop: 20, backgroundColor: "#FAFAFA", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, padding: 14 }}>
        <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent, marginBottom: 4 }}>📄 ON ACCOUNT OF</Text>
        <Text style={{ fontSize: 12, color: "#334155" }}>
          Payment received against Invoice No. {receipt.paymentReference || "INV-2024-0158"} towards supply of goods.
        </Text>
      </View>

      {/* Signatures & Cursive Thank You */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 28, alignItems: "flex-end" }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: DocumentColors.accent, fontStyle: "italic" }}>Thank You!</Text>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569" }}>For your payment.</Text>
        </View>

        <View style={{ width: 220, alignItems: "flex-end" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>For {receipt.company.name}</Text>
          {receipt.company.signatureUrl ? (
            <Image source={{ uri: receipt.company.signatureUrl }} style={{ width: 120, height: 44, marginVertical: 4 }} contentFit="contain" />
          ) : (
            <View style={{ height: 44, width: 120, borderBottomWidth: 1, borderBottomColor: "#CBD5E1", marginVertical: 4 }} />
          )}
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#0F172A" }}>Authorized Signatory</Text>
          <Text style={{ fontSize: 11, color: "#64748B" }}>Name : Amit Kumar</Text>
          <Text style={{ fontSize: 11, color: "#64748B" }}>Designation : Director</Text>
        </View>
      </View>

      {/* Bottom Footer Bar */}
      <View style={{ marginTop: "auto", borderTopWidth: 1, borderTopColor: DocumentColors.accent, paddingTop: 12, alignItems: "center", gap: 4 }}>
        <Text style={{ fontSize: 11, color: "#475569" }}>📞 {receipt.company.phone}   |   ✉️ {receipt.company.email}   |   🌐 {receipt.company.website}</Text>
        <Text style={{ fontSize: 12, fontWeight: "800", color: DocumentColors.accent }}>Thank you for your business!</Text>
      </View>
    </View>
  );
}

function InvoicePreview({ invoice, isDesktop }: { invoice: InvoiceRecord; isDesktop: boolean }) {
  const isTaxInvoice = invoice.documentType === "tax_invoice";
  const currency = invoice.company.currency;
  const currencySymbol = currency === "INR" ? "₹" : currency;
  const totals = useMemo(() => calculateDocumentTotals(invoice), [invoice]);

  return (
    <DocumentPaperShell isDesktop={isDesktop}>
      <DocumentBrandHeader
        company={{
          name: invoice.company.name,
          tagline: "Documents that build your business",
          address: invoice.company.address,
          phone: invoice.company.phone,
          email: invoice.company.email,
          website: invoice.company.website,
          logoUrl: invoice.company.logoUrl,
        }}
        documentTitle={getDocumentTitle(invoice.documentType).toUpperCase()}
        metaRows={[
          { label: isTaxInvoice ? "Invoice No." : "Bill No.", value: invoice.documentNumber },
          { label: "Date", value: invoice.invoiceDate },
          { label: "Due Date", value: invoice.dueDate },
          { label: "Status", value: getStatusLabel(invoice.status) },
          { label: "Currency", value: currency },
        ]}
      />

      <DocumentTaxBar gstin={invoice.company.taxRegistrationNumber} pan={invoice.company.pan} />

      <View style={{ flexDirection: "row", gap: 16, marginVertical: 12 }}>
        <View style={{ flex: 1 }}>
          <DocumentSectionTitle icon="person-outline" title="BILL TO" />
          <PreviewLine label="Name" value={invoice.customer.name} />
          <PreviewLine label="Address" value={invoice.customer.address} />
          {isTaxInvoice ? <PreviewLine label="GSTIN" value={invoice.customer.gstin} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <DocumentSectionTitle icon="car-outline" title="SHIP TO" />
          <PreviewLine label="Name" value={invoice.customer.name} />
          <PreviewLine label="Address" value={invoice.customer.address} />
        </View>
      </View>

      <View style={{ borderColor: DocumentColors.accent, borderRadius: 8, borderWidth: 1, marginTop: 8, overflow: "hidden" }}>
        <DocumentTableHeader
          columns={[
            { label: "#", width: 30, align: "center" },
            { label: "DESCRIPTION OF GOODS / SERVICES", flex: 2 },
            { label: "HSN/SAC", width: 70, align: "center" },
            { label: "QTY.", width: 44, align: "center" },
            { label: "RATE", width: 74, align: "right" },
            { label: "AMOUNT", width: 84, align: "right" },
          ]}
        />
        {invoice.items.map((item, index) => (
          <View key={item.id} style={{ flexDirection: "row", paddingHorizontal: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: DocumentColors.line, backgroundColor: index % 2 ? DocumentColors.rowAlt : DocumentColors.paper }}>
            <Text style={{ width: 30, fontSize: 11, textAlign: "center", color: DocumentColors.muted }}>{index + 1}</Text>
            <Text style={{ flex: 2, fontSize: 11, fontWeight: "600", color: DocumentColors.ink }}>{item.description || item.item}</Text>
            <Text style={{ width: 70, fontSize: 11, textAlign: "center", color: DocumentColors.muted }}>{item.hsnSac}</Text>
            <Text style={{ width: 44, fontSize: 11, textAlign: "center", color: DocumentColors.ink }}>{item.quantity}</Text>
            <Text style={{ width: 74, fontSize: 11, textAlign: "right", color: DocumentColors.ink }}>{formatMoney(toNumber(item.rate), "")}</Text>
            <Text style={{ width: 84, fontSize: 11, fontWeight: "700", textAlign: "right", color: DocumentColors.ink }}>{formatMoney(getLineAmount(item), "")}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
        <View style={{ flex: 1, paddingRight: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: DocumentColors.muted }}>Amount in Words :</Text>
          <Text style={{ fontSize: 12, fontWeight: "800", color: DocumentColors.ink, marginTop: 2 }}>{invoice.amountInWords}</Text>
        </View>
        <View style={{ width: 300, borderColor: DocumentColors.line, borderRadius: 10, borderWidth: 1, overflow: "hidden" }}>
          <View style={{ padding: 8, gap: 4 }}>
            <SummaryRow label="Sub Total" value={formatMoney(totals.subtotal, currencySymbol)} />
            <SummaryRow label="Discount" value={formatMoney(invoice.discount, currencySymbol)} />
            <SummaryRow label="Taxable Value" value={formatMoney(totals.taxableValue, currencySymbol)} />
            {isTaxInvoice && invoice.taxMode === "CGST + SGST" ? (
              <>
                <SummaryRow label={`CGST ${invoice.cgstPercent}%`} value={formatMoney(totals.cgstAmount, currencySymbol)} />
                <SummaryRow label={`SGST ${invoice.sgstPercent}%`} value={formatMoney(totals.sgstAmount, currencySymbol)} />
              </>
            ) : null}
            {isTaxInvoice && invoice.taxMode === "IGST" ? (
              <SummaryRow label={`IGST ${invoice.igstPercent}%`} value={formatMoney(totals.igstAmount, currencySymbol)} />
            ) : null}
          </View>
          <DocumentGrandTotalRow label="GRAND TOTAL" value={formatMoney(totals.grandTotal, currencySymbol)} />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 16, marginTop: 20 }}>
        <View style={{ flex: 1, borderColor: DocumentColors.line, borderRadius: 12, borderWidth: 1, padding: 12 }}>
          <DocumentSectionTitle icon="document-text-outline" title="BANK DETAILS" />
          <Text style={previewDocStyles.muted}>Bank: {invoice.bank.bankName}</Text>
          <Text style={previewDocStyles.muted}>A/C: {invoice.bank.accountNumber}</Text>
          <Text style={previewDocStyles.muted}>IFSC: {invoice.bank.ifscCode}</Text>
        </View>
        <View style={{ flex: 1, borderColor: DocumentColors.line, borderRadius: 12, borderWidth: 1, padding: 12 }}>
          <DocumentSectionTitle icon="list-outline" title="TERMS & CONDITIONS" />
          <Text style={previewDocStyles.muted}>{invoice.terms}</Text>
        </View>
      </View>

      <View style={previewDocStyles.signatureRow}>
        <View style={previewDocStyles.sectionCard}>
          <DocumentSectionTitle icon="create-outline" title="NOTES" />
          <Text style={previewDocStyles.muted}>{invoice.notes}</Text>
        </View>
        <View style={previewDocStyles.signBox}>
          <Text style={previewDocStyles.signFor}>For {invoice.company.name}</Text>
          <View style={previewDocStyles.assetRow}>
            <Asset label="Stamp" uri={invoice.company.stampUrl} />
            <Asset label="Signature" uri={invoice.company.signatureUrl} />
          </View>
          <Text style={previewDocStyles.signLabel}>Authorized Signatory</Text>
        </View>
      </View>

      <DocumentFooter phone={invoice.company.phone} email={invoice.company.email} website={invoice.company.website} />
    </DocumentPaperShell>
  );
}

function QuotationPreview({ quotation, isDesktop }: { quotation: QuotationRecord; isDesktop: boolean }) {
  // Screenshot 5: TABLE QUOTATION
  const totals = useMemo(() => calculateQuotationTotals(quotation), [quotation]);
  const currencySymbol = quotation.currency === "INR" || !quotation.currency ? "₹" : quotation.currency;

  return (
    <View style={[previewDocStyles.letterheadPaper, isDesktop && previewDocStyles.webLetterheadPaper, { padding: 32, minHeight: 1100, backgroundColor: "#FFFFFF" }]}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
          <HexagonLogo size={52} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A", letterSpacing: -0.3 }}>{quotation.company.name || "ABC ENTERPRISES PVT. LTD."}</Text>
            <Text style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>📍 {quotation.company.address || "123, Business Park, Andheri East, Mumbai"}</Text>
            <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>📞 {quotation.company.phone || "+91 98765 43210"}</Text>
            <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>✉️ {quotation.company.email || "info@abcenterprises.com"}</Text>
            <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>🌐 {quotation.company.website || "www.abcenterprises.com"}</Text>
          </View>
        </View>

        <View style={{ width: 240, alignItems: "flex-end" }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: DocumentColors.accent, letterSpacing: -0.5 }}>TABLE QUOTATION</Text>
          <View style={{ marginTop: 8, gap: 3, alignItems: "flex-end" }}>
            <Text style={{ fontSize: 11, color: "#475569" }}>Quotation No.  :  <Text style={{ fontWeight: "700", color: "#0F172A" }}>{quotation.quotationNumber}</Text></Text>
            <Text style={{ fontSize: 11, color: "#475569" }}>Date                 :  <Text style={{ fontWeight: "700", color: "#0F172A" }}>{quotation.quotationDate}</Text></Text>
            <Text style={{ fontSize: 11, color: "#475569" }}>Valid Till          :  <Text style={{ fontWeight: "700", color: "#0F172A" }}>{quotation.validUntil}</Text></Text>
            <Text style={{ fontSize: 11, color: "#475569" }}>Place                :  <Text style={{ fontWeight: "700", color: "#0F172A" }}>Mumbai, Maharashtra</Text></Text>
            <Text style={{ fontSize: 11, color: "#475569" }}>Currency          :  <Text style={{ fontWeight: "700", color: "#0F172A" }}>{quotation.currency} (Indian Rupees)</Text></Text>
          </View>
        </View>
      </View>

      {/* Tax Bar */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFF7ED", paddingVertical: 6, marginVertical: 12, borderRadius: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: DocumentColors.accent }}>GSTIN : <Text style={{ color: "#0F172A" }}>{quotation.company.taxRegistrationNumber || "27ABCDE1234F1Z5"}</Text></Text>
        <Text style={{ fontSize: 11, fontWeight: "700", color: DocumentColors.accent }}>PAN : <Text style={{ color: "#0F172A" }}>ABCDE1234F</Text></Text>
        <Text style={{ fontSize: 11, fontWeight: "700", color: DocumentColors.accent }}>CIN : <Text style={{ color: "#0F172A" }}>U74999MH2020PTC123456</Text></Text>
      </View>

      {/* Quoted To & Subject Block */}
      <View style={{ flexDirection: "row", gap: 20, marginVertical: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent }}>👤 QUOTED TO</Text>
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#0F172A" }}>{quotation.client.name || "Rahul Traders"}</Text>
          <Text style={{ fontSize: 11, color: "#475569" }}>{quotation.client.address || "456, Market Road, Pune - 411001"}</Text>
          <Text style={{ fontSize: 11, color: "#475569" }}>GSTIN : 27ABCDE1234F1Z5</Text>
        </View>

        <View style={{ flex: 1.2, gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent }}>📝 SUBJECT</Text>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}>{quotation.subject || "Quotation for Office Stationery & Related Products"}</Text>
          <Text style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Dear Sir/Madam,</Text>
          <Text style={{ fontSize: 11, color: "#475569" }}>Thank you for your enquiry. Please find below our best offer for the required products / services as per your requirements.</Text>
        </View>
      </View>

      {/* Table with Solid Orange Header */}
      <View style={{ marginTop: 14, borderWidth: 1, borderColor: DocumentColors.accent, borderRadius: 8, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", backgroundColor: DocumentColors.accent, paddingVertical: 8, paddingHorizontal: 6 }}>
          <Text style={{ width: 30, fontSize: 10, fontWeight: "800", color: "#FFFFFF", textAlign: "center" }}>#</Text>
          <Text style={{ flex: 2, fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>DESCRIPTION OF GOODS / SERVICES</Text>
          <Text style={{ width: 70, fontSize: 10, fontWeight: "800", color: "#FFFFFF", textAlign: "center" }}>HSN/SAC</Text>
          <Text style={{ width: 44, fontSize: 10, fontWeight: "800", color: "#FFFFFF", textAlign: "center" }}>QTY.</Text>
          <Text style={{ width: 44, fontSize: 10, fontWeight: "800", color: "#FFFFFF", textAlign: "center" }}>UNIT</Text>
          <Text style={{ width: 74, fontSize: 10, fontWeight: "800", color: "#FFFFFF", textAlign: "right" }}>RATE ({currencySymbol})</Text>
          <Text style={{ width: 74, fontSize: 10, fontWeight: "800", color: "#FFFFFF", textAlign: "right" }}>DISCOUNT ({currencySymbol})</Text>
          <Text style={{ width: 84, fontSize: 10, fontWeight: "800", color: "#FFFFFF", textAlign: "right" }}>AMOUNT ({currencySymbol})</Text>
        </View>

        {quotation.items.map((item, index) => (
          <View key={item.id} style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }}>
            <Text style={{ width: 30, fontSize: 11, color: "#475569", textAlign: "center" }}>{index + 1}</Text>
            <Text style={{ flex: 2, fontSize: 11, fontWeight: "600", color: "#0F172A" }}>{item.description}</Text>
            <Text style={{ width: 70, fontSize: 11, color: "#475569", textAlign: "center" }}>{item.itemCode || "4820"}</Text>
            <Text style={{ width: 44, fontSize: 11, color: "#0F172A", textAlign: "center" }}>{item.quantity}</Text>
            <Text style={{ width: 44, fontSize: 11, color: "#475569", textAlign: "center" }}>{item.unit || "Nos"}</Text>
            <Text style={{ width: 74, fontSize: 11, color: "#0F172A", textAlign: "right" }}>{formatMoney(toNumber(item.rate), "")}</Text>
            <Text style={{ width: 74, fontSize: 11, color: "#0F172A", textAlign: "right" }}>{formatMoney(toNumber(item.discount), "")}</Text>
            <Text style={{ width: 84, fontSize: 11, fontWeight: "700", color: "#0F172A", textAlign: "right" }}>{formatMoney(getQuotationItemAmount(item), "")}</Text>
          </View>
        ))}
      </View>

      {/* Totals Summary */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
        <View style={{ flex: 1, paddingRight: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#475569" }}>Amount in Words :</Text>
          <Text style={{ fontSize: 12, fontWeight: "800", color: "#0F172A", marginTop: 2 }}>{quotation.amountInWords || "Indian Rupees Eighteen Thousand Fifty Four Only"}</Text>
        </View>

        <View style={{ width: 280, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, overflow: "hidden" }}>
          <View style={{ padding: 8, gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 11, color: "#475569" }}>SUB TOTAL</Text><Text style={{ fontSize: 11, fontWeight: "700", color: "#0F172A" }}>{currencySymbol} {totals.subtotal.toFixed(2)}</Text></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 11, color: "#475569" }}>DISCOUNT</Text><Text style={{ fontSize: 11, fontWeight: "700", color: "#0F172A" }}>{currencySymbol} {quotation.discount.toFixed(2)}</Text></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 11, color: "#475569" }}>TAXABLE VALUE</Text><Text style={{ fontSize: 11, fontWeight: "700", color: "#0F172A" }}>{currencySymbol} {totals.subtotal.toFixed(2)}</Text></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 11, color: "#475569" }}>CGST @ 9%</Text><Text style={{ fontSize: 11, fontWeight: "700", color: "#0F172A" }}>{currencySymbol} {(totals.subtotal * 0.09).toFixed(2)}</Text></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 11, color: "#475569" }}>SGST @ 9%</Text><Text style={{ fontSize: 11, fontWeight: "700", color: "#0F172A" }}>{currencySymbol} {(totals.subtotal * 0.09).toFixed(2)}</Text></View>
          </View>
          <View style={{ backgroundColor: DocumentColors.accent, padding: 8, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#FFFFFF" }}>GRAND TOTAL</Text>
            <Text style={{ fontSize: 13, fontWeight: "900", color: "#FFFFFF" }}>{currencySymbol} {(totals.subtotal * 1.18).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Terms & Conditions & Signatures */}
      <View style={{ flexDirection: "row", gap: 16, marginTop: 20 }}>
        <View style={{ flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent, marginBottom: 4 }}>📜 TERMS & CONDITIONS</Text>
          <Text style={{ fontSize: 10, color: "#475569", lineHeight: 16 }}>1. This quotation is valid up to {quotation.validUntil}.</Text>
          <Text style={{ fontSize: 10, color: "#475569", lineHeight: 16 }}>2. Prices are inclusive of all applicable taxes.</Text>
          <Text style={{ fontSize: 10, color: "#475569", lineHeight: 16 }}>3. Delivery will be within 5 to 7 working days from date of confirmation.</Text>
        </View>

        <View style={{ flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: DocumentColors.accent, marginBottom: 4 }}>📝 NOTES</Text>
          <Text style={{ fontSize: 11, color: "#64748B" }}>{quotation.notes || "Add notes or special instructions here..."}</Text>
        </View>
      </View>

      <View style={{ marginTop: 20, alignItems: "flex-start" }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>For {quotation.company.name}</Text>
        {quotation.company.signatureUrl ? (
          <Image source={{ uri: quotation.company.signatureUrl }} style={{ width: 120, height: 40, marginVertical: 4 }} contentFit="contain" />
        ) : (
          <View style={{ height: 40, width: 120, borderBottomWidth: 1, borderBottomColor: "#CBD5E1", marginVertical: 4 }} />
        )}
        <Text style={{ fontSize: 11, fontWeight: "800", color: "#0F172A" }}>Amit Kumar</Text>
        <Text style={{ fontSize: 10, color: "#64748B" }}>Director</Text>
      </View>

      {/* Bottom Footer Bar */}
      <View style={{ marginTop: "auto", borderTopWidth: 1, borderTopColor: DocumentColors.accent, paddingTop: 12, alignItems: "center", gap: 4 }}>
        <Text style={{ fontSize: 11, color: "#475569" }}>📞 {quotation.company.phone}   |   ✉️ {quotation.company.email}   |   🌐 {quotation.company.website}</Text>
        <Text style={{ fontSize: 12, fontWeight: "800", color: DocumentColors.accent }}>Thank you for your business!</Text>
      </View>
    </View>
  );
}

function LetterheadPreview({ letterhead, isDesktop }: { letterhead: LetterheadRecord; isDesktop: boolean }) {
  // Screenshot 3 & Screenshot 4: LETTERHEAD TEMPLATES
  const isTemplate1 = (letterhead as any).templateStyle !== "template2";

  return (
    <View style={[previewDocStyles.letterheadPaper, isDesktop && previewDocStyles.webLetterheadPaper, { padding: 32, minHeight: 1100, backgroundColor: "#FFFFFF", position: "relative" }]}>
      {/* Background Watermark */}
      <View style={{ position: "absolute", bottom: isTemplate1 ? 40 : "35%", right: isTemplate1 ? 40 : "25%", opacity: 0.06, pointerEvents: "none" }}>
        <HexagonLogo size={320} />
      </View>

      {/* Top Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
          <HexagonLogo size={52} />
          <View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>{letterhead.company.name || "ABC ENTERPRISES PVT. LTD."}</Text>
            <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{letterhead.company.tagline || "Building Solutions. Delivering Trust."}</Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text style={{ fontSize: 11, color: "#475569" }}>📍 {letterhead.company.address || "123, Business Park, Andheri East, Mumbai"}</Text>
          <Text style={{ fontSize: 11, color: "#475569" }}>📞 {letterhead.company.phone || "+91 98765 43210"}</Text>
          <Text style={{ fontSize: 11, color: "#475569" }}>✉️ {letterhead.company.email || "info@abcenterprises.com"}</Text>
          <Text style={{ fontSize: 11, color: "#475569" }}>🌐 {letterhead.company.website || "www.abcenterprises.com"}</Text>
        </View>
      </View>

      {/* Sub-header Bar with Tax Badges */}
      {isTemplate1 ? (
        <View style={{ flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFF7ED", paddingVertical: 6, marginVertical: 12, borderRadius: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: DocumentColors.accent }}>GSTIN : <Text style={{ color: "#0F172A" }}>{letterhead.company.taxNumber || "27ABCDE1234F1Z5"}</Text></Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: DocumentColors.accent }}>PAN : <Text style={{ color: "#0F172A" }}>ABCDE1234F</Text></Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: DocumentColors.accent }}>CIN : <Text style={{ color: "#0F172A" }}>U74999MH2020PTC123456</Text></Text>
        </View>
      ) : (
        <View style={{ height: 3, backgroundColor: DocumentColors.accent, marginVertical: 12 }} />
      )}

      {/* Document Body Area */}
      <View style={{ flex: 1, paddingVertical: 20 }}>
        <Text style={{ fontSize: 15, color: "#0F172A", lineHeight: 26 }}>
          {letterhead.body || "Type your official letterhead content here. Every section of this document is fully editable and backed up real-time to your workspace."}
        </Text>
      </View>

      {/* Bottom Footer Bar */}
      <View style={{ marginTop: "auto", borderTopWidth: 1, borderTopColor: DocumentColors.accent, paddingTop: 12, alignItems: "center", gap: 4 }}>
        <Text style={{ fontSize: 11, color: "#475569" }}>📞 {letterhead.company.phone}   |   ✉️ {letterhead.company.email}   |   🌐 {letterhead.company.website}</Text>
        <Text style={{ fontSize: 12, fontWeight: "800", color: DocumentColors.accent }}>Thank you for your business!</Text>
      </View>
    </View>
  );
}

function PreviewLine({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <View style={[previewDocStyles.previewLine, compact && previewDocStyles.previewLineCompact]}>
      <Text style={previewDocStyles.lineLabel}>{label}</Text>
      <Text style={previewDocStyles.lineValue}>{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={previewDocStyles.summaryRow}>
      <Text style={[previewDocStyles.summaryLabel, strong && previewDocStyles.strong]}>{label}</Text>
      <Text style={[previewDocStyles.summaryValue, strong && previewDocStyles.strong]}>{value}</Text>
    </View>
  );
}

function Asset({ label, uri }: { label: string; uri?: string | null }) {
  return (
    <View style={previewDocStyles.asset}>
      <Text style={previewDocStyles.fieldLabel}>{label}</Text>
      {uri ? <Image source={{ uri }} style={previewDocStyles.assetImage} contentFit="contain" /> : <Text style={previewDocStyles.muted}>Not uploaded</Text>}
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

/** Styles for document preview sub-components (outside PreviewScreen scope). */
const previewDocStyles = StyleSheet.create({
  letterheadPaper: {
    alignSelf: "center",
    aspectRatio: 210 / 297,
    backgroundColor: "#FFFFFF",
    borderColor: "#D9D9D9",
    borderRadius: 2,
    borderWidth: 1,
    maxWidth: 794,
    minHeight: 1123,
    padding: 28,
    width: 794,
    ...shadow,
  },
  webLetterheadPaper: { width: 794 },
  previewLine: { alignItems: "center", flexDirection: "row", minHeight: 25 },
  previewLineCompact: { flex: 1 },
  lineLabel: { color: "#666666", fontSize: 13, fontWeight: "700", marginRight: 4 },
  lineValue: {
    borderBottomColor: "#B7B7B7",
    borderBottomWidth: 1,
    color: "#111111",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 22,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  summaryLabel: { color: "#333333", flex: 1, fontSize: 11, fontWeight: "700" },
  summaryValue: { color: "#111111", fontSize: 11, fontWeight: "900", textAlign: "right" },
  strong: { fontSize: 14, fontWeight: "900" },
  muted: { color: DocumentColors.muted, fontSize: 12, lineHeight: 18 },
  sectionCard: { flex: 1, padding: 9 },
  signatureRow: { flexDirection: "row", gap: 0, minHeight: 93 },
  signBox: { alignItems: "flex-end", flex: 1, justifyContent: "space-between", minHeight: 93, padding: 12 },
  signFor: { color: "#4A4A4A", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  assetRow: { flexDirection: "row", gap: 8, width: "100%" },
  asset: {
    alignItems: "center",
    borderColor: "#EEEEEE",
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    minHeight: 58,
    padding: 6,
  },
  assetImage: { height: 38, width: "100%" },
  signLabel: { color: "#4A4A4A", fontSize: 16, fontWeight: "500", marginTop: 10 },
  fieldLabel: { color: "#555555", fontSize: 9, fontWeight: "800", marginBottom: 3, textTransform: "uppercase" },
});

const createStyles = (theme: ThemePalette, isDark: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  webSafeArea: { backgroundColor: theme.wash },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  webHeader: { alignSelf: "center", maxWidth: 1040, width: "100%", paddingHorizontal: 40, paddingTop: 22 },
  backButton: { alignItems: "center", backgroundColor: theme.card, borderColor: theme.line, borderRadius: 18, borderWidth: 1, height: 40, justifyContent: "center", width: 40, ...shadow },
  headerTitle: { color: theme.ink, fontSize: 19, fontWeight: "800" },
  headerSpacer: { width: 40 },
  phoneHorizontalWorkspace: { minWidth: 860 },
  container: { alignSelf: "center", minWidth: 820, padding: 18, width: "100%" },
  webContainer: { maxWidth: 1040, paddingHorizontal: 40, paddingBottom: 56 },
  loadingText: { color: theme.muted, textAlign: "center" },
  document: { width: "100%", padding: 28, backgroundColor: "#FAFAFA", borderRadius: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#222222", marginVertical: 10 },
  content: { fontSize: 16, color: "#333333", lineHeight: 24 },
  emptyCard: { alignItems: "center", backgroundColor: "#FAFAFA", borderRadius: 18, padding: 28 },
  emptyTitle: { color: theme.ink, fontSize: 18, fontWeight: "800" },
  emptyText: { color: theme.muted, marginTop: 6 },
  workflowBar: { alignSelf: "center", backgroundColor: theme.card, borderColor: theme.line, borderRadius: 16, borderWidth: 1, marginBottom: 14, maxWidth: 794, padding: 14, width: "100%", ...shadow },
  workflowTitle: { color: theme.ink, fontSize: 15, fontWeight: "900", marginBottom: 10 },
  statusGrid: { flexDirection: "row", gap: 10 },
  statusBox: { borderColor: theme.line, borderRadius: 12, borderWidth: 1, flex: 1, padding: 11 },
  statusBoxActive: { backgroundColor: theme.orangeSoft, borderColor: theme.orange },
  statusLabel: { color: theme.ink, fontSize: 14, fontWeight: "900", marginBottom: 3 },
  statusLabelActive: { color: theme.orangeDark },
  statusDescription: { color: theme.muted, fontSize: 11 },
  previewActions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", marginTop: 12 },
  primaryAction: { backgroundColor: theme.orange, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  primaryActionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  secondaryAction: { alignItems: "center", borderColor: theme.line, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 12, paddingVertical: 9 },
  secondaryActionText: { color: theme.ink, fontSize: 12, fontWeight: "800" },
  disabledButton: { opacity: 0.7 },
  invoicePaper: { alignSelf: "center", aspectRatio: 210 / 297, backgroundColor: "#FFFFFF", borderColor: "#8A8A8A", borderRadius: 1, borderWidth: 1.5, maxWidth: 794, minHeight: 1123, padding: 0, width: 794, ...shadow },
  webInvoicePaper: { width: 794 },
  copyRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6 },
  copyLabel: { color: "#555555", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  topStrip: { alignItems: "flex-start", borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 4, paddingTop: 6 },
  stripBlock: { flex: 1 },
  stripBlockRight: { alignItems: "flex-end", flex: 1 },
  stripText: { color: "#4D4D4D", fontSize: 14, fontWeight: "700" },
  stripTextRight: { color: "#4D4D4D", fontSize: 14, fontWeight: "700", textAlign: "right" },
  invoiceTitle: { color: "#4A4A4A", flex: 1.1, fontSize: 18, fontWeight: "800", textAlign: "center", textDecorationLine: "underline" },
  companyHeader: { alignItems: "center", borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, flexDirection: "row", gap: 10, minHeight: 118, paddingHorizontal: 16, paddingVertical: 4 },
  logoBox: { alignItems: "center", borderColor: "#DADADA", borderRadius: 4, borderWidth: 1, height: 62, justifyContent: "center", overflow: "hidden", width: 74 },
  logoImage: { height: "100%", width: "100%" },
  partyBox: { borderRightColor: "#8A8A8A", borderRightWidth: 1.3, flex: 1.55, paddingHorizontal: 16, paddingVertical: 8 },
  invoiceInfoBox: { flex: 1, gap: 13, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { color: "#606060", fontSize: 13, fontWeight: "800", marginBottom: 8 },
  customerName: { color: "#111111", fontSize: 16, fontWeight: "900", marginBottom: 4 },
  recipientLine: { flexDirection: "row", gap: 8 },
  previewLine: { alignItems: "center", flexDirection: "row", minHeight: 25 },
  previewLineCompact: { flex: 1 },
  lineLabel: { color: "#666666", fontSize: 13, fontWeight: "700", marginRight: 4 },
  lineValue: { borderBottomColor: "#B7B7B7", borderBottomWidth: 1, color: "#111111", flex: 1, fontSize: 13, fontWeight: "700", minHeight: 22 },
  gstinPreviewField: { alignItems: "center", flexDirection: "row", marginTop: 4 },
  gstinPreviewText: { borderColor: "#8A8A8A", borderWidth: 1.4, color: "#111111", fontSize: 15, fontWeight: "800", height: 32, letterSpacing: 9, paddingHorizontal: 6, width: 374 },
  fieldLabel: { color: "#555555", fontSize: 9, fontWeight: "800", marginBottom: 3, textTransform: "uppercase" },
  fieldValue: { color: "#111111", fontSize: 11, fontWeight: "800" },
  table: { borderColor: "#8A8A8A", borderLeftWidth: 0, borderRightWidth: 0, borderTopWidth: 0, minWidth: 792 },
  tableRow: { flexDirection: "row" },
  tableHeader: { backgroundColor: "#F6F6F6" },
  cell: { borderRightColor: "#8A8A8A", borderRightWidth: 1.2, borderTopColor: "#8A8A8A", borderTopWidth: 1.2, color: "#555555", fontSize: 13, fontWeight: "700", minHeight: 28, padding: 5 },
  serialCell: { textAlign: "center", width: 44 },
  itemCell: { width: 270 },
  codeCell: { textAlign: "center", width: 64 },
  hsnCell: { width: 64 },
  smallCell: { textAlign: "center", width: 98 },
  amountCell: { borderRightWidth: 0, textAlign: "right", width: 132 },
  summaryArea: { borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, flexDirection: "row", gap: 0, paddingVertical: 0 },
  bankTermsColumn: { borderRightColor: "#8A8A8A", borderRightWidth: 1.3, flex: 1.18 },
  sectionCard: { flex: 1, padding: 9 },
  summaryCard: { flex: 0.95, paddingHorizontal: 12, paddingVertical: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  summaryLabel: { color: "#333333", flex: 1, fontSize: 11, fontWeight: "700" },
  summaryValue: { color: "#111111", fontSize: 11, fontWeight: "900", textAlign: "right" },
  strong: { fontSize: 14, fontWeight: "900" },
  wordsBox: { borderTopColor: "#DDDDDD", borderTopWidth: 1, marginTop: 8, paddingTop: 8 },
  signatureRow: { flexDirection: "row", gap: 0, minHeight: 93 },
  signBox: { alignItems: "flex-end", flex: 1, justifyContent: "space-between", minHeight: 93, padding: 12 },
  signFor: { color: "#4A4A4A", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  assetRow: { flexDirection: "row", gap: 8, width: "100%" },
  asset: { alignItems: "center", borderColor: "#EEEEEE", borderRadius: 4, borderWidth: 1, flex: 1, minHeight: 58, padding: 6 },
  assetImage: { height: 38, width: "100%" },
  signLabel: { color: "#4A4A4A", fontSize: 16, fontWeight: "500", marginTop: 10 },
  quotationPaper: { alignSelf: "center", aspectRatio: 210 / 297, backgroundColor: "#FFFFFF", borderColor: "#D9D9D9", borderRadius: 2, borderWidth: 1, maxWidth: 794, minHeight: 1123, padding: 22, width: 794, ...shadow },
  webQuotationPaper: { width: 794 },
  quotationHeader: { borderBottomColor: "#222222", borderBottomWidth: 1, flexDirection: "row", gap: 14, paddingBottom: 16 },
  quotationLogoBox: { alignItems: "center", borderColor: "#DADADA", borderRadius: 4, borderWidth: 1, height: 70, justifyContent: "center", overflow: "hidden", width: 82 },
  logoInitials: { color: theme.orangeDark, fontSize: 20, fontWeight: "900" },
  quotationCompanyCopy: { flex: 1 },
  quotationCompanyName: { color: "#111111", fontSize: 24, fontWeight: "900", marginBottom: 3 },
  quotationTitleBox: { alignItems: "flex-end", width: 180 },
  quotationTitle: { color: "#111111", fontSize: 22, fontWeight: "900", marginBottom: 8, textAlign: "right" },
  quotationClientGrid: { borderBottomColor: "#222222", borderBottomWidth: 1, flexDirection: "row", gap: 14, paddingVertical: 14 },
  quotationClientBox: { flex: 1 },
  quotationSubjectBox: { borderColor: "#E2E2E2", borderRadius: 4, borderWidth: 1, padding: 10, width: 260 },
  quotationSubject: { color: "#111111", fontSize: 14, fontWeight: "800", marginBottom: 8 },
  quotationLetterBody: { gap: 10, minHeight: 360, paddingVertical: 14 },
  letterText: { color: "#333333", fontSize: 13, lineHeight: 20 },
  quotationTable: { borderColor: "#222222", borderWidth: 1, marginTop: 14, minWidth: 746 },
  quoteSerialCell: { textAlign: "center", width: 48 },
  quoteDescriptionCell: { width: 210 },
  quoteCodeCell: { width: 80 },
  quoteSmallCell: { textAlign: "center", width: 70 },
  quoteAmountCell: { borderRightWidth: 0, textAlign: "right", width: 105 },
  quotationSummaryArea: { borderBottomColor: "#222222", borderBottomWidth: 1, borderTopColor: "#222222", borderTopWidth: 1, flexDirection: "row", gap: 14, marginTop: 14, paddingVertical: 12 },
  quotationNotes: { flex: 1.05, gap: 8 },
  letterheadPaper: { alignSelf: "center", aspectRatio: 210 / 297, backgroundColor: "#FFFFFF", borderColor: "#D9D9D9", borderRadius: 2, borderWidth: 1, maxWidth: 794, minHeight: 1123, padding: 28, width: 794, ...shadow },
  webLetterheadPaper: { width: 794 },
  letterheadTop: { borderBottomColor: theme.orange, borderBottomWidth: 3, flexDirection: "row", gap: 16, paddingBottom: 18 },
  letterheadLogoBox: { alignItems: "center", borderColor: "#DADADA", borderRadius: 6, borderWidth: 1, height: 78, justifyContent: "center", overflow: "hidden", width: 92 },
  letterheadCompanyBlock: { flex: 1 },
  letterheadCompanyName: { color: "#111111", fontSize: 27, fontWeight: "900", lineHeight: 34 },
  letterheadTagline: { color: theme.orangeDark, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  letterheadCompanyLine: { color: "#555555", fontSize: 11, lineHeight: 16 },
  letterheadMetaRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 12 },
  letterheadDocName: { color: "#111111", flex: 1, fontSize: 16, fontWeight: "900" },
  letterheadMetaText: { color: theme.muted, fontSize: 11, fontWeight: "800", textAlign: "right" },
  letterheadBody: { color: "#222222", flex: 1, fontSize: 14, minHeight: 710, paddingVertical: 12 },
  letterheadSignatureStrip: { alignItems: "flex-end", minHeight: 90 },
  letterheadSignatureArea: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "flex-end", minHeight: 62 },
  letterheadSignatureImage: { height: 52, width: 140 },
  letterheadStampImage: { height: 58, width: 82 },
  letterheadManualSignature: { borderBottomColor: "#BBBBBB", borderBottomWidth: 1, color: "#111111", fontSize: 18, fontStyle: "italic", minWidth: 180, paddingBottom: 4, textAlign: "center" },
  letterheadFooter: { borderTopColor: theme.orange, borderTopWidth: 2, paddingTop: 8 },
  letterheadFooterText: { color: "#555555", fontSize: 10, lineHeight: 14, textAlign: "center" },
  letterheadPageNumber: { color: "#777777", fontSize: 9, marginTop: 4, textAlign: "right" },
  visitingCardPreviewGrid: { alignSelf: "center", gap: 18, maxWidth: 920, width: "100%" },
  visitingCardPreviewGridDesktop: { alignItems: "flex-start", flexDirection: "row" },
  visitingCardPreviewPane: { flex: 1, gap: 10, minWidth: 0 },
});
