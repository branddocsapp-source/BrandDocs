import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AuthHeader,
  AuthInput,
  AuthLayout,
  AuthPrimaryButton,
} from "@/components/auth-ui";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { forgotPassword } from "@/services/auth";
import { useAppTheme } from "@/theme/theme-context";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { isAppPreview } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();

  function withPreviewRoute(pathname: "/signin" | "/support" | "/") {
    if (!isAppPreview) return pathname;
    if (pathname === "/") return "/app";
    return { pathname, params: { appPreview: "1" } };
  }

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your business email address.");
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(email.trim());
      Alert.alert(
        "Check Your Inbox",
        "A password reset link has been sent to your email address.",
        [{ text: "Continue", onPress: () => router.replace(withPreviewRoute("/signin") as never) }]
      );
    } catch (error: any) {
      let message = "We could not send the reset link right now.";

      switch (error.code) {
        case "auth/invalid-email":
          message = "Please enter a valid email address.";
          break;
        case "auth/user-not-found":
          message = "No account was found for that email.";
          break;
        default:
          message = error.message || message;
      }

      Alert.alert("Reset Failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader
        title="Forgot Password?"
        subtitle="Enter your business email address and we'll send you a secure password reset link."
        onLogoPress={() => router.push(withPreviewRoute("/") as never)}
      />

      {/* Lock Illustration Icon */}
      <View style={styles.illustrationContainer}>
        <View style={[styles.lockIconBox, { backgroundColor: isDark ? "rgba(234, 88, 12, 0.15)" : "#FFF7ED" }]}>
          <Ionicons name="lock-closed" size={44} color="#EA580C" />
          <View style={styles.mailBadge}>
            <Ionicons name="mail" size={16} color="#FFFFFF" />
          </View>
        </View>
      </View>

      <View style={{ marginVertical: 14 }}>
        <AuthInput
          placeholder="Business Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <AuthPrimaryButton label="Send Reset Link" loading={loading} disabled={loading} onPress={handleReset} />

      <Pressable
        onPress={() => router.replace(withPreviewRoute("/signin") as never)}
        style={{ marginTop: 16, alignItems: "center" }}
      >
        <Text style={styles.underlineLinkText}>Back to Sign In</Text>
      </Pressable>

      <View style={styles.supportFooter}>
        <Text style={{ fontSize: 13, color: theme.muted, fontWeight: "500" }}>Need help?</Text>
        <Pressable onPress={() => router.push(withPreviewRoute("/support") as never)}>
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
  lockIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mailBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#EA580C",
    borderRadius: 12,
    padding: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
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
