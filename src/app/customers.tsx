import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppShell, TipCard } from "@/components/ui/branddocs";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useAppTheme } from "@/theme/theme-context";

const sampleCustomers = [
  { id: "1", initial: "A", name: "Acme Corp", phone: "+1 234 567 890", email: "contact@acme.com" },
  { id: "2", initial: "G", name: "Globex Inc", phone: "+1 987 654 321", email: "info@globex.com" },
  { id: "3", initial: "S", name: "Soylent Corp", phone: "+1 555 123 456", email: "hello@soylent.com" },
  { id: "4", initial: "I", name: "Initech", phone: "+1 555 987 654", email: "support@initech.com" },
];

export default function CustomersScreen() {
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
        <Text style={[styles.pageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Customers</Text>
        <Text style={[styles.pageSubtitleText, { color: theme.muted }]}>Manage your clients and customers</Text>
      </View>

      {/* Top Action Pills */}
      <View style={styles.topActionsRow}>
        <Pressable
          onPress={() => router.push(appRoute("/profile") as never)}
          style={({ pressed }) => [
            styles.actionPillBtn,
            { backgroundColor: isDark ? "rgba(234, 88, 12, 0.15)" : "#FFF7ED" },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="person-add-outline" size={18} color="#EA580C" />
          <Text style={styles.actionPillText}>Add Customer</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push(appRoute("/profile") as never)}
          style={({ pressed }) => [
            styles.actionPillBtn,
            { backgroundColor: isDark ? "rgba(234, 88, 12, 0.15)" : "#FFF7ED" },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="people-outline" size={18} color="#EA580C" />
          <Text style={styles.actionPillText}>Import Contacts</Text>
        </Pressable>
      </View>

      {/* Section Title */}
      <Text style={[styles.sectionHeadingText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Recent Customers</Text>

      {/* Customer List */}
      <View style={styles.customerListStack}>
        {sampleCustomers.map((cust) => (
          <Pressable
            key={cust.id}
            onPress={() => router.push(appRoute("/profile") as never)}
            style={({ pressed }) => [
              styles.customerRowCard,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{cust.initial}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.customerName, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>{cust.name}</Text>
              <View style={styles.contactDetailsRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="call-outline" size={13} color={theme.muted} />
                  <Text style={[styles.detailText, { color: theme.muted }]}>{cust.phone}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="mail-outline" size={13} color={theme.muted} />
                  <Text style={[styles.detailText, { color: theme.muted }]} numberOfLines={1}>{cust.email}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </Pressable>
        ))}
      </View>

      {/* Tip Card */}
      <TipCard text="Add complete details to create invoices faster!" />
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
  topActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionPillBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 8,
  },
  actionPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7C2D12",
  },
  sectionHeadingText: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  customerListStack: {
    gap: 12,
    marginBottom: 20,
  },
  customerRowCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
  },
  contactDetailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
