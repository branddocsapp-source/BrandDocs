import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard, AppShell, EmptyState, PageHeader, PrimaryButton } from "@/components/ui/branddocs";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors, BrandRadius, BrandShadows, BrandSpacing, BrandTypography } from "@/theme/tokens";

const modules = [
  { title: "Tax Invoice", route: "/invoice", icon: "receipt-outline", previous: "Previous Tax Invoices", empty: "No tax invoices created yet" },
  { title: "Bill of Supply", route: "/invoice", icon: "document-text-outline", previous: "Previous Bills of Supply", empty: "No bills of supply created yet" },
  { title: "Standard Quotation", route: "/quotation", icon: "reader-outline", previous: "Previous Standard Quotations", empty: "No standard quotations created yet" },
  { title: "Table Quotation", route: "/table-quotation", icon: "grid-outline", previous: "Previous Table Quotations", empty: "No table quotations created yet" },
  { title: "Letterhead", route: "/letterhead", icon: "newspaper-outline", previous: "Previous Letterheads", empty: "No letterheads created yet" },
  { title: "Receipt", route: "/receipt", icon: "receipt-outline", previous: "Previous Receipts", empty: "No receipts created yet" },
  { title: "Visiting Card", route: "/visiting-card", icon: "id-card-outline", previous: "Previous Visiting Cards", empty: "No visiting cards created yet" },
  { title: "Receipt Scanner", route: "/scan-receipt", icon: "scan-circle-outline", previous: "Previous Scanned Receipts", empty: "No scanned receipts created yet" },
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
      <PageHeader
        title="Documents"
        subtitle="Create and review every BrandDocs document module from one workspace."
      />

      <View style={styles.moduleList}>
        {modules.map((module) => (
          <AppCard key={module.title} style={styles.moduleCard}>
            <View style={styles.moduleTop}>
              <View style={[styles.moduleIcon, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
                <Ionicons name={module.icon as never} size={22} color={BrandColors.primary} />
              </View>
              <View style={styles.moduleCopy}>
                <Text style={[styles.moduleTitle, { color: theme.ink }]}>{module.title}</Text>
                <Text style={[styles.moduleSubtitle, { color: theme.muted }]}>{module.previous}</Text>
              </View>
              <PrimaryButton label="Create" onPress={() => router.push(appRoute(module.route) as never)} />
            </View>

            <View style={styles.previousArea}>
              <EmptyState title={module.previous} message={module.empty} />
            </View>
          </AppCard>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to dashboard"
        style={({ pressed }) => [styles.backLink, { backgroundColor: theme.card, borderColor: theme.line }, pressed && styles.pressed]}
        onPress={() => router.push(appRoute("/dashboard") as never)}
      >
        <Ionicons name="arrow-back" size={18} color={BrandColors.primary} />
        <Text style={styles.backLinkText}>Back to dashboard</Text>
      </Pressable>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  moduleList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
  },
  moduleCard: {
    flexGrow: 1,
    minWidth: 300,
    width: "48%",
  },
  moduleTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.md,
  },
  moduleIcon: {
    alignItems: "center",
    backgroundColor: BrandColors.primarySoft,
    borderRadius: BrandRadius.medium,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  moduleCopy: {
    flex: 1,
    minWidth: 0,
  },
  moduleTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  moduleSubtitle: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  previousArea: {
    marginTop: BrandSpacing.lg,
  },
  backLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.sm,
    marginTop: BrandSpacing["2xl"],
    minHeight: 44,
    paddingHorizontal: BrandSpacing.lg,
    ...BrandShadows.subtle,
  },
  backLinkText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.primary,
  },
  pressed: {
    opacity: 0.72,
  },
});
