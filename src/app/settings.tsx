import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { signOut } from "firebase/auth";

import { AppShell, PrimaryButton, SecondaryButton } from "@/components/ui/branddocs";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { useAppTheme } from "@/theme/theme-context";

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
      iconBg: "#E0F2FE",
      iconColor: "#0284C7",
      action: () => router.push(appRoute("/profile") as never),
    },
    {
      title: "Business Details",
      subtitle: "Update business name, address, logo",
      icon: "business-outline",
      iconBg: "#FFEDD5",
      iconColor: "#EA580C",
      action: () => router.push(appRoute("/business-setup") as never),
    },
    {
      title: "Tax & Invoice",
      subtitle: "Manage GST, prefixes, terms",
      icon: "receipt-outline",
      iconBg: "#DCFCE7",
      iconColor: "#16A34A",
      action: () => setTaxModalVisible(true),
    },
    {
      title: "Notifications",
      subtitle: "Manage alerts and emails",
      icon: "notifications-outline",
      iconBg: "#F3E8FF",
      iconColor: "#9333EA",
      action: () => router.push(appRoute("/settings") as never),
    },
    {
      title: "Security",
      subtitle: "Change password, 2FA",
      icon: "shield-outline",
      iconBg: "#F1F5F9",
      iconColor: "#475569",
      action: () => router.push(appRoute("/security") as never),
    },
  ];

  return (
    <AppShell>
      {/* Title & Subtitle */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.pageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Settings</Text>
        <Text style={[styles.pageSubtitleText, { color: theme.muted }]}>Manage your application preferences</Text>
      </View>

      {/* Settings Items Stack */}
      <View style={styles.settingsStack}>
        {settingsItems.map((item) => (
          <Pressable
            key={item.title}
            onPress={item.action}
            style={({ pressed }) => [
              styles.settingRowCard,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.settingIconBox, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon as never} size={22} color={item.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>{item.title}</Text>
              <Text style={[styles.settingSubtitle, { color: theme.muted }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </Pressable>
        ))}
      </View>

      {/* Log Out Button */}
      <Pressable
        onPress={handleLogOut}
        disabled={loggingOut}
        style={({ pressed }) => [
          styles.logoutButton,
          { backgroundColor: isDark ? "rgba(220, 38, 38, 0.15)" : "#FEF2F2" },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Ionicons name="log-out-outline" size={22} color="#DC2626" />
        <Text style={styles.logoutText}>{loggingOut ? "Logging out..." : "Log Out"}</Text>
      </Pressable>

      {/* Tax Info Modal */}
      <Modal transparent visible={taxModalVisible} animationType="fade" onRequestClose={() => setTaxModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTaxModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Tax & Invoice Settings</Text>
            <Text style={[styles.modalSubtitle, { color: theme.muted }]}>Set up your GSTIN / Tax Registration Number</Text>
            <TextInput
              value={taxNumber}
              onChangeText={setTaxNumber}
              placeholder="e.g. 22AAAAA0000A1Z5"
              placeholderTextColor={theme.muted}
              style={[styles.modalInput, { color: isDark ? "#FFFFFF" : "#0F172A", borderColor: theme.line }]}
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
