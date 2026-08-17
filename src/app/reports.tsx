import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AppShell } from "@/components/ui/branddocs";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BusinessProfile, loadBusinessProfile } from "@/services/business-profile";
import { InvoiceRecord, loadInvoices } from "@/services/invoices";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors } from "@/theme/tokens";

export default function ReportsScreen() {
  const router = useRouter();
  const { isAppPreview } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"sales" | "pending">("sales");

  function appRoute(pathname: string, params?: Record<string, string>) {
    if (!isAppPreview) return params ? { pathname, params } : pathname;
    return { pathname, params: { ...params, appPreview: "1" } };
  }

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const savedProfile = await loadBusinessProfile(auth.currentUser);
        const allInvoices = await loadInvoices(auth.currentUser, savedProfile, "tax_invoice", 500);

        if (isMounted) {
          setProfile(savedProfile);
          setInvoices(allInvoices);
          setLoading(false);
        }
      } catch (error) {
        console.warn("Reports data load failed", error);
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const currency = profile?.defaultCurrency || profile?.currencyCode || "INR";

  // Calculations for Tax Invoices
  const taxInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => (!inv.documentType || inv.documentType === "tax_invoice") && inv.status !== "cancelled"
    );
  }, [invoices]);

  const finalInvoices = useMemo(() => {
    return taxInvoices.filter((inv) => inv.status === "final");
  }, [taxInvoices]);

  const pendingInvoices = useMemo(() => {
    return taxInvoices.filter((inv) => inv.status === "draft");
  }, [taxInvoices]);

  const totalSalesAmount = useMemo(() => {
    return finalInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  }, [finalInvoices]);

  const totalPendingAmount = useMemo(() => {
    return pendingInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  }, [pendingInvoices]);

  function formatMoney(amount: number) {
    return `${currency} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <AppShell>
      {/* Title & Subtitle */}
      <View style={{ marginBottom: 24 }}>
        <Text style={[styles.pageTitleText, { color: theme.ink }]}>Tax Invoice Reports</Text>
        <Text style={[styles.pageSubtitleText, { color: theme.muted }]}>
          Real-time summary of Total Sales and Pending Tax Invoices
        </Text>
      </View>

      {/* Top 2 KPI Summary Cards */}
      <View style={styles.topSummaryRow}>
        {/* Total Sales Card */}
        <Pressable
          onPress={() => setActiveTab("sales")}
          style={[
            styles.summaryCard,
            {
              backgroundColor: activeTab === "sales" ? (isDark ? "rgba(22, 163, 74, 0.15)" : "#F0FDF4") : theme.card,
              borderColor: activeTab === "sales" ? "#16A34A" : theme.line,
              borderWidth: activeTab === "sales" ? 2 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={[styles.summaryIconBox, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="trending-up" size={20} color="#16A34A" />
            </View>
            <View style={[styles.badge, { backgroundColor: "#DCFCE7" }]}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#16A34A" }}>{finalInvoices.length} Final</Text>
            </View>
          </View>
          <Text style={[styles.summaryLabel, { color: theme.muted }]}>Tax Invoice Total Sales</Text>
          <Text style={[styles.summaryValue, { color: "#16A34A" }]}>
            {loading ? "..." : formatMoney(totalSalesAmount)}
          </Text>
        </Pressable>

        {/* Pending Due Card */}
        <Pressable
          onPress={() => setActiveTab("pending")}
          style={[
            styles.summaryCard,
            {
              backgroundColor: activeTab === "pending" ? (isDark ? "rgba(234, 88, 12, 0.15)" : "#FFF7ED") : theme.card,
              borderColor: activeTab === "pending" ? BrandColors.primary : theme.line,
              borderWidth: activeTab === "pending" ? 2 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={[styles.summaryIconBox, { backgroundColor: "#FFEDD5" }]}>
              <Ionicons name="time-outline" size={20} color={BrandColors.primary} />
            </View>
            <View style={[styles.badge, { backgroundColor: "#FFEDD5" }]}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: BrandColors.primaryDark }}>{pendingInvoices.length} Draft</Text>
            </View>
          </View>
          <Text style={[styles.summaryLabel, { color: theme.muted }]}>Tax Invoice Pending</Text>
          <Text style={[styles.summaryValue, { color: BrandColors.primary }]}>
            {loading ? "..." : formatMoney(totalPendingAmount)}
          </Text>
        </Pressable>
      </View>

      {/* 2 Main Report Options */}
      <Text style={[styles.sectionHeadingText, { color: theme.ink }]}>Tax Invoice Options</Text>

      <View style={styles.reportsListStack}>
        {/* Option 1: Total Sales Report */}
        <Pressable
          onPress={() => setActiveTab("sales")}
          style={({ pressed }) => [
            styles.reportRowCard,
            {
              backgroundColor: activeTab === "sales" ? (isDark ? "rgba(22, 163, 74, 0.1)" : "#F0FDF4") : theme.card,
              borderColor: activeTab === "sales" ? "#16A34A" : theme.line,
              borderWidth: activeTab === "sales" ? 1.5 : 1,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[styles.reportIconBox, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="receipt" size={22} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.reportTitle, { color: theme.ink }]}>Total Sales Report</Text>
            <Text style={[styles.reportSubtitle, { color: theme.muted }]}>
              {finalInvoices.length} finalized tax invoice(s) • Total Revenue: {formatMoney(totalSalesAmount)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={activeTab === "sales" ? "#16A34A" : theme.muted} />
        </Pressable>

        {/* Option 2: Pending Details Report */}
        <Pressable
          onPress={() => setActiveTab("pending")}
          style={({ pressed }) => [
            styles.reportRowCard,
            {
              backgroundColor: activeTab === "pending" ? (isDark ? "rgba(234, 88, 12, 0.1)" : "#FFF7ED") : theme.card,
              borderColor: activeTab === "pending" ? BrandColors.primary : theme.line,
              borderWidth: activeTab === "pending" ? 1.5 : 1,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[styles.reportIconBox, { backgroundColor: "#FFEDD5" }]}>
            <Ionicons name="hourglass-outline" size={22} color={BrandColors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.reportTitle, { color: theme.ink }]}>Pending Invoices Report</Text>
            <Text style={[styles.reportSubtitle, { color: theme.muted }]}>
              {pendingInvoices.length} draft/pending tax invoice(s) • Pending Amount: {formatMoney(totalPendingAmount)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={activeTab === "pending" ? BrandColors.primary : theme.muted} />
        </Pressable>
      </View>

      {/* Invoice List Breakdown based on selected Tab */}
      <View style={[styles.detailCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Text style={[styles.detailCardTitle, { color: theme.ink }]}>
            {activeTab === "sales" ? "Finalized Tax Invoices (Sales)" : "Pending / Draft Tax Invoices"}
          </Text>
          <Pressable
            onPress={() => router.push(appRoute("/invoice") as never)}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: BrandColors.primary }}>Manage Invoices</Text>
            <Ionicons name="arrow-forward" size={14} color={BrandColors.primary} />
          </Pressable>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 30, alignItems: "center" }}>
            <ActivityIndicator size="small" color={BrandColors.primary} />
            <Text style={{ color: theme.muted, marginTop: 8, fontSize: 13 }}>Loading reports...</Text>
          </View>
        ) : (activeTab === "sales" ? finalInvoices : pendingInvoices).length > 0 ? (
          (activeTab === "sales" ? finalInvoices : pendingInvoices).map((inv) => (
            <Pressable
              key={inv.id || inv.documentNumber}
              onPress={() => router.push(appRoute("/preview", { type: "invoice", invoiceId: inv.id || "" }) as never)}
              style={({ pressed }) => [
                styles.invoiceRow,
                { borderBottomColor: theme.line },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.invoiceNumber, { color: theme.ink }]}>{inv.documentNumber}</Text>
                  <View style={[styles.statusPill, { backgroundColor: inv.status === "final" ? "#DCFCE7" : "#F1F5F9" }]}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: inv.status === "final" ? "#16A34A" : "#475569" }}>
                      {inv.status === "final" ? "Final" : "Draft"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.invoiceMeta, { color: theme.muted }]}>
                  {inv.invoiceDate} • {inv.customer?.name || "Recipient"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.invoiceAmount, { color: theme.ink }]}>
                  {formatMoney(Number(inv.grandTotal) || 0)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.muted} style={{ marginTop: 2 }} />
              </View>
            </Pressable>
          ))
        ) : (
          <View style={{ paddingVertical: 28, alignItems: "center", gap: 6 }}>
            <Ionicons name="document-text-outline" size={32} color={theme.muted} />
            <Text style={{ color: theme.ink, fontWeight: "700", fontSize: 14 }}>
              {activeTab === "sales" ? "No finalized tax invoices yet" : "No pending tax invoices"}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center" }}>
              {activeTab === "sales"
                ? "Finalize draft tax invoices to see your sales revenue here."
                : "All tax invoices have been finalized or no drafts exist."}
            </Text>
          </View>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  detailCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: "800",
  },
  invoiceMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: "700",
  },
  invoiceRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  pageSubtitleText: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  pageTitleText: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  reportIconBox: {
    alignItems: "center",
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  reportRowCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  reportSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  reportsListStack: {
    gap: 12,
    marginBottom: 24,
  },
  sectionHeadingText: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  statusPill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 18,
  },
  summaryIconBox: {
    alignItems: "center",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  topSummaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
});
