import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, TextInput } from "react-native";

import { AppCard, AppShell, EmptyState, PageHeader, PrimaryButton, SecondaryButton, IconButton } from "@/components/ui/branddocs";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors, BrandRadius, BrandShadows, BrandSpacing, BrandTypography } from "@/theme/tokens";

const modules = [
  { title: "Tax Invoice", category: "invoices", route: "/invoice", icon: "receipt-outline", previous: "Tax Invoices Generator", empty: "Create compliant client tax invoices with automatic tax & totals." },
  { title: "Bill of Supply", category: "invoices", route: "/invoice", icon: "document-text-outline", previous: "Bill of Supply Document", empty: "Create tax-exempt or composition scheme bills of supply." },
  { title: "Standard Quotation", category: "quotations", route: "/quotation", icon: "reader-outline", previous: "Client Price Proposals", empty: "Prepare clear proposals & cost estimates for your business." },
  { title: "Table Quotation", category: "quotations", route: "/table-quotation", icon: "grid-outline", previous: "Tabular Price Lists", empty: "Create clean multi-column product price sheets and rate cards." },
  { title: "Letterhead", category: "branding", route: "/letterhead", icon: "newspaper-outline", previous: "Official Letterhead Generator", empty: "Draft executive correspondence with company headers & seals." },
  { title: "Receipt", category: "receipts", route: "/receipt", icon: "receipt-outline", previous: "Cash & Payment Receipts", empty: "Issue instant receipts for cash, bank transfers, or card deposits." },
  { title: "Visiting Card", category: "branding", route: "/visiting-card", icon: "id-card-outline", previous: "Digital Visiting Cards", empty: "Design digital contact cards complete with vCard QR codes." },
  { title: "Receipt Scanner", category: "receipts", route: "/scan-receipt", icon: "scan-circle-outline", previous: "OCR Document Scanner", empty: "Capture paper bills and automatically extract amounts & dates." },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const { isAppPreview, isPhone } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  function appRoute(pathname: string) {
    if (!isAppPreview) return pathname;
    return { pathname, params: { appPreview: "1" } };
  }

  const filteredModules = useMemo(() => {
    return modules.filter((mod) => {
      const matchesCategory = activeCategory === "all" || mod.category === activeCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.empty.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  return (
    <AppShell>
      <PageHeader
        title="Document Workspaces"
        subtitle="Create, manage, and export every document module from one central workspace."
        action={
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <IconButton
              icon={viewMode === "grid" ? "list-outline" : "grid-outline"}
              accessibilityLabel="Toggle Grid or List View"
              active={false}
              onPress={() => setViewMode((m) => (m === "grid" ? "list" : "grid"))}
            />
          </View>
        }
      />

      {/* Search & Filter Toolbar */}
      <View style={[styles.filterBar, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={18} color={theme.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search document tools..."
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.ink }]}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* Category Pills */}
        <View style={styles.categoryPills}>
          {[
            { id: "all", label: "All Modules" },
            { id: "invoices", label: "Invoices & Bills" },
            { id: "quotations", label: "Quotations" },
            { id: "branding", label: "Cards & Letterhead" },
            { id: "receipts", label: "Receipts & OCR" },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: isActive
                      ? BrandColors.primary
                      : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "#F0F2F5",
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: isActive ? "#FFFFFF" : theme.ink },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Module Grid or List */}
      <View style={viewMode === "grid" ? styles.moduleList : styles.listView}>
        {filteredModules.map((module) => (
          <AppCard
            key={module.title}
            style={[
              styles.moduleCard,
              viewMode === "list" && styles.listCard,
              isPhone && { width: "100%" },
            ]}
          >
            <View style={styles.moduleTop}>
              <View
                style={[
                  styles.moduleIcon,
                  { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft },
                ]}
              >
                <Ionicons name={module.icon as never} size={22} color={BrandColors.primary} />
              </View>
              <View style={styles.moduleCopy}>
                <Text style={[styles.moduleTitle, { color: theme.ink }]}>{module.title}</Text>
                <Text style={[styles.moduleSubtitle, { color: theme.muted }]}>
                  {module.previous}
                </Text>
              </View>
              <PrimaryButton
                label="Launch"
                icon="arrow-forward"
                onPress={() => router.push(appRoute(module.route) as never)}
              />
            </View>

            {viewMode === "grid" ? (
              <View style={styles.moduleDescBox}>
                <Text style={[styles.moduleDescText, { color: theme.muted }]}>
                  {module.empty}
                </Text>
              </View>
            ) : null}
          </AppCard>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to dashboard"
        style={({ pressed }) => [
          styles.backLink,
          { backgroundColor: theme.card, borderColor: theme.line },
          pressed && styles.pressed,
        ]}
        onPress={() => router.push(appRoute("/dashboard") as never)}
      >
        <Ionicons name="arrow-back" size={18} color={BrandColors.primary} />
        <Text style={styles.backLinkText}>Back to dashboard</Text>
      </Pressable>
    </AppShell>
  );
}


const styles = StyleSheet.create({
  filterBar: {
    padding: BrandSpacing.lg,
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    marginBottom: BrandSpacing.xl,
    gap: BrandSpacing.md,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BrandRadius.medium,
    backgroundColor: "rgba(0,0,0,0.03)",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    fontWeight: "500",
  },
  categoryPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BrandRadius.pill,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  moduleList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
  },
  listView: {
    flexDirection: "column",
    gap: BrandSpacing.md,
  },
  moduleCard: {
    flexGrow: 1,
    minWidth: 300,
    width: "48%",
  },
  listCard: {
    width: "100%",
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
  moduleDescBox: {
    marginTop: BrandSpacing.md,
    paddingTop: BrandSpacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  moduleDescText: {
    ...BrandTypography.caption,
    fontSize: 13,
    lineHeight: 18,
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

