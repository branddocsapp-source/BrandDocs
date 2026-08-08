import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppShell, TipCard } from "@/components/ui/branddocs";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useAppTheme } from "@/theme/theme-context";

const documentItems = [
  { title: "Invoices", subtitle: "Create and manage invoices", route: "/invoice", icon: "document-text", iconBg: "#E0F2FE", iconColor: "#0284C7" },
  { title: "Quotations", subtitle: "Create and manage quotations", route: "/quotation", icon: "document-text", iconBg: "#DCFCE7", iconColor: "#16A34A" },
  { title: "Receipts", subtitle: "Create and manage receipts", route: "/receipt", icon: "document-text-outline", iconBg: "#CCFBF1", iconColor: "#0D9488" },
  { title: "Letterheads", subtitle: "Create and manage letterheads", route: "/letterhead", icon: "newspaper", iconBg: "#F3E8FF", iconColor: "#9333EA" },
  { title: "Visiting Cards", subtitle: "Create and manage visiting cards", route: "/visiting-card", icon: "id-card", iconBg: "#FCE7F3", iconColor: "#DB2777" },
  { title: "Scan Receipt", subtitle: "Scan and save receipt documents", route: "/scan-receipt", icon: "scan", iconBg: "#FFEDD5", iconColor: "#EA580C" },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const { isAppPreview } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();

  function appRoute(pathname: string) {
    if (!isAppPreview) return pathname;
    return { pathname, params: { appPreview: "1" } };
  }

  return (
    <AppShell>
      {/* Page Title Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.docPageTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Documents</Text>
        <Text style={[styles.docPageSubtitle, { color: theme.muted }]}>Create and manage all your business documents</Text>
      </View>

      {/* Document Items List */}
      <View style={styles.documentListStack}>
        {documentItems.map((item) => (
          <Pressable
            key={item.title}
            onPress={() => router.push(appRoute(item.route) as never)}
            style={({ pressed }) => [
              styles.documentRowCard,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.docIconBox, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon as never} size={22} color={item.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.docItemTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>{item.title}</Text>
              <Text style={[styles.docItemSubtitle, { color: theme.muted }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </Pressable>
        ))}
      </View>

      {/* Tip Card */}
      <TipCard text="Keep all your business documents in one place. Create, manage and share with ease!" />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  docPageTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  docPageSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  documentListStack: {
    gap: 12,
    marginBottom: 20,
  },
  documentRowCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  docItemTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  docItemSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
  },
});
