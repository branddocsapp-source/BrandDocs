import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  AppCard,
  AppShell,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui/branddocs";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BusinessProfile, getCompanyInitials, loadBusinessProfile } from "@/services/business-profile";
import { loadInvoices } from "@/services/invoices";
import { loadQuotations } from "@/services/quotations";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [quotationCount, setQuotationCount] = useState(0);
  const { isAppPreview, isWideDesktop } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();

  function appRoute(pathname: string, params?: Record<string, string>) {
    if (!isAppPreview) {
      return params ? { pathname, params } : pathname;
    }
    return { pathname, params: { ...params, appPreview: "1" } };
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      setLoading(true);
      const savedProfile = await loadBusinessProfile(auth.currentUser);
      const [invoices, quotations] = await Promise.all([
        loadInvoices(auth.currentUser, savedProfile, undefined, 200),
        loadQuotations(auth.currentUser, savedProfile, undefined, 200),
      ]);

      if (isMounted) {
        setProfile(savedProfile);
        setInvoiceCount(invoices.length);
        setQuotationCount(quotations.length);
        setLoading(false);
      }
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const companyName = profile?.name || "Your Business Profile";
  const legalName = profile?.legalName || companyName;
  const companyInitials = getCompanyInitials(profile?.name);

  const contactRows = [
    { label: "Contact Person", value: profile?.ownerName, icon: "person-outline" },
    { label: "Email Address", value: profile?.email, icon: "mail-outline" },
    { label: "Phone Number", value: profile?.phone, icon: "call-outline" },
    { label: "Website", value: profile?.website, icon: "globe-outline" },
    { label: "Business Type", value: profile?.businessType || "Standard Business", icon: "briefcase-outline" },
    {
      label: "Full Address",
      value: [profile?.address, profile?.city, profile?.stateProvince, profile?.zipCode, profile?.country]
        .filter(Boolean)
        .join(", "),
      icon: "location-outline",
    },
  ];

  const taxRows = [
    { label: "Tax Registration / GSTIN / VAT", value: profile?.taxRegistrationNumber, icon: "receipt-outline" },
    { label: "Country / Tax Region", value: profile?.country || profile?.countryCode, icon: "flag-outline" },
    { label: "Default Currency", value: profile?.defaultCurrency || profile?.currencyCode || "INR", icon: "cash-outline" },
  ];

  const bankDetails = profile?.countryMeta?.bankDetails || {};
  const bankRows = [
    { label: "Bank Name", value: bankDetails.bankName || "Not configured", icon: "business-outline" },
    { label: "Account Number", value: bankDetails.accountNumber || "Not configured", icon: "card-outline" },
    { label: "IFSC / IBAN / SWIFT", value: bankDetails.ifscCode || bankDetails.swiftCode || "Not configured", icon: "barcode-outline" },
  ];

  const assetItems = [
    {
      label: "Company Logo",
      url: profile?.branding?.logoUrl,
      icon: "image-outline",
      fallbackText: "Logo",
    },
    {
      label: "Official Stamp",
      url: profile?.branding?.stampUrl,
      icon: "ribbon-outline",
      fallbackText: "Stamp",
    },
    {
      label: "Digital Signature",
      url: profile?.branding?.signatureUrl,
      icon: "create-outline",
      fallbackText: "Signature",
    },
    {
      label: "Profile Photo",
      url: profile?.branding?.photoUrl,
      icon: "person-circle-outline",
      fallbackText: "Photo",
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Businesses"
        subtitle="Manage active business workspace, tax registration, and brand identity."
        action={
          <PrimaryButton
            label="Edit Business Setup"
            icon="create-outline"
            onPress={() => router.push(appRoute("/business-setup", { mode: "edit" }) as never)}
          />
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={[styles.loadingText, { color: theme.muted }]}>Loading business details...</Text>
        </View>
      ) : (
        <View style={styles.contentGrid}>
          {/* Main Hero Card */}
          <AppCard style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={[styles.avatarBox, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
                {profile?.branding?.logoUrl || profile?.branding?.photoUrl ? (
                  <Image source={{ uri: profile.branding.logoUrl || profile.branding.photoUrl || "" }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>{companyInitials}</Text>
                )}
              </View>

              <View style={styles.heroCopy}>
                <View style={styles.heroTitleRow}>
                  <Text style={[styles.companyTitle, { color: theme.ink }]}>{companyName}</Text>
                  <StatusBadge status="Active Business" />
                </View>
                {legalName !== companyName ? (
                  <Text style={[styles.legalSubtitle, { color: theme.muted }]}>Legal: {legalName}</Text>
                ) : null}
                <Text style={[styles.countryBadgeText, { color: theme.muted }]}>
                  📍 {profile?.city ? `${profile.city}, ` : ""}{profile?.country || "Default Region"} • Currency: {profile?.defaultCurrency || "INR"}
                </Text>
              </View>
            </View>

            {/* Business Activity Metrics */}
            <View style={[styles.metricsRow, { borderColor: theme.line, backgroundColor: isDark ? theme.background : BrandColors.surface }]}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.ink }]}>{invoiceCount}</Text>
                <Text style={[styles.metricLabel, { color: theme.muted }]}>Invoices Created</Text>
              </View>
              <View style={[styles.metricDivider, { backgroundColor: theme.line }]} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.ink }]}>{quotationCount}</Text>
                <Text style={[styles.metricLabel, { color: theme.muted }]}>Quotations Created</Text>
              </View>
              <View style={[styles.metricDivider, { backgroundColor: theme.line }]} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.ink }]}>{assetItems.filter((item) => !!item.url).length} / 3</Text>
                <Text style={[styles.metricLabel, { color: theme.muted }]}>Branding Assets</Text>
              </View>
            </View>
          </AppCard>

          <View style={[styles.twoColumnGrid, isWideDesktop && styles.twoColumnGridWide]}>
            {/* Left Column: Business Details & Tax */}
            <View style={styles.columnStack}>
              {/* Contact Information */}
              <AppCard>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="business-outline" size={20} color={BrandColors.primary} />
                  <Text style={[styles.cardHeaderTitle, { color: theme.ink }]}>Business Details</Text>
                </View>
                {contactRows.map((row, index) => (
                  <View
                    key={row.label}
                    style={[
                      styles.infoRow,
                      index < contactRows.length - 1 && [styles.rowBorder, { borderBottomColor: theme.line }],
                    ]}
                  >
                    <View style={styles.infoLeft}>
                      <Ionicons name={row.icon as never} size={17} color={theme.muted} />
                      <Text style={[styles.infoLabel, { color: theme.muted }]}>{row.label}</Text>
                    </View>
                    <Text style={[styles.infoValue, { color: theme.ink }]}>{row.value?.trim() || "Not provided"}</Text>
                  </View>
                ))}
              </AppCard>

              {/* Tax & Compliance */}
              <AppCard>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="receipt-outline" size={20} color={BrandColors.primary} />
                  <Text style={[styles.cardHeaderTitle, { color: theme.ink }]}>Tax & Registration</Text>
                </View>
                {taxRows.map((row, index) => (
                  <View
                    key={row.label}
                    style={[
                      styles.infoRow,
                      index < taxRows.length - 1 && [styles.rowBorder, { borderBottomColor: theme.line }],
                    ]}
                  >
                    <View style={styles.infoLeft}>
                      <Ionicons name={row.icon as never} size={17} color={theme.muted} />
                      <Text style={[styles.infoLabel, { color: theme.muted }]}>{row.label}</Text>
                    </View>
                    <Text style={[styles.infoValue, { color: theme.ink }]}>{row.value?.trim() || "Not configured"}</Text>
                  </View>
                ))}
              </AppCard>
            </View>

            {/* Right Column: Branding Assets & Bank Details */}
            <View style={styles.columnStack}>
              {/* Branding & Assets Status */}
              <AppCard>
                <View style={styles.cardHeaderRowBetween}>
                  <View style={styles.cardHeaderRow}>
                    <Ionicons name="image-outline" size={20} color={BrandColors.primary} />
                    <Text style={[styles.cardHeaderTitle, { color: theme.ink }]}>Branding Assets</Text>
                  </View>
                  <SecondaryButton
                    label="Manage"
                    icon="create-outline"
                    onPress={() => router.push(appRoute("/business-setup", { mode: "edit" }) as never)}
                  />
                </View>

                <View style={styles.assetGrid}>
                  {assetItems.map((asset) => (
                    <View key={asset.label} style={[styles.assetCard, { backgroundColor: isDark ? theme.background : BrandColors.surface, borderColor: theme.line }]}>
                      {asset.url ? (
                        <Image source={{ uri: asset.url }} style={styles.assetPreview} contentFit="contain" />
                      ) : (
                        <View style={[styles.assetPlaceholder, { backgroundColor: isDark ? theme.card : "#EAEAEA" }]}>
                          <Ionicons name={asset.icon as never} size={24} color={theme.muted} />
                        </View>
                      )}
                      <Text style={[styles.assetLabel, { color: theme.ink }]}>{asset.label}</Text>
                      <Text style={[styles.assetStatus, { color: asset.url ? BrandColors.success : theme.muted }]}>
                        {asset.url ? "Active" : "Not uploaded"}
                      </Text>
                    </View>
                  ))}
                </View>
              </AppCard>

              {/* Bank & Payment Information */}
              <AppCard>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="card-outline" size={20} color={BrandColors.primary} />
                  <Text style={[styles.cardHeaderTitle, { color: theme.ink }]}>Payout & Bank Details</Text>
                </View>
                {bankRows.map((row, index) => (
                  <View
                    key={row.label}
                    style={[
                      styles.infoRow,
                      index < bankRows.length - 1 && [styles.rowBorder, { borderBottomColor: theme.line }],
                    ]}
                  >
                    <View style={styles.infoLeft}>
                      <Ionicons name={row.icon as never} size={17} color={theme.muted} />
                      <Text style={[styles.infoLabel, { color: theme.muted }]}>{row.label}</Text>
                    </View>
                    <Text style={[styles.infoValue, { color: theme.ink }]}>{row.value?.trim() || "Not configured"}</Text>
                  </View>
                ))}
              </AppCard>

              {/* Workspace Action Box */}
              <AppCard style={styles.workspaceBox}>
                <View style={styles.workspaceContent}>
                  <View style={[styles.workspaceIcon, { backgroundColor: isDark ? theme.orangeSoft : BrandColors.primarySoft }]}>
                    <Ionicons name="add-circle-outline" size={24} color={BrandColors.primary} />
                  </View>
                  <View style={styles.workspaceCopy}>
                    <Text style={[styles.workspaceTitle, { color: theme.ink }]}>Multi-Business Workspace</Text>
                    <Text style={[styles.workspaceSubtitle, { color: theme.muted }]}>Register or update business profiles to issue invoices under multiple business entities.</Text>
                  </View>
                </View>
                <SecondaryButton
                  label="Update Profile Details"
                  icon="create-outline"
                  onPress={() => router.push(appRoute("/business-setup", { mode: "edit" }) as never)}
                  style={styles.workspaceButton}
                />
              </AppCard>
            </View>
          </View>
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 260,
  },
  loadingText: {
    ...BrandTypography.body,
    marginTop: BrandSpacing.md,
  },
  contentGrid: {
    gap: BrandSpacing.xl,
  },
  heroCard: {
    padding: BrandSpacing.xl,
  },
  heroHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.lg,
  },
  avatarBox: {
    alignItems: "center",
    borderRadius: BrandRadius.large,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  avatarText: {
    color: BrandColors.primaryDark,
    fontSize: 26,
    fontWeight: "900",
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
  },
  companyTitle: {
    ...BrandTypography.sectionHeading,
    fontSize: 22,
  },
  legalSubtitle: {
    ...BrandTypography.body,
    fontSize: 14,
  },
  countryBadgeText: {
    ...BrandTypography.caption,
    marginTop: 2,
  },
  metricsRow: {
    borderRadius: BrandRadius.medium,
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: BrandSpacing.xl,
    paddingVertical: BrandSpacing.md,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    ...BrandTypography.sectionHeading,
    fontSize: 20,
  },
  metricLabel: {
    ...BrandTypography.caption,
    marginTop: 2,
  },
  metricDivider: {
    height: "70%",
    width: 1,
  },
  twoColumnGrid: {
    gap: BrandSpacing.xl,
  },
  twoColumnGridWide: {
    flexDirection: "row",
  },
  columnStack: {
    flex: 1,
    gap: BrandSpacing.xl,
  },
  cardHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.sm,
    marginBottom: BrandSpacing.md,
  },
  cardHeaderRowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: BrandSpacing.md,
  },
  cardHeaderTitle: {
    ...BrandTypography.cardTitle,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: BrandSpacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
  },
  infoLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.sm,
  },
  infoLabel: {
    ...BrandTypography.caption,
  },
  infoValue: {
    ...BrandTypography.buttonLabel,
    flexShrink: 1,
    textAlign: "right",
  },
  assetGrid: {
    flexDirection: "row",
    gap: BrandSpacing.md,
  },
  assetCard: {
    alignItems: "center",
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    flex: 1,
    padding: BrandSpacing.md,
  },
  assetPreview: {
    borderRadius: BrandRadius.small,
    height: 48,
    width: "100%",
  },
  assetPlaceholder: {
    alignItems: "center",
    borderRadius: BrandRadius.small,
    height: 48,
    justifyContent: "center",
    width: "100%",
  },
  assetLabel: {
    ...BrandTypography.caption,
    marginTop: BrandSpacing.sm,
    textAlign: "center",
  },
  assetStatus: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  workspaceBox: {
    gap: BrandSpacing.md,
  },
  workspaceContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.md,
  },
  workspaceIcon: {
    alignItems: "center",
    borderRadius: BrandRadius.medium,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  workspaceCopy: {
    flex: 1,
  },
  workspaceTitle: {
    ...BrandTypography.cardTitle,
  },
  workspaceSubtitle: {
    ...BrandTypography.caption,
    marginTop: 2,
  },
  workspaceButton: {
    alignSelf: "flex-start",
  },
});
