import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { signOut } from "firebase/auth";

import { AppShell, PrimaryButton, SecondaryButton } from "@/components/ui/branddocs";
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
      iconBg: isDark ? "rgba(255, 122, 0, 0.16)" : BrandColors.primarySoft,
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
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  settingSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
  },
  logoutButton: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 16,
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "800",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 400,
    padding: 20,
    width: "100%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 14,
    marginTop: 4,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
});
