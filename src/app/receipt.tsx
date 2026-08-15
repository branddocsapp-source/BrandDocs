import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

import {
  AppCard,
  AppShell,
  ConfirmationModal,
  EmptyState,
  InputField,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui/branddocs";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BusinessProfile, loadBusinessProfile } from "@/services/business-profile";
import {
  deleteReceipt,
  generateNextReceiptNumber,
  getPaymentMethodLabel,
  loadReceiptById,
  loadReceipts,
  PaymentMethod,
  ReceiptRecord,
  saveReceipt,
  validateReceipt,
} from "@/services/receipts";
import { useAppTheme, ThemePalette } from "@/theme/theme-context";
import { BrandColors, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";
import { ReceiptPaper } from "@/components/document-template/ReceiptPaper";
import { SavedCustomerProfile } from "@/services/customer-directory";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function buildDraftReceipt(profile: BusinessProfile | null, receipts: ReceiptRecord[]): ReceiptRecord {
  const { receiptNumber, numberingSequence } = generateNextReceiptNumber(receipts);

  return {
    receiptNumber,
    numberingSequence,
    receiptTitle: "PAYMENT RECEIPT",
    receiptDate: todayISO(),
    status: "draft",
    paymentMethod: "cash",
    paymentReference: "",
    amount: 0,
    amountInWords: "",
    notes: "",
    receivedFrom: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
    company: {
      logoUrl: profile?.branding?.logoUrl || null,
      name: profile?.name || "Your Company Name",
      address: [profile?.address, profile?.city, profile?.stateProvince, profile?.zipCode, profile?.country].filter(Boolean).join(", ") || "Company Address",
      email: profile?.email || "company@example.com",
      phone: profile?.phone || "",
      website: profile?.website || "",
      country: profile?.country || "",
      currency: profile?.defaultCurrency || profile?.currencyCode || "INR",
      taxRegistrationNumber: profile?.taxRegistrationNumber || "",
      signatureUrl: profile?.branding?.signatureUrl || null,
      stampUrl: profile?.branding?.stampUrl || null,
    },
  };
}

export default function ReceiptScreen() {
  const { theme, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const router = useRouter();
  const { editReceiptId } = useLocalSearchParams<{ editReceiptId?: string }>();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [draft, setDraft] = useState<ReceiptRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<ReceiptRecord | null>(null);
  const { width, isWebsite, isDesktop, isAppPreview } = useResponsiveLayout();
  const isPhone = width < 640;
  const baseWidth = 794;
  const baseHeight = 1123;
  const scale = width < 820 ? (width - 28) / baseWidth : 1;

  const appRoute = useCallback((pathname: string, params?: Record<string, string>) => {
    if (!isAppPreview) return params ? { pathname, params } : pathname;
    return { pathname, params: { ...params, appPreview: "1" } };
  }, [isAppPreview]);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      const savedProfile = await loadBusinessProfile(auth.currentUser);
      const savedReceipts = await loadReceipts(auth.currentUser, savedProfile, 50);
      const editingReceipt = editReceiptId ? await loadReceiptById(auth.currentUser, savedProfile, editReceiptId) : null;

      if (isMounted) {
        setProfile(savedProfile);
        setReceipts(savedReceipts);
        if (editingReceipt) {
          setDraft(editingReceipt);
        }
        setLoading(false);
      }
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [editReceiptId]);

  function refreshReceipts(next?: ReceiptRecord) {
    loadReceipts(auth.currentUser, profile, 50).then((saved) => {
      setReceipts(saved.length ? saved : next ? [next, ...receipts] : receipts);
    });
  }

  function startNewReceipt() {
    setFieldErrors({});
    setDraft(buildDraftReceipt(profile, receipts));
  }

  function updateDraftField(field: keyof ReceiptRecord, value: any) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateReceivedFromField(field: keyof ReceiptRecord["receivedFrom"], value: string) {
    setDraft((current) => (current ? {
      ...current,
      receivedFrom: { ...current.receivedFrom, [field]: value }
    } : current));
  }

  function applySavedCustomer(customer: SavedCustomerProfile) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        receivedFrom: {
          ...current.receivedFrom,
          name: customer.name || current.receivedFrom.name,
          phone: customer.phone || current.receivedFrom.phone,
          email: customer.email || current.receivedFrom.email,
          address: customer.address || current.receivedFrom.address,
        },
      };
    });
  }

  async function handleDelete(receipt: ReceiptRecord) {
    try {
      await deleteReceipt(auth.currentUser, profile, receipt);
      setReceipts((current) => current.filter((item) => item.id !== receipt.id && item.receiptNumber !== receipt.receiptNumber));
      setDeleteTarget(null);
    } catch (error: any) {
      Alert.alert("Delete Failed", error?.message || "We could not delete this receipt.");
    }
  }

  async function persistReceipt(status: ReceiptRecord["status"], goToPreview = false) {
    if (!draft) return;
    
    const errors = validateReceipt(draft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Alert.alert("Validation Error", "Please correct the errors in the form before saving.");
      return;
    }
    setFieldErrors({});

    try {
      setSaving(true);
      const result = await saveReceipt(auth.currentUser, profile, { ...draft, status });
      refreshReceipts(result.receipt);

      if (goToPreview) {
        router.push(appRoute("/preview", { type: "receipt", receiptId: result.receipt.id || "" }) as never);
      } else {
        setDraft(null);
        Alert.alert("Receipt Saved", result.warning || `Receipt saved as ${status.charAt(0).toUpperCase() + status.slice(1)}.`);
      }
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "We could not save this receipt.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={[styles.loadingText, { color: theme.muted }]}>Loading Receipts Module...</Text>
        </View>
      </AppShell>
    );
  }

  if (draft) {
    const paymentMethods: PaymentMethod[] = ["cash", "bank_transfer", "cheque", "card", "upi", "other"];
    const isPaidReceipt = (draft.receiptTitle || "").toUpperCase().includes("PAID");

    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.editorHeader}>
              <Pressable style={styles.headerButton} onPress={() => setDraft(null)} accessibilityRole="button" accessibilityLabel="Back">
                <Ionicons name="chevron-back" size={22} color={theme.ink} />
              </Pressable>
              <Text style={styles.editorTitle}>Payment Receipt</Text>
              <View style={styles.editorActions}>
                <Pressable style={styles.secondaryButton} onPress={() => persistReceipt("draft")} disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Save Draft</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => persistReceipt("final")} disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Finalize</Text>
                </Pressable>
                <Pressable style={[styles.saveButton, saving && styles.disabledButton]} onPress={() => persistReceipt("draft", true)} disabled={saving}>
                  <Text style={styles.saveButtonText}>Preview</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.typeToolbar}>
              <Pressable
                style={[styles.typePill, isPaidReceipt && styles.typePillActive]}
                onPress={() => updateDraftField("receiptTitle", "MONEY PAID RECEIPT")}
              >
                <Text style={[styles.typePillText, isPaidReceipt && styles.typePillTextActive]}>Money Paid</Text>
              </Pressable>
              <Pressable
                style={[styles.typePill, !isPaidReceipt && styles.typePillActive]}
                onPress={() => updateDraftField("receiptTitle", "MONEY RECEIVED RECEIPT")}
              >
                <Text style={[styles.typePillText, !isPaidReceipt && styles.typePillTextActive]}>Money Received</Text>
              </Pressable>
              <View style={styles.methodPicker}>
                {paymentMethods.map((method) => (
                  <Pressable
                    key={method}
                    style={[styles.methodChip, draft.paymentMethod === method && styles.methodChipActive]}
                    onPress={() => updateDraftField("paymentMethod", method)}
                  >
                    <Text style={[styles.methodChipText, draft.paymentMethod === method && styles.methodChipTextActive]}>
                      {getPaymentMethodLabel(method)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {fieldErrors.amount || fieldErrors["receivedFrom.name"] ? (
              <View style={styles.errorBox}>
                {Object.values(fieldErrors).map((error) => (
                  <Text key={error} style={styles.errorText}>{error}</Text>
                ))}
              </View>
            ) : null}

            <ScrollView contentContainerStyle={[styles.editorContent, isWebsite && styles.webEditorContent, width < 820 && { minWidth: 0 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                  <ReceiptPaper
                    receipt={draft}
                    editable
                    isDesktop={isDesktop}
                    onFieldChange={updateDraftField}
                    onReceivedFromChange={updateReceivedFromField}
                    onSelectSavedCustomer={applySavedCustomer}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Payment Receipt"
        subtitle="Track and issue instant payment receipts for clients, cash sales, bank transfers, or deposits."
        action={
          <PrimaryButton
            label="Create New Receipt"
            icon="add"
            onPress={startNewReceipt}
          />
        }
      />

      <View style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <Text style={[styles.sectionTitle, { color: theme.ink, marginBottom: 16 }]}>Previous Receipts</Text>

        {receipts.length > 0 ? (
          receipts.map((receipt) => (
            <View key={receipt.id || receipt.receiptNumber} style={[styles.receiptRow, { borderBottomColor: theme.line }]}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
                <Ionicons name="receipt-outline" size={20} color={BrandColors.primary} />
              </View>
              <View style={styles.receiptDetails}>
                <View style={styles.numberRow}>
                  <Text style={[styles.receiptNumberText, { color: theme.ink }]}>{receipt.receiptNumber}</Text>
                  <StatusBadge status={receipt.status} />
                </View>
                <Text style={[styles.receiptMeta, { color: theme.muted }]}>
                  {receipt.receiptDate} • Received from {receipt.receivedFrom.name || "Unnamed Customer"}
                </Text>
              </View>
              <View style={styles.rightActions}>
                <Text style={[styles.receiptAmountText, { color: theme.ink }]}>
                  {receipt.company.currency} {receipt.amount.toFixed(2)}
                </Text>
                <View style={styles.actionButtons}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => router.push(appRoute("/preview", { type: "receipt", receiptId: receipt.id || "" }) as never)}
                    accessibilityRole="button"
                    accessibilityLabel="View Receipt Preview"
                  >
                    <Ionicons name="eye-outline" size={18} color={theme.ink} />
                  </Pressable>
                  {receipt.status === "draft" && (
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => setDraft(receipt)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit Receipt"
                    >
                      <Ionicons name="create-outline" size={18} color={theme.ink} />
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => setDeleteTarget(receipt)}
                    accessibilityRole="button"
                    accessibilityLabel="Delete Receipt"
                  >
                    <Ionicons name="trash-outline" size={18} color={BrandColors.error} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No receipts created yet"
            message="Created receipts will appear here, sorted by the latest date first."
            icon="receipt-outline"
          />
        )}
      </View>

      <ConfirmationModal
        visible={!!deleteTarget}
        title="Delete Receipt"
        message={`Are you sure you want to permanently delete receipt ${deleteTarget?.receiptNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}

const createStyles = (theme: ThemePalette, isDark: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  webSafeArea: {
    backgroundColor: theme.wash,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  loadingText: {
    ...BrandTypography.body,
    marginTop: BrandSpacing.md,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: BrandSpacing.lg,
    paddingVertical: BrandSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
    backgroundColor: theme.card,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
  },
  editorTitle: {
    ...BrandTypography.sectionHeading,
    color: theme.ink,
    flex: 1,
    marginLeft: BrandSpacing.md,
  },
  editorActions: {
    flexDirection: "row",
    gap: BrandSpacing.sm,
  },
  secondaryButton: {
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
  },
  secondaryButtonText: {
    ...BrandTypography.buttonLabel,
    color: theme.ink,
  },
  saveButton: {
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
    borderRadius: BrandRadius.medium,
    backgroundColor: BrandColors.primary,
  },
  saveButtonText: {
    ...BrandTypography.buttonLabel,
    color: "#FFFFFF",
  },
  disabledButton: {
    opacity: 0.5,
  },
  editorContent: {
    padding: BrandSpacing.lg,
    gap: BrandSpacing.lg,
    alignSelf: "center",
    minWidth: 820,
    width: "100%",
  },
  webEditorContent: {
    maxWidth: 1120,
    paddingVertical: BrandSpacing["2xl"],
  },
  typeToolbar: {
    alignItems: "center",
    backgroundColor: theme.card,
    borderBottomColor: theme.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
    paddingHorizontal: BrandSpacing.lg,
    paddingVertical: BrandSpacing.sm,
  },
  typePill: {
    borderColor: theme.line,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.xs,
  },
  typePillActive: {
    backgroundColor: BrandColors.primarySoft,
    borderColor: BrandColors.primary,
  },
  typePillText: {
    ...BrandTypography.caption,
    color: theme.muted,
  },
  typePillTextActive: {
    color: BrandColors.primaryDark,
  },
  methodPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.xs,
    marginLeft: "auto",
  },
  methodChip: {
    borderColor: theme.line,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    paddingHorizontal: BrandSpacing.sm,
    paddingVertical: 4,
  },
  methodChipActive: {
    backgroundColor: BrandColors.primarySoft,
    borderColor: BrandColors.primary,
  },
  methodChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.muted,
  },
  methodChipTextActive: {
    color: BrandColors.primaryDark,
  },
  errorBox: {
    alignSelf: "center",
    backgroundColor: "#FFF2F0",
    borderColor: "#FFD2CC",
    borderRadius: 12,
    borderWidth: 1,
    margin: BrandSpacing.md,
    maxWidth: 794,
    padding: 12,
    width: "100%",
  },
  errorText: {
    color: BrandColors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  formSection: {
    padding: BrandSpacing.lg,
  },
  sectionTitle: {
    ...BrandTypography.cardTitle,
    fontWeight: "800",
    marginBottom: BrandSpacing.md,
  },
  row: {
    flexDirection: "row",
    gap: BrandSpacing.md,
  },
  col: {
    flex: 1,
  },
  inputLabel: {
    ...BrandTypography.formLabel,
    marginTop: BrandSpacing.md,
    marginBottom: BrandSpacing.xs,
  },
  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
    marginVertical: BrandSpacing.sm,
  },
  methodBox: {
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
  },
  methodBoxSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: BrandColors.primarySoft,
  },
  methodText: {
    ...BrandTypography.caption,
    color: theme.text,
  },
  methodTextSelected: {
    color: BrandColors.primary,
    fontWeight: "700",
  },
  listCard: {
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    padding: BrandSpacing.lg,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: BrandSpacing.md,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BrandRadius.medium,
    justifyContent: "center",
    alignItems: "center",
    marginRight: BrandSpacing.md,
  },
  receiptDetails: {
    flex: 1,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: BrandSpacing.sm,
    marginBottom: 4,
  },
  receiptNumberText: {
    ...BrandTypography.cardTitle,
  },
  receiptMeta: {
    ...BrandTypography.caption,
  },
  rightActions: {
    alignItems: "flex-end",
    gap: BrandSpacing.xs,
  },
  receiptAmountText: {
    ...BrandTypography.cardTitle,
    fontWeight: "800",
  },
  actionButtons: {
    flexDirection: "row",
    gap: BrandSpacing.xs,
  },
  actionBtn: {
    padding: 6,
  },
});
