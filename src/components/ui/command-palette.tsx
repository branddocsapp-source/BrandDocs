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
          <View style={[styles.searchBar, { borderBottomColor: theme.line, backgroundColor: isDark ? "#171A21" : "#FAFAFA" }]}>
            <Ionicons name="search-outline" size={22} color="#EA580C" />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Type a command or jump to tool..."
              placeholderTextColor={theme.muted}
              style={[
                styles.searchInput,
                { color: theme.ink },
                Platform.OS === "web" && ({ outlineStyle: "none", outlineWidth: 0 } as any),
              ]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={theme.muted} />
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} style={[styles.closeBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" }]}>
              <Text style={[styles.closeBadgeText, { color: isDark ? "#CBD5E1" : "#475569" }]}>ESC</Text>
            </Pressable>
          </View>

          {/* Results List */}
          <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
            {filteredCommands.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={36} color={theme.muted} />
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
                    pressed && { backgroundColor: isDark ? "rgba(234, 88, 12, 0.12)" : "rgba(234, 88, 12, 0.05)" },
                  ]}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: isDark ? "rgba(234, 88, 12, 0.2)" : "#FFF7ED" }]}>
                    <Ionicons name={item.icon} size={20} color="#EA580C" />
                  </View>
                  <View style={styles.textWrapper}>
                    <Text style={[styles.commandTitle, { color: theme.ink }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.commandSubtitle, { color: theme.muted }]}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <View style={[styles.categoryTag, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" }]}>
                    <Text style={[styles.categoryTagText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                      {item.category.toUpperCase()}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Footer Shortcuts */}
          <View style={[styles.footer, { borderTopColor: theme.line, backgroundColor: isDark ? "#171A21" : "#F8FAFC" }]}>
            <Text style={[styles.footerText, { color: theme.muted }]}>
              💡 Tip: Tap any tool to navigate instantly or press <Text style={{ fontWeight: "700", color: "#EA580C" }}>ESC</Text> to close
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
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: Platform.OS === "web" ? 90 : 40,
    paddingHorizontal: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 620,
    maxHeight: 540,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    padding: 0,
    borderWidth: 0,
  },
  closeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  closeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  resultsList: {
    paddingVertical: 6,
  },
  commandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrapper: {
    flex: 1,
  },
  commandTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  commandSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  emptyContainer: {
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
