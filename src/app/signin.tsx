import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  AuthDivider,
  AuthHeader,
  AuthInput,
  AuthLayout,
  AuthPrimaryButton,
  PasswordVisibilityButton,
  SocialAuthButton,
  authStyles,
} from "@/components/auth-ui";
import {
  getAppleAuthAvailability,
  getGoogleAuthAvailability,
  getSocialAuthErrorMessage,
  loginUser,
  loginWithApple,
  loginWithGoogle,
} from "@/services/auth";
import { loadBusinessProfile } from "@/services/business-profile";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);
  const { isAppPreview } = useResponsiveLayout();
  const googleAvailability = getGoogleAuthAvailability();
  const appleAvailability = getAppleAuthAvailability();

  function withPreviewRoute(pathname: "/signin" | "/signup" | "/forgot-password" | "/business-setup" | "/dashboard" | "/") {
    if (!isAppPreview) return pathname;
    if (pathname === "/") return "/app";
    return { pathname, params: { appPreview: "1" } };
  }

  async function handleSignin() {
    if (socialLoading) return;

    if (!email.trim() || !password) {
      Alert.alert("Missing Details", "Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const user = await loginUser(email.trim(), password);
      const profile = await loadBusinessProfile(user);
      router.replace(withPreviewRoute(profile ? "/dashboard" : "/business-setup") as never);
    } catch (error: any) {
      let message = "Unable to sign in. Please try again.";

      switch (error.code) {
        case "auth/invalid-email":
          message = "Please enter a valid email address.";
          break;
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          message = "The email or password is incorrect.";
          break;
        case "auth/network-request-failed":
          message = "No internet connection.";
          break;
        default:
          message = error.message || message;
      }

      Alert.alert("Sign In Failed", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialSignin(provider: "google" | "apple") {
    if (loading || socialLoading) return;

    const providerName = provider === "google" ? "Google" : "Apple";
    const availability = provider === "google" ? googleAvailability : appleAvailability;

    if (!availability.available) {
      Alert.alert(
        `${providerName} Sign-In`,
        `${availability.message}\n\nMissing configuration:\n${availability.missing.map((item) => `- ${item}`).join("\n")}`
      );
      return;
    }

    try {
      setSocialLoading(provider);
      const user = provider === "google" ? await loginWithGoogle() : await loginWithApple();
      const profile = await loadBusinessProfile(user);
      router.replace(withPreviewRoute(profile ? "/dashboard" : "/business-setup") as never);
    } catch (error: any) {
      Alert.alert(`${providerName} Sign-In`, getSocialAuthErrorMessage(error, providerName));
    } finally {
      setSocialLoading(null);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader
        title="Welcome Back"
        subtitle="Sign in to continue managing your business documents."
        onLogoPress={() => router.push(withPreviewRoute("/") as never)}
      />

      <View style={authStyles.fieldGroup}>
        <AuthInput
          placeholder="Email Address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />

        <AuthInput
          placeholder="Password"
          secureTextEntry={!showPassword}
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          rightAction={<PasswordVisibilityButton visible={showPassword} onPress={() => setShowPassword((value) => !value)} />}
        />
      </View>

      <Pressable onPress={() => router.push(withPreviewRoute("/forgot-password") as never)}>
        <Text style={authStyles.linkText}>Forgot Password?</Text>
      </Pressable>

      <AuthPrimaryButton label="Sign In" loading={loading} disabled={loading || !!socialLoading} onPress={handleSignin} />

      <AuthDivider />

      <View style={authStyles.socialGroup}>
        <SocialAuthButton
          provider="google"
          loading={socialLoading === "google"}
          unavailable={!googleAvailability.available}
          disabled={loading || socialLoading === "apple"}
          onPress={() => handleSocialSignin("google")}
        />
        <SocialAuthButton
          provider="apple"
          loading={socialLoading === "apple"}
          unavailable={!appleAvailability.available}
          disabled={loading || socialLoading === "google"}
          onPress={() => handleSocialSignin("apple")}
        />
      </View>

      <Pressable onPress={() => router.push(withPreviewRoute("/signup") as never)}>
        <Text style={authStyles.footerText}>
          {"Don't have an account? "}
          <Text style={authStyles.footerLink}>Create Account</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
}
