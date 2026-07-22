import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { ReactNode, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
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
import { loadBusinessProfile, BusinessProfile, getCompanyInitials } from "@/services/business-profile";

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
          style={[styles.input, { color: theme.ink }, style]}
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
      <View style={[styles.documentIcon, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
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
      <View style={[styles.stateIcon, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
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
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderCopy}>
        <Text style={[styles.pageTitle, { color: theme.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.pageSubtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function AppLogo({ compact }: { compact?: boolean }) {
  return <BrandLogo size={compact ? "small" : "medium"} />;
}

const mainNavigation: { label: string; icon: IconName; route: string; aliases?: string[] }[] = [
  { label: "Dashboard", icon: "home-outline", route: "/dashboard" },
  { label: "Documents", icon: "folder-open-outline", route: "/documents", aliases: ["/invoice", "/quotation", "/table-quotation", "/letterhead", "/receipt", "/visiting-card", "/scan-receipt"] },
  { label: "Businesses", icon: "business-outline", route: "/profile", aliases: ["/business-setup", "/profile"] },
  { label: "Reports", icon: "bar-chart-outline", route: "/reports" },
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
                active && { backgroundColor: isDark ? theme.card : BrandColors.primarySoft },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={item.icon} size={19} color={active ? BrandColors.primary : theme.muted} />
              <Text style={[styles.sidebarText, { color: active ? BrandColors.primary : theme.text }]}>{item.label}</Text>
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
  const { theme } = useAppTheme();

  return (
    <View style={[styles.bottomNav, { backgroundColor: theme.card, borderColor: theme.line }]}>
      {mainNavigation.map((item) => {
        const active = isActiveRoute(pathname, item);
        return (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => router.push(appRoute(item.route) as never)}
            style={({ pressed }) => [styles.bottomNavItem, pressed && styles.pressed]}
          >
            <Ionicons name={active ? (item.icon.replace("-outline", "") as IconName) : item.icon} size={21} color={active ? BrandColors.primary : theme.muted} />
            <Text style={[styles.bottomNavLabel, { color: active ? BrandColors.primary : theme.muted }]} numberOfLines={1}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
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
  const { isDark, theme, toggleTheme } = useAppTheme();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

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

  const resolvedLogoUrl = profileLogoUrl !== undefined ? profileLogoUrl : (profile?.branding?.logoUrl || profile?.branding?.photoUrl);
  const resolvedInitials = profileInitials !== "BD" ? profileInitials : (profile ? getCompanyInitials(profile.name) : "BD");

  const content = (
    <View style={[styles.contentInner, !usesSidebar && styles.mobileContentInner, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }, isWebsite && { backgroundColor: theme.background }]}>
      <View style={[styles.shell, { backgroundColor: theme.background }]}>
        {usesSidebar ? <DesktopSidebar /> : null}
        <View style={[styles.workspace, { backgroundColor: theme.wash }]}>
          <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.line }, usesSidebar && { backgroundColor: theme.background, borderBottomWidth: 0 }]}>
            {!usesSidebar ? <AppLogo /> : <View />}
            <View style={styles.topActions}>
              {showSearch ? <IconButton icon="search-outline" accessibilityLabel="Search" /> : null}
              <IconButton
                icon={isDark ? "sunny-outline" : "moon-outline"}
                accessibilityLabel="Toggle Theme Mode"
                onPress={toggleTheme}
              />
              <IconButton icon="notifications-outline" accessibilityLabel="Notifications" />
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
          {profileMenu ? <View style={styles.profileMenuSlot}>{profileMenu}</View> : null}
          {scroll ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {content}
            </ScrollView>
          ) : content}
        </View>
        {!usesSidebar ? <MobileBottomNavigation /> : null}
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
  },
  topBar: {
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 68,
    paddingHorizontal: BrandSpacing.xl,
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
  profileMenuSlot: {
    alignItems: "flex-end",
    paddingHorizontal: BrandSpacing["3xl"],
    zIndex: 4,
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
    padding: BrandSpacing["2xl"],
    width: BrandLayout.sidebarWidth,
  },
  sidebarNav: {
    gap: BrandSpacing.xs,
    marginTop: BrandSpacing["3xl"],
  },
  sidebarItem: {
    alignItems: "center",
    borderRadius: BrandRadius.medium,
    flexDirection: "row",
    gap: BrandSpacing.md,
    minHeight: 46,
    paddingHorizontal: BrandSpacing.md,
  },
  sidebarItemActive: {
    backgroundColor: BrandColors.primarySoft,
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
    alignSelf: "center",
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    bottom: BrandSpacing.lg,
    flexDirection: "row",
    height: BrandLayout.bottomNavHeight,
    justifyContent: "space-around",
    maxWidth: BrandLayout.mobileContentWidth - BrandSpacing.xl,
    paddingHorizontal: BrandSpacing.xs,
    position: "absolute",
    width: "92%",
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
});
