import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppCard,
  AppShell,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui/branddocs";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BusinessProfile, loadBusinessProfile } from "@/services/business-profile";
import { InvoiceRecord, loadInvoices } from "@/services/invoices";
import { QuotationRecord, loadQuotations } from "@/services/quotations";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";

type TimePeriod = "this_month" | "quarter" | "ytd" | "all";

export default function ReportsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>("all");
  const { isAppPreview, isWideDesktop, isPhone } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();

  const currency = profile?.defaultCurrency || profile?.currencyCode || "INR";

  function appRoute(pathname: string, params?: Record<string, string>) {
    if (!isAppPreview) return params ? { pathname, params } : pathname;
    return { pathname, params: { ...params, appPreview: "1" } };
  }

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      const savedProfile = await loadBusinessProfile(auth.currentUser);
      const [savedInvoices, savedQuotations] = await Promise.all([
        loadInvoices(auth.currentUser, savedProfile, undefined, 500),
        loadQuotations(auth.currentUser, savedProfile, undefined, 500),
      ]);

      if (isMounted) {
        setProfile(savedProfile);
        setInvoices(savedInvoices);
        setQuotations(savedQuotations);
        setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredInvoices = useMemo(() => {
    if (period === "all") return invoices;
    const now = new Date();
    return invoices.filter((inv) => {
      const invDate = new Date(inv.invoiceDate || inv.createdAt || 0);
      if (Number.isNaN(invDate.getTime())) return true;
      if (period === "this_month") {
        return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      }
      if (period === "quarter") {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return invDate >= threeMonthsAgo;
      }
      if (period === "ytd") {
        return invDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [invoices, period]);

  const filteredQuotations = useMemo(() => {
    if (period === "all") return quotations;
    const now = new Date();
    return quotations.filter((quo) => {
      const quoDate = new Date(quo.quotationDate || quo.createdAt || 0);
      if (Number.isNaN(quoDate.getTime())) return true;
      if (period === "this_month") {
        return quoDate.getMonth() === now.getMonth() && quoDate.getFullYear() === now.getFullYear();
      }
      if (period === "quarter") {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return quoDate >= threeMonthsAgo;
      }
      if (period === "ytd") {
        return quoDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [quotations, period]);

  const paidTotal = filteredInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  const pendingTotal = filteredInvoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  const grandTotalRevenue = paidTotal + pendingTotal;

  const acceptedQuotations = filteredQuotations.filter((q) => q.status === "accepted").length;
  const conversionRate = filteredQuotations.length
    ? Math.round((acceptedQuotations / filteredQuotations.length) * 100)
    : 0;

  function formatMoney(amount: number) {
    return `${currency} ${amount.toFixed(2)}`;
  }

  return (
    <AppShell>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Track revenue, collected income, pending receivables, and document conversion rates."
        action={
          <SecondaryButton
            label="Back to Dashboard"
            icon="home-outline"
            onPress={() => router.push(appRoute("/dashboard") as never)}
          />
        }
      />

      {/* Period Filter Tabs */}
      <View style={[styles.periodBar, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <Text style={[styles.periodLabel, { color: theme.muted }]}>Filter Period:</Text>
        <View style={styles.periodTabs}>
          {[
            { id: "all", label: "All Time" },
            { id: "this_month", label: "This Month" },
            { id: "quarter", label: "Last 3 Months" },
            { id: "ytd", label: "Year to Date" },
          ].map((tab) => {
            const active = period === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setPeriod(tab.id as TimePeriod)}
                style={[
                  styles.periodTab,
                  active && { backgroundColor: BrandColors.primary },
                ]}
              >
                <Text style={[styles.periodTabText, { color: active ? "#FFFFFF" : theme.ink }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={[styles.loadingText, { color: theme.muted }]}>Calculating financial reports...</Text>
        </View>
      ) : (
        <View style={styles.contentGrid}>
          {/* Top KPI Cards */}
          <View style={[styles.kpiGrid, isWideDesktop && styles.kpiGridWide]}>
            <AppCard style={[styles.kpiCard, isPhone && { minWidth: 140 }]}>
              <View style={[styles.kpiIcon, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
                <Ionicons name="bar-chart-outline" size={22} color={BrandColors.primary} />
              </View>
              <Text style={[styles.kpiLabel, { color: theme.muted }]}>Total Billed Revenue</Text>
              <Text style={[styles.kpiValue, { color: theme.ink }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(grandTotalRevenue)}
              </Text>
              <Text style={[styles.kpiSubtext, { color: theme.muted }]}>{filteredInvoices.length} invoices generated</Text>
            </AppCard>

            <AppCard style={[styles.kpiCard, isPhone && { minWidth: 140 }]}>
              <View style={[styles.kpiIcon, { backgroundColor: isDark ? "rgba(36, 161, 72, 0.18)" : BrandColors.successSoft }]}>
                <Ionicons name="checkmark-circle-outline" size={22} color={BrandColors.success} />
              </View>
              <Text style={[styles.kpiLabel, { color: theme.muted }]}>Collected Income</Text>
              <Text style={[styles.kpiValue, { color: BrandColors.success }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(paidTotal)}
              </Text>
              <Text style={[styles.kpiSubtext, { color: theme.muted }]}>
                {filteredInvoices.filter((i) => i.status === "paid").length} paid transactions
              </Text>
            </AppCard>

            <AppCard style={[styles.kpiCard, isPhone && { minWidth: 140 }]}>
              <View style={[styles.kpiIcon, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.18)" : BrandColors.warningSoft }]}>
                <Ionicons name="time-outline" size={22} color={BrandColors.warning} />
              </View>
              <Text style={[styles.kpiLabel, { color: theme.muted }]}>Pending Receivables</Text>
              <Text style={[styles.kpiValue, { color: BrandColors.warning }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(pendingTotal)}
              </Text>
              <Text style={[styles.kpiSubtext, { color: theme.muted }]}>
                {filteredInvoices.filter((i) => i.status === "pending").length} pending client payments
              </Text>
            </AppCard>

            <AppCard style={[styles.kpiCard, isPhone && { minWidth: 140 }]}>
              <View style={[styles.kpiIcon, { backgroundColor: isDark ? "rgba(37, 99, 235, 0.18)" : BrandColors.infoSoft }]}>
                <Ionicons name="pie-chart-outline" size={22} color={BrandColors.info} />
              </View>
              <Text style={[styles.kpiLabel, { color: theme.muted }]}>Quotation Conversion</Text>
              <Text style={[styles.kpiValue, { color: theme.ink }]}>{conversionRate}%</Text>
              <Text style={[styles.kpiSubtext, { color: theme.muted }]}>
                {acceptedQuotations} / {filteredQuotations.length} quotes accepted
              </Text>
            </AppCard>
          </View>

          {/* Breakdown Section */}
          <View style={[styles.twoColumn, isWideDesktop && styles.twoColumnWide]}>
            {/* Document Distribution Card */}
            <AppCard style={styles.columnCard}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="documents-outline" size={20} color={BrandColors.primary} />
                <Text style={[styles.cardHeaderTitle, { color: theme.ink }]}>Document Volume Breakdown</Text>
              </View>

              <View style={styles.breakdownList}>
                <View style={[styles.breakdownRow, { borderBottomColor: theme.line }]}>
                  <Text style={[styles.breakdownName, { color: theme.ink }]}>Tax Invoices</Text>
                  <Text style={[styles.breakdownBadge, { color: theme.ink }]}>{filteredInvoices.length} docs</Text>
                </View>
                <View style={[styles.breakdownRow, { borderBottomColor: theme.line }]}>
                  <Text style={[styles.breakdownName, { color: theme.ink }]}>Quotations</Text>
                  <Text style={[styles.breakdownBadge, { color: theme.ink }]}>{filteredQuotations.length} docs</Text>
                </View>
                <View style={[styles.breakdownRow, { borderBottomColor: theme.line }]}>
                  <Text style={[styles.breakdownName, { color: theme.ink }]}>Paid Invoices</Text>
                  <Text style={[styles.breakdownBadge, { color: BrandColors.success }]}>
                    {filteredInvoices.filter((i) => i.status === "paid").length} paid
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownName, { color: theme.ink }]}>Pending Invoices</Text>
                  <Text style={[styles.breakdownBadge, { color: BrandColors.warning }]}>
                    {filteredInvoices.filter((i) => i.status === "pending").length} pending
                  </Text>
                </View>
              </View>
            </AppCard>

            {/* Quick Actions Card */}
            <AppCard style={styles.columnCard}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="briefcase-outline" size={20} color={BrandColors.primary} />
                <Text style={[styles.cardHeaderTitle, { color: theme.ink }]}>Workspace Overview</Text>
              </View>
              <Text style={[styles.overviewBody, { color: theme.muted }]}>
                Showing financial activity for <Text style={{ color: theme.ink, fontWeight: "700" }}>{profile?.name || "Your Business"}</Text>. Reports automatically reflect all saved client invoices and quotations.
              </Text>
              <View style={styles.overviewActions}>
                <PrimaryButton
                  label="Create Invoice"
                  icon="add"
                  onPress={() => router.push(appRoute("/invoice") as never)}
                />
                <SecondaryButton
                  label="Create Quotation"
                  icon="reader-outline"
                  onPress={() => router.push(appRoute("/quotation") as never)}
                />
              </View>
            </AppCard>
          </View>

          {/* Recent Invoices & Transactions Table */}
          <AppCard>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.cardHeaderTitle, { color: theme.ink }]}>Recent Billed Transactions</Text>
              <SecondaryButton
                label="View all documents"
                icon="folder-open-outline"
                onPress={() => router.push(appRoute("/documents") as never)}
              />
            </View>

            {filteredInvoices.length === 0 ? (
              <EmptyState
                title="No invoices in selected period"
                message="Create invoices to view real-time revenue reporting and transaction history."
                action={
                  <PrimaryButton
                    label="Create Invoice"
                    icon="add"
                    onPress={() => router.push(appRoute("/invoice") as never)}
                  />
                }
              />
            ) : (
              <View style={styles.tableStack}>
                {filteredInvoices.slice(0, 5).map((inv, index) => (
                  <View
                    key={inv.id || inv.documentNumber}
                    style={[
                      styles.tableRow,
                      index < Math.min(filteredInvoices.length, 5) - 1 && [styles.tableRowBorder, { borderBottomColor: theme.line }],
                    ]}
                  >
                    <View style={styles.tableColLeft}>
                      <Text style={[styles.tableDocNum, { color: theme.ink }]}>{inv.documentNumber || inv.invoiceNumber}</Text>
                      <Text style={[styles.tableClient, { color: theme.muted }]}>{inv.customer?.name || inv.company?.name || "Client"}</Text>
                    </View>
                    <View style={styles.tableColRight}>
                      <Text style={[styles.tableAmount, { color: theme.ink }]}>{formatMoney(inv.grandTotal || 0)}</Text>
                      <StatusBadge status={inv.status === "paid" ? "Paid" : inv.status === "pending" ? "Pending" : "Draft"} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </AppCard>
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  periodBar: {
    alignItems: "center",
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
    marginBottom: BrandSpacing.xl,
    padding: BrandSpacing.md,
  },
  periodLabel: {
    ...BrandTypography.formLabel,
    marginLeft: BrandSpacing.xs,
  },
  periodTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.xs,
  },
  periodTab: {
    borderRadius: BrandRadius.pill,
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.xs + 2,
  },
  periodTabText: {
    ...BrandTypography.caption,
    fontWeight: "700",
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 240,
  },
  loadingText: {
    ...BrandTypography.body,
    marginTop: BrandSpacing.md,
  },
  contentGrid: {
    gap: BrandSpacing.xl,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
  },
  kpiGridWide: {
    flexWrap: "nowrap",
  },
  kpiCard: {
    flexGrow: 1,
    minWidth: 200,
    width: "23.5%",
  },
  kpiIcon: {
    alignItems: "center",
    borderRadius: BrandRadius.medium,
    height: 44,
    justifyContent: "center",
    marginBottom: BrandSpacing.md,
    width: 44,
  },
  kpiLabel: {
    ...BrandTypography.caption,
    marginBottom: BrandSpacing.xs,
  },
  kpiValue: {
    ...BrandTypography.sectionHeading,
    fontSize: 22,
  },
  kpiSubtext: {
    ...BrandTypography.helperText,
    marginTop: BrandSpacing.xs,
  },
  twoColumn: {
    gap: BrandSpacing.xl,
  },
  twoColumnWide: {
    flexDirection: "row",
  },
  columnCard: {
    flex: 1,
  },
  cardHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.sm,
    marginBottom: BrandSpacing.md,
  },
  cardHeaderTitle: {
    ...BrandTypography.cardTitle,
  },
  breakdownList: {
    gap: BrandSpacing.sm,
  },
  breakdownRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: BrandSpacing.sm,
  },
  breakdownName: {
    ...BrandTypography.body,
    fontSize: 14,
  },
  breakdownBadge: {
    ...BrandTypography.buttonLabel,
  },
  overviewBody: {
    ...BrandTypography.body,
    lineHeight: 22,
    marginBottom: BrandSpacing.lg,
  },
  overviewActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
  },
  tableHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: BrandSpacing.md,
  },
  tableStack: {
    gap: BrandSpacing.xs,
  },
  tableRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: BrandSpacing.md,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
  },
  tableColLeft: {
    gap: 2,
  },
  tableDocNum: {
    ...BrandTypography.cardTitle,
    fontSize: 15,
  },
  tableClient: {
    ...BrandTypography.caption,
  },
  tableColRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  tableAmount: {
    ...BrandTypography.buttonLabel,
  },
});
