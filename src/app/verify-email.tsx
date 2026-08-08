import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { sendEmailVerification } from "firebase/auth";

import {
  AuthHeader,
  AuthLayout,
  AuthPrimaryButton,
} from "@/components/auth-ui";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { loadBusinessProfile } from "@/services/business-profile";
import { useAppTheme } from "@/theme/theme-context";

export default function VerifyEmailScreen() {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { isAppPreview } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();

  const userEmail = auth.currentUser?.email || "example@company.com";

  function appRoute(pathname: string) {
    if (!isAppPreview) return pathname;
    return { pathname, params: { appPreview: "1" } };
  }

  async function handleVerifiedCheck() {
    if (loading) return;
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
      const profile = await loadBusinessProfile(auth.currentUser);
      router.replace(appRoute(profile ? "/dashboard" : "/business-setup") as never);
    } catch (e) {
      console.warn("Verify email check error", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    if (!auth.currentUser || resending) return;
    try {
      setResending(true);
      await sendEmailVerification(auth.currentUser);
      Alert.alert("Email Sent", "A new verification link has been sent to your email address.");
    } catch (e: any) {
      Alert.alert("Verification Email", e?.message || "Could not send verification email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader
        title="Verify Your Email"
        subtitle="We've sent a verification link to your email address. Please verify your email to continue."
        onLogoPress={() => router.push(appRoute("/") as never)}
      />

      {/* Envelope Illustration with Checkmark */}
      <View style={styles.illustrationContainer}>
        <View style={[styles.envelopeIconBox, { backgroundColor: isDark ? "rgba(234, 88, 12, 0.15)" : "#FFF7ED" }]}>
          <Ionicons name="mail-open-outline" size={48} color="#EA580C" />
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        </View>
      </View>

      {/* Email Pill Card */}
      <View style={[styles.emailPillCard, { backgroundColor: isDark ? "rgba(234, 88, 12, 0.12)" : "#FFF7ED", borderColor: isDark ? "rgba(234, 88, 12, 0.25)" : "#FED7AA" }]}>
        <Text style={[styles.emailPillLabel, { color: theme.muted }]}>Email:</Text>
        <Text style={[styles.emailPillValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>{userEmail}</Text>
      </View>

      {/* Primary Button */}
      <AuthPrimaryButton label="I've Verified My Email" loading={loading} disabled={loading} onPress={handleVerifiedCheck} />

      {/* Action Links */}
      <View style={styles.linksStack}>
        <Pressable onPress={handleResendEmail} disabled={resending}>
          <Text style={styles.underlineLinkText}>{resending ? "Sending..." : "Resend Email"}</Text>
        </Pressable>

        <Pressable onPress={() => router.replace(appRoute("/signin") as never)}>
          <Text style={styles.underlineLinkText}>Change Email Address</Text>
        </Pressable>
      </View>

      {/* Footer Support Link */}
      <View style={styles.supportFooter}>
        <Text style={{ fontSize: 13, color: theme.muted, fontWeight: "500" }}>Need help?</Text>
        <Pressable onPress={() => router.push(appRoute("/support") as never)}>
          <Text style={{ fontSize: 13, color: "#EA580C", fontWeight: "700" }}>Contact Support</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  envelopeIconBox: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  checkBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EA580C",
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  emailPillCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginBottom: 20,
  },
  emailPillLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  emailPillValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  linksStack: {
    marginTop: 20,
    alignItems: "center",
    gap: 14,
  },
  underlineLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    textDecorationLine: "underline",
  },
  supportFooter: {
    marginTop: 32,
    alignItems: "center",
    gap: 4,
  },
});
