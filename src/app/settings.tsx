import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { signOut } from "firebase/auth";

import { AppShell, PrimaryButton, SecondaryButton } from "@/components/ui/branddocs";
import { ThemeModeSelector } from "@/components/ui/theme-mode-selector";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors } from "@/theme/tokens";

export default function SettingsScreen() {
  const router = useRouter();
  const { isAppPreview } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const [taxModalVisible, setTaxModalVisible] = useState(false);
  const [taxNumber, setTaxNumber] = useState("");

  function appRoute(pathname: string) {
    if (!isAppPreview) return pathname;
    return { pathname, params: { appPreview: "1" } };
  }

  async function handleLogOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out error", e);
    } finally {
      setLoggingOut(false);
      router.replace(appRoute("/signin") as never);
    }
  }

  const sectionGroups = [
    {
      groupTitle: "BUSINESS & PROFILE",
      items: [
        {
          title: "Business Setup & Branding",
          subtitle: "Edit logo, company name, address & tax IDs",
          icon: "briefcase-outline",
          iconBg: isDark ? "rgba(255, 122, 0, 0.16)" : BrandColors.primarySoft,
          iconColor: BrandColors.primary,
          action: () => router.push(appRoute("/business-setup") as never),
        },
        {
          title: "User Profile & Credentials",
          subtitle: "Update display name, email & avatar",
          icon: "person-outline",
          iconBg: isDark ? "rgba(2, 132, 199, 0.16)" : "#E0F2FE",
          iconColor: "#0284C7",
          action: () => router.push(appRoute("/profile") as never),
        },
      ],
    },
    {
      groupTitle: "TAX & DOCUMENTS",
      items: [
        {
          title: "Tax & Invoice Configurations",
          subtitle: "Manage GSTIN, invoice prefixes & default terms",
          icon: "receipt-outline",
          iconBg: isDark ? "rgba(22, 163, 74, 0.16)" : "#DCFCE7",
          iconColor: "#16A34A",
          action: () => setTaxModalVisible(true),
        },
        {
          title: "Reports & Analytics",
          subtitle: "View tax summaries & payment analytics",
          icon: "bar-chart-outline",
          iconBg: isDark ? "rgba(147, 51, 234, 0.16)" : "#F3E8FF",
          iconColor: "#9333EA",
          action: () => router.push(appRoute("/reports") as never),
        },
      ],
    },
    {
      groupTitle: "SECURITY & LEGAL",
      items: [
        {
          title: "Security & Account Credentials",
          subtitle: "Password reset, authentication & sessions",
          icon: "shield-checkmark-outline",
          iconBg: isDark ? "rgba(16, 185, 129, 0.16)" : "#D1FAE5",
          iconColor: "#10B981",
          action: () => router.push(appRoute("/security") as never),
        },
        {
          title: "Privacy & Legal Center",
          subtitle: "Data consent, terms & privacy controls",
          icon: "document-text-outline",
          iconBg: isDark ? "rgba(245, 158, 11, 0.16)" : "#FEF3C7",
          iconColor: "#F59E0B",
          action: () => router.push(appRoute("/legal-center") as never),
        },
      ],
    },
  ];

  return (
    <AppShell>
      {/* Top Header with Back Navigation */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.push(appRoute("/dashboard") as never)}
          style={({ pressed }) => [
            styles.backNavBtn,
            { backgroundColor: theme.card, borderColor: theme.line },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="arrow-back" size={18} color={theme.ink} />
          <Text style={[styles.backNavText, { color: theme.ink }]}>Back to Dashboard</Text>
        </Pressable>

        <View style={{ marginTop: 14 }}>
          <Text style={[styles.pageTitleText, { color: theme.ink }]}>Settings</Text>
          <Text style={[styles.pageSubtitleText, { color: theme.muted }]}>
            Manage business profile, appearance, document rules & security preferences
          </Text>
        </View>
      </View>

      {/* Theme Preference Switcher Card */}
      <View style={[styles.themeCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <View style={styles.themeHeader}>
          <View style={[styles.settingIconBox, { backgroundColor: isDark ? "rgba(255, 122, 0, 0.16)" : BrandColors.primarySoft }]}>
            <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={22} color={BrandColors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: theme.ink }]}>Appearance Theme</Text>
            <Text style={[styles.settingSubtitle, { color: theme.muted }]}>Choose your preferred interface theme</Text>
          </View>
        </View>
        <View style={{ marginTop: 14 }}>
          <ThemeModeSelector />
        </View>
      </View>

      {/* Section Groups */}
      {sectionGroups.map((group) => (
        <View key={group.groupTitle} style={styles.sectionGroup}>
          <Text style={[styles.groupTitleText, { color: theme.muted }]}>{group.groupTitle}</Text>
          <View style={styles.settingsStack}>
            {group.items.map((item) => (
              <Pressable
                key={item.title}
                onPress={item.action}
                style={({ pressed }) => [
                  styles.settingRowCard,
                  { backgroundColor: theme.card, borderColor: theme.line },
                  pressed && { opacity: 0.8, backgroundColor: theme.orangeSoft },
                ]}
              >
                <View style={[styles.settingIconBox, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon as never} size={20} color={item.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: theme.ink }]}>{item.title}</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.muted }]}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {/* Log Out Action Button */}
      <Pressable
        onPress={handleLogOut}
        disabled={loggingOut}
        style={({ pressed }) => [
          styles.logoutButton,
          { backgroundColor: isDark ? "rgba(220, 38, 38, 0.14)" : "#FEF2F2", borderColor: isDark ? "rgba(220, 38, 38, 0.3)" : "#FCA5A5" },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.logoutText}>{loggingOut ? "Logging out..." : "Log Out of Workspace"}</Text>
      </Pressable>

      {/* Tax & GSTIN Settings Modal */}
      <Modal transparent visible={taxModalVisible} animationType="fade" onRequestClose={() => setTaxModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTaxModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.ink }]}>Tax & Invoice Settings</Text>
            <Text style={[styles.modalSubtitle, { color: theme.muted }]}>Set up your GSTIN / Tax Registration Number for compliant invoices</Text>
            <TextInput
              value={taxNumber}
              onChangeText={setTaxNumber}
              placeholder="e.g. 22AAAAA0000A1Z5"
              placeholderTextColor={theme.muted}
              style={[styles.modalInput, { color: theme.ink, borderColor: theme.line, backgroundColor: theme.background }]}
            />
            <View style={styles.modalActions}>
              <SecondaryButton label="Cancel" onPress={() => setTaxModalVisible(false)} />
              <PrimaryButton label="Save Changes" onPress={() => setTaxModalVisible(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginBottom: 20,
  },
  backNavBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  backNavText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pageTitleText: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  pageSubtitleText: {
    fontSize: 13.5,
    fontWeight: "500",
    marginTop: 4,
    lineHeight: 19,
  },
  themeCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  themeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sectionGroup: {
    marginBottom: 22,
  },
  groupTitleText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingLeft: 4,
  },
  settingsStack: {
    gap: 10,
  },
  settingRowCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  settingIconBox: {
    alignItems: "center",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  settingTitle: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  settingSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  logoutButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 30,
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 14.5,
    fontWeight: "800",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 420,
    padding: 22,
    width: "100%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    marginTop: 4,
    lineHeight: 18,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
});
