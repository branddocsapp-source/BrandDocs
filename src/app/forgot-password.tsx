import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text } from "react-native";

import {
  AuthHeader,
  AuthInput,
  AuthLayout,
  AuthPrimaryButton,
  authStyles,
} from "@/components/auth-ui";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { forgotPassword } from "@/services/auth";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { isAppPreview } = useResponsiveLayout();

  function withPreviewRoute(pathname: "/signin" | "/") {
    if (!isAppPreview) return pathname;
    if (pathname === "/") return "/app";
    return { pathname, params: { appPreview: "1" } };
  }

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(email.trim());
      Alert.alert(
        "Check Your Inbox",
        "A password reset link has been sent to your email.",
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
        case "auth/network-request-failed":
          message = "No internet connection.";
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
        title="Reset Password"
        subtitle="Enter your email and we’ll send you a secure reset link."
        onLogoPress={() => router.push(withPreviewRoute("/") as never)}
      />

      <AuthInput
        placeholder="Email Address"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />

      <AuthPrimaryButton label="Send Reset Link" loading={loading} disabled={loading} onPress={handleReset} />

      <Pressable onPress={() => router.replace(withPreviewRoute("/signin") as never)}>
        <Text style={authStyles.linkText}>Back to Sign In</Text>
      </Pressable>
    </AuthLayout>
  );
}
