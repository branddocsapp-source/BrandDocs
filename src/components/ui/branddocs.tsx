import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { ReactNode, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BrandLogo } from "@/components/brand-logo";
import { useAppTheme } from "@/theme/theme-context";
import {
  BrandColors,
  BrandLayout,
  BrandRadius,
  BrandShadows,
  BrandSpacing,
  BrandTypography,
} from "@/theme/tokens";
import { auth } from "@/firebase";
import { loadBusinessProfile, BusinessProfile, getCompanyInitials, getCachedBusinessProfile } from "@/services/business-profile";
import { CommandPalette } from "@/components/ui/command-palette";

type IconName = keyof typeof Ionicons.glyphMap;
type RouteValue = string | { pathname: string; params?: Record<string, string> };

type ButtonProps = {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

function buttonStateStyle(pressed: boolean, disabled?: boolean) {
  if (disabled) return styles.disabled;
  if (pressed) return styles.pressed;
  return null;
}

export function PrimaryButton({ label, onPress, icon, disabled, loading, accessibilityLabel, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.buttonBase, styles.primaryButton, buttonStateStyle(pressed, disabled || loading), style]}
    >
      {loading ? <ActivityIndicator color={BrandColors.background} /> : null}
      {!loading && icon ? <Ionicons name={icon} size={18} color={BrandColors.background} /> : null}
      {!loading ? <Text style={styles.primaryButtonText}>{label}</Text> : null}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, icon, disabled, loading, accessibilityLabel, style }: ButtonProps) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        styles.secondaryButton,
        { backgroundColor: theme.card, borderColor: theme.line },
        buttonStateStyle(pressed, disabled || loading),
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={theme.ink} /> : null}
      {!loading && icon ? <Ionicons name={icon} size={18} color={theme.ink} /> : null}
      {!loading ? <Text style={[styles.secondaryButtonText, { color: theme.ink }]}>{label}</Text> : null}
    </Pressable>
  );
}

export function TextButton({ label, onPress, icon, disabled, accessibilityLabel, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.textButton, buttonStateStyle(pressed, disabled), style]}
    >
      {icon ? <Ionicons name={icon} size={17} color={BrandColors.primary} /> : null}
      <Text style={styles.textButtonText}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  active,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.card, borderColor: theme.line }, active && styles.iconButtonActive, pressed && styles.pressed, style]}
    >
      <Ionicons name={icon} size={20} color={active ? BrandColors.primary : theme.ink} />
    </Pressable>
  );
}

type InputFieldProps = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: IconName;
  rightAccessory?: ReactNode;
};

export function InputField({ label, helperText, errorText, leftIcon, rightAccessory, style, ...props }: InputFieldProps) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.inputGroup}>
      {label ? <Text style={[styles.formLabel, { color: theme.ink }]}>{label}</Text> : null}
      <View style={[styles.inputShell, { backgroundColor: theme.card, borderColor: theme.line }, errorText && styles.inputShellError]}>
        {leftIcon ? <Ionicons name={leftIcon} size={18} color={theme.muted} /> : null}
        <TextInput
          placeholderTextColor={theme.muted}
          {...props}
          style={[styles.input, { color: theme.ink }, Platform.OS === "web" && ({ outlineStyle: "none" } as any), style]}
        />
        {rightAccessory}
      </View>
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : helperText ? <Text style={[styles.helperText, { color: theme.muted }]}>{helperText}</Text> : null}
    </View>
  );
}

export function PasswordField(props: InputFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <InputField
      {...props}
      secureTextEntry={!visible}
      rightAccessory={
        <IconButton
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          icon={visible ? "eye-off-outline" : "eye-outline"}
          onPress={() => setVisible((value) => !value)}
          style={styles.inlineIconButton}
        />
      }
    />
  );
}

export function SelectField({
  label,
  value,
  placeholder = "Select",
  onPress,
  errorText,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  onPress?: () => void;
  errorText?: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.inputGroup}>
      {label ? <Text style={[styles.formLabel, { color: theme.ink }]}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        onPress={onPress}
        style={({ pressed }) => [styles.inputShell, { backgroundColor: theme.card, borderColor: theme.line }, errorText && styles.inputShellError, pressed && styles.pressed]}
      >
        <Text style={[styles.selectText, { color: theme.ink }, !value && { color: theme.muted }]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={theme.muted} />
      </Pressable>
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </View>
  );
}

export function SearchField(props: TextInputProps) {
  return <InputField leftIcon="search-outline" accessibilityLabel="Search" placeholder="Search..." {...props} />;
}

export function AppCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useAppTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.line }, style]}>{children}</View>;
}

export function StatusBadge({ status }: { status: string }) {
  const { isDark, theme } = useAppTheme();
  const normalized = status.toLowerCase();
  const tone =
    normalized.includes("paid") || normalized.includes("accepted")
      ? [styles.badgeSuccess, isDark && { backgroundColor: "rgba(36, 161, 72, 0.18)" }]
      : normalized.includes("pending") || normalized.includes("sent")
        ? [styles.badgeWarning, isDark && { backgroundColor: "rgba(245, 158, 11, 0.18)" }]
        : normalized.includes("reject") || normalized.includes("error")
          ? [styles.badgeError, isDark && { backgroundColor: "rgba(217, 45, 32, 0.18)" }]
          : [styles.badgeInfo, isDark && { backgroundColor: "rgba(37, 99, 235, 0.18)" }];

  return (
    <View style={[styles.badge, tone]}>
      <Text style={[styles.badgeText, { color: isDark ? theme.ink : BrandColors.text }]}>{status}</Text>
    </View>
  );
}

export function DocumentCard({
  title,
  subtitle,
  meta,
  amount,
  status,
  icon = "document-text-outline",
  onOpen,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  amount?: string;
  status?: string;
  icon?: IconName;
  onOpen?: () => void;
}) {
  const { isDark, theme } = useAppTheme();
  return (
    <AppCard style={styles.documentCard}>
      <View style={[styles.documentIcon, { backgroundColor: theme.orangeSoft }]}>
        <Ionicons name={icon} size={20} color={BrandColors.primary} />
      </View>
      <View style={styles.documentCopy}>
        <Text style={[styles.documentTitle, { color: theme.ink }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.documentSubtitle, { color: theme.muted }]} numberOfLines={1}>{subtitle}</Text>
        {meta ? <Text style={[styles.documentMeta, { color: theme.muted }]}>{meta}</Text> : null}
      </View>
      <View style={styles.documentAside}>
        {amount ? <Text style={[styles.documentAmount, { color: theme.ink }]}>{amount}</Text> : null}
        {status ? <StatusBadge status={status} /> : null}
      </View>
      {onOpen ? <IconButton icon="chevron-forward" accessibilityLabel={`Open ${title}`} onPress={onOpen} style={styles.documentOpenButton} /> : null}
    </AppCard>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  const { isDark, theme } = useAppTheme();
  return (
    <View style={[styles.stateBox, { borderColor: theme.line }]}>
      <View style={[styles.stateIcon, { backgroundColor: theme.orangeSoft }]}>
        <Ionicons name="file-tray-outline" size={24} color={BrandColors.primary} />
      </View>
      <Text style={[styles.stateTitle, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.stateMessage, { color: theme.muted }]}>{message}</Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.stateBox, { borderColor: theme.line }]}>
      <ActivityIndicator color={BrandColors.primary} />
      <Text style={[styles.stateMessage, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}

export function ErrorState({ title = "Something went wrong", message }: { title?: string; message: string }) {
  const { isDark, theme } = useAppTheme();
  return (
    <View style={[styles.stateBox, { borderColor: theme.line }]}>
      <View style={[styles.stateIcon, styles.stateIconError, isDark && { backgroundColor: "rgba(217, 45, 32, 0.18)" }]}>
        <Ionicons name="alert-circle-outline" size={24} color={BrandColors.error} />
      </View>
      <Text style={[styles.stateTitle, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.stateMessage, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  loading,
  children,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <AppCard style={styles.confirmationModal}>
          <Text style={[styles.modalTitle, destructive && styles.modalTitleDanger]}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          {children}
          <View style={styles.modalActions}>
            <SecondaryButton label={cancelLabel} onPress={onCancel} disabled={loading} />
            <PrimaryButton
              label={confirmLabel}
              onPress={onConfirm}
              loading={loading}
              style={destructive && styles.destructiveButton}
            />
          </View>
        </AppCard>
      </View>
    </Modal>
  );
}

export function BottomSheet({ visible, children, onClose }: { visible: boolean; children: ReactNode; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  showBack,
  onBackPress,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  showBack?: boolean;
  onBackPress?: () => void;
}) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const handleBack = onBackPress || (() => router.back());

  return (
    <View style={styles.pageHeader}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
        {(showBack || onBackPress || router.canGoBack()) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            style={({ pressed }) => [
              styles.pageHeaderBackBtn,
              { backgroundColor: theme.card, borderColor: theme.line },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="chevron-back" size={19} color={theme.ink} />
          </Pressable>
        ) : null}
        <View style={styles.pageHeaderCopy}>
          <Text style={[styles.pageTitle, { color: theme.ink }]}>{title}</Text>
          {subtitle ? <Text style={[styles.pageSubtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {action}
    </View>
  );
}

export function AppLogo() {
  return (
    <View style={styles.sidebarLogoWrap}>
      <BrandLogo size="medium" align="left" disableNavigation />
    </View>
  );
}

export function MobileHeaderLogo() {
  return <BrandLogo size="small" align="left" disableNavigation />;
}

export function TipCard({ text }: { text: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.tipCard, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
      <Ionicons name="bulb-outline" size={22} color={BrandColors.primary} style={{ marginTop: 1 }} />
      <Text style={[styles.tipText, { color: theme.text }]}>
        <Text style={{ fontWeight: "700", color: theme.ink }}>Tip: </Text>
        {text}
      </Text>
    </View>
  );
}

const mainNavigation: { label: string; icon: IconName; route: string; aliases?: string[] }[] = [
  { label: "Dashboard", icon: "grid-outline", route: "/dashboard" },
  { label: "Documents", icon: "document-text-outline", route: "/documents", aliases: ["/invoice", "/quotation", "/table-quotation", "/letterhead", "/receipt", "/visiting-card", "/scan-receipt"] },
  { label: "Reports", icon: "copy-outline", route: "/reports" },
  { label: "Settings", icon: "settings-outline", route: "/settings" },
];

function usePreviewRoute() {
  const params = useLocalSearchParams<{ appPreview?: string }>();
  const { isAppPreview } = useResponsiveLayout();

  return function appRoute(pathname: string): RouteValue {
    if (!isAppPreview && params.appPreview !== "1") return pathname;
    return { pathname, params: { appPreview: "1" } };
  };
}

function isActiveRoute(pathname: string, item: { route: string; aliases?: string[] }) {
  if (pathname === item.route) return true;
  return Boolean(item.aliases?.some((alias) => pathname === alias));
}

export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const appRoute = usePreviewRoute();
  const { isDark, theme } = useAppTheme();

  return (
    <View style={[styles.sidebar, { backgroundColor: theme.background, borderRightColor: theme.line }]}>
      <AppLogo />
      <View style={styles.sidebarNav}>
        {mainNavigation.map((item) => {
          const active = isActiveRoute(pathname, item);
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => router.push(appRoute(item.route) as never)}
              style={({ pressed }) => [
                styles.sidebarItem,
                active && styles.sidebarItemActive,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={item.icon} size={19} color={active ? "#FFFFFF" : theme.muted} />
              <Text style={[styles.sidebarText, { color: active ? "#FFFFFF" : theme.text }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MobileBottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const appRoute = usePreviewRoute();
  const { theme, isDark } = useAppTheme();

  return (
    <View style={styles.floatingNavWrapper} pointerEvents="box-none">
      <View style={[styles.floatingBottomNav, { backgroundColor: theme.card, borderColor: theme.line }]}>
        {mainNavigation.map((item) => {
          const active = isActiveRoute(pathname, item);
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => router.push(appRoute(item.route) as never)}
              style={({ pressed }) => [
                styles.floatingNavItem,
                active && { backgroundColor: theme.orangeSoft },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={active ? (item.icon.replace("-outline", "") as IconName) : item.icon}
                size={22}
                color={active ? BrandColors.primary : theme.muted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function QuickAccessDrawer({
  visible,
  onClose,
  profile,
}: {
  visible: boolean;
  onClose: () => void;
  profile: BusinessProfile | null;
}) {
  const router = useRouter();
  const appRoute = usePreviewRoute();
  const { isDark, toggleTheme, theme, themeMode } = useAppTheme();

  if (!visible) return null;

  const handleNavigate = (route: string) => {
    onClose();
    router.push(appRoute(route) as never);
  };

  const featureItems: { id: string; title: string; subtitle: string; icon: IconName; route: string }[] = [
    { id: "invoice", title: "Tax Invoice", subtitle: "Itemized billing & GST/VAT tax compliance", icon: "receipt-outline", route: "/invoice" },
    { id: "quotation", title: "Quotation", subtitle: "Sales proposal & cost estimate", icon: "reader-outline", route: "/quotation" },
    { id: "visiting-card", title: "Visiting Card", subtitle: "Digital business card with vCard QR", icon: "id-card-outline", route: "/visiting-card" },
    { id: "letterhead", title: "Letterhead", subtitle: "Official executive company letterhead", icon: "newspaper-outline", route: "/letterhead" },
    { id: "receipt", title: "Payment Receipt", subtitle: "Instant payment & deposit proof", icon: "receipt-outline", route: "/receipt" },
    { id: "scanner", title: "OCR Bill Scanner", subtitle: "Scan paper receipts with camera", icon: "scan-circle-outline", route: "/scan-receipt" },
    { id: "documents", title: "All Documents Hub", subtitle: "Browse, filter & export stored files", icon: "folder-open-outline", route: "/documents" },
    { id: "reports", title: "Financial Reports", subtitle: "Tax summaries & business analytics", icon: "bar-chart-outline", route: "/reports" },
    { id: "business-setup", title: "Business Setup Profile", subtitle: "Edit logo, company name & tax IDs", icon: "briefcase-outline", route: "/business-setup" },
    { id: "settings", title: "App Settings", subtitle: "System preferences, currency & security", icon: "settings-outline", route: "/settings" },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.drawerOverlay}>
        <Animated.View entering={FadeIn.duration(200)} style={[styles.drawerContent, { backgroundColor: theme.card, borderColor: theme.line }]}>
          {/* Drawer Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: theme.line }]}>
            <View style={styles.drawerUserRow}>
              <View style={[styles.avatarButton, { width: 42, height: 42, borderRadius: 21 }]}>
                {profile?.branding?.logoUrl ? (
                  <Image source={{ uri: profile.branding.logoUrl }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Text style={[styles.avatarText, { fontSize: 13 }]}>{getCompanyInitials(profile?.name)}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.drawerTitle, { color: theme.ink }]} numberOfLines={1}>
                  {profile?.name || "BrandDocs Workspace"}
                </Text>
                <Text style={[styles.drawerSubtitle, { color: theme.muted }]} numberOfLines={1}>
                  {profile?.email || auth.currentUser?.email || "Quick Access Menu"}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={[styles.drawerCloseBtn, { backgroundColor: theme.line }]}>
              <Ionicons name="close" size={18} color={theme.ink} />
            </Pressable>
          </View>

          {/* Quick Access Action Items */}
          <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.drawerSectionLabel, { color: theme.muted }]}>QUICK ACCESS FEATURES</Text>
            {featureItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleNavigate(item.route)}
                style={({ pressed }) => [
                  styles.drawerRow,
                  { borderBottomColor: theme.line },
                  pressed && { backgroundColor: theme.orangeSoft },
                ]}
              >
                <View style={[styles.drawerIconWrapper, { backgroundColor: theme.orangeSoft }]}>
                  <Ionicons name={item.icon} size={18} color={BrandColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.drawerRowTitle, { color: theme.ink }]}>{item.title}</Text>
                  <Text style={[styles.drawerRowSubtitle, { color: theme.muted }]}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={theme.muted} />
              </Pressable>
            ))}

            {/* Preferences */}
            <Text style={[styles.drawerSectionLabel, { color: theme.muted, marginTop: 16 }]}>PREFERENCES & ACCOUNT</Text>
            <Pressable
              onPress={() => toggleTheme()}
              style={({ pressed }) => [styles.drawerRow, { borderBottomColor: theme.line }, pressed && { backgroundColor: theme.orangeSoft }]}
            >
              <View style={[styles.drawerIconWrapper, { backgroundColor: theme.orangeSoft }]}>
                <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={BrandColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.drawerRowTitle, { color: theme.ink }]}>
                  {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                </Text>
                <Text style={[styles.drawerRowSubtitle, { color: theme.muted }]}>
                  {themeMode === "system"
                    ? `Following device · ${isDark ? "Dark" : "Light"}`
                    : `Currently using ${isDark ? "Dark" : "Light"} theme`}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => handleNavigate("/profile")}
              style={({ pressed }) => [styles.drawerRow, { borderBottomColor: theme.line }, pressed && { backgroundColor: theme.orangeSoft }]}
            >
              <View style={[styles.drawerIconWrapper, { backgroundColor: theme.orangeSoft }]}>
                <Ionicons name="person-outline" size={18} color={BrandColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.drawerRowTitle, { color: theme.ink }]}>My Profile & Account</Text>
                <Text style={[styles.drawerRowSubtitle, { color: theme.muted }]}>Manage user credentials and subscription</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={theme.muted} />
            </Pressable>
          </ScrollView>
        </Animated.View>
        <Pressable style={styles.drawerBackdrop} onPress={onClose} accessibilityLabel="Close quick access menu" />
      </View>
    </Modal>
  );
}

export function AppShell({
  children,
  profileInitials = "BD",
  profileLogoUrl,
  onProfilePress,
  profileMenu,
  showSearch,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  profileInitials?: string;
  profileLogoUrl?: string | null;
  onProfilePress?: () => void;
  profileMenu?: ReactNode;
  showSearch?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const appRoute = usePreviewRoute();
  const { isWebsite, usesSidebar } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();
  const [profile, setProfile] = useState<BusinessProfile | null>(() => getCachedBusinessProfile(auth.currentUser?.uid));
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      try {
        const p = await loadBusinessProfile(auth.currentUser);
        if (isMounted && p) {
          setProfile(p);
        }
      } catch (e) {
        console.warn("Failed to load profile for AppShell header", e);
      }
    }
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  const handleBackToControlPanel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(appRoute("/dashboard") as never);
    }
  };

  const resolvedLogoUrl = profileLogoUrl !== undefined ? profileLogoUrl : (profile?.branding?.logoUrl || profile?.branding?.photoUrl);
  const resolvedInitials = profileInitials !== "BD" ? profileInitials : (profile ? getCompanyInitials(profile.name) : "BD");

  const content = (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[
        styles.contentInner,
        !usesSidebar && styles.mobileContentInner,
        isWebsite && !usesSidebar && styles.webTabletContentInner,
        isWebsite && usesSidebar && styles.desktopContentInner,
        contentStyle,
      ]}
    >
      {children}
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }, isWebsite && { backgroundColor: theme.background }]}>
      <View style={[styles.shell, { backgroundColor: theme.background }]}>
        {usesSidebar ? <DesktopSidebar /> : null}
        <View style={[styles.workspace, { backgroundColor: theme.wash }]}>
          <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.line }, usesSidebar && styles.desktopTopBar, usesSidebar && { backgroundColor: theme.background, borderBottomWidth: 0 }, !usesSidebar && { paddingHorizontal: BrandSpacing.lg, height: 60 }]}>
            {!usesSidebar ? (
              <View style={styles.mobileTopBarRow}>
                {/* Left: Top Back Arrow (returns to Main Control Panel) + Hamburger Icon */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  {!isDashboard ? (
                    <Pressable
                      accessibilityLabel="Back to Main Control Panel"
                      onPress={handleBackToControlPanel}
                      style={({ pressed }) => [styles.mobileHeaderIconBtn, pressed && styles.pressed]}
                    >
                      <Ionicons name="chevron-back" size={24} color={theme.ink} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityLabel="Open Quick Access Menu"
                    onPress={() => setDrawerVisible(true)}
                    style={({ pressed }) => [styles.mobileHeaderIconBtn, pressed && styles.pressed]}
                  >
                    <Ionicons name="menu-outline" size={24} color={theme.ink} />
                  </Pressable>
                </View>

                {/* Center: Persistent Search Bar Input Pill */}
                <Pressable
                  accessibilityLabel="Open Search & Command Palette"
                  onPress={() => setCommandPaletteVisible(true)}
                  style={({ pressed }) => [
                    styles.searchPill,
                    styles.mobileSearchPill,
                    { backgroundColor: theme.searchSurface, borderColor: theme.line },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="search-outline" size={16} color={BrandColors.primary} />
                  <Text style={[styles.searchPillText, { color: theme.muted }]} numberOfLines={1}>
                    Type a command or jump to tool...
                  </Text>
                </Pressable>

                {/* Right: Profile Section Avatar Button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Profile"
                  onPress={onProfilePress || (() => router.push(appRoute("/profile") as never))}
                  style={({ pressed }) => [styles.avatarButton, styles.mobileAvatarButton, pressed && styles.pressed]}
                >
                  {resolvedLogoUrl ? (
                    <Image source={{ uri: resolvedLogoUrl }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <Text style={styles.avatarText}>{resolvedInitials}</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.desktopTopBarInner}>
                {!isDashboard ? (
                  <Pressable
                    accessibilityLabel="Back to Main Control Panel"
                    onPress={handleBackToControlPanel}
                    style={({ pressed }) => [styles.mobileHeaderIconBtn, { marginRight: 6 }, pressed && styles.pressed]}
                  >
                    <Ionicons name="chevron-back" size={22} color={theme.ink} />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel="Open Quick Access Menu"
                  onPress={() => setDrawerVisible(true)}
                  style={({ pressed }) => [styles.mobileHeaderIconBtn, { marginRight: 12 }, pressed && styles.pressed]}
                >
                  <Ionicons name="menu-outline" size={24} color={theme.ink} />
                </Pressable>
                <View style={styles.topBarSearchCenter}>
                  <Pressable
                    onPress={() => setCommandPaletteVisible(true)}
                    style={({ pressed }) => [
                      styles.searchPill,
                      styles.searchPillDesktop,
                      { backgroundColor: theme.searchSurface, borderColor: theme.line },
                      pressed && styles.pressed,
                    ]}
                    accessibilityLabel="Open Quick Search & Command Palette"
                  >
                    <Ionicons name="search-outline" size={16} color={BrandColors.primary} />
                    <Text style={[styles.searchPillText, { color: theme.muted }]}>Type a command or jump to tool...</Text>
                  </Pressable>
                </View>

                <View style={styles.topBarRightActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open profile menu"
                    onPress={onProfilePress || (() => router.push(appRoute("/profile") as never))}
                    style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
                  >
                    {resolvedLogoUrl ? (
                      <Image source={{ uri: resolvedLogoUrl }} style={styles.avatarImage} contentFit="cover" />
                    ) : (
                      <Text style={styles.avatarText}>{resolvedInitials}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
          {scroll ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {content}
            </ScrollView>
          ) : content}
          {!usesSidebar ? <MobileBottomNavigation /> : null}
          <CommandPalette visible={commandPaletteVisible} onClose={() => setCommandPaletteVisible(false)} />
          <QuickAccessDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} profile={profile} />
          {profileMenu ? (
            <>
              <Pressable
                accessibilityLabel="Close profile menu"
                onPress={onProfilePress}
                style={styles.profileMenuBackdrop}
              />
              <View
                pointerEvents="box-none"
                style={[
                  styles.profileMenuFloating,
                  {
                    paddingHorizontal: usesSidebar ? BrandSpacing["3xl"] : BrandSpacing.lg,
                    top: usesSidebar ? 76 : 60,
                  },
                ]}
              >
                {profileMenu}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  webSafeArea: {
    backgroundColor: BrandColors.surface,
  },
  shell: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: BrandColors.surface,
  },
  workspace: {
    flex: 1,
    backgroundColor: BrandColors.surface,
    position: "relative",
  },
  topBar: {
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 68,
    paddingHorizontal: BrandSpacing.xl,
    width: "100%",
  },
  desktopTopBarInner: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    minHeight: 68,
    position: "relative",
    width: "100%",
  },
  topBarSearchCenter: {
    alignItems: "center",
    justifyContent: "center",
    left: 0,
    pointerEvents: "box-none",
    position: "absolute",
    right: 0,
  },
  searchPillDesktop: {
    maxWidth: 420,
    minWidth: 240,
    width: "42%",
  },
  topBarRightActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.sm,
    marginLeft: "auto",
    zIndex: 2,
  },
  desktopTopBar: {
    backgroundColor: BrandColors.surface,
    borderBottomWidth: 0,
    minHeight: 76,
    paddingHorizontal: BrandSpacing["3xl"],
  },
  topActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.sm,
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    gap: 8,
  },
  searchPillText: {
    fontSize: 13,
    fontWeight: "500",
  },

  profileMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  profileMenuFloating: {
    alignItems: "flex-end",
    position: "absolute",
    right: 0,
    zIndex: 50,
  },
  scrollContent: {
    paddingBottom: BrandSpacing["5xl"],
  },
  contentInner: {
    alignSelf: "center",
    maxWidth: BrandLayout.maxContentWidth,
    paddingHorizontal: BrandSpacing["3xl"],
    width: "100%",
  },
  desktopContentInner: {
    maxWidth: BrandLayout.maxContentWidth,
    paddingHorizontal: BrandSpacing["4xl"],
  },
  webTabletContentInner: {
    maxWidth: BrandLayout.tabletContentWidth,
  },
  mobileContentInner: {
    maxWidth: BrandLayout.mobileContentWidth,
    paddingBottom: BrandLayout.bottomNavHeight + BrandSpacing["3xl"],
    paddingHorizontal: BrandSpacing.xl,
    paddingTop: BrandSpacing.xl,
  },
  sidebar: {
    backgroundColor: BrandColors.background,
    borderRightColor: BrandColors.border,
    borderRightWidth: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing["2xl"],
    paddingBottom: BrandSpacing["2xl"],
    width: BrandLayout.sidebarWidth,
  },
  sidebarLogoWrap: {
    alignItems: "flex-start",
    paddingHorizontal: BrandSpacing.xs,
    width: "100%",
  },
  sidebarNav: {
    gap: BrandSpacing.sm,
    marginTop: BrandSpacing["3xl"],
  },
  sidebarItem: {
    alignItems: "center",
    borderRadius: BrandRadius.medium,
    flexDirection: "row",
    gap: BrandSpacing.md,
    minHeight: 46,
    paddingHorizontal: BrandSpacing.lg,
  },
  sidebarItemActive: {
    backgroundColor: BrandColors.primary,
  },
  sidebarText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.textSecondary,
  },
  sidebarTextActive: {
    color: BrandColors.primary,
  },
  bottomNav: {
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    bottom: BrandSpacing.lg,
    flexDirection: "row",
    height: BrandLayout.bottomNavHeight,
    justifyContent: "space-around",
    left: 16,
    right: 16,
    paddingHorizontal: BrandSpacing.xs,
    position: "absolute",
    ...BrandShadows.raised,
  },
  bottomNavItem: {
    alignItems: "center",
    flex: 1,
    gap: BrandSpacing.xs,
    justifyContent: "center",
    minHeight: 54,
  },
  bottomNavLabel: {
    color: BrandColors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0,
  },
  bottomNavLabelActive: {
    color: BrandColors.primary,
  },
  logoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.sm,
  },
  logoIcon: {
    height: 32,
    width: 32,
  },
  logoText: {
    color: BrandColors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  avatarButton: {
    alignItems: "center",
    backgroundColor: BrandColors.primarySoft,
    borderColor: BrandColors.primarySubtle,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  avatarText: {
    color: BrandColors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  buttonBase: {
    alignItems: "center",
    borderRadius: BrandRadius.pill,
    flexDirection: "row",
    gap: BrandSpacing.sm,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: BrandSpacing.lg,
  },
  primaryButton: {
    backgroundColor: BrandColors.primary,
  },
  secondaryButton: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderWidth: 1,
  },
  textButton: {
    alignItems: "center",
    borderRadius: BrandRadius.pill,
    flexDirection: "row",
    gap: BrandSpacing.xs,
    minHeight: 40,
    paddingHorizontal: BrandSpacing.sm,
  },
  primaryButtonText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.background,
  },
  secondaryButtonText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.text,
  },
  textButtonText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.primary,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  iconButtonActive: {
    backgroundColor: BrandColors.primarySoft,
    borderColor: BrandColors.primarySubtle,
  },
  inlineIconButton: {
    borderWidth: 0,
    height: 34,
    width: 34,
  },
  disabled: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.72,
  },
  inputGroup: {
    gap: BrandSpacing.sm,
  },
  formLabel: {
    ...BrandTypography.formLabel,
    color: BrandColors.text,
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.sm,
    minHeight: 48,
    paddingHorizontal: BrandSpacing.md,
  },
  inputShellError: {
    borderColor: BrandColors.error,
  },
  input: {
    ...BrandTypography.body,
    color: BrandColors.text,
    flex: 1,
    minHeight: 46,
    padding: 0,
  },
  selectText: {
    ...BrandTypography.body,
    color: BrandColors.text,
    flex: 1,
  },
  placeholderText: {
    color: BrandColors.textMuted,
  },
  helperText: {
    ...BrandTypography.helperText,
    color: BrandColors.textSecondary,
  },
  errorText: {
    ...BrandTypography.helperText,
    color: BrandColors.error,
  },
  card: {
    backgroundColor: BrandColors.card,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    padding: BrandSpacing.lg,
    ...BrandShadows.subtle,
  },
  documentCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.md,
  },
  documentIcon: {
    alignItems: "center",
    backgroundColor: BrandColors.primarySoft,
    borderRadius: BrandRadius.medium,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  documentCopy: {
    flex: 1,
    minWidth: 0,
  },
  documentTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  documentSubtitle: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  documentMeta: {
    ...BrandTypography.helperText,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  documentAside: {
    alignItems: "flex-end",
    gap: BrandSpacing.xs,
  },
  documentAmount: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.text,
  },
  documentOpenButton: {
    height: 36,
    width: 36,
  },
  badge: {
    borderRadius: BrandRadius.pill,
    paddingHorizontal: BrandSpacing.sm,
    paddingVertical: BrandSpacing.xs,
  },
  badgeSuccess: {
    backgroundColor: BrandColors.successSoft,
  },
  badgeWarning: {
    backgroundColor: BrandColors.warningSoft,
  },
  badgeError: {
    backgroundColor: BrandColors.errorSoft,
  },
  badgeInfo: {
    backgroundColor: BrandColors.infoSoft,
  },
  badgeText: {
    ...BrandTypography.caption,
    color: BrandColors.text,
  },
  stateBox: {
    alignItems: "center",
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.large,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: BrandSpacing.sm,
    padding: BrandSpacing["2xl"],
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: BrandColors.primarySoft,
    borderRadius: BrandRadius.pill,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  stateIconError: {
    backgroundColor: BrandColors.errorSoft,
  },
  stateTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
    textAlign: "center",
  },
  stateMessage: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
    textAlign: "center",
  },
  stateAction: {
    marginTop: BrandSpacing.sm,
  },
  pageHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: BrandSpacing.lg,
    justifyContent: "space-between",
    marginBottom: BrandSpacing["2xl"],
  },
  pageHeaderBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeaderCopy: {
    flex: 1,
  },
  pageTitle: {
    ...BrandTypography.pageHeading,
    color: BrandColors.text,
  },
  pageSubtitle: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
    marginTop: BrandSpacing.xs,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.34)",
    flex: 1,
    justifyContent: "center",
    padding: BrandSpacing.xl,
  },
  confirmationModal: {
    maxWidth: 460,
    width: "100%",
  },
  modalTitle: {
    ...BrandTypography.sectionHeading,
    color: BrandColors.text,
    marginBottom: BrandSpacing.sm,
  },
  modalTitleDanger: {
    color: BrandColors.error,
  },
  modalMessage: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
    marginBottom: BrandSpacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: BrandSpacing.sm,
    justifyContent: "flex-end",
    marginTop: BrandSpacing.lg,
  },
  destructiveButton: {
    backgroundColor: BrandColors.error,
  },
  sheetOverlay: {
    backgroundColor: "rgba(17, 24, 39, 0.34)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: BrandColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: BrandSpacing.xl,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: BrandColors.borderStrong,
    borderRadius: BrandRadius.pill,
    height: 4,
    marginBottom: BrandSpacing.xl,
    width: 44,
  },
  floatingNavWrapper: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
    paddingHorizontal: 20,
  },
  floatingBottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 36,
    borderWidth: 1,
    maxWidth: 380,
    width: "100%",
    ...BrandShadows.raised,
  },
  floatingNavItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  mobileTopBarRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  mobileSearchPill: {
    flex: 1,
    height: 38,
    paddingHorizontal: 12,
  },
  mobileHeaderIconBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    borderRadius: 10,
  },
  mobileAvatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BrandColors.primary,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContent: {
    width: "82%",
    maxWidth: 340,
    height: "100%",
    borderRightWidth: 1,
    paddingTop: Platform.OS === "web" ? 20 : 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  drawerUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  drawerTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  drawerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerScroll: {
    flex: 1,
    marginTop: 14,
  },
  drawerSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  drawerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  drawerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerRowTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  drawerRowSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
});
