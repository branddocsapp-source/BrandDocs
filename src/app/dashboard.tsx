import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, signOut } from "firebase/auth";

import {
  AppCard,
  AppShell,
  ConfirmationModal,
  DocumentCard,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui/branddocs";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BusinessProfile, getCompanyInitials, loadBusinessProfile } from "@/services/business-profile";
import { getDocumentLabel, InvoiceRecord, loadInvoices } from "@/services/invoices";
import { getQuotationLabel, QuotationRecord, loadQuotations } from "@/services/quotations";
import { useAppTheme, ThemePalette } from "@/theme/theme-context";
import { BrandColors, BrandRadius, BrandShadows, BrandSpacing, BrandTypography } from "@/theme/tokens";

const quickActions = [
  { title: "Tax Invoice", subtitle: "Create a compliant client invoice.", icon: "receipt-outline", route: "/invoice" },
  { title: "Quotation", subtitle: "Prepare a polished standard quotation.", icon: "reader-outline", route: "/quotation" },
  { title: "Receipt", subtitle: "Record a paid transaction.", icon: "receipt-outline", route: "/receipt" },
  { title: "Letterhead", subtitle: "Draft a branded business letter.", icon: "newspaper-outline", route: "/letterhead" },
  { title: "Visiting Card", subtitle: "Create a professional contact card.", icon: "id-card-outline", route: "/visiting-card" },
  { title: "Receipt Scanner", subtitle: "Capture a receipt for your records.", icon: "scan-circle-outline", route: "/scan-receipt" },
];

function formatDashboardMoney(amount: number, currency: string) {
  return `${currency || "INR"} ${amount.toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function invoiceStatusLabel(status: InvoiceRecord["status"]) {
  if (status === "paid") return "Paid";
  if (status === "pending") return "Pending";
  return "Draft";
}

function quotationStatusLabel(status: QuotationRecord["status"]) {
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
  if (status === "sent") return "Sent";
  return "Draft";
}

function statToneStyle(tone: string, isDark: boolean, theme: ThemePalette) {
  if (tone === "success") return { backgroundColor: isDark ? "rgba(36, 161, 72, 0.18)" : BrandColors.successSoft };
  if (tone === "warning") return { backgroundColor: isDark ? "rgba(245, 158, 11, 0.18)" : BrandColors.warningSoft };
  if (tone === "info") return { backgroundColor: isDark ? "rgba(37, 99, 235, 0.18)" : BrandColors.infoSoft };
  return { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft };
}

export default function DashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [dashboardDocuments, setDashboardDocuments] = useState<InvoiceRecord[]>([]);
  const [dashboardQuotations, setDashboardQuotations] = useState<QuotationRecord[]>([]);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { isAppPreview, isWideDesktop, usesSidebar, isPhone } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();
  const companyName = profile?.name || "Your company";
  const companyInitials = getCompanyInitials(profile?.name);
  const logoUrl = profile?.branding?.logoUrl;
  const dashboardCurrency = profile?.defaultCurrency || profile?.currencyCode || "INR";

  const paidAmount = dashboardDocuments
    .filter((document) => document.status === "paid")
    .reduce((total, document) => total + document.grandTotal, 0);
  const pendingAmount = dashboardDocuments
    .filter((document) => document.status === "pending")
    .reduce((total, document) => total + document.grandTotal, 0);
  const draftCount =
    dashboardDocuments.filter((document) => document.status === "draft").length +
    dashboardQuotations.filter((quotation) => quotation.status === "draft").length;
  const totalDocuments = dashboardDocuments.length + dashboardQuotations.length;

  const stats = [
    { label: "Total Documents", value: String(totalDocuments), icon: "documents-outline", tone: "neutral" },
    { label: "Paid / Received", value: formatDashboardMoney(paidAmount, dashboardCurrency), icon: "checkmark-circle-outline", tone: "success" },
    { label: "Pending Amount", value: formatDashboardMoney(pendingAmount, dashboardCurrency), icon: "time-outline", tone: "warning" },
    { label: "Draft Documents", value: String(draftCount), icon: "create-outline", tone: "info" },
  ];

  const appRoute = useCallback((pathname: string, params?: Record<string, string>) => {
    if (!isAppPreview) return params ? { pathname, params } : pathname;
    return { pathname, params: { ...params, appPreview: "1" } };
  }, [isAppPreview]);

  const recentDocuments = useMemo(() => {
    const invoices = dashboardDocuments.map((document) => ({
      key: `invoice-${document.id || document.documentNumber}`,
      title: document.documentNumber || document.invoiceNumber,
      subtitle: document.customer?.name || document.company?.name || getDocumentLabel(document.documentType),
      date: document.invoiceDate || document.createdAt,
      amount: formatDashboardMoney(document.grandTotal || 0, document.company?.currency || dashboardCurrency),
      status: invoiceStatusLabel(document.status),
      icon: document.documentType === "bill_of_supply" ? "document-text-outline" : "receipt-outline",
      onOpen: () => router.push(appRoute("/invoice", document.id ? { editInvoiceId: document.id } : undefined) as never),
    }));
    const quotations = dashboardQuotations.map((quotation) => ({
      key: `quotation-${quotation.id || quotation.quotationNumber}`,
      title: quotation.quotationNumber,
      subtitle: quotation.client?.companyName || quotation.client?.name || getQuotationLabel(quotation.documentType),
      date: quotation.quotationDate || quotation.createdAt,
      amount: formatDashboardMoney(quotation.grandTotal || 0, quotation.currency || dashboardCurrency),
      status: quotationStatusLabel(quotation.status),
      icon: quotation.documentType === "table_quotation" ? "grid-outline" : "reader-outline",
      onOpen: () => router.push(appRoute("/quotation", quotation.id ? { editQuotationId: quotation.id } : undefined) as never),
    }));

    return [...invoices, ...quotations]
      .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())
      .slice(0, 6);
  }, [appRoute, dashboardDocuments, dashboardQuotations, dashboardCurrency, router]);

  function closeDeleteModal() {
    setDeleteModalVisible(false);
    setDeleteConfirmation("");
    setDeletePassword("");
    setDeleteError("");
  }

  async function handleLogout() {
    if (loggingOut || deletingAccount) return;

    try {
      setLoggingOut(true);
      setProfileMenuVisible(false);
      await signOut(auth);
      setProfile(null);
      router.replace(appRoute("/signin") as never);
    } catch (error: any) {
      Alert.alert("Log Out Failed", error?.message || "We could not log you out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleDeleteAccount() {
    const user = auth.currentUser;

    setDeleteError("");

    if (!user) {
      setDeleteError("No authenticated user was found. Please sign in again.");
      return;
    }

    if (deleteConfirmation.trim() !== "DELETE") {
      setDeleteError("Type DELETE to confirm account deletion.");
      return;
    }

    const usesPassword = user.providerData.some((provider) => provider.providerId === "password");

    if (usesPassword && !deletePassword) {
      setDeleteError("Enter your password to re-authenticate before deleting your account.");
      return;
    }

    try {
      setDeletingAccount(true);

      if (usesPassword) {
        const credential = EmailAuthProvider.credential(user.email || "", deletePassword);
        await reauthenticateWithCredential(user, credential);
      }

      await deleteUser(user);
      setProfile(null);
      closeDeleteModal();
      Alert.alert(
        "Account Deleted",
        "Your Firebase Authentication account was deleted. BrandDocs Firestore and Storage data deletion is not implemented yet, so associated business data may still require manual cleanup.",
        [{ text: "Continue", onPress: () => router.replace(appRoute("/signin") as never) }]
      );
    } catch (error: any) {
      let message = error?.message || "We could not delete this account. Please try again.";

      if (error?.code === "auth/requires-recent-login") {
        message = "Firebase requires recent authentication before deleting this account. Please log out, sign in again, and retry Delete Account.";
      } else if (error?.code === "auth/wrong-password" || error?.code === "auth/invalid-credential") {
        message = "The password entered for re-authentication is incorrect.";
      }

      setDeleteError(message);
    } finally {
      setDeletingAccount(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateProfile() {
      const savedProfile = await loadBusinessProfile(auth.currentUser);
      const [savedDocuments, savedQuotations] = await Promise.all([
        loadInvoices(auth.currentUser, savedProfile, undefined, 500),
        loadQuotations(auth.currentUser, savedProfile, undefined, 500),
      ]);
      if (isMounted) {
        setProfile(savedProfile);
        setDashboardDocuments(savedDocuments);
        setDashboardQuotations(savedQuotations);
      }
    }

    hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const profileMenu = profileMenuVisible ? (
    <AppCard style={styles.profileMenu}>
      <Pressable
        style={styles.profileMenuItem}
        onPress={() => {
          setProfileMenuVisible(false);
          router.push(appRoute("/profile") as never);
        }}
      >
        <Text style={[styles.profileMenuText, { color: theme.ink }]}>View Profile</Text>
      </Pressable>
      <Pressable
        style={styles.profileMenuItem}
        onPress={() => {
          setProfileMenuVisible(false);
          router.push(appRoute("/business-setup", { mode: "edit" }) as never);
        }}
      >
        <Text style={[styles.profileMenuText, { color: theme.ink }]}>Edit Business Profile</Text>
      </Pressable>
      <Pressable style={styles.profileMenuItem} onPress={handleLogout} disabled={loggingOut}>
        {loggingOut ? <ActivityIndicator color={theme.muted} /> : <Text style={[styles.profileMenuText, { color: theme.ink }]}>Log Out</Text>}
      </Pressable>
      <Pressable
        style={styles.profileMenuItem}
        onPress={() => {
          setProfileMenuVisible(false);
          router.push(appRoute("/delete-account") as never);
        }}
      >
        <Text style={styles.deleteMenuText}>Delete Account</Text>
      </Pressable>
    </AppCard>
  ) : null;

  return (
    <AppShell
      profileInitials={companyInitials}
      profileLogoUrl={logoUrl}
      onProfilePress={() => setProfileMenuVisible((value) => !value)}
      profileMenu={profileMenu}
      showSearch={usesSidebar}
    >
      <PageHeader
        title={`Hi, ${profile?.ownerName || companyName}`}
        subtitle="Here is what is happening across your business documents."
        action={usesSidebar ? <StatusBadge status="Workspace" /> : undefined}
      />

      <View style={[styles.statsGrid, isWideDesktop && styles.statsGridWide]}>
        {stats.map((item) => (
          <AppCard key={item.label} style={[styles.statCard, isPhone && { minWidth: 140 }]}>
            <View style={[styles.statIcon, statToneStyle(item.tone, isDark, theme)]}>
              <Ionicons name={item.icon as never} size={21} color={BrandColors.primary} />
            </View>
            <Text style={[styles.statLabel, { color: theme.muted }]}>{item.label}</Text>
            <Text style={[styles.statValue, { color: theme.ink }]} numberOfLines={1} adjustsFontSizeToFit>{item.value}</Text>
          </AppCard>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Quick Actions</Text>
      </View>
      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <Pressable
            key={action.title}
            style={({ pressed }) => [
              styles.actionCard,
              isPhone && { minWidth: 135 },
              { backgroundColor: theme.card, borderColor: theme.line },
              pressed && styles.pressedCard,
            ]}
            onPress={() => router.push(appRoute(action.route) as never)}
            accessibilityRole="button"
            accessibilityLabel={action.title}
          >
            <View style={[styles.actionIcon, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
              <Ionicons name={action.icon as never} size={21} color={BrandColors.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.ink }]}>{action.title}</Text>
            <Text style={[styles.actionSubtitle, { color: theme.muted }]}>{action.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.recentHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>Recent Documents</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.muted }]}>Real saved invoices and quotations from this workspace.</Text>
        </View>
        <SecondaryButton label="View all" icon="folder-open-outline" onPress={() => router.push(appRoute("/documents") as never)} />
      </View>

      <View style={styles.recentList}>
        {recentDocuments.length ? (
          recentDocuments.map((document) => (
            <DocumentCard
              key={document.key}
              title={document.title}
              subtitle={document.subtitle}
              meta={formatDate(document.date)}
              amount={document.amount}
              status={document.status}
              icon={document.icon as never}
              onOpen={document.onOpen}
            />
          ))
        ) : (
          <EmptyState
            title="No documents yet"
            message="Create your first invoice, quotation, receipt, or letterhead when you are ready."
            action={<PrimaryButton label="Create document" icon="add" onPress={() => router.push(appRoute("/documents") as never)} />}
          />
        )}
      </View>

      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Account"
        message="Deleting your account may permanently remove your BrandDocs account. Firestore and Storage data deletion is not safely implemented yet, so associated business data may require manual cleanup."
        confirmLabel="Delete Account"
        destructive
        loading={deletingAccount}
        onCancel={closeDeleteModal}
        onConfirm={handleDeleteAccount}
      >
        <Text style={[styles.deleteInstruction, { color: theme.ink }]}>Type DELETE to confirm.</Text>
        <TextInput
          style={[styles.deleteInput, { color: theme.ink, borderColor: theme.line, backgroundColor: theme.card }]}
          value={deleteConfirmation}
          onChangeText={setDeleteConfirmation}
          autoCapitalize="characters"
          placeholder="DELETE"
          placeholderTextColor={theme.muted}
        />
        {auth.currentUser?.providerData.some((provider) => provider.providerId === "password") ? (
          <>
            <Text style={[styles.deleteInstruction, { color: theme.ink }]}>Enter your password to re-authenticate.</Text>
            <TextInput
              style={[styles.deleteInput, { color: theme.ink, borderColor: theme.line, backgroundColor: theme.card }]}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              placeholder="Password"
              placeholderTextColor={theme.muted}
            />
          </>
        ) : null}
        {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}
      </ConfirmationModal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
    marginBottom: BrandSpacing["3xl"],
  },
  statsGridWide: {
    flexWrap: "nowrap",
  },
  statCard: {
    flexGrow: 1,
    minWidth: 190,
    width: "23.5%",
  },
  statIcon: {
    alignItems: "center",
    borderRadius: BrandRadius.medium,
    height: 42,
    justifyContent: "center",
    marginBottom: BrandSpacing.md,
    width: 42,
  },
  neutralIcon: {
    backgroundColor: BrandColors.primarySoft,
  },
  successIcon: {
    backgroundColor: BrandColors.successSoft,
  },
  warningIcon: {
    backgroundColor: BrandColors.warningSoft,
  },
  infoIcon: {
    backgroundColor: BrandColors.infoSoft,
  },
  statLabel: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
    marginBottom: BrandSpacing.xs,
  },
  statValue: {
    ...BrandTypography.sectionHeading,
    color: BrandColors.text,
  },
  sectionHeader: {
    marginBottom: BrandSpacing.md,
  },
  sectionTitle: {
    ...BrandTypography.sectionHeading,
    color: BrandColors.text,
  },
  sectionSubtitle: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
    marginBottom: BrandSpacing["3xl"],
  },
  actionCard: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 154,
    minWidth: 158,
    padding: BrandSpacing.lg,
    width: "31%",
    ...BrandShadows.subtle,
  },
  pressedCard: {
    opacity: 0.76,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: BrandColors.primarySoft,
    borderRadius: BrandRadius.medium,
    height: 44,
    justifyContent: "center",
    marginBottom: BrandSpacing.md,
    width: 44,
  },
  actionTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  actionSubtitle: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
    marginTop: BrandSpacing.xs,
  },
  recentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.md,
    justifyContent: "space-between",
    marginBottom: BrandSpacing.md,
  },
  recentList: {
    gap: BrandSpacing.md,
  },
  profileMenu: {
    marginTop: -BrandSpacing.sm,
    minWidth: 230,
    paddingVertical: BrandSpacing.sm,
  },
  profileMenuItem: {
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: BrandSpacing.lg,
  },
  profileMenuText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.text,
  },
  deleteMenuText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.error,
  },
  deleteInstruction: {
    ...BrandTypography.formLabel,
    color: BrandColors.text,
    marginBottom: BrandSpacing.sm,
  },
  deleteInput: {
    ...BrandTypography.body,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    color: BrandColors.text,
    marginBottom: BrandSpacing.md,
    minHeight: 48,
    paddingHorizontal: BrandSpacing.md,
  },
  deleteError: {
    ...BrandTypography.helperText,
    color: BrandColors.error,
  },
});
