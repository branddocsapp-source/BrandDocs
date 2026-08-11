import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  Text,
  View,
} from "react-native";

import {
  AuthCheckbox,
  AuthDivider,
  AuthHeader,
  AuthInput,
  AuthLayout,
  AuthPrimaryButton,
  PasswordVisibilityButton,
  SocialAuthButton,
  authStyles,
} from "@/components/auth-ui";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  getAppleAuthAvailability,
  getGoogleAuthAvailability,
  getSocialAuthErrorMessage,
  loginWithApple,
  loginWithGoogle,
  registerUser,
} from "@/services/auth";
import { loadBusinessProfile } from "@/services/business-profile";
import { saveLegalAcceptance } from "@/services/consent";

type FormErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agreement?: string;
};

export default function SignUpScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");

  const { isAppPreview } = useResponsiveLayout();
  const googleAvailability = getGoogleAuthAvailability();
  const appleAvailability = getAppleAuthAvailability();

  function withPreviewRoute(pathname: "/signin" | "/business-setup" | "/dashboard" | "/") {
    if (!isAppPreview) return pathname;
    if (pathname === "/") return "/app";
    return { pathname, params: { appPreview: "1" } };
  }

  function clearFieldError(field: keyof FormErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = "Please enter your full name.";
    }

    if (!email.trim()) {
      nextErrors.email = "Please enter your email address.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        nextErrors.email = "Please enter a valid email address.";
      }
    }

    if (!password) {
      nextErrors.password = "Please enter a password.";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!acceptedTerms) {
      nextErrors.agreement = "Please agree to the Terms of Service and acknowledge the Privacy Policy.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function getFriendlyErrorMessage(error: any) {
    switch (error?.code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please use a different email address.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/network-request-failed":
        return "No internet connection. Please try again.";
      default:
        return error?.message || "We could not create your account right now. Please try again.";
    }
  }

  async function handleSignup() {
    setSubmitError("");

    if (socialLoading) return;

    if (!validateForm()) {
      return;
    }

    const firebaseConfigMissing = !auth?.app?.options?.apiKey || !auth?.app?.options?.projectId || !auth?.app?.options?.appId;
    if (firebaseConfigMissing) {
      setSubmitError("Firebase configuration is incomplete. Missing apiKey, projectId, or appId.");
      return;
    }

    try {
      setLoading(true);
      const user = await registerUser(fullName.trim(), email.trim(), password);
      await saveLegalAcceptance(user, marketingOptIn, "signup");
      router.replace(withPreviewRoute("/business-setup") as never);
    } catch (error: any) {
      setSubmitError(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialSignup(provider: "google" | "apple") {
    if (loading || socialLoading) return;

    setSubmitError("");

    if (!acceptedTerms) {
      setErrors((current) => ({
        ...current,
        agreement: "Please agree to the Terms of Service and acknowledge the Privacy Policy.",
      }));
      return;
    }

    const providerName = provider === "google" ? "Google" : "Apple";
    const availability = provider === "google" ? googleAvailability : appleAvailability;

    if (!availability.available) {
      setSubmitError(
        `${availability.message} Missing configuration: ${availability.missing.join("; ")}.`
      );
      return;
    }

    try {
      setSocialLoading(provider);
      const user = provider === "google" ? await loginWithGoogle() : await loginWithApple();
      await saveLegalAcceptance(user, marketingOptIn, `signup-${provider}`);
      const profile = await loadBusinessProfile(user);
      router.replace(withPreviewRoute(profile ? "/dashboard" : "/business-setup") as never);
    } catch (error: any) {
      setSubmitError(getSocialAuthErrorMessage(error, providerName));
    } finally {
      setSocialLoading(null);
    }
  }

  return (
    <AuthLayout showBack={true} onBackPress={() => router.replace(withPreviewRoute("/signin") as never)}>
      <AuthHeader
        title="Create your account"
        subtitle="Start creating professional business documents in minutes."
        showBack={true}
        onBackPress={() => router.replace(withPreviewRoute("/signin") as never)}
        onLogoPress={() => router.push(withPreviewRoute("/") as never)}
      />

      <View style={authStyles.fieldGroup}>
        <AuthInput
          placeholder="Full Name"
          value={fullName}
          onChangeText={(value) => {
            setFullName(value);
            clearFieldError("fullName");
          }}
        />
        {errors.fullName ? <Text style={authStyles.errorText}>{errors.fullName}</Text> : null}

        <AuthInput
          placeholder="Business Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            clearFieldError("email");
          }}
        />
        {errors.email ? <Text style={authStyles.errorText}>{errors.email}</Text> : null}

        {/* Mobile Number with country code flag pill */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={{ paddingHorizontal: 12, height: 48, borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FAFAFA", flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 14 }}>🇺🇸 +1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <AuthInput
              placeholder="Mobile Number"
              keyboardType="phone-pad"
              value={confirmPassword}
              onChangeText={(val) => {}}
            />
          </View>
        </View>

        <AuthInput
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearFieldError("password");
          }}
          rightAction={<PasswordVisibilityButton visible={showPassword} onPress={() => setShowPassword((value) => !value)} />}
        />
        {errors.password ? <Text style={authStyles.errorText}>{errors.password}</Text> : null}

        <AuthInput
          placeholder="Confirm Password"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            clearFieldError("confirmPassword");
          }}
          rightAction={<PasswordVisibilityButton visible={showConfirmPassword} onPress={() => setShowConfirmPassword((value) => !value)} />}
        />
        {errors.confirmPassword ? <Text style={authStyles.errorText}>{errors.confirmPassword}</Text> : null}
      </View>

      <AuthCheckbox
        checked={acceptedTerms}
        onPress={() => {
          setAcceptedTerms((value) => !value);
          clearFieldError("agreement");
        }}
      >
        <Text style={authStyles.agreementText}>
          I agree to the{" "}
          <Text
            style={authStyles.agreementLink}
            onPress={() => router.push("/terms" as never)}
          >
            Terms of Service
          </Text>{" "}
          and acknowledge the{" "}
          <Text
            style={authStyles.agreementLink}
            onPress={() => router.push("/privacy" as never)}
          >
            Privacy Policy
          </Text>
        </Text>
      </AuthCheckbox>
      {errors.agreement ? <Text style={authStyles.errorText}>{errors.agreement}</Text> : null}

      <AuthCheckbox
        checked={marketingOptIn}
        onPress={() => setMarketingOptIn((value) => !value)}
      >
        <Text style={authStyles.agreementText}>
          I would like to receive product updates and promotional communications.
        </Text>
      </AuthCheckbox>

      {submitError ? <Text style={authStyles.submitError}>{submitError}</Text> : null}

      <AuthPrimaryButton label="Create Account" loading={loading} disabled={loading || !!socialLoading} onPress={handleSignup} />

      <AuthDivider />

      <View style={authStyles.socialGroup}>
        <SocialAuthButton
          provider="google"
          loading={socialLoading === "google"}
          unavailable={!googleAvailability.available}
          disabled={loading || socialLoading === "apple"}
          onPress={() => handleSocialSignup("google")}
        />
        <SocialAuthButton
          provider="apple"
          loading={socialLoading === "apple"}
          unavailable={!appleAvailability.available}
          disabled={loading || socialLoading === "google"}
          onPress={() => handleSocialSignup("apple")}
        />
      </View>

      <Pressable onPress={() => router.replace(withPreviewRoute("/signin") as never)}>
        <Text style={authStyles.footerText}>
          Already have an account? <Text style={authStyles.footerLink}>Sign In</Text>
        </Text>
      </Pressable>

      <View style={authStyles.securityMessage}>
        <Text style={authStyles.securityText}>BrandDocs uses Firebase authentication and draft privacy controls for account access.</Text>
      </View>
    </AuthLayout>
  );
}
