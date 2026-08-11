import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { signOut } from "firebase/auth";

import { AppShell, PrimaryButton, SecondaryButton } from "@/components/ui/branddocs";
import { ThemeModeSelector } from "@/components/ui/theme-mode-selector";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { ThemeMode, useAppTheme } from "@/theme/theme-context";
import { BrandColors } from "@/theme/tokens";

const APPEARANCE_OPTIONS: Array<{ mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { mode: "light", label: "Light", icon: "sunny-outline" },
  { mode: "dark", label: "Dark", icon: "moon-outline" },
  { mode: "system", label: "System Default", icon: "phone-portrait-outline" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { isAppPreview } = useResponsiveLayout();
  const { isDark, theme, themeMode, setThemeMode } = useAppTheme();
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

  const settingsItems = [
    {
      title: "Profile Settings",
      subtitle: "Update your personal details",
      icon: "person-outline",
      iconBg: isDark ? "rgba(2, 132, 199, 0.16)" : "#E0F2FE",
      iconColor: "#0284C7",
      action: () => router.push(appRoute("/profile") as never),
    },
    {
      title: "Business Details",
      subtitle: "Update business name, address, logo",
      icon: "business-outline",
      iconBg: isDark ? "rgba(246, 162, 26, 0.16)" : "#FFEDD5",
      iconColor: BrandColors.primary,
      action: () => router.push(appRoute("/business-setup") as never),
    },
    {
      title: "Tax & Invoice",
      subtitle: "Manage GST, prefixes, terms",
      icon: "receipt-outline",
      iconBg: isDark ? "rgba(22, 163, 74, 0.16)" : "#DCFCE7",
      iconColor: "#16A34A",
      action: () => setTaxModalVisible(true),
    },
    {
      title: "Notifications",
      subtitle: "Manage alerts and emails",
      icon: "notifications-outline",
      iconBg: isDark ? "rgba(147, 51, 234, 0.16)" : "#F3E8FF",
      iconColor: "#9333EA",
      action: () => router.push(appRoute("/settings") as never),
    },
    {
      title: "Security",
      subtitle: "Change password, 2FA",
      icon: "shield-outline",
      iconBg: isDark ? "rgba(148, 163, 184, 0.12)" : "#F1F5F9",
      iconColor: isDark ? theme.text : "#475569",
      action: () => router.push(appRoute("/security") as never),
    },
  ];

  return (
    <AppShell>
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.pageTitleText, { color: theme.ink }]}>Settings</Text>
        <Text style={[styles.pageSubtitleText, { color: theme.muted }]}>Manage your application preferences</Text>
      </View>

      <View style={[styles.appearanceCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <View style={styles.appearanceHeader}>
          <View>
            <Text style={[styles.appearanceTitle, { color: theme.ink }]}>Appearance</Text>
            <Text style={[styles.appearanceSubtitle, { color: theme.muted }]}>
              Match your device or choose light and dark manually.
            </Text>
          </View>
          <ThemeModeSelector compact />
        </View>

        <View style={styles.appearanceOptions}>
          {APPEARANCE_OPTIONS.map((option) => {
            const selected = themeMode === option.mode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => setThemeMode(option.mode)}
                style={({ pressed }) => [
                  styles.appearanceOption,
                  {
                    backgroundColor: selected ? theme.orangeSoft : theme.background,
                    borderColor: selected ? BrandColors.primary : theme.line,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Ionicons name={option.icon} size={18} color={selected ? BrandColors.primary : theme.muted} />
                <Text style={[styles.appearanceOptionText, { color: selected ? theme.ink : theme.text }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.settingsStack}>
        {settingsItems.map((item) => (
          <Pressable
            key={item.title}
            onPress={item.action}
            style={({ pressed }) => [
              styles.settingRowCard,
              { backgroundColor: theme.card, borderColor: theme.line },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.settingIconBox, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon as never} size={22} color={item.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: theme.ink }]}>{item.title}</Text>
              <Text style={[styles.settingSubtitle, { color: theme.muted }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleLogOut}
        disabled={loggingOut}
        style={({ pressed }) => [
          styles.logoutButton,
          { backgroundColor: isDark ? "rgba(220, 38, 38, 0.14)" : "#FEF2F2" },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Ionicons name="log-out-outline" size={22} color="#DC2626" />
        <Text style={styles.logoutText}>{loggingOut ? "Logging out..." : "Log Out"}</Text>
      </Pressable>

      <Modal transparent visible={taxModalVisible} animationType="fade" onRequestClose={() => setTaxModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTaxModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.ink }]}>Tax & Invoice Settings</Text>
            <Text style={[styles.modalSubtitle, { color: theme.muted }]}>Set up your GSTIN / Tax Registration Number</Text>
            <TextInput
              value={taxNumber}
              onChangeText={setTaxNumber}
              placeholder="e.g. 22AAAAA0000A1Z5"
              placeholderTextColor={theme.muted}
              style={[styles.modalInput, { color: theme.ink, borderColor: theme.line, backgroundColor: theme.background }]}
            />
            <View style={styles.modalActions}>
              <SecondaryButton label="Cancel" onPress={() => setTaxModalVisible(false)} />
              <PrimaryButton label="Save" onPress={() => setTaxModalVisible(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  appearanceCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    marginBottom: 20,
    padding: 16,
  },
  appearanceHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  appearanceTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  appearanceSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
  },
  appearanceOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  appearanceOption: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  appearanceOptionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  settingsStack: {
    gap: 12,
    marginBottom: 24,
  },
  settingRowCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  settingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  settingSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
    marginTop: 8,
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#DC2626",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    padding: 20,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
});
