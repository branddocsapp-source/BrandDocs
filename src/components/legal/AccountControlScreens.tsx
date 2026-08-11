import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, signOut } from "firebase/auth";

import { ConsentControls } from "@/components/legal/ConsentControls";
import { showComingSoon } from "@/components/legal/PrivacyRequestScreen";
import { auth } from "@/firebase";
import { createPrivacyRequest } from "@/services/consent";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors, BrandLayout, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";

function ScreenShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { theme } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <Ionicons name="chevron-back" size={19} color={theme.ink} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.ink }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({ title, subtitle, icon, onPress }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { isDark, theme } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: theme.line }, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={BrandColors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: theme.ink }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.muted }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.muted} />
    </Pressable>
  );
}

export function PrivacySecurityScreen() {
  const { theme } = useAppTheme();
  return (
    <ScreenShell title="Privacy & Security" subtitle="Manage consent, privacy rights, security settings and account controls.">
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <ActionRow title="Privacy & Consent Center" subtitle="Withdraw optional consent and marketing preferences." icon="shield-checkmark-outline" onPress={() => router.push("/privacy-consent" as never)} />
        <ActionRow title="View My Data" subtitle="Open profile, company and document areas you can review." icon="eye-outline" onPress={() => router.push("/profile" as never)} />
        <ActionRow title="Export My Data" subtitle="Request a data export record." icon="download-outline" onPress={() => router.push("/data-export" as never)} />
        <ActionRow title="Correct Profile Data" subtitle="Edit your business profile details." icon="create-outline" onPress={() => router.push({ pathname: "/business-setup", params: { mode: "edit" } } as never)} />
        <ActionRow title="Delete Individual Documents" subtitle="Open Documents and delete supported records individually." icon="trash-outline" onPress={() => router.push("/documents" as never)} />
        <ActionRow title="Delete Business Profile" subtitle="Coming in Commercial Version with ownership checks." icon="business-outline" onPress={() => showComingSoon("Delete Business Profile")} />
        <ActionRow title="Delete Account" subtitle="Requires confirmation and recent authentication." icon="warning-outline" onPress={() => router.push("/delete-account" as never)} />
        <ActionRow title="View Active Sessions" subtitle="Backend session list placeholder." icon="desktop-outline" onPress={() => showComingSoon("View Active Sessions")} />
        <ActionRow title="Contact Privacy Support" subtitle="Submit a privacy request." icon="mail-outline" onPress={() => router.push("/privacy-request" as never)} />
      </View>
    </ScreenShell>
  );
}

export function PrivacyConsentCenterScreen() {
  return (
    <ScreenShell title="Privacy & Consent Center" subtitle="Optional controls are off by default and can be withdrawn at any time. Permission prompts remain contextual.">
      <ConsentControls />
      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Contextual Permissions</Text>
        <Text style={styles.noteText}>Location, camera, photo library, notifications and tracking are not requested automatically. They must wait for a relevant feature and explanatory screen.</Text>
      </View>
      <View style={styles.card}>
        <ActionRow title="Location Access" subtitle="Not requested. Future location features must ask contextually first." icon="location-outline" onPress={() => showComingSoon("Location Access")} />
        <ActionRow title="Camera Access" subtitle="Requested only when opening Receipt Scanner." icon="camera-outline" onPress={() => router.push("/scan-receipt" as never)} />
        <ActionRow title="Photo Library Access" subtitle="Requested only when selecting an upload." icon="image-outline" onPress={() => router.push({ pathname: "/business-setup", params: { mode: "edit" } } as never)} />
        <ActionRow title="Notifications" subtitle="Not requested on launch. Future notification prompts must be contextual." icon="notifications-outline" onPress={() => showComingSoon("Notifications")} />
      </View>
    </ScreenShell>
  );
}

export function SecuritySettingsScreen() {
  return (
    <ScreenShell title="Security" subtitle="Security controls and backend-safe placeholders. No secrets, tokens or credentials are shown.">
      <View style={styles.card}>
        <ActionRow title="Change Password" subtitle="Use password reset until in-app change password is configured." icon="key-outline" onPress={() => router.push("/forgot-password" as never)} />
        <ActionRow title="Two-Factor Authentication" subtitle="Coming in Commercial Version." icon="lock-closed-outline" onPress={() => showComingSoon("Two-Factor Authentication")} />
        <ActionRow title="Active Sessions" subtitle="Coming in Commercial Version." icon="desktop-outline" onPress={() => showComingSoon("Active Sessions")} />
        <ActionRow title="Sign Out From All Devices" subtitle="Coming in Commercial Version." icon="log-out-outline" onPress={() => showComingSoon("Sign Out From All Devices")} />
        <ActionRow title="Login Alerts" subtitle="Preference placeholder until notification backend is configured." icon="notifications-outline" onPress={() => showComingSoon("Login Alerts")} />
        <ActionRow title="Data Export" subtitle="Create a backend-safe export request." icon="download-outline" onPress={() => router.push("/data-export" as never)} />
        <ActionRow title="Delete Account" subtitle="Requires confirmation and re-authentication." icon="warning-outline" onPress={() => router.push("/delete-account" as never)} />
        <ActionRow title="Legal Documents" subtitle="Open Legal & Privacy Center." icon="document-text-outline" onPress={() => router.push("/legal-center" as never)} />
      </View>
    </ScreenShell>
  );
}

export function DataExportScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function submitExportRequest() {
    try {
      setSubmitting(true);
      setMessage("");
      const requestId = await createPrivacyRequest(auth.currentUser, "data-export", {
        formats: ["json", "csv", "pdf", "zip"],
        note: "Automated ZIP package generation is Coming in Commercial Version.",
      });
      setMessage(`Export request received. Reference: ${requestId}`);
    } catch (error: any) {
      console.error("[BrandDocs] Data export request failed:", error);
      setMessage(error?.message || "Could not submit export request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell title="Data Export" subtitle="Request an export of account, business, document, consent and supported asset metadata.">
      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Coming in Commercial Version</Text>
        <Text style={styles.noteText}>Automated ZIP generation is not implemented yet. Phase 1 records a backend-safe export request for follow-up.</Text>
      </View>
      <Pressable style={styles.primaryButton} disabled={submitting} onPress={submitExportRequest}>
        {submitting ? <ActivityIndicator color={BrandColors.background} /> : <Text style={styles.primaryButtonText}>Request Data Export</Text>}
      </Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </ScreenShell>
  );
}

export function DeleteAccountScreen() {
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  async function submitDeletion() {
    const user = auth.currentUser;
    setMessage("");

    if (!user) {
      setMessage("Please sign in before deleting your account.");
      return;
    }

    if (confirmation.trim() !== "DELETE MY ACCOUNT") {
      setMessage("Type DELETE MY ACCOUNT to confirm.");
      return;
    }

    const usesPassword = user.providerData.some((provider) => provider.providerId === "password");
    if (usesPassword && !password) {
      setMessage("Enter your password to re-authenticate.");
      return;
    }

    try {
      setProcessing(true);
      await createPrivacyRequest(user, "account-deletion", {
        deleteAuthAccount: true,
        associatedDataDeletionRequested: true,
        retainedDataPolicy: "Configurable retention policy requires legal review.",
      });

      if (usesPassword) {
        const credential = EmailAuthProvider.credential(user.email || "", password);
        await reauthenticateWithCredential(user, credential);
      }

      await deleteUser(user);
      Alert.alert("Account Deletion Started", "Your sign-in account was deleted. Associated-data deletion request was recorded where supported.", [
        { text: "Continue", onPress: () => router.replace("/signin" as never) },
      ]);
    } catch (error: any) {
      console.error("[BrandDocs] Delete account failed:", { code: error?.code, message: error?.message });
      if (error?.code === "auth/requires-recent-login") {
        setMessage("Firebase requires recent authentication. Sign out, sign in again, then retry deletion.");
      } else {
        setMessage(error?.message || "Could not delete account. You can retry or contact support.");
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <ScreenShell title="Delete Account" subtitle="This is not temporary deactivation. It requires confirmation and recent authentication.">
      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>What deletion may include</Text>
        <Text style={styles.noteText}>User profile, company profiles, invoices, quotations, letterheads, receipts, visiting cards, scans/uploads, related cloud files, preferences and consent records where legally permitted.</Text>
        <Text style={styles.noteText}>Some information may need to be retained under a configurable policy. Draft - Legal Review Required.</Text>
      </View>
      <Text style={styles.label}>Confirmation text</Text>
      <TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} placeholder="DELETE MY ACCOUNT" placeholderTextColor={BrandColors.textMuted} />
      {auth.currentUser?.providerData.some((provider) => provider.providerId === "password") ? (
        <>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Re-enter password" placeholderTextColor={BrandColors.textMuted} />
        </>
      ) : null}
      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} disabled={processing} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.dangerButton} disabled={processing} onPress={submitDeletion}>
          {processing ? <ActivityIndicator color={BrandColors.background} /> : <Text style={styles.primaryButtonText}>Continue</Text>}
        </Pressable>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </ScreenShell>
  );
}

export async function signOutCurrentUser() {
  await signOut(auth);
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BrandColors.background },
  container: {
    alignSelf: "center",
    maxWidth: BrandLayout.maxContentWidth,
    paddingHorizontal: BrandSpacing["2xl"],
    paddingVertical: BrandSpacing["3xl"],
    width: "100%",
  },
  backButton: {
    alignItems: "center",
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    marginBottom: BrandSpacing.lg,
    width: 40,
  },
  title: { ...BrandTypography.displayHeading, color: BrandColors.text },
  subtitle: { ...BrandTypography.body, color: BrandColors.textSecondary, marginTop: BrandSpacing.sm, maxWidth: 780 },
  content: { gap: BrandSpacing.lg, marginTop: BrandSpacing["2xl"] },
  card: {
    backgroundColor: BrandColors.card,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.md,
    minHeight: 72,
    padding: BrandSpacing.lg,
  },
  pressed: { opacity: 0.72 },
  rowIcon: {
    alignItems: "center",
    backgroundColor: BrandColors.primarySoft,
    borderRadius: BrandRadius.medium,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  rowCopy: { flex: 1 },
  rowTitle: { ...BrandTypography.cardTitle, color: BrandColors.text },
  rowSubtitle: { ...BrandTypography.caption, color: BrandColors.textSecondary, marginTop: 3 },
  noteCard: {
    backgroundColor: BrandColors.surface,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    gap: BrandSpacing.sm,
    padding: BrandSpacing.lg,
  },
  noteTitle: { ...BrandTypography.cardTitle, color: BrandColors.text },
  noteText: { ...BrandTypography.body, color: BrandColors.textSecondary },
  label: { ...BrandTypography.formLabel, color: BrandColors.text },
  input: {
    ...BrandTypography.body,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    color: BrandColors.text,
    minHeight: 48,
    paddingHorizontal: BrandSpacing.md,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: BrandSpacing.md },
  primaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.pill,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 180,
    paddingHorizontal: BrandSpacing.lg,
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: BrandColors.error,
    borderRadius: BrandRadius.pill,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 140,
    paddingHorizontal: BrandSpacing.lg,
  },
  primaryButtonText: { ...BrandTypography.buttonLabel, color: BrandColors.background },
  secondaryButton: {
    alignItems: "center",
    borderColor: BrandColors.borderStrong,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: BrandSpacing.lg,
  },
  secondaryButtonText: { ...BrandTypography.buttonLabel, color: BrandColors.text },
  message: { ...BrandTypography.body, color: BrandColors.textSecondary },
});
