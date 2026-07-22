import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppCard, AppShell, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui/branddocs";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BusinessProfile, loadBusinessProfile, saveBusinessProfile } from "@/services/business-profile";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";

type CurrencyOption = { code: string; symbol: string; name: string };

const CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "United States Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound Sterling" },
  { code: "AED", symbol: "AED", name: "United Arab Emirates Dirham" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Modals state
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [taxModalVisible, setTaxModalVisible] = useState(false);

  // Form states
  const [selectedCurrency, setSelectedCurrency] = useState("INR");
  const [taxNumber, setTaxNumber] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const { isAppPreview } = useResponsiveLayout();
  const { isDark, theme, toggleTheme } = useAppTheme();

  function appRoute(pathname: string, params?: Record<string, string>) {
    if (!isAppPreview) return params ? { pathname, params } : pathname;
    return { pathname, params: { ...params, appPreview: "1" } };
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      setLoadingProfile(true);
      const savedProfile = await loadBusinessProfile(auth.currentUser);
      if (isMounted && savedProfile) {
        setProfile(savedProfile);
        setSelectedCurrency(savedProfile.defaultCurrency || savedProfile.currencyCode || "INR");
        setTaxNumber(savedProfile.taxRegistrationNumber || "");
      }
      setLoadingProfile(false);
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSaveCurrency(code: string) {
    if (!auth.currentUser || !profile) {
      setSelectedCurrency(code);
      setCurrencyModalVisible(false);
      return;
    }

    try {
      setSavingSettings(true);
      const updated: BusinessProfile = {
        ...profile,
        defaultCurrency: code,
        currencyCode: code,
      };
      const result = await saveBusinessProfile(auth.currentUser, updated);
      setProfile(result.profile);
      setSelectedCurrency(code);
      setSaveMessage(`Currency updated to ${code}`);
    } catch (err: any) {
      setSaveMessage(err?.message || "Failed to update currency.");
    } finally {
      setSavingSettings(false);
      setCurrencyModalVisible(false);
    }
  }

  async function handleSaveTaxInfo() {
    if (!auth.currentUser || !profile) {
      setTaxModalVisible(false);
      return;
    }

    try {
      setSavingSettings(true);
      const updated: BusinessProfile = {
        ...profile,
        taxRegistrationNumber: taxNumber.trim(),
      };
      const result = await saveBusinessProfile(auth.currentUser, updated);
      setProfile(result.profile);
      setSaveMessage("Tax Registration Number updated.");
    } catch (err: any) {
      setSaveMessage(err?.message || "Failed to update tax details.");
    } finally {
      setSavingSettings(false);
      setTaxModalVisible(false);
    }
  }

  const settingsItems = [
    {
      id: "theme",
      title: "Appearance & Theme",
      subtitle: isDark ? "Dark Mode is active (click to switch to Light Mode)" : "Light Mode is active (click to switch to Dark Mode)",
      icon: isDark ? "sunny-outline" : "moon-outline",
      action: () => toggleTheme(),
    },
    {
      id: "profile",
      title: "Business Profile & Details",
      subtitle: profile?.name ? `${profile.name} • ${profile.ownerName || "Edit details"}` : "View or edit business information",
      icon: "business-outline",
      action: () => router.push(appRoute("/profile") as never),
    },
    {
      id: "assets",
      title: "Logo, Stamp & Digital Signature",
      subtitle: "Upload or manage brand assets",
      icon: "image-outline",
      action: () => router.push(appRoute("/business-setup", { mode: "edit" }) as never),
    },
    {
      id: "currency",
      title: "Default Currency",
      subtitle: `Current document currency: ${selectedCurrency}`,
      icon: "cash-outline",
      action: () => setCurrencyModalVisible(true),
    },
    {
      id: "tax",
      title: "Tax Registration & Compliance",
      subtitle: taxNumber ? `GSTIN / Tax ID: ${taxNumber}` : "Configure tax registration number",
      icon: "receipt-outline",
      action: () => setTaxModalVisible(true),
    },
    {
      id: "consent",
      title: "Privacy & Consent Preferences",
      subtitle: "Withdraw optional choices & marketing preferences",
      icon: "shield-checkmark-outline",
      action: () => router.push(appRoute("/privacy-consent") as never),
    },
    {
      id: "privacy_sec",
      title: "Privacy Rights & Data Controls",
      subtitle: "Data export, account settings and privacy rights",
      icon: "lock-closed-outline",
      action: () => router.push(appRoute("/privacy-security") as never),
    },
    {
      id: "security",
      title: "Security & Passwords",
      subtitle: "Reset password and security controls",
      icon: "key-outline",
      action: () => router.push(appRoute("/security") as never),
    },
    {
      id: "export",
      title: "Data Export",
      subtitle: "Request an export copy of your data",
      icon: "download-outline",
      action: () => router.push(appRoute("/data-export") as never),
    },
    {
      id: "delete",
      title: "Delete Account",
      subtitle: "Permanent account deletion flow",
      icon: "warning-outline",
      action: () => router.push(appRoute("/delete-account") as never),
    },
    {
      id: "terms",
      title: "Terms of Service",
      subtitle: "Read application terms & conditions",
      icon: "document-text-outline",
      action: () => router.push(appRoute("/terms") as never),
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      subtitle: "Read privacy statement",
      icon: "reader-outline",
      action: () => router.push(appRoute("/privacy") as never),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Manage business document preferences, theme, currency, tax info, and privacy controls."
      />

      {saveMessage ? (
        <View style={[styles.toast, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={BrandColors.primary} />
          <Text style={[styles.toastText, { color: theme.ink }]}>{saveMessage}</Text>
        </View>
      ) : null}

      <AppCard style={styles.card}>
        {loadingProfile ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={BrandColors.primary} />
          </View>
        ) : (
          settingsItems.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={({ pressed }) => [
                styles.row,
                index < settingsItems.length - 1 && [styles.rowDivider, { borderBottomColor: theme.line }],
                pressed && styles.pressed,
              ]}
              onPress={item.action}
            >
              <View style={[styles.rowIcon, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
                <Ionicons name={item.icon as never} size={20} color={BrandColors.primary} />
              </View>

              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: theme.ink }]}>{item.title}</Text>
                <Text style={[styles.rowSubtitle, { color: theme.muted }]}>{item.subtitle}</Text>
              </View>

              <Ionicons
                name={item.id === "theme" ? (isDark ? "sunny" : "moon") : "chevron-forward"}
                size={18}
                color={BrandColors.primary}
              />
            </Pressable>
          ))
        )}
      </AppCard>

      {/* Currency Selector Modal */}
      <Modal transparent visible={currencyModalVisible} animationType="fade" onRequestClose={() => setCurrencyModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCurrencyModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.ink }]}>Select Default Currency</Text>
            <Text style={[styles.modalSubtitle, { color: theme.muted }]}>Choose the currency symbol used across new invoices and quotations.</Text>

            <ScrollView style={styles.currencyList}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => handleSaveCurrency(c.code)}
                  style={({ pressed }) => [
                    styles.currencyRow,
                    { borderBottomColor: theme.line },
                    selectedCurrency === c.code && { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.currencyLeft}>
                    <Text style={[styles.currencySymbol, { color: BrandColors.primary }]}>{c.symbol}</Text>
                    <View>
                      <Text style={[styles.currencyCode, { color: theme.ink }]}>{c.code}</Text>
                      <Text style={[styles.currencyName, { color: theme.muted }]}>{c.name}</Text>
                    </View>
                  </View>
                  {selectedCurrency === c.code ? <Ionicons name="checkmark" size={20} color={BrandColors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <SecondaryButton label="Cancel" onPress={() => setCurrencyModalVisible(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tax Registration Modal */}
      <Modal transparent visible={taxModalVisible} animationType="fade" onRequestClose={() => setTaxModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTaxModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.ink }]}>Tax Registration Details</Text>
            <Text style={[styles.modalSubtitle, { color: theme.muted }]}>Update your business GSTIN, VAT, or Tax Identification Number.</Text>

            <Text style={[styles.fieldLabel, { color: theme.ink }]}>Tax Registration / GSTIN / VAT Number</Text>
            <TextInput
              style={[styles.fieldInput, { color: theme.ink, borderColor: theme.line, backgroundColor: theme.card }]}
              value={taxNumber}
              onChangeText={setTaxNumber}
              placeholder="e.g. 22AAAAA0000A1Z5 / VAT123456"
              placeholderTextColor={theme.muted}
            />

            <View style={styles.modalActions}>
              <SecondaryButton label="Cancel" onPress={() => setTaxModalVisible(false)} disabled={savingSettings} />
              <PrimaryButton label="Save Tax Number" icon="checkmark" onPress={handleSaveTaxInfo} loading={savingSettings} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    maxWidth: 840,
    paddingHorizontal: BrandSpacing.md,
    width: "100%",
  },
  loadingBox: {
    padding: BrandSpacing.xl,
  },
  toast: {
    alignItems: "center",
    borderRadius: BrandRadius.medium,
    flexDirection: "row",
    gap: BrandSpacing.sm,
    marginBottom: BrandSpacing.md,
    maxWidth: 840,
    padding: BrandSpacing.md,
  },
  toastText: {
    ...BrandTypography.caption,
    fontWeight: "700",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.md,
    minHeight: 72,
    paddingVertical: BrandSpacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
  },
  rowIcon: {
    alignItems: "center",
    borderRadius: BrandRadius.medium,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    ...BrandTypography.cardTitle,
  },
  rowSubtitle: {
    ...BrandTypography.caption,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.76,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: BrandSpacing.xl,
  },
  modalCard: {
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    maxWidth: 500,
    padding: BrandSpacing.xl,
    width: "100%",
  },
  modalTitle: {
    ...BrandTypography.sectionHeading,
    fontSize: 20,
  },
  modalSubtitle: {
    ...BrandTypography.body,
    fontSize: 14,
    marginBottom: BrandSpacing.lg,
    marginTop: 4,
  },
  currencyList: {
    maxHeight: 280,
  },
  currencyRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderRadius: BrandRadius.medium,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: BrandSpacing.md,
  },
  currencyLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.md,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "800",
    width: 36,
  },
  currencyCode: {
    ...BrandTypography.cardTitle,
    fontSize: 15,
  },
  currencyName: {
    ...BrandTypography.caption,
    fontSize: 12,
  },
  fieldLabel: {
    ...BrandTypography.formLabel,
    marginBottom: BrandSpacing.xs,
  },
  fieldInput: {
    ...BrandTypography.body,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: BrandSpacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: BrandSpacing.sm,
    justifyContent: "flex-end",
    marginTop: BrandSpacing.xl,
  },
});
