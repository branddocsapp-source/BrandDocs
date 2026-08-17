import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { useAppTheme } from "@/theme/theme-context";

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

  const { isAppPreview, width } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();
  const isWide = width >= 780;

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
    if (!validateForm()) return;

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

  const activeColorOption = TEMPLATE_COLOR_OPTIONS.find((o) => o.value === templateColor) || TEMPLATE_COLOR_OPTIONS[0];
  const primaryBrandColor = activeColorOption.primaryColor;

  return (
    <AuthLayout
      showBack={true}
      onBackPress={() => router.replace(withPreviewRoute("/signin") as never)}
      maxWidth={isWide ? 960 : 460}
      cardStyle={{ padding: isWide ? 32 : 20 }}
    >
      <View style={[styles.mainLayout, isWide && styles.mainLayoutWide]}>
        {/* ── LEFT COLUMN: Account Form ── */}
        <View style={[styles.column, isWide && styles.leftColumn]}>
          <AuthHeader
            title="Create your account"
            subtitle="Start creating professional business documents in minutes."
            showBack={true}
            onBackPress={() => router.replace(withPreviewRoute("/signin") as never)}
            onLogoPress={() => router.push(withPreviewRoute("/") as never)}
          />

          <View style={[authStyles.fieldGroup, { marginTop: 12 }]}>
            <View>
              <AuthInput
                placeholder="Full Name"
                value={fullName}
                onChangeText={(value) => {
                  setFullName(value);
                  clearFieldError("fullName");
                }}
              />
              {errors.fullName ? <Text style={authStyles.errorText}>{errors.fullName}</Text> : null}
            </View>

            <View>
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
            </View>

            {/* Mobile Number Row */}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <View ref={triggerRef} collapsable={false}>
                <TouchableOpacity
                  onPress={toggleDropdown}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 12,
                    height: 52,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.line,
                    backgroundColor: theme.searchSurface,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 13, color: theme.ink, fontWeight: "600" }}>
                    {selectedCountry.code.toLowerCase()} {selectedCountry.value}
                  </Text>
                  <Text style={{ fontSize: 9, color: theme.muted }}>▼</Text>
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

            {/* Passwords in row on wide screens or stacked */}
            <View style={[isWide && { flexDirection: "row", gap: 10 }]}>
              <View style={{ flex: 1 }}>
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
              </View>

              <View style={[{ flex: 1 }, !isWide && { marginTop: 12 }]}>
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
            </View>
          </View>

          {/* Terms & Marketing */}
          <View style={{ marginTop: 14, gap: 10 }}>
            <AuthCheckbox
              checked={acceptedTerms}
              onPress={() => {
                setAcceptedTerms((value) => !value);
                clearFieldError("agreement");
              }}
            >
              <Text style={authStyles.agreementText}>
                I agree to the{" "}
                <Text style={authStyles.agreementLink} onPress={() => router.push("/terms" as never)}>
                  Terms of Service
                </Text>{" "}
                and acknowledge the{" "}
                <Text style={authStyles.agreementLink} onPress={() => router.push("/privacy" as never)}>
                  Privacy Policy
                </Text>
              </Text>
            </AuthCheckbox>
            {errors.agreement ? <Text style={authStyles.errorText}>{errors.agreement}</Text> : null}

            <AuthCheckbox checked={marketingOptIn} onPress={() => setMarketingOptIn((value) => !value)}>
              <Text style={authStyles.agreementText}>
                I would like to receive product updates and communications.
              </Text>
            </AuthCheckbox>
          </View>

          {submitError ? <Text style={[authStyles.submitError, { marginTop: 10 }]}>{submitError}</Text> : null}

          <View style={{ marginTop: 14 }}>
            <AuthPrimaryButton label="Create Account" loading={loading} disabled={loading || !acceptedTerms || !!socialLoading} onPress={handleSignup} />
          </View>

          <AuthDivider />

          <View style={[authStyles.socialGroup, isWide && { flexDirection: "row", gap: 10 }]}>
            <View style={{ flex: 1 }}>
              <SocialAuthButton
                provider="google"
                loading={socialLoading === "google"}
                unavailable={!googleAvailability.available}
                disabled={loading || socialLoading === "apple"}
                onPress={() => handleSocialSignup("google")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SocialAuthButton
                provider="apple"
                loading={socialLoading === "apple"}
                unavailable={!appleAvailability.available}
                disabled={loading || socialLoading === "google"}
                onPress={() => handleSocialSignup("apple")}
              />
            </View>
          </View>

          <Pressable onPress={() => router.replace(withPreviewRoute("/signin") as never)} style={{ marginTop: 10 }}>
            <Text style={authStyles.footerText}>
              Already have an account? <Text style={authStyles.footerLink}>Sign In</Text>
            </Text>
          </Pressable>
        </View>

        {/* ── RIGHT COLUMN: Template Color & Document Live Preview ── */}
        <View style={[styles.column, isWide && styles.rightColumn]}>
          <View style={styles.previewCardHeader}>
            <Text style={[styles.previewSectionTitle, { color: theme.ink }]}>Template Color</Text>
            <Text style={[styles.previewSectionSubtitle, { color: theme.muted }]}>Choose the primary tone for your invoices & receipts.</Text>
          </View>

          {/* Color Selector Grid */}
          <View style={styles.colorGrid}>
            {TEMPLATE_COLOR_OPTIONS.map((option) => {
              const isActive = templateColor === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${option.label} template color`}
                  onPress={() => setTemplateColor(option.value)}
                  style={[
                    styles.colorChip,
                    {
                      borderColor: isActive ? option.primaryColor : theme.line,
                      backgroundColor: isActive ? option.primaryColor + "15" : theme.searchSurface,
                    },
                  ]}
                >
                  <View
                    style={{
                      backgroundColor: option.primaryColor,
                      borderRadius: 999,
                      height: 16,
                      width: 16,
                    }}
                  />
                  <Text
                    style={{
                      color: isActive ? option.primaryColor : theme.ink,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Live Mini Invoice Preview */}
          <View style={[styles.previewBox, { borderColor: theme.line }]}>
            {/* Header bar */}
            <View style={{ backgroundColor: primaryBrandColor, paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>Your Company</Text>
                <Text style={{ color: "#fff", fontSize: 7, opacity: 0.85 }}>Business Slogan Here</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 }}>INVOICE</Text>
                <Text style={{ color: "#fff", fontSize: 7, opacity: 0.85 }}>#INV-2025-1001</Text>
              </View>
            </View>

            {/* Preview Body */}
            <View style={{ padding: 10, backgroundColor: "#FFFFFF" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <View style={{ gap: 1 }}>
                  <Text style={{ fontSize: 7, color: "#888" }}>123 Business Street</Text>
                  <Text style={{ fontSize: 7, color: "#888" }}>New York, NY 10001</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 1 }}>
                  <Text style={{ fontSize: 7, color: "#555" }}>Invoice Date: 20 May 2025</Text>
                  <Text style={{ fontSize: 7, color: "#555" }}>Due Date: 03 Jun 2025</Text>
                </View>
              </View>

              <View style={{ marginBottom: 6 }}>
                <Text style={{ fontSize: 6.5, color: "#888" }}>Bill To:</Text>
                <Text style={{ fontSize: 7.5, color: "#222", fontWeight: "700" }}>John Doe — ABC Corporation</Text>
              </View>

              {/* Table header */}
              <View style={{ backgroundColor: primaryBrandColor, borderRadius: 4, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 3, marginBottom: 3 }}>
                {["Item & Description", "Qty", "Rate", "Amount"].map((h) => (
                  <Text key={h} style={{ color: "#fff", fontSize: 6.5, fontWeight: "800" }}>{h}</Text>
                ))}
              </View>

              {/* Table rows */}
              {[
                ["Web Design", "1", "$500.00", "$500.00"],
                ["Development", "1", "$1,200.00", "$1,200.00"],
                ["SEO Optimization", "1", "$300.00", "$300.00"],
              ].map(([item, qty, rate, amt], i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: "#F1F5F9" }}>
                  <Text style={{ fontSize: 6.5, color: "#333", flex: 1 }}>{item}</Text>
                  <Text style={{ fontSize: 6.5, color: "#555", width: 20, textAlign: "center" }}>{qty}</Text>
                  <Text style={{ fontSize: 6.5, color: "#555", width: 44, textAlign: "right" }}>{rate}</Text>
                  <Text style={{ fontSize: 6.5, color: "#333", fontWeight: "600", width: 44, textAlign: "right" }}>{amt}</Text>
                </View>
              ))}

              {/* Total Due Banner */}
              <View style={{ marginTop: 6, alignItems: "flex-end" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: primaryBrandColor, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, width: 120 }}>
                  <Text style={{ color: "#fff", fontSize: 7, fontWeight: "800" }}>Total Due</Text>
                  <Text style={{ color: "#fff", fontSize: 7.5, fontWeight: "900" }}>$2,090.00</Text>
                </View>
              </View>
            </View>

            {/* Preview Footer */}
            <View style={{ backgroundColor: primaryBrandColor + "18", borderTopWidth: 1, borderTopColor: primaryBrandColor + "28", paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: primaryBrandColor }} />
              <Text style={{ fontSize: 6.5, color: primaryBrandColor, fontWeight: "700" }}>BrandDocs – Create. Share. Grow.</Text>
            </View>
          </View>

          {/* Color Details Swatch */}
          <View style={[styles.swatchLegend, { backgroundColor: theme.searchSurface, borderColor: theme.line }]}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: primaryBrandColor }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.ink }}>{activeColorOption.label.toUpperCase()}</Text>
              <Text style={{ fontSize: 10, color: theme.muted, fontWeight: "600" }}>HEX: {activeColorOption.primaryColor} • {activeColorOption.tagline}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Floating Country Code Popover */}
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
              backgroundColor: theme.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.line,
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
                    <Text style={{ fontSize: 14, color: theme.ink }}>{item.label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: theme.muted }}>{item.value}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  colorChip: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  column: {
    width: "100%",
  },
  leftColumn: {
    flex: 1.1,
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: "rgba(226, 232, 240, 0.5)",
  },
  mainLayout: {
    gap: 20,
    width: "100%",
  },
  mainLayoutWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  previewBox: {
    borderRadius: 12,
    borderWidth: 1,
    elevation: 3,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  previewCardHeader: {
    marginBottom: 10,
  },
  previewSectionSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  previewSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  rightColumn: {
    flex: 0.9,
    paddingLeft: 20,
  },
  swatchLegend: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    padding: 10,
  },
});