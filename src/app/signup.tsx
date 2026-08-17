import { Ionicons } from "@expo/vector-icons";
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
  { label: "United States", flag: "🇺🇸", value: "+1", code: "US" },
  { label: "India", flag: "🇮🇳", value: "+91", code: "IN" },
  { label: "Canada", flag: "🇨🇦", value: "+1", code: "CA" },
  { label: "United Kingdom", flag: "🇬🇧", value: "+44", code: "GB" },
  { label: "Australia", flag: "🇦🇺", value: "+61", code: "AU" },
  { label: "Germany", flag: "🇩🇪", value: "+49", code: "DE" },
  { label: "France", flag: "🇫🇷", value: "+33", code: "FR" },
  { label: "United Arab Emirates", flag: "🇦🇪", value: "+971", code: "AE" },
  { label: "Singapore", flag: "🇸🇬", value: "+65", code: "SG" },
  { label: "Japan", flag: "🇯🇵", value: "+81", code: "JP" },
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
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]); // Default to US
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 260 });
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
  const isWide = width >= 720;

  const googleAvailability = getGoogleAuthAvailability();
  const appleAvailability = getAppleAuthAvailability();

  function toggleDropdown() {
    if (isPickerVisible) {
      setIsPickerVisible(false);
    } else {
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        setDropdownPos({
          left: Math.max(16, x),
          top: y + height + 6,
          width: Math.max(260, width),
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
      maxWidth={isWide ? 1040 : 540}
      cardStyle={{ padding: isWide ? 38 : 24 }}
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

          <View style={styles.formFields}>
            {/* Full Name */}
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

            {/* Email */}
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

            {/* Mobile Number with Country Flag & Code */}
            <View style={styles.phoneInputRow}>
              <View ref={triggerRef} collapsable={false}>
                <TouchableOpacity
                  onPress={toggleDropdown}
                  activeOpacity={0.7}
                  style={[
                    styles.countryPickerTrigger,
                    {
                      borderColor: theme.line,
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F8FAFC",
                    },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{selectedCountry.flag}</Text>
                  <Text style={[styles.countryCodeText, { color: theme.ink }]}>
                    {selectedCountry.value}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={theme.muted} style={{ marginLeft: 2 }} />
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

            {/* Password */}
            <View>
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

            {/* Confirm Password */}
            <View>
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

          {/* Terms & Marketing */}
          <View style={styles.agreementsBlock}>
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
                I would like to receive product updates and promotional communications.
              </Text>
            </AuthCheckbox>
          </View>

          {submitError ? <Text style={[authStyles.submitError, { marginTop: 12 }]}>{submitError}</Text> : null}

          <View style={{ marginTop: 18 }}>
            <AuthPrimaryButton
              label="Create Account"
              loading={loading}
              disabled={loading || !acceptedTerms || !!socialLoading}
              onPress={handleSignup}
            />
          </View>

          <AuthDivider />

          <View style={[authStyles.socialGroup, { marginTop: 2 }]}>
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

          <Pressable onPress={() => router.replace(withPreviewRoute("/signin") as never)} style={{ marginTop: 14, alignSelf: "center" }}>
            <Text style={authStyles.footerText}>
              Already have an account? <Text style={authStyles.footerLink}>Sign In</Text>
            </Text>
          </Pressable>
        </View>

        {/* ── RIGHT COLUMN: Template Color & Document Live Preview ── */}
        <View style={[styles.column, isWide && styles.rightColumn]}>
          <View style={styles.previewCardHeader}>
            <Text style={[styles.previewSectionTitle, { color: theme.ink }]}>Template Color & Preview</Text>
            <Text style={[styles.previewSectionSubtitle, { color: theme.muted }]}>
              Choose the primary brand theme for your invoices, receipts, and quotations.
            </Text>
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
                      backgroundColor: isActive ? option.primaryColor + "18" : (isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC"),
                    },
                  ]}
                >
                  <View
                    style={{
                      backgroundColor: option.primaryColor,
                      borderRadius: 999,
                      height: 18,
                      width: 18,
                      shadowColor: option.primaryColor,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isActive ? 0.4 : 0,
                      shadowRadius: 4,
                      elevation: isActive ? 3 : 0,
                    }}
                  />
                  <Text
                    style={{
                      color: isActive ? option.primaryColor : theme.ink,
                      fontSize: 12,
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
          <View style={[styles.previewBox, { borderColor: theme.line, backgroundColor: "#FFFFFF" }]}>
            {/* Header bar */}
            <View style={{ backgroundColor: primaryBrandColor, paddingHorizontal: 14, paddingVertical: 9, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.3 }}>Your Company</Text>
                <Text style={{ color: "#fff", fontSize: 7.5, opacity: 0.85 }}>Business Slogan Here</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 }}>INVOICE</Text>
                <Text style={{ color: "#fff", fontSize: 7.5, opacity: 0.85 }}>#INV-2025-1001</Text>
              </View>
            </View>

            {/* Preview Body */}
            <View style={{ padding: 12, backgroundColor: "#FFFFFF" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontSize: 7.5, color: "#888" }}>123 Business Street</Text>
                  <Text style={{ fontSize: 7.5, color: "#888" }}>New York, NY 10001</Text>
                  <Text style={{ fontSize: 7.5, color: "#888" }}>+1 (555) 123-4567</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={{ fontSize: 7.5, color: "#555" }}>Invoice Date: 20 May 2025</Text>
                  <Text style={{ fontSize: 7.5, color: "#555" }}>Due Date: 03 Jun 2025</Text>
                  <Text style={{ fontSize: 7.5, color: "#555" }}>Payment Terms: Net 14 Days</Text>
                </View>
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 7, color: "#888" }}>Bill To:</Text>
                <Text style={{ fontSize: 8.5, color: "#1E293B", fontWeight: "700" }}>John Doe</Text>
                <Text style={{ fontSize: 7.5, color: "#555" }}>ABC Corporation, 456 Client Avenue</Text>
              </View>

              {/* Table header */}
              <View style={{ backgroundColor: primaryBrandColor, borderRadius: 5, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4 }}>
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
                  <Text style={{ fontSize: 7.5, color: primaryBrandColor, fontWeight: "700", width: 14 }}>{num}</Text>
                  <Text style={{ fontSize: 7.5, color: "#333", flex: 1 }}>{item}</Text>
                  <Text style={{ fontSize: 7.5, color: "#555", width: 22, textAlign: "center" }}>{qty}</Text>
                  <Text style={{ fontSize: 7.5, color: "#555", width: 48, textAlign: "right" }}>{rate}</Text>
                  <Text style={{ fontSize: 7.5, color: "#1E293B", fontWeight: "700", width: 48, textAlign: "right" }}>{amt}</Text>
                </View>
              ))}

              {/* Total Due Banner */}
              <View style={{ marginTop: 8, alignItems: "flex-end" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: primaryBrandColor, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, width: 140 }}>
                  <Text style={{ color: "#fff", fontSize: 8, fontWeight: "800" }}>Total Due</Text>
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>$2,090.00</Text>
                </View>
              </View>
            </View>

            {/* Preview Footer */}
            <View style={{ backgroundColor: primaryBrandColor + "15", borderTopWidth: 1, borderTopColor: primaryBrandColor + "25", paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: primaryBrandColor }} />
              <Text style={{ fontSize: 7.5, color: primaryBrandColor, fontWeight: "700" }}>BrandDocs – Create. Share. Grow.</Text>
            </View>
          </View>

          {/* Color Details Swatch */}
          <View style={[styles.swatchLegend, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC", borderColor: theme.line }]}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: primaryBrandColor }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.ink }}>{activeColorOption.label.toUpperCase()}</Text>
              <Text style={{ fontSize: 10.5, color: theme.muted, fontWeight: "600" }}>HEX: {activeColorOption.primaryColor} • {activeColorOption.tagline}</Text>
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
              maxHeight: 250,
              backgroundColor: theme.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.line,
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.16,
              shadowRadius: 16,
              elevation: 10,
              paddingVertical: 6,
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
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                  }}
                  onPress={() => {
                    setSelectedCountry(item);
                    setIsPickerVisible(false);
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 20 }}>{item.flag}</Text>
                    <Text style={{ fontSize: 14, color: theme.ink, fontWeight: "600" }}>{item.label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: theme.muted, fontWeight: "700" }}>{item.value}</Text>
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
  agreementsBlock: {
    gap: 12,
    marginTop: 16,
  },
  colorChip: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  column: {
    width: "100%",
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  countryPickerTrigger: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 54,
    paddingHorizontal: 14,
  },
  formFields: {
    gap: 16,
    marginTop: 18,
  },
  leftColumn: {
    flex: 1.15,
    paddingRight: 28,
    borderRightWidth: 1,
    borderRightColor: "rgba(226, 232, 240, 0.6)",
  },
  mainLayout: {
    gap: 28,
    width: "100%",
  },
  mainLayoutWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  phoneInputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  previewBox: {
    borderRadius: 14,
    borderWidth: 1,
    elevation: 3,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
  },
  previewCardHeader: {
    marginBottom: 14,
  },
  previewSectionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  previewSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  rightColumn: {
    flex: 0.95,
    paddingLeft: 28,
  },
  swatchLegend: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    padding: 12,
  },
});