import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppShell, TipCard } from "@/components/ui/branddocs";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useAppTheme } from "@/theme/theme-context";

const availableReports = [
  { title: "Sales Report", subtitle: "Monthly sales overview", icon: "trending-up", iconBg: "#E0F2FE", iconColor: "#0284C7" },
  { title: "Tax Report", subtitle: "GST and tax summaries", icon: "pie-chart", iconBg: "#F3E8FF", iconColor: "#9333EA" },
  { title: "Expense Report", subtitle: "Monthly expenses overview", icon: "bar-chart", iconBg: "#FEE2E2", iconColor: "#DC2626" },
  { title: "Item Sales", subtitle: "Product wise sales", icon: "stats-chart", iconBg: "#CCFBF1", iconColor: "#0D9488" },
];

export default function ReportsScreen() {
  const router = useRouter();
  const { isAppPreview } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();

  function appRoute(pathname: string) {
    if (!isAppPreview) return pathname;
    return { pathname, params: { appPreview: "1" } };
  }

  return (
    <AppShell>
      {/* Title & Subtitle */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.pageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Reports</Text>
        <Text style={[styles.pageSubtitleText, { color: theme.muted }]}>View insights and analytics</Text>
      </View>

      {/* Top 2 KPI Summary Cards */}
      <View style={styles.topSummaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0" }]}>
          <View style={[styles.summaryIconBox, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="trending-up" size={20} color="#16A34A" />
          </View>
          <Text style={[styles.summaryLabel, { color: theme.muted }]}>Total Sales</Text>
          <Text style={[styles.summaryValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Rs. 45,230</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0" }]}>
          <View style={[styles.summaryIconBox, { backgroundColor: "#FFEDD5" }]}>
            <Ionicons name="pie-chart" size={20} color="#EA580C" />
          </View>
          <Text style={[styles.summaryLabel, { color: theme.muted }]}>Pending Due</Text>
          <Text style={[styles.summaryValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Rs. 12,500</Text>
        </View>
      </View>

      {/* Section Title */}
      <Text style={[styles.sectionHeadingText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Available Reports</Text>

      {/* Reports List */}
      <View style={styles.reportsListStack}>
        {availableReports.map((report) => (
          <Pressable
            key={report.title}
            onPress={() => router.push(appRoute("/documents") as never)}
            style={({ pressed }) => [
              styles.reportRowCard,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.reportIconBox, { backgroundColor: report.iconBg }]}>
              <Ionicons name={report.icon as never} size={22} color={report.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reportTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>{report.title}</Text>
              <Text style={[styles.reportSubtitle, { color: theme.muted }]}>{report.subtitle}</Text>
            </View>
            <View style={styles.downloadIconBox}>
              <Ionicons name="arrow-down-circle-outline" size={22} color="#64748B" />
            </View>
          </Pressable>
        ))}
      </View>

      {/* Tip Card */}
      <TipCard text="Download your reports as PDF or Excel for easy sharing." />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  pageTitleText: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  pageSubtitleText: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  topSummaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionHeadingText: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  reportsListStack: {
    gap: 12,
    marginBottom: 20,
  },
  reportRowCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  reportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  reportSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
  },
  downloadIconBox: {
    padding: 4,
  },
});
