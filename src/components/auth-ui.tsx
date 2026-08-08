import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { ReactNode, useState } from "react";
import {
    ActivityIndicator,
    Image,
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

const authBrand = {
  orange: "#EA580C",
  orangeDark: "#C2410C",
  orangeSoft: "#FFF7ED",
  ink: "#0F172A",
  text: "#334155",
  muted: "#64748B",
  line: "#E2E8F0",
  wash: "#F8FAFC",
  white: "#FFFFFF",
};

type AuthLayoutProps = {
  children: ReactNode;
};

type AuthHeaderProps = {
  title: string;
  subtitle: string;
  onLogoPress: () => void;
};

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

export function AuthLayout({ children }: AuthLayoutProps) {
  const { isDark, theme } = useAppTheme();

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: isDark ? "#0F172A" : "#FAF8F5" }]}
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
          {
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
          },
        ]}
      >
        {children}
      </Animated.View>
    </ScrollView>
  );
}

function BrandPanel({ compact }: { compact: boolean }) {
  const { isDark, theme } = useAppTheme();
  return (
    <View style={[styles.brandPanel, { backgroundColor: isDark ? "#121419" : authBrand.wash, borderColor: theme.line }, compact && styles.brandPanelCompact]}>
      <View style={styles.brandTop}>
        <BrandLogo size="large" disableNavigation />
        <View style={[styles.badge, { backgroundColor: isDark ? "#261D10" : theme.orangeSoft, borderColor: theme.line }]}>
          <Ionicons name="globe-outline" size={16} color={theme.orangeDark} />
          <Text style={[styles.badgeText, { color: theme.orangeDark }]}>Made for businesses worldwide</Text>
        </View>
      </View>

      <View style={styles.brandCopy}>
        <Text style={[styles.brandTitle, { color: theme.ink }, compact && styles.brandTitleCompact]}>
          Professional business documents,{"\n"}
          <Text style={{ color: theme.orange }}>made simple.</Text>
        </Text>
        <Text style={[styles.brandText, { color: theme.muted }]}>
          Create and manage professional business documents, organize multiple companies, automate numbering, and keep your work securely backed up in one BrandDocs workspace.
        </Text>
      </View>

      <View style={styles.featureList}>
        {["Tax Invoices", "Quotations", "Multi Company", "Auto Numbering", "Cloud & Email Backup"].map((item) => (
          <View
            key={item}
            style={[
              styles.featureItem,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#FFFFFF",
                borderColor: isDark ? "rgba(255,255,255,0.14)" : authBrand.line,
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={18} color={theme.orangeDark} />
            <Text style={[styles.featureItemText, { color: theme.ink }]}>{item}</Text>
          </View>
        ))}
      </View>

      <DashboardPreview compact={compact} />
    </View>
  );
}

function DashboardPreview({ compact }: { compact: boolean }) {
  const { isDark, theme } = useAppTheme();

  return (
    <View style={[styles.previewStage, compact && styles.previewStageCompact]} accessibilityLabel="BrandDocs dashboard preview">
      <View style={[styles.laptopPreview, { backgroundColor: isDark ? "#1A1D24" : "#FFFFFF", borderColor: theme.line }, compact && styles.laptopPreviewCompact]}>
        <View style={[styles.previewTopBar, { borderBottomColor: theme.line }]}>
          <View style={styles.previewDot} />
          <View style={styles.previewDot} />
          <View style={styles.previewDot} />
        </View>
        <View style={styles.previewBody}>
          <View style={[styles.previewSidebar, { backgroundColor: isDark ? "#14161B" : "#F7F6F2", borderRightColor: theme.line }]}>
            <View style={[styles.previewSideLineWide, { backgroundColor: isDark ? "#2E3340" : "#DDDAD1" }]} />
            <View style={[styles.previewSideLine, { backgroundColor: isDark ? "#282B36" : "#E5E2DA" }]} />
            <View style={[styles.previewSideLine, { backgroundColor: isDark ? "#282B36" : "#E5E2DA" }]} />
          </View>
          <View style={styles.previewWorkspace}>
            <Text style={[styles.previewTitle, { color: theme.ink }]}>Dashboard</Text>
            <View style={styles.previewCards}>
              {["Tax Invoice", "Quotation", "Receipt"].map((item) => (
                <View key={item} style={[styles.previewCard, { backgroundColor: isDark ? "#222630" : "#FFFFFF", borderColor: theme.line }]}>
                  <View style={[styles.previewIcon, { backgroundColor: theme.orangeSoft, borderColor: theme.line }]} />
                  <Text style={[styles.previewCardText, { color: theme.ink }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
      {!compact ? (
        <>
          <View style={[styles.tabletPreview, { backgroundColor: isDark ? "#1A1D24" : "#FFFFFF", borderColor: theme.line }]}>
            <View style={[styles.tabletLineWide, { backgroundColor: isDark ? "#2E3340" : "#DDDAD1" }]} />
            <View style={[styles.tabletLine, { backgroundColor: isDark ? "#282B36" : "#E5E2DA" }]} />
            <View style={[styles.tabletLineShort, { backgroundColor: isDark ? "#282B36" : "#E5E2DA" }]} />
          </View>
          <View style={[styles.phonePreview, { backgroundColor: isDark ? "#1A1D24" : "#FFFFFF", borderColor: theme.line }]}>
            <View style={styles.phonePill} />
            <View style={[styles.phoneLineWide, { backgroundColor: isDark ? "#2E3340" : "#DDDAD1" }]} />
            <View style={[styles.phoneLine, { backgroundColor: isDark ? "#282B36" : "#E5E2DA" }]} />
          </View>
        </>
      ) : null}
    </View>
  );
}

export function AuthHeader({ title, subtitle, onLogoPress }: AuthHeaderProps) {
  const { isDark, theme } = useAppTheme();
  return (
    <View style={styles.header}>
      <Pressable onPress={onLogoPress} accessibilityRole="link" accessibilityLabel="BrandDocs home">
        <BrandLogo size="medium" disableNavigation />
      </Pressable>
      <View style={styles.titleGroup}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.ink }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text>
      </View>
    </View>
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
  const { theme, isDark } = useAppTheme();

  return (
    <View style={[
      styles.inputFrame,
      { backgroundColor: isDark ? "#1E293B" : "#FAFAFA", borderColor: isDark ? "rgba(255,255,255,0.12)" : "#E2E8F0" },
      focused && { borderColor: "#EA580C", backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
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
      <View style={[styles.checkboxBox, { borderColor: theme.line }, checked && { backgroundColor: "#EA580C", borderColor: "#EA580C" }]}>
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
        { backgroundColor: "#EA580C", borderRadius: 24, height: 50 },
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
  const { isDark } = useAppTheme();
  return (
    <View style={[styles.infoBox, { backgroundColor: isDark ? "rgba(234, 88, 12, 0.12)" : "#FFF7ED", borderColor: isDark ? "rgba(234, 88, 12, 0.25)" : "#FED7AA" }]}>
      <Ionicons name="information-circle" size={20} color="#EA580C" style={{ marginTop: 1 }} />
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
      accessibilityLabel={`Continue with ${isApple ? "Apple" : "Google"}`}
      accessibilityState={{ disabled: !!disabled || !!loading || !!unavailable }}
    >
      {loading ? (
        <ActivityIndicator color={theme.ink} />
      ) : (
        <View style={styles.socialButtonContent}>
          <Ionicons
            name={isApple ? "logo-apple" : "logo-google"}
            size={20}
            color={isApple ? (isDark ? "#FFFFFF" : "#000000") : (isDark ? "#FFAA2A" : "#EA4335")}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.socialButtonText, { color: theme.ink }]}>Continue with {isApple ? "Apple" : "Google"}</Text>
        </View>
      )}
    </Pressable>
  );
}

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
    borderColor: authBrand.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  featureItemText: {
    color: authBrand.text,
    fontSize: 14,
    fontWeight: "850" as never,
  },
  previewStage: {
    marginTop: 34,
    minHeight: 260,
  },
  previewStageCompact: {
    minHeight: 200,
  },
  laptopPreview: {
    backgroundColor: authBrand.white,
    borderColor: authBrand.line,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 260,
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0px 18px 32px rgba(25, 26, 23, 0.08)",
      },
      default: {
        shadowColor: authBrand.ink,
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
      },
    }),
  },
  laptopPreviewCompact: {
    minHeight: 200,
  },
  previewTopBar: {
    alignItems: "center",
    borderBottomColor: authBrand.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 7,
    height: 42,
    paddingHorizontal: 15,
  },
  previewDot: {
    backgroundColor: "#E3DFD4",
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  previewBody: {
    flex: 1,
    flexDirection: "row",
  },
  previewSidebar: {
    backgroundColor: "#F5F2EC",
    borderRightColor: authBrand.line,
    borderRightWidth: 1,
    gap: 11,
    padding: 14,
    width: 102,
  },
  previewSideLineWide: {
    backgroundColor: "#DDD8CC",
    borderRadius: 999,
    height: 9,
    width: 64,
  },
  previewSideLine: {
    backgroundColor: "#E8E2D7",
    borderRadius: 999,
    height: 9,
    width: 48,
  },
  previewWorkspace: {
    flex: 1,
    padding: 16,
  },
  previewTitle: {
    color: authBrand.ink,
    fontSize: 18,
    fontWeight: "950" as never,
    marginBottom: 14,
  },
  previewCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  previewCard: {
    backgroundColor: authBrand.white,
    borderColor: authBrand.line,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 82,
    padding: 11,
    width: 118,
  },
  previewIcon: {
    backgroundColor: authBrand.orangeSoft,
    borderColor: "#F0D7AA",
    borderRadius: 9,
    borderWidth: 1,
    height: 28,
    marginBottom: 10,
    width: 28,
  },
  previewCardText: {
    color: authBrand.text,
    fontSize: 12,
    fontWeight: "850" as never,
    lineHeight: 16,
  },
  tabletPreview: {
    backgroundColor: authBrand.white,
    borderColor: "#D9D4C8",
    borderRadius: 22,
    borderWidth: 6,
    bottom: -14,
    height: 152,
    left: 24,
    padding: 18,
    position: "absolute",
    width: 210,
  },
  tabletLineWide: {
    backgroundColor: authBrand.orangeSoft,
    borderRadius: 999,
    height: 12,
    width: 120,
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
    transform: [{ scale: 0.995 }],
  },
  primaryButtonDisabled: {
    opacity: 0.62,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: authBrand.white,
    fontSize: 16,
    fontWeight: "800",
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
