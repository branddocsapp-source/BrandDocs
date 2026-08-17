import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { ReactNode, useState } from "react";
import { Image } from "expo-image";
import {
    ActivityIndicator,
    KeyboardTypeOptions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { Colors } from "@/theme/colors";
import { BrandLogo } from "@/components/brand-logo";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors } from "@/theme/tokens";

const authLogos = {
  google: require("@/assets/images/auth/google-logo.svg"),
  appleBlack: require("@/assets/images/auth/apple-logo-black.png"),
  appleWhite: require("@/assets/images/auth/apple-logo-white.png"),
};

const authBrand = {
  orange: BrandColors.primary,
  orangeDark: BrandColors.primaryDark,
  orangeSoft: BrandColors.primarySoft,
  ink: "#0F172A",
  text: "#334155",
  muted: "#64748B",
  line: "#E2E8F0",
  wash: "#F8FAFC",
  white: "#FFFFFF",
};

export function AuthInlineLink({ label, href }: { label: string; href: Href }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(href as never)} hitSlop={8}>
      <Text style={authStyles.inlineLink}>{label}</Text>
    </Pressable>
  );
}

export const authStyles = StyleSheet.create({
  fieldGroup: {
    gap: 14,
  },
  socialGroup: {
    gap: 12,
  },
  formMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: -3,
  },
  securityMessage: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: -2,
  },
  securityText: {
    color: "#9DA3AF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: "650" as never,
    lineHeight: 18,
    marginTop: -5,
    paddingHorizontal: 2,
  },
  submitError: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: "650" as never,
    lineHeight: 19,
    textAlign: "center",
  },
  linkText: {
    color: authBrand.orangeDark,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  inlineLink: {
    color: authBrand.orangeDark,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  footerText: {
    color: "#9DA3AF",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  footerLink: {
    color: authBrand.orangeDark,
    fontWeight: "900",
  },
  agreementText: {
    color: authBrand.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  agreementLink: {
    color: authBrand.orangeDark,
    fontWeight: "900",
  },
});

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: authBrand.white,
  },
  pageContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  pageContentWide: {
    paddingHorizontal: 46,
    paddingVertical: 54,
  },
  pageContentTablet: {
    paddingHorizontal: 30,
    paddingVertical: 38,
  },
  pageContentCompact: {
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  shell: {
    alignSelf: "center",
    gap: 20,
    maxWidth: 640,
    width: "100%",
  },
  shellWide: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 34,
    maxWidth: 1220,
  },
  shellTablet: {
    maxWidth: 760,
  },
  brandPanel: {
    backgroundColor: authBrand.wash,
    borderColor: authBrand.line,
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    justifyContent: "space-between",
    minHeight: 690,
    overflow: "hidden",
    padding: 34,
  },
  brandPanelCompact: {
    minHeight: 0,
    padding: 24,
  },
  brandTop: {
    gap: 18,
  },
  logoWrap: {
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  logoWrapDark: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  brandLogo: {
    height: 58,
    width: 214,
  },
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: authBrand.orangeSoft,
    borderColor: "#F0D7AA",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 13,
  },
  badgeText: {
    color: authBrand.orangeDark,
    fontSize: 13,
    fontWeight: "900",
  },
  brandCopy: {
    marginTop: 34,
  },
  brandTitle: {
    color: authBrand.ink,
    fontSize: 45,
    fontWeight: "950" as never,
    letterSpacing: 0,
    lineHeight: 52,
  },
  brandTitleCompact: {
    fontSize: 34,
    lineHeight: 40,
  },
  brandTitleAccent: {
    color: authBrand.orange,
  },
  brandText: {
    color: authBrand.muted,
    fontSize: 17,
    lineHeight: 28,
    marginTop: 16,
    maxWidth: 570,
  },
  featureList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 28,
  },
  featureItem: {
    alignItems: "center",
    backgroundColor: authBrand.white,
    borderColor: "#E5E1D8",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  featureText: {
    color: authBrand.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  previewStage: {
    backgroundColor: authBrand.white,
    borderColor: "#E5E1D8",
    borderRadius: 22,
    borderWidth: 1,
    height: 250,
    marginTop: 30,
    overflow: "hidden",
    position: "relative",
  },
  tabletPreview: {
    backgroundColor: authBrand.white,
    borderColor: authBrand.ink,
    borderRadius: 20,
    borderWidth: 6,
    height: 200,
    left: 24,
    padding: 16,
    position: "absolute",
    top: 24,
    width: 280,
  },
  tabletBar: {
    backgroundColor: authBrand.orangeSoft,
    borderRadius: 999,
    height: 12,
    marginBottom: 14,
    width: 130,
  },
  tabletGrid: {
    flexDirection: "row",
    gap: 12,
  },
  tabletCard: {
    backgroundColor: "#F6F4EE",
    borderRadius: 12,
    flex: 1,
    height: 94,
    padding: 10,
  },
  tabletLine: {
    backgroundColor: "#E7E2D7",
    borderRadius: 999,
    height: 10,
    marginTop: 12,
    width: 150,
  },
  tabletLineShort: {
    backgroundColor: "#E7E2D7",
    borderRadius: 999,
    height: 10,
    marginTop: 10,
    width: 90,
  },
  phonePreview: {
    backgroundColor: authBrand.white,
    borderColor: authBrand.ink,
    borderRadius: 26,
    borderWidth: 7,
    bottom: -18,
    height: 184,
    padding: 16,
    position: "absolute",
    right: 22,
    width: 104,
  },
  phonePill: {
    alignSelf: "center",
    backgroundColor: authBrand.ink,
    borderRadius: 999,
    height: 4,
    marginBottom: 18,
    width: 34,
  },
  phoneLineWide: {
    backgroundColor: authBrand.orangeSoft,
    borderRadius: 999,
    height: 42,
    marginBottom: 12,
  },
  phoneLine: {
    backgroundColor: "#E7E2D7",
    borderRadius: 999,
    height: 10,
  },
  card: {
    alignSelf: "center",
    backgroundColor: authBrand.white,
    borderColor: authBrand.line,
    borderRadius: 24,
    borderWidth: 1,
    gap: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
    ...Platform.select({
      web: {
        boxShadow: "0px 18px 34px rgba(25, 26, 23, 0.07)",
      },
      default: {
        shadowColor: authBrand.ink,
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.07,
        shadowRadius: 34,
      },
    }),
  },
  cardWide: {
    flex: 0.82,
    maxWidth: 560,
    paddingHorizontal: 44,
    paddingVertical: 46,
  },
  cardTablet: {
    maxWidth: 600,
    paddingHorizontal: 40,
    paddingVertical: 42,
  },
  cardCompact: {
    gap: 17,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topBackFloatingWrapper: {
    alignSelf: "center",
    marginBottom: 12,
    maxWidth: 640,
    width: "100%",
  },
  topBackFloatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    gap: 20,
  },
  cardLogo: {
    height: 62,
    width: 230,
  },
  titleGroup: {
    gap: 8,
  },
  title: {
    color: authBrand.ink,
    fontSize: 36,
    fontWeight: "950" as never,
    letterSpacing: 0,
    lineHeight: 42,
  },
  subtitle: {
    color: authBrand.muted,
    fontSize: 16,
    lineHeight: 25,
  },
  inputFrame: {
    backgroundColor: authBrand.white,
    borderColor: "#DFDED7",
    borderRadius: 14,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
  },
  inputFrameFocused: {
    borderColor: authBrand.orange,
  },
  input: {
    color: authBrand.ink,
    fontSize: 16,
    height: 54,
    paddingHorizontal: 17,
  },
  inputWithAction: {
    paddingRight: 60,
  },
  inputAction: {
    bottom: 0,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 0,
  },
  passwordIconButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconPressed: {
    backgroundColor: authBrand.orangeSoft,
  },
  checkboxRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    marginTop: -2,
  },
  checkboxPressed: {
    opacity: 0.86,
  },
  checkboxBox: {
    alignItems: "center",
    backgroundColor: authBrand.white,
    borderColor: "#D8D7D0",
    borderRadius: 6,
    borderWidth: 1,
    height: 21,
    justifyContent: "center",
    marginTop: 1,
    width: 21,
  },
  checkboxBoxChecked: {
    backgroundColor: authBrand.orange,
    borderColor: authBrand.orange,
  },
  checkboxContent: {
    flex: 1,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: authBrand.orange,
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
  },
  primaryButtonHover: {
    backgroundColor: authBrand.orangeDark,
    transform: [{ translateY: -1 }],
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonDisabled: {
    opacity: 0.58,
  },
  primaryButtonText: {
    color: authBrand.white,
    fontSize: 16,
    fontWeight: "900",
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  dividerLine: {
    backgroundColor: authBrand.line,
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    color: "#8A8D87",
    fontSize: 12,
    fontWeight: "900",
  },
  socialButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: authBrand.white,
    borderColor: "#DFDED7",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    height: 54,
    justifyContent: "center",
    paddingHorizontal: 18,
    width: "100%",
  },
  socialButtonHover: {
    backgroundColor: authBrand.wash,
    borderColor: "#CDCBC2",
    transform: [{ translateY: -1 }],
  },
  socialButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.995 }],
  },
  socialButtonDisabled: {
    opacity: 0.58,
  },
  socialButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  socialLogo: {
    height: 20,
    width: 20,
  },
  socialButtonText: {
    color: authBrand.ink,
    fontSize: 14.5,
    fontWeight: "900",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginVertical: 14,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },
  authCardContainer: {
    width: "100%",
    maxWidth: 440,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    width: "100%",
  },
  topBackFloatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    gap: 20,
  },
  cardLogo: {
    height: 62,
    width: 230,
  },
  titleGroup: {
    gap: 8,
  },
  title: {
    color: authBrand.ink,
    fontSize: 36,
    fontWeight: "950" as never,
    letterSpacing: 0,
    lineHeight: 42,
  },
  subtitle: {
    color: authBrand.muted,
    fontSize: 16,
    lineHeight: 25,
  },
  inputFrame: {
    backgroundColor: authBrand.white,
    borderColor: "#DFDED7",
    borderRadius: 14,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
  },
  inputFrameFocused: {
    borderColor: authBrand.orange,
  },
  input: {
    color: authBrand.ink,
    fontSize: 16,
    height: 54,
    paddingHorizontal: 17,
  },
  inputWithAction: {
    paddingRight: 60,
  },
  inputAction: {
    bottom: 0,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 0,
  },
  passwordIconButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconPressed: {
    backgroundColor: authBrand.orangeSoft,
  },
  checkboxRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    marginTop: -2,
  },
  checkboxPressed: {
    opacity: 0.86,
  },
  checkboxBox: {
    alignItems: "center",
    backgroundColor: authBrand.white,
    borderColor: "#D8D7D0",
    borderRadius: 6,
    borderWidth: 1,
    height: 21,
    justifyContent: "center",
    marginTop: 1,
    width: 21,
  },
  checkboxBoxChecked: {
    backgroundColor: authBrand.orange,
    borderColor: authBrand.orange,
  },
  checkboxContent: {
    flex: 1,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: authBrand.orange,
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
  },
  primaryButtonHover: {
    backgroundColor: authBrand.orangeDark,
    transform: [{ translateY: -1 }],
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonDisabled: {
    opacity: 0.58,
  },
  primaryButtonText: {
    color: authBrand.white,
    fontSize: 16,
    fontWeight: "900",
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  dividerLine: {
    backgroundColor: authBrand.line,
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    color: "#8A8D87",
    fontSize: 12,
    fontWeight: "900",
  },
  socialButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: authBrand.white,
    borderColor: "#DFDED7",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    height: 54,
    justifyContent: "center",
    paddingHorizontal: 18,
    width: "100%",
  },
  socialButtonHover: {
    backgroundColor: authBrand.wash,
    borderColor: "#CDCBC2",
    transform: [{ translateY: -1 }],
  },
  socialButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.995 }],
  },
  socialButtonDisabled: {
    opacity: 0.58,
  },
  socialButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  socialLogo: {
    height: 20,
    width: 20,
  },
  socialButtonText: {
    color: authBrand.ink,
    fontSize: 14.5,
    fontWeight: "900",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginVertical: 14,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },
  authCardContainer: {
    width: "100%",
    maxWidth: 440,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    alignSelf: "center",
  },
});

type AuthLayoutProps = {
  children: ReactNode;
  showBack?: boolean;
  onBackPress?: () => void;
  maxWidth?: number;
  cardStyle?: any;
};

type AuthHeaderProps = {
  title: string;
  subtitle: string;
  onLogoPress?: () => void;
  onBackPress?: () => void;
  showBack?: boolean;
};

export function AuthHeader({ title, subtitle, onLogoPress, onBackPress, showBack }: AuthHeaderProps) {
  const { isDark, theme } = useAppTheme();
  const handleBack = onBackPress || (() => { if (router.canGoBack()) router.back(); else router.replace("/signin" as never); });

  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        {(showBack || onBackPress) ? (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backArrowBtn,
              { backgroundColor: theme.searchSurface, borderColor: theme.line },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color={theme.ink} />
          </Pressable>
        ) : null}
        <Pressable onPress={onLogoPress} accessibilityRole="link" accessibilityLabel="BrandDocs home">
          <BrandLogo size="medium" disableNavigation />
        </Pressable>
      </View>
      <View style={styles.titleGroup}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.ink }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

type AuthInputProps = {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  autoComplete?: "email" | "password" | "new-password";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightAction?: ReactNode;
};

type AuthPrimaryButtonProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  showArrow?: boolean;
  onPress: () => void;
};

type SocialAuthButtonProps = {
  provider: "apple" | "google";
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  unavailable?: boolean;
};

type AuthCheckboxProps = {
  checked: boolean;
  onPress: () => void;
  children: ReactNode;
};

export function AuthLayout({ children, maxWidth, cardStyle }: AuthLayoutProps) {
  const { isDark, theme } = useAppTheme();

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View
        entering={FadeIn.duration(350)}
        style={[
          styles.authCardContainer,
          maxWidth ? { maxWidth } : null,
          cardStyle,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
          },
        ]}
      >
        {children}
      </Animated.View>
    </ScrollView>
  );
}

export function AuthInput({
  placeholder,
  value,
  onChangeText,
  autoComplete,
  autoCapitalize = "sentences",
  keyboardType,
  secureTextEntry,
  leftIcon,
  rightAction,
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const { theme } = useAppTheme();

  return (
    <View style={[
      styles.inputFrame,
      { backgroundColor: theme.inputSurface, borderColor: theme.line },
      focused && { borderColor: BrandColors.primary, backgroundColor: theme.card },
    ]}>
      {leftIcon ? <Ionicons name={leftIcon} size={19} color="#64748B" style={{ marginLeft: 14, marginRight: -4 }} /> : null}
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        style={[styles.input, { color: theme.ink }, rightAction ? styles.inputWithAction : undefined]}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
      />
      {rightAction ? <View style={styles.inputAction}>{rightAction}</View> : null}
    </View>
  );
}

export function PasswordVisibilityButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={visible ? "Hide password" : "Show password"}
      style={({ pressed }) => [styles.passwordIconButton, pressed && styles.iconPressed]}
    >
      <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={21} color={theme.muted} />
    </Pressable>
  );
}

export function AuthCheckbox({ checked, onPress, children }: AuthCheckboxProps) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [styles.checkboxRow, pressed && styles.checkboxPressed]}
    >
      <View style={[styles.checkboxBox, { borderColor: theme.line }, checked && { backgroundColor: BrandColors.primary, borderColor: BrandColors.primary }]}>
        {checked ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
      </View>
      <View style={styles.checkboxContent}>{children}</View>
    </Pressable>
  );
}

export function AuthPrimaryButton({ label, loading, disabled, showArrow, onPress }: AuthPrimaryButtonProps) {
  return (
    <Pressable
      style={({ hovered, pressed }) => [
        styles.primaryButton,
        { backgroundColor: BrandColors.primary, borderRadius: 24, height: 50 },
        hovered && !disabled && styles.primaryButtonHover,
        pressed && !disabled && { opacity: 0.85 },
        disabled && styles.primaryButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Text style={[styles.primaryButtonText, { fontSize: 16, fontWeight: "700" }]}>{label}</Text>
          {showArrow ? <Ionicons name="arrow-forward" size={19} color="#FFFFFF" /> : null}
        </View>
      )}
    </Pressable>
  );
}

export function InfoBox({ text }: { text: string }) {
  const { isDark, theme } = useAppTheme();
  return (
    <View style={[styles.infoBox, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
      <Ionicons name="information-circle" size={20} color={BrandColors.primary} style={{ marginTop: 1 }} />
      <Text style={[styles.infoBoxText, { color: isDark ? "#FED7AA" : "#7C2D12" }]}>{text}</Text>
    </View>
  );
}

export function ConfettiSuccess({ title, subtitle }: { title: string; subtitle: string }) {
  const { isDark } = useAppTheme();
  return (
    <View style={{ alignItems: "center", marginVertical: 24, gap: 14 }}>
      <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="checkmark" size={40} color="#FFFFFF" />
        </View>
      </View>
      <Text style={{ fontSize: 24, fontWeight: "800", color: isDark ? "#FFFFFF" : "#0F172A", textAlign: "center", marginTop: 8 }}>{title}</Text>
      <Text style={{ fontSize: 14, fontWeight: "500", color: "#64748B", textAlign: "center", maxWidth: 320, lineHeight: 20 }}>{subtitle}</Text>
    </View>
  );
}

export function AuthDivider({ label = "OR" }: { label?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: theme.line }]} />
      <Text style={[styles.dividerLabel, { color: theme.muted }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: theme.line }]} />
    </View>
  );
}

export function SocialAuthButton({ provider, onPress, loading, disabled, unavailable }: SocialAuthButtonProps) {
  const isApple = provider === "apple";
  const { isDark, theme } = useAppTheme();

  return (
    <Pressable
      style={({ hovered, pressed }) => [
        styles.socialButton,
        {
          backgroundColor: isDark ? "#1C202A" : "#FFFFFF",
          borderColor: isDark ? "#303646" : "#DFDED7",
          borderWidth: 1,
        },
        hovered && !disabled && !loading && { backgroundColor: isDark ? "#242A36" : "#F7F6F2" },
        pressed && !disabled && !loading && { opacity: 0.9 },
        (disabled || loading || unavailable) && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={isApple ? "Continue with Apple" : "Continue with Google"}
      accessibilityState={{ disabled: !!disabled || !!loading || !!unavailable }}
    >
      {loading ? (
        <ActivityIndicator color={theme.ink} />
      ) : (
        <View style={styles.socialButtonContent}>
          <Image
            source={isApple ? (isDark ? authLogos.appleWhite : authLogos.appleBlack) : authLogos.google}
            style={{ width: 20, height: 20, marginRight: 8 }}
            contentFit="contain"
            transition={0}
            accessibilityLabel={isApple ? "Apple logo" : "Google logo"}
          />
          <Text style={[styles.socialButtonText, { color: theme.ink }]}>
            {isApple ? "Continue with Apple" : "Continue with Google"}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
