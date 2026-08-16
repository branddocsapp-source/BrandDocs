import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AppCard,
  AppShell,
  ConfirmationModal
} from "@/components/ui/branddocs";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  BusinessProfile,
  getCompanyInitials,
  loadBusinessProfile,
} from "@/services/business-profile";
import {
  getDocumentLabel,
  InvoiceRecord,
  loadInvoices,
} from "@/services/invoices";
import {
  getQuotationLabel,
  loadQuotations,
  QuotationRecord,
} from "@/services/quotations";
import { ThemePalette, useAppTheme } from "@/theme/theme-context";
import {
  BrandColors,
  BrandRadius,
  BrandShadows,
  BrandSpacing,
  BrandTypography,
} from "@/theme/tokens";

const quickActions = [
  {
    title: "Tax Invoice",
    subtitle: "Create a compliant client invoice.",
    icon: "receipt-outline",
    route: "/invoice",
  },
  {
    title: "Quotation",
    subtitle: "Prepare a polished standard quotation.",
    icon: "reader-outline",
    route: "/quotation",
  },
  {
    title: "Receipt",
    subtitle: "Record a paid transaction.",
    icon: "receipt-outline",
    route: "/receipt",
  },
  {
    title: "Letterhead",
    subtitle: "Draft a branded business letter.",
    icon: "newspaper-outline",
    route: "/letterhead",
  },
  {
    title: "Visiting Card",
    subtitle: "Create a professional contact card.",
    icon: "id-card-outline",
    route: "/visiting-card",
  },
  {
    title: "Receipt Scanner",
    subtitle: "Capture a receipt for your records.",
    icon: "scan-circle-outline",
    route: "/scan-receipt",
  },
];

function formatDashboardMoney(amount: number, currency: string) {
  return `${currency || "INR"} ${amount.toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  if (tone === "success")
    return {
      backgroundColor: isDark
        ? "rgba(36, 161, 72, 0.18)"
        : BrandColors.successSoft,
    };
  if (tone === "warning")
    return {
      backgroundColor: isDark
        ? "rgba(245, 158, 11, 0.18)"
        : BrandColors.warningSoft,
    };
  if (tone === "info")
    return {
      backgroundColor: isDark
        ? "rgba(37, 99, 235, 0.18)"
        : BrandColors.infoSoft,
    };
  return {
    backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft,
  };
}

export default function DashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [dashboardDocuments, setDashboardDocuments] = useState<InvoiceRecord[]>(
    [],
  );
  const [dashboardQuotations, setDashboardQuotations] = useState<
    QuotationRecord[]
  >([]);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { isAppPreview, isWideDesktop, usesSidebar, isPhone, width } =
    useResponsiveLayout();
  const { isDark, theme } = useAppTheme();
  const companyName = profile?.name || "Your company";
  const companyInitials = getCompanyInitials(profile?.name);
  const logoUrl = profile?.branding?.logoUrl;
  const dashboardCurrency =
    profile?.defaultCurrency || profile?.currencyCode || "INR";

  const paidAmount = dashboardDocuments
    .filter((document) => document.status === "paid")
    .reduce((total, document) => total + document.grandTotal, 0);
  const pendingAmount = dashboardDocuments
    .filter((document) => document.status === "pending")
    .reduce((total, document) => total + document.grandTotal, 0);
  const draftCount =
    dashboardDocuments.filter((document) => document.status === "draft")
      .length +
    dashboardQuotations.filter((quotation) => quotation.status === "draft")
      .length;
  const totalDocuments = dashboardDocuments.length + dashboardQuotations.length;

  const stats = [
    {
      label: "Total Documents",
      value: String(totalDocuments),
      icon: "documents-outline",
      tone: "neutral",
    },
    {
      label: "Paid / Received",
      value: formatDashboardMoney(paidAmount, dashboardCurrency),
      icon: "checkmark-circle-outline",
      tone: "success",
    },
    {
      label: "Pending Amount",
      value: formatDashboardMoney(pendingAmount, dashboardCurrency),
      icon: "time-outline",
      tone: "warning",
    },
    {
      label: "Draft Documents",
      value: String(draftCount),
      icon: "create-outline",
      tone: "info",
    },
  ];

  const appRoute = useCallback(
    (pathname: string, params?: Record<string, string>) => {
      if (!isAppPreview) return params ? { pathname, params } : pathname;
      return { pathname, params: { ...params, appPreview: "1" } };
    },
    [isAppPreview],
  );

  const recentDocuments = useMemo(() => {
    const invoices = dashboardDocuments.map((document) => ({
      key: `invoice-${document.id || document.documentNumber}`,
      title: document.documentNumber || document.invoiceNumber,
      subtitle:
        document.customer?.name ||
        document.company?.name ||
        getDocumentLabel(document.documentType),
      date: document.invoiceDate || document.createdAt,
      amount: formatDashboardMoney(
        document.grandTotal || 0,
        document.company?.currency || dashboardCurrency,
      ),
      status: invoiceStatusLabel(document.status),
      icon:
        document.documentType === "bill_of_supply"
          ? "document-text-outline"
          : "receipt-outline",
      onOpen: () =>
        router.push(
          appRoute(
            "/invoice",
            document.id ? { editInvoiceId: document.id } : undefined,
          ) as never,
        ),
    }));
    const quotations = dashboardQuotations.map((quotation) => ({
      key: `quotation-${quotation.id || quotation.quotationNumber}`,
      title: quotation.quotationNumber,
      subtitle:
        quotation.client?.companyName ||
        quotation.client?.name ||
        getQuotationLabel(quotation.documentType),
      date: quotation.quotationDate || quotation.createdAt,
      amount: formatDashboardMoney(
        quotation.grandTotal || 0,
        quotation.currency || dashboardCurrency,
      ),
      status: quotationStatusLabel(quotation.status),
      icon:
        quotation.documentType === "table_quotation"
          ? "grid-outline"
          : "reader-outline",
      onOpen: () =>
        router.push(
          appRoute(
            "/quotation",
            quotation.id ? { editQuotationId: quotation.id } : undefined,
          ) as never,
        ),
    }));

    return [...invoices, ...quotations]
      .sort(
        (left, right) =>
          new Date(right.date || 0).getTime() -
          new Date(left.date || 0).getTime(),
      )
      .slice(0, 6);
  }, [
    appRoute,
    dashboardDocuments,
    dashboardQuotations,
    dashboardCurrency,
    router,
  ]);

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
      Alert.alert(
        "Log Out Failed",
        error?.message || "We could not log you out. Please try again.",
      );
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

    const usesPassword = user.providerData.some(
      (provider) => provider.providerId === "password",
    );

    if (usesPassword && !deletePassword) {
      setDeleteError(
        "Enter your password to re-authenticate before deleting your account.",
      );
      return;
    }

    try {
      setDeletingAccount(true);

      if (usesPassword) {
        const credential = EmailAuthProvider.credential(
          user.email || "",
          deletePassword,
        );
        await reauthenticateWithCredential(user, credential);
      }

      await deleteUser(user);
      setProfile(null);
      closeDeleteModal();
      Alert.alert(
        "Account Deleted",
        "Your Firebase Authentication account was deleted. BrandDocs Firestore and Storage data deletion is not implemented yet, so associated business data may still require manual cleanup.",
        [
          {
            text: "Continue",
            onPress: () => router.replace(appRoute("/signin") as never),
          },
        ],
      );
    } catch (error: any) {
      let message =
        error?.message || "We could not delete this account. Please try again.";

      if (error?.code === "auth/requires-recent-login") {
        message =
          "Firebase requires recent authentication before deleting this account. Please log out, sign in again, and retry Delete Account.";
      } else if (
        error?.code === "auth/wrong-password" ||
        error?.code === "auth/invalid-credential"
      ) {
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
        <Text style={[styles.profileMenuText, { color: theme.ink }]}>
          View Profile
        </Text>
      </Pressable>
      <Pressable
        style={styles.profileMenuItem}
        onPress={() => {
          setProfileMenuVisible(false);
          router.push(appRoute("/business-setup", { mode: "edit" }) as never);
        }}
      >
        <Text style={[styles.profileMenuText, { color: theme.ink }]}>
          Edit Business Profile
        </Text>
      </Pressable>
      <Pressable
        style={styles.profileMenuItem}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color={theme.muted} />
        ) : (
          <Text style={[styles.profileMenuText, { color: theme.ink }]}>
            Log Out
          </Text>
        )}
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
      {/* Business Profile Selector Card */}
      <Pressable
        onPress={() => router.push(appRoute("/profile") as never)}
        style={({ pressed }) => [
          styles.businessProfileBanner,
          {
            backgroundColor: isDark ? theme.accentSurface : theme.accentSurface,
            borderColor: isDark ? theme.accentBorder : theme.accentBorder,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View
          style={[
            styles.businessProfileIconBox,
            {
              backgroundColor: isDark
                ? "rgba(255, 122, 0, 0.18)"
                : BrandColors.primarySoft,
            },
          ]}
        >
          <Ionicons name="business" size={22} color={BrandColors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.businessProfileTitle, { color: theme.ink }]}>
            {companyName}
          </Text>
          <Text
            style={[
              styles.businessProfileSubtitle,
              { color: BrandColors.primary },
            ]}
          >
            View Profile
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={BrandColors.primary} />
      </Pressable>

      {/* 2x2 Metrics Cards */}
      <View
        style={[
          styles.metricsGrid,
          usesSidebar && styles.metricsGridWide,
          width < 480 && styles.metricsGridCompact,
        ]}
      >
        <View
          style={[
            styles.metricCard,
            usesSidebar && styles.metricCardWide,
            width < 480 && styles.metricCardCompact,
            width < 480 && styles.metricCardCompact,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
        >
          <View
            style={[
              styles.metricIconBox,
              {
                backgroundColor: isDark ? "rgba(2, 132, 199, 0.16)" : "#E0F2FE",
              },
            ]}
          >
            <Ionicons name="document-text" size={20} color="#0284C7" />
          </View>
          <Text style={[styles.metricLabel, { color: theme.muted }]}>
            Invoices
          </Text>
          <Text style={[styles.metricValue, { color: theme.ink }]}>24</Text>
          <Text style={[styles.metricSubtext, { color: theme.muted }]}>
            This Month
          </Text>
        </View>

        <View
          style={[
            styles.metricCard,
            usesSidebar && styles.metricCardWide,
            width < 480 && styles.metricCardCompact,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
        >
          <View
            style={[
              styles.metricIconBox,
              {
                backgroundColor: isDark ? "rgba(22, 163, 74, 0.16)" : "#DCFCE7",
              },
            ]}
          >
            <Ionicons name="document-text" size={20} color="#16A34A" />
          </View>
          <Text style={[styles.metricLabel, { color: theme.muted }]}>
            Quotations
          </Text>
          <Text style={[styles.metricValue, { color: theme.ink }]}>18</Text>
          <Text style={[styles.metricSubtext, { color: theme.muted }]}>
            This Month
          </Text>
        </View>

        <View
          style={[
            styles.metricCard,
            usesSidebar && styles.metricCardWide,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
        >
          <View
            style={[
              styles.metricIconBox,
              {
                backgroundColor: isDark
                  ? "rgba(13, 148, 136, 0.16)"
                  : "#CCFBF1",
              },
            ]}
          >
            <Ionicons name="document-text-outline" size={20} color="#0D9488" />
          </View>
          <Text style={[styles.metricLabel, { color: theme.muted }]}>
            Receipts
          </Text>
          <Text style={[styles.metricValue, { color: theme.ink }]}>12</Text>
          <Text style={[styles.metricSubtext, { color: theme.muted }]}>
            This Month
          </Text>
        </View>

        <View
          style={[
            styles.metricCard,
            usesSidebar && styles.metricCardWide,
            width < 480 && styles.metricCardCompact,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
        >
          <View
            style={[
              styles.metricIconBox,
              {
                backgroundColor: isDark
                  ? "rgba(255, 122, 0, 0.16)"
                  : BrandColors.primarySoft,
              },
            ]}
          >
            <Ionicons
              name="scan-outline"
              size={20}
              color={BrandColors.primary}
            />
          </View>
          <Text style={[styles.metricLabel, { color: theme.muted }]}>
            Scan Receipts
          </Text>
          <Text style={[styles.metricValue, { color: theme.ink }]}>32</Text>
          <Text style={[styles.metricSubtext, { color: theme.muted }]}>
            This Month
          </Text>
        </View>
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitleText, { color: theme.ink }]}>
          Quick Actions
        </Text>
      </View>

      <View
        style={[
          styles.quickActions3x2,
          usesSidebar && styles.quickActionsWide,
          width < 480 && styles.quickActionsCompact,
        ]}
      >
        {[
          { title: "Create Invoice", icon: "document-text", route: "/invoice" },
          {
            title: "Create Quotation",
            icon: "document-text",
            route: "/quotation",
          },
          { title: "Create Receipt", icon: "document-text", route: "/receipt" },
          {
            title: "Create Letterhead",
            icon: "newspaper",
            route: "/letterhead",
          },
          {
            title: "Create Visiting Card",
            icon: "id-card",
            route: "/visiting-card",
          },
          { title: "Scan Receipt", icon: "scan", route: "/scan-receipt" },
        ].map((action) => (
          <Pressable
            key={action.title}
            onPress={() => router.push(appRoute(action.route) as never)}
            style={({ pressed }) => [
              styles.quickActionPill,
              usesSidebar && styles.quickActionPillWide,
              width < 480 && styles.quickActionPillCompact,
              {
                backgroundColor: theme.accentSurface,
                borderColor: theme.accentBorder,
                borderWidth: 1,
              },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Ionicons
              name={action.icon as never}
              size={22}
              color={BrandColors.primary}
            />
            <Text style={[styles.quickActionLabel, { color: theme.ink }]}>
              {action.title}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Recent Documents */}
      <View style={styles.recentHeaderRow}>
        <Text style={[styles.sectionTitleText, { color: theme.ink }]}>
          Recent Documents
        </Text>
        <Pressable onPress={() => router.push(appRoute("/documents") as never)}>
          <Text style={[styles.viewAllLink, { color: BrandColors.primary }]}>
            View All
          </Text>
        </Pressable>
      </View>

      <View style={styles.recentItemsList}>
        <Pressable
          onPress={() => router.push(appRoute("/invoice") as never)}
          style={[
            styles.recentRowItem,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
        >
          <View
            style={[
              styles.recentIconBox,
              {
                backgroundColor: isDark
                  ? "rgba(13, 148, 136, 0.16)"
                  : "#CCFBF1",
              },
            ]}
          >
            <Ionicons name="document-text-outline" size={20} color="#0D9488" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recentItemTitle, { color: theme.ink }]}>
              INV-042
            </Text>
            <Text style={[styles.recentItemSubtitle, { color: theme.muted }]}>
              Today
            </Text>
          </View>
          <Text style={[styles.recentItemAmount, { color: "#0D9488" }]}>
            Rs. 1,440.00
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push(appRoute("/scan-receipt") as never)}
          style={[
            styles.recentRowItem,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
        >
          <View
            style={[
              styles.recentIconBox,
              {
                backgroundColor: isDark ? "rgba(220, 38, 38, 0.16)" : "#FEE2E2",
              },
            ]}
          >
            <Ionicons name="scan-outline" size={20} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recentItemTitle, { color: theme.ink }]}>
              SCN-142
            </Text>
            <Text style={[styles.recentItemSubtitle, { color: theme.muted }]}>
              Yesterday
            </Text>
          </View>
          <Text style={[styles.recentItemAmount, { color: "#DC2626" }]}>
            Rs. 140.00
          </Text>
        </Pressable>
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
        <Text style={[styles.deleteInstruction, { color: theme.ink }]}>
          Type DELETE to confirm.
        </Text>
        <TextInput
          style={[
            styles.deleteInput,
            {
              color: theme.ink,
              borderColor: theme.line,
              backgroundColor: theme.card,
            },
          ]}
          value={deleteConfirmation}
          onChangeText={setDeleteConfirmation}
          autoCapitalize="characters"
          placeholder="DELETE"
          placeholderTextColor={theme.muted}
        />
        {auth.currentUser?.providerData.some(
          (provider) => provider.providerId === "password",
        ) ? (
          <>
            <Text style={[styles.deleteInstruction, { color: theme.ink }]}>
              Enter your password to re-authenticate.
            </Text>
            <TextInput
              style={[
                styles.deleteInput,
                {
                  color: theme.ink,
                  borderColor: theme.line,
                  backgroundColor: theme.card,
                },
              ]}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              placeholder="Password"
              placeholderTextColor={theme.muted}
            />
          </>
        ) : null}
        {deleteError ? (
          <Text style={styles.deleteError}>{deleteError}</Text>
        ) : null}
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
  revenueCard: {
    marginBottom: BrandSpacing["3xl"],
    padding: BrandSpacing.xl,
  },
  revenueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: BrandSpacing.md,
  },
  revenueTitle: {
    ...BrandTypography.cardTitle,
    fontSize: 17,
  },
  revenueSubtitle: {
    ...BrandTypography.caption,
    marginTop: 2,
  },
  revenueTotalText: {
    ...BrandTypography.cardTitle,
    fontWeight: "700",
  },
  progressBarTrack: {
    height: 12,
    borderRadius: 6,
    flexDirection: "row",
    overflow: "hidden",
    marginVertical: BrandSpacing.md,
  },
  progressSegment: {
    height: "100%",
  },
  legendRow: {
    flexDirection: "row",
    gap: BrandSpacing.xl,
    marginTop: BrandSpacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...BrandTypography.caption,
    fontWeight: "600",
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
    minWidth: 230,
    paddingVertical: BrandSpacing.sm,
    ...BrandShadows.raised,
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
  businessProfileBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  businessProfileIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  businessProfileTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  businessProfileSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.primary,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  metricsGridWide: {
    flexWrap: "nowrap",
  },
  metricsGridCompact: {
    flexDirection: "column",
  },
  metricCard: {
    width: "48%",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
  },
  metricCardWide: {
    flex: 1,
    minWidth: 0,
    width: "auto",
  },
  metricCardCompact: {
    width: "100%",
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  metricSubtext: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  quickActions3x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  quickActionsWide: {
    flexWrap: "nowrap",
  },
  quickActionsCompact: {
    flexDirection: "column",
  },
  quickActionPill: {
    width: "31.5%",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickActionPillWide: {
    flex: 1,
    minWidth: 0,
    width: "auto",
  },
  quickActionPillCompact: {
    width: "100%",
  },
  quickActionLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 14,
  },
  recentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: "700",
    color: BrandColors.primary,
  },
  recentItemsList: {
    gap: 10,
    marginBottom: 20,
  },
  recentRowItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  recentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recentItemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  recentItemSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  recentItemAmount: {
    fontSize: 15,
    fontWeight: "800",
  },
});
