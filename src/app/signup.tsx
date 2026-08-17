import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
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
  saveUserTemplateColor,
} from "@/services/auth";
import { loadBusinessProfile } from "@/services/business-profile";
import { saveLegalAcceptance } from "@/services/consent";
import { TEMPLATE_COLOR_OPTIONS, TemplateColor } from "@/theme/template-colors";

const COUNTRY_CODES = [
  { label: "Canada", flag: "🇨🇦", value: "+1", code: "CA" },
  { label: "UK", flag: "🇬🇧", value: "+44", code: "GB" },
  { label: "India", flag: "🇮🇳", value: "+91", code: "IN" },
  { label: "Australia", flag: "🇦🇺", value: "+61", code: "AU" },
  { label: "US", flag: "🇺🇸", value: "+1", code: "US" },
  { label: "Germany", flag: "🇩🇪", value: "+49", code: "DE" },
  { label: "France", flag: "🇫🇷", value: "+33", code: "FR" },
  { label: "Japan", flag: "🇯🇵", value: "+81", code: "JP" },
  { label: "UAE", flag: "🇦🇪", value: "+971", code: "AE" },
];

type FormErrors = {
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  password?: string;
  confirmPassword?: string;
  agreement?: string;
};

export default function SignUpScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[4]); // Default to US
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 220 });
  const triggerRef = useRef<View>(null);

  const [mobileNumber, setMobileNumber] = useState("");
  const [templateColor, setTemplateColor] = useState<TemplateColor>("orange");
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

  function toggleDropdown() {
    if (isPickerVisible) {
      setIsPickerVisible(false);
    } else {
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        setDropdownPos({
          left: x,
          top: y + height + 4,
          width: 220,
        });
        setIsPickerVisible(true);
      });
    }
  }

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
      const user = await registerUser(fullName.trim(), email.trim(), password, templateColor);
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
      await saveUserTemplateColor(user, templateColor);
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

        {/* Mobile Number Row with Anchored Dropdown */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View ref={triggerRef} collapsable={false}>
            <TouchableOpacity
              onPress={toggleDropdown}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 12,
                height: 48,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                backgroundColor: "#FAFAFA",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 14 }}>
                {selectedCountry.code.toLowerCase()} {selectedCountry.value}
              </Text>
              <Text style={{ fontSize: 9, color: "#64748B" }}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <AuthInput
              placeholder="Mobile Number"
              keyboardType="phone-pad"
              value={mobileNumber}
              onChangeText={(val) => {
                setMobileNumber(val);
                clearFieldError("mobileNumber");
              }}
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

        {/* ── Template Color ─────────────────────────────────── */}
        <View>
          <Text style={{ color: "#334155", fontSize: 13, fontWeight: "700", marginBottom: 10, marginLeft: 2 }}>
            Template Color
          </Text>

          {/* ── 5-color horizontal scroll picker ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
          >
            {TEMPLATE_COLOR_OPTIONS.map((option) => {
              const isActive = templateColor === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${option.label} template color`}
                  onPress={() => setTemplateColor(option.value)}
                  style={{
                    alignItems: "center",
                    borderColor: isActive ? option.primaryColor : "#E2E8F0",
                    borderRadius: 14,
                    borderWidth: isActive ? 2 : 1,
                    gap: 6,
                    minWidth: 90,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: isActive ? option.primaryColor + "14" : "transparent",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: option.primaryColor,
                      borderRadius: 999,
                      height: 18,
                      width: 18,
                      shadowColor: option.primaryColor,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isActive ? 0.45 : 0,
                      shadowRadius: 4,
                      elevation: isActive ? 4 : 0,
                    }}
                  />
                  <Text
                    style={{
                      color: isActive ? option.primaryColor : "#475569",
                      fontSize: 11,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Live mini invoice preview ── */}
          {(() => {
            const active = TEMPLATE_COLOR_OPTIONS.find((o) => o.value === templateColor);
            if (!active) return null;
            const c = active.primaryColor;
            const row = (label: string, amount: string) => (
              <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 8, color: "#555" }}>{label}</Text>
                <Text style={{ fontSize: 8, color: "#333", fontWeight: "600" }}>{amount}</Text>
              </View>
            );
            return (
              <View
                style={{
                  marginTop: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  overflow: "hidden",
                  backgroundColor: "#FFFFFF",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                {/* Header bar */}
                <View style={{ backgroundColor: c, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.3 }}>Your Company</Text>
                    <Text style={{ color: "#fff", fontSize: 7, opacity: 0.8 }}>Business Slogan Here</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 }}>INVOICE</Text>
                    <Text style={{ color: "#fff", fontSize: 7, opacity: 0.85 }}>#INV-2025-1001</Text>
                  </View>
                </View>

                {/* Body */}
                <View style={{ padding: 10 }}>
                  {/* Info row */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <View style={{ gap: 2 }}>
                      <Text style={{ fontSize: 7, color: "#888" }}>123 Business Street</Text>
                      <Text style={{ fontSize: 7, color: "#888" }}>New York, NY 10001</Text>
                      <Text style={{ fontSize: 7, color: "#888" }}>+1 (555) 123-4567</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Text style={{ fontSize: 7, color: "#888" }}>Invoice Date</Text>
                        <Text style={{ fontSize: 7, color: "#333", fontWeight: "600" }}>20 May 2025</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Text style={{ fontSize: 7, color: "#888" }}>Due Date</Text>
                        <Text style={{ fontSize: 7, color: "#333", fontWeight: "600" }}>03 Jun 2025</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Text style={{ fontSize: 7, color: "#888" }}>Payment Terms</Text>
                        <Text style={{ fontSize: 7, color: "#333", fontWeight: "600" }}>Net 14 Days</Text>
                      </View>
                    </View>
                  </View>

                  {/* Bill To */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 7, color: "#888", marginBottom: 2 }}>Bill To:</Text>
                    <Text style={{ fontSize: 8, color: "#222", fontWeight: "700" }}>John Doe</Text>
                    <Text style={{ fontSize: 7, color: "#555" }}>ABC Corporation, 456 Client Avenue</Text>
                    <Text style={{ fontSize: 7, color: "#555" }}>Los Angeles, CA 90001, United States</Text>
                  </View>

                  {/* Table header */}
                  <View style={{ backgroundColor: c, borderRadius: 5, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 4, marginBottom: 5 }}>
                    {["# Item & Description", "Qty", "Rate", "Amount"].map((h) => (
                      <Text key={h} style={{ color: "#fff", fontSize: 7, fontWeight: "800" }}>{h}</Text>
                    ))}
                  </View>

                  {/* Table rows */}
                  {[
                    ["1", "Web Design", "1", "$500.00", "$500.00"],
                    ["2", "Development", "1", "$1,200.00", "$1,200.00"],
                    ["3", "SEO Optimization", "1", "$300.00", "$300.00"],
                  ].map(([num, item, qty, rate, amt]) => (
                    <View key={num} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                      <Text style={{ fontSize: 7, color: c, fontWeight: "700", width: 16 }}>{num}</Text>
                      <Text style={{ fontSize: 7, color: "#333", flex: 1 }}>{item}</Text>
                      <Text style={{ fontSize: 7, color: "#555", width: 20, textAlign: "center" }}>{qty}</Text>
                      <Text style={{ fontSize: 7, color: "#555", width: 44, textAlign: "right" }}>{rate}</Text>
                      <Text style={{ fontSize: 7, color: "#333", fontWeight: "600", width: 44, textAlign: "right" }}>{amt}</Text>
                    </View>
                  ))}

                  {/* Totals */}
                  <View style={{ marginTop: 6, alignItems: "flex-end", gap: 2 }}>
                    {row("Subtotal", "$2,000.00")}
                    {row("Discount (5%)", "-$100.00")}
                    {row("Tax (10%)", "$190.00")}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: c, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4, marginTop: 3, width: 140 }}>
                      <Text style={{ color: "#fff", fontSize: 8, fontWeight: "800" }}>Total Due</Text>
                      <Text style={{ color: "#fff", fontSize: 8, fontWeight: "900" }}>$2,090.00</Text>
                    </View>
                  </View>

                  {/* Thank you */}
                  <Text style={{ fontSize: 7, color: "#888", marginTop: 6, fontStyle: "italic" }}>Thank you for your business!</Text>
                </View>

                {/* Footer */}
                <View style={{ backgroundColor: c + "22", borderTopWidth: 1, borderTopColor: c + "33", paddingHorizontal: 12, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
                  <Text style={{ fontSize: 7, color: c, fontWeight: "700" }}>BrandDocs – Create. Share. Grow.</Text>
                </View>
              </View>
            );
          })()}

          {/* Color swatch legend below preview */}
          {(() => {
            const active = TEMPLATE_COLOR_OPTIONS.find((o) => o.value === templateColor);
            if (!active) return null;
            return (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: active.primaryColor }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#1E293B" }}>{active.label.toUpperCase()}</Text>
                  <Text style={{ fontSize: 10, color: "#64748B", fontWeight: "600" }}>HEX: {active.primaryColor}</Text>
                  <Text style={{ fontSize: 10, color: "#64748B", marginTop: 1 }}>{active.tagline}</Text>
                </View>
              </View>
            );
          })()}
        </View>
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

      {/* Floating Popover Dropdown Menu */}
      <Modal visible={isPickerVisible} transparent animationType="none">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "transparent" }}
          activeOpacity={1}
          onPress={() => setIsPickerVisible(false)}
        >
          <View
            style={{
              position: "absolute",
              left: dropdownPos.left,
              top: dropdownPos.top,
              width: dropdownPos.width,
              maxHeight: 210,
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 10,
              elevation: 8,
              paddingVertical: 4,
              overflow: "hidden",
            }}
          >
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                  onPress={() => {
                    setSelectedCountry(item);
                    setIsPickerVisible(false);
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>{item.flag}</Text>
                    <Text style={{ fontSize: 14, color: "#1E293B" }}>{item.label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: "#64748B" }}>{item.value}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </AuthLayout>
  );
}