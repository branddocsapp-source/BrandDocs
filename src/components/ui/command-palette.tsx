import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors, BrandRadius, BrandShadows } from "@/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

type CommandItem = {
  id: string;
  title: string;
  subtitle: string;
  category: "create" | "navigate" | "action";
  icon: IconName;
  route?: string;
  action?: () => void;
};

type CommandPaletteProps = {
  visible: boolean;
  onClose: () => void;
};

export function CommandPalette({ visible, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { isDark, toggleTheme, theme } = useAppTheme();
  const [query, setQuery] = useState("");

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "create-invoice",
        title: "Create Tax Invoice",
        subtitle: "Draft a compliant client invoice with line items",
        category: "create",
        icon: "receipt-outline",
        route: "/invoice",
      },
      {
        id: "create-quotation",
        title: "Create Quotation",
        subtitle: "Prepare a client price proposal or cost estimate",
        category: "create",
        icon: "reader-outline",
        route: "/quotation",
      },
      {
        id: "create-visiting-card",
        title: "Design Visiting Card",
        subtitle: "Create digital card with interactive vCard QR code",
        category: "create",
        icon: "id-card-outline",
        route: "/visiting-card",
      },
      {
        id: "create-letterhead",
        title: "Draft Letterhead",
        subtitle: "Generate official company letterhead document",
        category: "create",
        icon: "newspaper-outline",
        route: "/letterhead",
      },
      {
        id: "create-receipt",
        title: "Issue Payment Receipt",
        subtitle: "Record a paid transaction or cash receipt",
        category: "create",
        icon: "receipt-outline",
        route: "/receipt",
      },
      {
        id: "scan-receipt",
        title: "OCR Receipt Scanner",
        subtitle: "Scan paper receipt to extract total & vendor info",
        category: "create",
        icon: "scan-circle-outline",
        route: "/scan-receipt",
      },
      {
        id: "nav-documents",
        title: "All Documents Hub",
        subtitle: "Browse, filter, & export stored documents",
        category: "navigate",
        icon: "folder-open-outline",
        route: "/documents",
      },
      {
        id: "nav-business-setup",
        title: "Business Setup Profile",
        subtitle: "Edit logo, company name, address, tax IDs",
        category: "navigate",
        icon: "briefcase-outline",
        route: "/business-setup",
      },
      {
        id: "nav-reports",
        title: "Financial Reports",
        subtitle: "View tax summaries and payment analytics",
        category: "navigate",
        icon: "bar-chart-outline",
        route: "/reports",
      },
      {
        id: "nav-settings",
        title: "App Settings",
        subtitle: "Preferences, currency, security, & theme options",
        category: "navigate",
        icon: "settings-outline",
        route: "/settings",
      },
      {
        id: "action-toggle-theme",
        title: isDark ? "Switch to Light Mode" : "Switch to Dark Mode",
        subtitle: `Currently using ${isDark ? "Dark" : "Light"} theme`,
        category: "action",
        icon: isDark ? "sunny-outline" : "moon-outline",
        action: () => {
          toggleTheme();
          onClose();
        },
      },
    ],
    [isDark, toggleTheme, onClose]
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  const handleSelect = (item: CommandItem) => {
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route as any);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContent,
            { backgroundColor: theme.card, borderColor: theme.line },
            BrandShadows.raised,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header Search Input */}
          <View style={[styles.searchBar, { borderBottomColor: theme.line }]}>
            <Ionicons name="search-outline" size={20} color={BrandColors.primary} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Type a command or jump to tool..."
              placeholderTextColor={theme.muted}
              style={[styles.searchInput, { color: theme.ink }]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.muted} />
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} style={styles.closeBadge}>
              <Text style={styles.closeBadgeText}>ESC</Text>
            </Pressable>
          </View>

          {/* Results List */}
          <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
            {filteredCommands.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-discontent" size={32} color={theme.muted} />
                <Text style={[styles.emptyText, { color: theme.muted }]}>
                  No matching tools found for "{query}"
                </Text>
              </View>
            ) : (
              filteredCommands.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [
                    styles.commandRow,
                    { borderBottomColor: theme.line },
                    pressed && { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" },
                  ]}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: isDark ? "rgba(255, 122, 0, 0.15)" : BrandColors.primarySoft }]}>
                    <Ionicons name={item.icon} size={20} color={BrandColors.primary} />
                  </View>
                  <View style={styles.textWrapper}>
                    <Text style={[styles.commandTitle, { color: theme.ink }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.commandSubtitle, { color: theme.muted }]}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <View style={[styles.categoryTag, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F0F2F5" }]}>
                    <Text style={[styles.categoryTagText, { color: theme.muted }]}>
                      {item.category.toUpperCase()}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Footer Shortcuts */}
          <View style={[styles.footer, { borderTopColor: theme.line, backgroundColor: theme.surface }]}>
            <Text style={[styles.footerText, { color: theme.muted }]}>
              💡 Tip: Tap any command to navigate instantly
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: Platform.OS === "web" ? 80 : 40,
    paddingHorizontal: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 620,
    maxHeight: 520,
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    overflow: "hidden",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    padding: 0,
  },
  closeBadge: {
    backgroundColor: "rgba(150,150,150,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
  },
  resultsList: {
    paddingVertical: 4,
  },
  commandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 14,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrapper: {
    flex: 1,
  },
  commandTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  commandSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
