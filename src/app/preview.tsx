import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { VisitingCardPreview } from "@/components/visiting-card/VisitingCardPreview";
import {
  duplicateVisitingCardRecord,
  loadVisitingCardById,
  saveVisitingCard,
  VisitingCardRecord,
  VisitingCardStatus,
} from "@/services/visiting-cards";
import { Colors } from "@/theme/colors";

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
  const router = useRouter();
  const { content, type, invoiceId, quotationId, letterheadId, visitingCardId, action } = useLocalSearchParams<{
    content?: string;
    type?: string;
    invoiceId?: string;
    quotationId?: string;
    letterheadId?: string;
    visitingCardId?: string;
    action?: string;
  }>();
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [quotation, setQuotation] = useState<QuotationRecord | null>(null);
  const [letterhead, setLetterhead] = useState<LetterheadRecord | null>(null);
  const [visitingCard, setVisitingCard] = useState<VisitingCardRecord | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>("draft");
  const [selectedQuotationStatus, setSelectedQuotationStatus] = useState<QuotationStatus>("draft");
  const [selectedLetterheadStatus, setSelectedLetterheadStatus] = useState<LetterheadStatus>("draft");
  const [selectedVisitingCardStatus, setSelectedVisitingCardStatus] = useState<VisitingCardStatus>("draft");
  const [loading, setLoading] = useState(type === "invoice" || type === "quotation" || type === "letterhead" || type === "visitingCard");
  const [saving, setSaving] = useState(false);
  const { width, isWebsite, isDesktop, isAppPreview } = useResponsiveLayout();
  const isPhone = width < 640;

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

    hydrateInvoicePreview();
    hydrateQuotationPreview();
    hydrateLetterheadPreview();
    hydrateVisitingCardPreview();

    return () => {
      isMounted = false;
    };
  }, [invoiceId, quotationId, letterheadId, visitingCardId, type]);

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
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{invoice ? `${getDocumentLabel(invoice.documentType)} Preview` : "Document Preview"}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            horizontal={isPhone}
            contentContainerStyle={isPhone ? styles.phoneHorizontalWorkspace : undefined}
            showsHorizontalScrollIndicator={isPhone}
          >
            <ScrollView contentContainerStyle={[styles.container, isWebsite && styles.webContainer]} showsVerticalScrollIndicator={false}>
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
                          <Ionicons name="create-outline" size={16} color={Colors.text} />
                          <Text style={styles.secondaryActionText}>Edit</Text>
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="print-outline" size={16} color={Colors.text} />
                        <Text style={styles.secondaryActionText}>Print</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="document-attach-outline" size={16} color={Colors.text} />
                        <Text style={styles.secondaryActionText}>PDF</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryAction, saving && styles.disabledButton]} onPress={handleFinalSave} disabled={saving}>
                        <Text style={styles.primaryActionText}>{saving ? "Saving" : "Final Save"}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <InvoicePreview invoice={{ ...invoice, status: selectedStatus }} isDesktop={isDesktop} />
                </>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Document not found</Text>
                  <Text style={styles.emptyText}>We could not load this saved document.</Text>
                </View>
              )}
            </ScrollView>
          </ScrollView>
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
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{quotation ? `${getQuotationLabel(quotation.documentType)} Preview` : "Quotation Preview"}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView horizontal={isPhone} contentContainerStyle={isPhone ? styles.phoneHorizontalWorkspace : undefined} showsHorizontalScrollIndicator={isPhone}>
            <ScrollView contentContainerStyle={[styles.container, isWebsite && styles.webContainer]} showsVerticalScrollIndicator={false}>
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
                          <Ionicons name="create-outline" size={16} color={Colors.text} />
                          <Text style={styles.secondaryActionText}>Edit</Text>
                        </Pressable>
                      ) : null}
                      {selectedQuotationStatus === "accepted" ? (
                        <Pressable style={[styles.secondaryAction, styles.disabledButton]} disabled>
                          <Ionicons name="swap-horizontal-outline" size={16} color={Colors.textSecondary} />
                          <Text style={styles.secondaryActionText}>Convert to Tax Invoice</Text>
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="print-outline" size={16} color={Colors.text} />
                        <Text style={styles.secondaryActionText}>Print</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="document-attach-outline" size={16} color={Colors.text} />
                        <Text style={styles.secondaryActionText}>PDF</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryAction, saving && styles.disabledButton]} onPress={handleQuotationFinalSave} disabled={saving}>
                        <Text style={styles.primaryActionText}>{saving ? "Saving" : "Final Save"}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <QuotationPreview quotation={{ ...quotation, status: selectedQuotationStatus }} isDesktop={isDesktop} />
                </>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Quotation not found</Text>
                  <Text style={styles.emptyText}>We could not load this saved quotation.</Text>
                </View>
              )}
            </ScrollView>
          </ScrollView>
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
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{letterhead ? "Letterhead Preview" : "Letterhead"}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView horizontal={isPhone} contentContainerStyle={isPhone ? styles.phoneHorizontalWorkspace : undefined} showsHorizontalScrollIndicator={isPhone}>
            <ScrollView contentContainerStyle={[styles.container, isWebsite && styles.webContainer]} showsVerticalScrollIndicator={false}>
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
                          <Ionicons name="create-outline" size={16} color={Colors.text} />
                          <Text style={styles.secondaryActionText}>Edit</Text>
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="print-outline" size={16} color={Colors.text} />
                        <Text style={styles.secondaryActionText}>Print</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                        <Ionicons name="document-attach-outline" size={16} color={Colors.text} />
                        <Text style={styles.secondaryActionText}>PDF</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryAction, saving && styles.disabledButton]} onPress={handleLetterheadFinalSave} disabled={saving}>
                        <Text style={styles.primaryActionText}>{saving ? "Saving" : "Final Save"}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <LetterheadPreview letterhead={{ ...letterhead, status: selectedLetterheadStatus }} isDesktop={isDesktop} />
                </>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Letterhead not found</Text>
                  <Text style={styles.emptyText}>We could not load this saved letterhead.</Text>
                </View>
              )}
            </ScrollView>
          </ScrollView>
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
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>{visitingCard ? "Visiting Card Preview" : "Visiting Card"}</Text>
            <View style={styles.headerSpacer} />
          </View>

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
                      <Ionicons name="create-outline" size={16} color={Colors.text} />
                      <Text style={styles.secondaryActionText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryAction} onPress={handleVisitingCardDuplicate}>
                      <Ionicons name="copy-outline" size={16} color={Colors.text} />
                      <Text style={styles.secondaryActionText}>Duplicate</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                      <Ionicons name="print-outline" size={16} color={Colors.text} />
                      <Text style={styles.secondaryActionText}>Print A4</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryAction} onPress={handlePrint}>
                      <Ionicons name="document-attach-outline" size={16} color={Colors.text} />
                      <Text style={styles.secondaryActionText}>PDF</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryAction} onPress={handleShare}>
                      <Ionicons name="share-outline" size={16} color={Colors.text} />
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

function InvoicePreview({ invoice, isDesktop }: { invoice: InvoiceRecord; isDesktop: boolean }) {
  const isTaxInvoice = invoice.documentType === "tax_invoice";
  const currency = invoice.company.currency;
  const totals = useMemo(() => calculateDocumentTotals(invoice), [invoice]);
  const copyLabels = isTaxInvoice
    ? ["Original for Recipient", "Duplicate for Supplier / Seller Copy"]
    : ["Recipient Copy", "Supplier Copy"];

  return (
    <View style={[styles.invoicePaper, isDesktop && styles.webInvoicePaper]}>
      <View style={styles.copyRow}>
        {copyLabels.map((label) => (
          <Text key={label} style={styles.copyLabel}>{label}</Text>
        ))}
      </View>

      <View style={styles.topStrip}>
        <View style={styles.stripBlock}>
          <Text style={styles.stripText}>GSTIN: {invoice.company.taxRegistrationNumber}</Text>
          <Text style={styles.stripText}>PAN: {invoice.company.pan}</Text>
        </View>
        <Text style={styles.invoiceTitle}>{getDocumentTitle(invoice.documentType)}</Text>
        <View style={styles.stripBlockRight}>
          <Text style={styles.stripTextRight}>{invoice.company.phone}</Text>
          <Text style={styles.stripTextRight}>{invoice.company.email}</Text>
        </View>
      </View>

      <View style={styles.companyHeader}>
        {invoice.company.logoUrl ? (
          <View style={styles.logoBox}>
            <Image source={{ uri: invoice.company.logoUrl }} style={styles.logoImage} contentFit="contain" />
          </View>
        ) : null}
        <View style={styles.companyCopy}>
          <Text style={styles.companyName}>{invoice.company.name}</Text>
          <Text style={styles.companyAddress}>Office : {invoice.company.address}</Text>
          <Text style={styles.companyEmail}>Email: {invoice.company.email}</Text>
          {invoice.company.website ? <Text style={styles.muted}>{invoice.company.website}</Text> : null}
        </View>
      </View>

      <View style={styles.partiesGrid}>
        <View style={styles.partyBox}>
          <Text style={styles.sectionTitle}>Recipient Detail :</Text>
          <PreviewLine label="Name" value={invoice.customer.name} />
          <PreviewLine label="Address" value={invoice.customer.address} />
          <View style={styles.recipientLine}>
            <PreviewLine label="State" value={invoice.customer.state || ""} compact />
            <PreviewLine label="State Code" value={invoice.customer.stateCode || ""} compact />
            <PreviewLine label="PIN" value={invoice.customer.pin || ""} compact />
          </View>
          {isTaxInvoice ? (
            <View style={styles.gstinPreviewField}>
              <Text style={styles.lineLabel}>GSTIN :</Text>
              <Text style={styles.gstinPreviewText}>{invoice.customer.gstin}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.invoiceInfoBox}>
          <PreviewLine label={isTaxInvoice ? "Invoice Serial No." : "Bill Serial No."} value={invoice.documentNumber} />
          <PreviewLine label="Invoice Date" value={invoice.invoiceDate} />
          <PreviewLine label="Status" value={getStatusLabel(invoice.status)} />
          <PreviewLine label="Currency" value={currency} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.serialCell]}>S.No.</Text>
            <Text style={[styles.cell, styles.itemCell]}>Description of Goods / Services</Text>
            <Text style={[styles.cell, styles.codeCell]}>SSN{"\n"}CODE</Text>
            <Text style={[styles.cell, styles.codeCell]}>HSN{"\n"}CODE</Text>
            <Text style={[styles.cell, styles.smallCell]}>Qty</Text>
            <Text style={[styles.cell, styles.smallCell]}>Rate</Text>
            <Text style={[styles.cell, styles.amountCell]}>VALUE{"\n"}Rs.        P.</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.cell, styles.serialCell]}>{index + 1}</Text>
              <Text style={[styles.cell, styles.itemCell]}>{item.description || item.item}</Text>
              <Text style={[styles.cell, styles.codeCell]}>{item.ssnCode}</Text>
              <Text style={[styles.cell, styles.codeCell]}>{item.hsnSac}</Text>
              <Text style={[styles.cell, styles.smallCell]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.smallCell]}>{formatMoney(toNumber(item.rate), currency)}</Text>
              <Text style={[styles.cell, styles.amountCell]}>{formatMoney(getLineAmount(item), currency)}</Text>
            </View>
          ))}
          {Array.from({ length: Math.max(0, 12 - invoice.items.length) }).map((_, index) => (
            <View key={`blank-${index}`} style={styles.tableRow}>
              <Text style={[styles.cell, styles.serialCell]} />
              <Text style={[styles.cell, styles.itemCell]} />
              <Text style={[styles.cell, styles.codeCell]} />
              <Text style={[styles.cell, styles.codeCell]} />
              <Text style={[styles.cell, styles.smallCell]} />
              <Text style={[styles.cell, styles.smallCell]} />
              <Text style={[styles.cell, styles.amountCell]} />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.summaryArea}>
        <View style={styles.bankTermsColumn}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <Text style={styles.muted}>Bank Name: {invoice.bank.bankName}</Text>
            <Text style={styles.muted}>Account Number: {invoice.bank.accountNumber}</Text>
            <Text style={styles.muted}>IFSC: {invoice.bank.ifscCode}</Text>
            <Text style={styles.muted}>Branch: {invoice.bank.branchAddress}</Text>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.muted}>{invoice.terms}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow label={isTaxInvoice ? "Total Value Before Tax" : "Subtotal"} value={formatMoney(totals.subtotal, currency)} />
          <SummaryRow label="Discount" value={formatMoney(invoice.discount, currency)} />
          <SummaryRow label="Freight / Other Charges" value={formatMoney(invoice.freightCharges, currency)} />
          <SummaryRow label={isTaxInvoice ? "Taxable Value" : "Total"} value={formatMoney(totals.taxableValue, currency)} />
          {isTaxInvoice && invoice.taxMode === "CGST + SGST" ? (
            <>
              <SummaryRow label={`CGST ${invoice.cgstPercent}%`} value={formatMoney(totals.cgstAmount, currency)} />
              <SummaryRow label={`SGST ${invoice.sgstPercent}%`} value={formatMoney(totals.sgstAmount, currency)} />
            </>
          ) : null}
          {isTaxInvoice && invoice.taxMode === "IGST" ? <SummaryRow label={`IGST ${invoice.igstPercent}%`} value={formatMoney(totals.igstAmount, currency)} /> : null}
          <View style={styles.divider} />
          <SummaryRow label={isTaxInvoice ? "Gross Total Value" : "Grand Total"} value={formatMoney(totals.grandTotal, currency)} strong />
          <View style={styles.wordsBox}>
            <Text style={styles.sectionTitle}>Amount in Words</Text>
            <Text style={styles.muted}>{invoice.amountInWords}</Text>
          </View>
        </View>
      </View>

      <View style={styles.signatureRow}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.muted}>{invoice.notes}</Text>
        </View>
        <View style={styles.signBox}>
          <Text style={styles.signFor}>For {invoice.company.name}</Text>
          <View style={styles.assetRow}>
            <Asset label="Stamp" uri={invoice.company.stampUrl} />
            <Asset label="Signature" uri={invoice.company.signatureUrl} />
          </View>
          <Text style={styles.signLabel}>Authorized Signatory</Text>
        </View>
      </View>
    </View>
  );
}

function QuotationPreview({ quotation, isDesktop }: { quotation: QuotationRecord; isDesktop: boolean }) {
  const isTableQuotation = quotation.documentType === "table_quotation";
  const totals = useMemo(() => calculateQuotationTotals(quotation), [quotation]);

  return (
    <View style={[styles.quotationPaper, isDesktop && styles.webQuotationPaper]}>
      <View style={styles.quotationHeader}>
        <View style={styles.quotationLogoBox}>
          {quotation.company.logoUrl ? (
            <Image source={{ uri: quotation.company.logoUrl }} style={styles.logoImage} contentFit="contain" />
          ) : (
            <Text style={styles.logoInitials}>{quotation.company.name.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.quotationCompanyCopy}>
          <Text style={styles.quotationCompanyName}>{quotation.company.name}</Text>
          <Text style={styles.muted}>{quotation.company.address}</Text>
          <Text style={styles.muted}>{quotation.company.email} • {quotation.company.phone}</Text>
          {quotation.company.website ? <Text style={styles.muted}>{quotation.company.website}</Text> : null}
        </View>
        <View style={styles.quotationTitleBox}>
          <Text style={styles.quotationTitle}>{getQuotationTitle(quotation.documentType)}</Text>
          <Text style={styles.muted}>{quotation.quotationNumber}</Text>
          <Text style={styles.muted}>Date: {quotation.quotationDate}</Text>
          <Text style={styles.muted}>Valid Until: {quotation.validUntil}</Text>
        </View>
      </View>

      <View style={styles.quotationClientGrid}>
        <View style={styles.quotationClientBox}>
          <Text style={styles.sectionTitle}>Client Details</Text>
          <Text style={styles.customerName}>{quotation.client.name}</Text>
          {quotation.client.companyName ? <Text style={styles.muted}>{quotation.client.companyName}</Text> : null}
          <Text style={styles.muted}>{quotation.client.address}</Text>
          <Text style={styles.muted}>{quotation.client.email} • {quotation.client.phone}</Text>
        </View>
        <View style={styles.quotationSubjectBox}>
          <Text style={styles.sectionTitle}>Subject / Reference</Text>
          <Text style={styles.quotationSubject}>{quotation.subject}</Text>
          <Text style={styles.muted}>Status: {getQuotationStatusLabel(quotation.status)}</Text>
        </View>
      </View>

      {isTableQuotation ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quotationTable}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.cell, styles.quoteSerialCell]}>S.No.</Text>
              <Text style={[styles.cell, styles.quoteDescriptionCell]}>Description of Goods / Services</Text>
              <Text style={[styles.cell, styles.quoteCodeCell]}>Item Code</Text>
              <Text style={[styles.cell, styles.quoteSmallCell]}>Qty</Text>
              <Text style={[styles.cell, styles.quoteSmallCell]}>Unit</Text>
              <Text style={[styles.cell, styles.quoteSmallCell]}>Rate</Text>
              <Text style={[styles.cell, styles.quoteSmallCell]}>Discount</Text>
              <Text style={[styles.cell, styles.quoteAmountCell]}>Amount</Text>
            </View>
            {quotation.items.map((item, index) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.cell, styles.quoteSerialCell]}>{index + 1}</Text>
                <Text style={[styles.cell, styles.quoteDescriptionCell]}>{item.description}</Text>
                <Text style={[styles.cell, styles.quoteCodeCell]}>{item.itemCode}</Text>
                <Text style={[styles.cell, styles.quoteSmallCell]}>{item.quantity}</Text>
                <Text style={[styles.cell, styles.quoteSmallCell]}>{item.unit}</Text>
                <Text style={[styles.cell, styles.quoteSmallCell]}>{formatMoney(toNumber(item.rate), quotation.currency)}</Text>
                <Text style={[styles.cell, styles.quoteSmallCell]}>{formatMoney(toNumber(item.discount), quotation.currency)}</Text>
                <Text style={[styles.cell, styles.quoteAmountCell]}>{formatMoney(getQuotationItemAmount(item), quotation.currency)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.quotationLetterBody}>
          <Text style={styles.letterText}>{quotation.greeting}</Text>
          <Text style={styles.letterText}>{quotation.intro}</Text>
          <Text style={styles.sectionTitle}>Scope of Work / Services</Text>
          <Text style={styles.letterText}>{quotation.scope}</Text>
          <Text style={styles.sectionTitle}>Milestones / Deliverables</Text>
          <Text style={styles.letterText}>{quotation.milestones}</Text>
        </View>
      )}

      <View style={styles.quotationSummaryArea}>
        <View style={styles.quotationNotes}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.muted}>{quotation.notes}</Text>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <Text style={styles.muted}>{quotation.terms}</Text>
        </View>
        <View style={styles.summaryCard}>
          <SummaryRow label="Subtotal" value={formatMoney(totals.subtotal, quotation.currency)} />
          <SummaryRow label="Discount" value={formatMoney(quotation.discount, quotation.currency)} />
          <SummaryRow label="Other Charges" value={formatMoney(quotation.otherCharges, quotation.currency)} />
          <View style={styles.divider} />
          <SummaryRow label="Grand Total" value={formatMoney(totals.grandTotal, quotation.currency)} strong />
          <View style={styles.wordsBox}>
            <Text style={styles.sectionTitle}>Amount in Words</Text>
            <Text style={styles.muted}>{quotation.amountInWords}</Text>
          </View>
        </View>
      </View>

      <View style={styles.signatureRow}>
        <View style={styles.sectionCard}>
          <Text style={styles.muted}>{quotation.closing}</Text>
        </View>
        <View style={styles.signBox}>
          <Text style={styles.signFor}>For {quotation.company.name}</Text>
          <View style={styles.assetRow}>
            <Asset label="Stamp" uri={quotation.company.stampUrl} />
            <Asset label="Signature" uri={quotation.company.signatureUrl} />
          </View>
          <Text style={styles.signLabel}>Authorized Signatory</Text>
        </View>
      </View>
    </View>
  );
}

function LetterheadPreview({ letterhead, isDesktop }: { letterhead: LetterheadRecord; isDesktop: boolean }) {
  const lineHeight = letterhead.bodyFormatting.spacing === "compact" ? 20 : letterhead.bodyFormatting.spacing === "relaxed" ? 30 : 24;
  const placeBusinessSignature = letterhead.signatureMode === "business" && letterhead.company.signatureUrl;
  const placeManualSignature = letterhead.signatureMode === "manual" && letterhead.manualSignature;

  return (
    <View style={[styles.letterheadPaper, isDesktop && styles.webLetterheadPaper]}>
      <View style={styles.letterheadTop}>
        <View style={styles.letterheadLogoBox}>
          {letterhead.company.logoUrl ? (
            <Image source={{ uri: letterhead.company.logoUrl }} style={styles.logoImage} contentFit="contain" />
          ) : (
            <Text style={styles.logoInitials}>{letterhead.company.name.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.letterheadCompanyBlock}>
          <Text style={styles.letterheadCompanyName}>{letterhead.company.name}</Text>
          {letterhead.company.tagline ? <Text style={styles.letterheadTagline}>{letterhead.company.tagline}</Text> : null}
          <Text style={styles.letterheadCompanyLine}>{letterhead.company.address}</Text>
          <Text style={styles.letterheadCompanyLine}>
            {[letterhead.company.city, letterhead.company.state, letterhead.company.country, letterhead.company.postalCode].filter(Boolean).join(", ")}
          </Text>
          <Text style={styles.letterheadCompanyLine}>
            {[letterhead.company.phone, letterhead.company.email, letterhead.company.website].filter(Boolean).join(" • ")}
          </Text>
          {letterhead.company.taxNumber ? <Text style={styles.letterheadCompanyLine}>Tax ID: {letterhead.company.taxNumber}</Text> : null}
          {letterhead.company.registrationNumber ? <Text style={styles.letterheadCompanyLine}>Registration: {letterhead.company.registrationNumber}</Text> : null}
        </View>
      </View>

      <View style={styles.letterheadMetaRow}>
        <Text style={styles.letterheadDocName}>{letterhead.documentName}</Text>
        <Text style={styles.letterheadMetaText}>{letterhead.letterheadNumber}</Text>
        <Text style={styles.letterheadMetaText}>{letterhead.documentDate}</Text>
      </View>

      <Text
        style={[
          styles.letterheadBody,
          {
            fontWeight: letterhead.bodyFormatting.bold ? "800" : "400",
            fontStyle: letterhead.bodyFormatting.italic ? "italic" : "normal",
            textDecorationLine: letterhead.bodyFormatting.underline ? "underline" : "none",
            textAlign: letterhead.bodyFormatting.alignment,
            lineHeight,
          },
        ]}
      >
        {letterhead.body}
      </Text>

      <View style={styles.letterheadSignatureStrip}>
        <View style={styles.letterheadSignatureArea}>
          {letterhead.showStamp && letterhead.company.stampUrl ? <Image source={{ uri: letterhead.company.stampUrl }} style={styles.letterheadStampImage} contentFit="contain" /> : null}
          {placeBusinessSignature ? <Image source={{ uri: letterhead.company.signatureUrl || "" }} style={styles.letterheadSignatureImage} contentFit="contain" /> : null}
          {placeManualSignature ? <Text style={styles.letterheadManualSignature}>{letterhead.manualSignature}</Text> : null}
        </View>
      </View>

      <View style={styles.letterheadFooter}>
        <Text style={styles.letterheadFooterText}>
          {[letterhead.company.address, letterhead.company.city, letterhead.company.state, letterhead.company.country, letterhead.company.postalCode].filter(Boolean).join(", ")}
        </Text>
        <Text style={styles.letterheadFooterText}>
          {[letterhead.company.phone, letterhead.company.email, letterhead.company.website].filter(Boolean).join(" • ")}
        </Text>
        {letterhead.company.taxNumber ? <Text style={styles.letterheadFooterText}>Tax ID: {letterhead.company.taxNumber}</Text> : null}
        {letterhead.showPageNumber ? <Text style={styles.letterheadPageNumber}>Page 1</Text> : null}
      </View>
    </View>
  );
}

function PreviewLine({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <View style={[styles.previewLine, compact && styles.previewLineCompact]}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

function Asset({ label, uri }: { label: string; uri?: string | null }) {
  return (
    <View style={styles.asset}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {uri ? <Image source={{ uri }} style={styles.assetImage} contentFit="contain" /> : <Text style={styles.muted}>Not uploaded</Text>}
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
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  webSafeArea: { backgroundColor: Colors.surface },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  webHeader: { alignSelf: "center", maxWidth: 1040, width: "100%", paddingHorizontal: 40, paddingTop: 22 },
  backButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#EFEFEF", borderRadius: 18, borderWidth: 1, height: 40, justifyContent: "center", width: 40, ...shadow },
  headerTitle: { color: Colors.text, fontSize: 19, fontWeight: "800" },
  headerSpacer: { width: 40 },
  phoneHorizontalWorkspace: { minWidth: 860 },
  container: { alignSelf: "center", minWidth: 820, padding: 18, width: "100%" },
  webContainer: { maxWidth: 1040, paddingHorizontal: 40, paddingBottom: 56 },
  loadingText: { color: Colors.textSecondary, textAlign: "center" },
  document: { width: "100%", padding: 28, backgroundColor: "#FAFAFA", borderRadius: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#222222", marginVertical: 10 },
  content: { fontSize: 16, color: "#333333", lineHeight: 24 },
  emptyCard: { alignItems: "center", backgroundColor: "#FAFAFA", borderRadius: 18, padding: 28 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: "800" },
  emptyText: { color: Colors.textSecondary, marginTop: 6 },
  workflowBar: { alignSelf: "center", backgroundColor: "#FFFFFF", borderColor: "#E8E8E8", borderRadius: 16, borderWidth: 1, marginBottom: 14, maxWidth: 794, padding: 14, width: "100%", ...shadow },
  workflowTitle: { color: Colors.text, fontSize: 15, fontWeight: "900", marginBottom: 10 },
  statusGrid: { flexDirection: "row", gap: 10 },
  statusBox: { borderColor: "#E5E5E5", borderRadius: 12, borderWidth: 1, flex: 1, padding: 11 },
  statusBoxActive: { backgroundColor: "#FFF4E3", borderColor: Colors.primary },
  statusLabel: { color: Colors.text, fontSize: 14, fontWeight: "900", marginBottom: 3 },
  statusLabelActive: { color: Colors.primaryDark },
  statusDescription: { color: Colors.textSecondary, fontSize: 11 },
  previewActions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", marginTop: 12 },
  primaryAction: { backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  primaryActionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  secondaryAction: { alignItems: "center", borderColor: "#E8E8E8", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 12, paddingVertical: 9 },
  secondaryActionText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
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
  companyCopy: { flex: 1 },
  companyName: { color: "#4A4A4A", fontSize: 44, fontWeight: "900", lineHeight: 52, textAlign: "center" },
  companyAddress: { color: "#4A4A4A", fontSize: 18, fontWeight: "800", lineHeight: 24, textAlign: "center" },
  companyEmail: { color: "#4A4A4A", fontSize: 16, fontWeight: "800", textAlign: "center" },
  muted: { color: "#333333", fontSize: 11, lineHeight: 16 },
  partiesGrid: { borderBottomColor: "#8A8A8A", borderBottomWidth: 1.3, flexDirection: "row", minHeight: 145 },
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
  logoInitials: { color: Colors.primaryDark, fontSize: 20, fontWeight: "900" },
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
  letterheadTop: { borderBottomColor: Colors.primary, borderBottomWidth: 3, flexDirection: "row", gap: 16, paddingBottom: 18 },
  letterheadLogoBox: { alignItems: "center", borderColor: "#DADADA", borderRadius: 6, borderWidth: 1, height: 78, justifyContent: "center", overflow: "hidden", width: 92 },
  letterheadCompanyBlock: { flex: 1 },
  letterheadCompanyName: { color: "#111111", fontSize: 27, fontWeight: "900", lineHeight: 34 },
  letterheadTagline: { color: Colors.primaryDark, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  letterheadCompanyLine: { color: "#555555", fontSize: 11, lineHeight: 16 },
  letterheadMetaRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 12 },
  letterheadDocName: { color: "#111111", flex: 1, fontSize: 16, fontWeight: "900" },
  letterheadMetaText: { color: Colors.textSecondary, fontSize: 11, fontWeight: "800", textAlign: "right" },
  letterheadBody: { color: "#222222", flex: 1, fontSize: 14, minHeight: 710, paddingVertical: 12 },
  letterheadSignatureStrip: { alignItems: "flex-end", minHeight: 90 },
  letterheadSignatureArea: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "flex-end", minHeight: 62 },
  letterheadSignatureImage: { height: 52, width: 140 },
  letterheadStampImage: { height: 58, width: 82 },
  letterheadManualSignature: { borderBottomColor: "#BBBBBB", borderBottomWidth: 1, color: "#111111", fontSize: 18, fontStyle: "italic", minWidth: 180, paddingBottom: 4, textAlign: "center" },
  letterheadFooter: { borderTopColor: Colors.primary, borderTopWidth: 2, paddingTop: 8 },
  letterheadFooterText: { color: "#555555", fontSize: 10, lineHeight: 14, textAlign: "center" },
  letterheadPageNumber: { color: "#777777", fontSize: 9, marginTop: 4, textAlign: "right" },
  visitingCardPreviewGrid: { alignSelf: "center", gap: 18, maxWidth: 920, width: "100%" },
  visitingCardPreviewGridDesktop: { alignItems: "flex-start", flexDirection: "row" },
  visitingCardPreviewPane: { flex: 1, gap: 10, minWidth: 0 },
});
