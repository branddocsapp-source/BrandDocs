import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/brand-logo";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  BusinessProfile,
  BusinessProfileAssetInput,
  BusinessProfilePreviousAssets,
  loadBusinessProfile,
  saveBusinessProfile,
} from "@/services/business-profile";
import { getCountryOptions } from "@/services/country-rules";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors } from "@/theme/tokens";
import { pickLogoImage } from "@/utils/pick-logo-image";

const COUNTRY_OPTIONS = getCountryOptions();

export default function BusinessSetupScreen() {
  const { theme, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [existingProfileId, setExistingProfileId] = useState<string | undefined>();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessEmail, setBusinessEmail] = useState(auth.currentUser?.email ?? "");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessType, setBusinessType] = useState("Service");

  // Address Fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [countryCode, setCountryCode] = useState("US");
  const [currency, setCurrency] = useState("USD");

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoAsset, setLogoAsset] = useState<BusinessProfileAssetInput | null>(null);
  const [previousAssets, setPreviousAssets] = useState<BusinessProfilePreviousAssets>({});
  const [logoProcessing, setLogoProcessing] = useState(false);

  const { isAppPreview } = useResponsiveLayout();

  const appRoute = useCallback(
    (pathname: string) => {
      if (!isAppPreview) return pathname;
      return { pathname, params: { appPreview: "1" } };
    },
    [isAppPreview]
  );

  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      const profile = await loadBusinessProfile(auth.currentUser);
      if (!isMounted || !profile) return;

      setExistingProfileId(profile.id);
      setBusinessName(profile.name || "");
      setOwnerName(profile.ownerName || "");
      setBusinessEmail(profile.email || auth.currentUser?.email || "");
      setBusinessPhone(profile.phone || "");
      setBusinessType(profile.businessType || "Service");
      setAddressLine1(profile.address || "");
      setCity(profile.city || "");
      setStateProvince(profile.stateProvince || "");
      setZipCode(profile.zipCode || "");
      if (profile.country) setCountry(profile.country);
      if (profile.countryCode) setCountryCode(profile.countryCode);
      if (profile.defaultCurrency) setCurrency(profile.defaultCurrency);
      setLogoPreviewUrl(profile.branding?.logoUrl || null);
      setPreviousAssets({
        logo: {
          url: profile.branding?.logoUrl || null,
          storagePath: profile.branding?.logoStoragePath || null,
        },
      });
    }

    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleCountrySelect(option: (typeof COUNTRY_OPTIONS)[0]) {
    setCountry(option.country);
    setCountryCode(option.countryCode);
    setCurrency(option.currencyCode);
    setShowCountryPicker(false);
  }

  async function handlePickLogo() {
    if (logoProcessing) return;

    try {
      setLogoProcessing(true);
      const picked = await pickLogoImage();
      if (!picked) return;

      setLogoAsset(picked.asset);
      setLogoPreviewUrl(picked.asset.uri || null);

      if (picked.backgroundRemoved) {
        Alert.alert("Logo Ready", "Background removed automatically. Your logo will appear cleanly on all documents.");
      }
    } catch (error: any) {
      Alert.alert("Logo Upload Failed", error?.message || "We could not process the selected logo.");
    } finally {
      setLogoProcessing(false);
    }
  }

  function handleRemoveLogo() {
    setLogoAsset({ uri: null });
    setLogoPreviewUrl(null);
  }

  async function handleCompleteSetup() {
    if (loading) return;

    if (!businessName.trim() && step === 1) {
      Alert.alert("Required Field", "Please enter your business name.");
      return;
    }

    try {
      setLoading(true);
      const profileToSave: BusinessProfile = {
        id: existingProfileId,
        name: businessName.trim() || "My Company",
        legalName: businessName.trim() || "My Company",
        ownerName: ownerName.trim(),
        email: businessEmail.trim(),
        phone: businessPhone.trim(),
        businessType,
        country,
        countryCode,
        stateProvince: stateProvince.trim(),
        city: city.trim(),
        zipCode: zipCode.trim(),
        address: [addressLine1.trim(), addressLine2.trim()].filter(Boolean).join(", "),
        defaultCurrency: currency,
        currencyCode: currency,
      };

      if (auth.currentUser) {
        await saveBusinessProfile(
          auth.currentUser,
          {
            ...profileToSave,
            branding: {
              logoUrl: logoPreviewUrl,
            },
          },
          previousAssets,
          logoAsset ? { logo: logoAsset } : undefined
        );
      }
      setShowSuccess(true);
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "Unable to save profile to Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const filteredCountries = COUNTRY_OPTIONS.filter((c) =>
    c.country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  if (showSuccess) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.centerContainer}>
          <BrandLogo size="medium" disableNavigation />

          {/* Celebratory Checkmark Badge */}
          <View style={{ alignItems: "center", marginVertical: 24, gap: 16 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#DCFCE7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 34,
                  backgroundColor: "#16A34A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={42} color="#FFFFFF" />
              </View>
            </View>

            <Text style={[styles.successTitle, { color: theme.ink }]}>
              Company Profile{"\n"}Created Successfully!
            </Text>
            <Text style={[styles.successSubtitle, { color: theme.muted }]}>
              Your business information has been saved. You can edit it anytime from settings.
            </Text>
          </View>

          <Pressable
            onPress={() => router.replace(appRoute("/dashboard") as never)}
            style={({ pressed }) => [styles.orangeBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.orangeBtnText}>Go to Dashboard</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Top Step Header */}
      <View style={styles.wizardHeader}>
        <Pressable
          onPress={() => {
            if (step > 1) setStep((s) => (s - 1) as any);
            else router.back();
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={20} color={isDark ? "#FFFFFF" : "#0F172A"} />
          <Text style={[styles.headerBtnText, { color: theme.ink }]}>Back</Text>
        </Pressable>

        <Text style={[styles.stepIndicatorText, { color: theme.muted }]}>
          Step {step} of 3
        </Text>

        <Pressable
          onPress={() => router.replace(appRoute("/dashboard") as never)}
          style={styles.headerBtn}
        >
          <Text style={styles.skipBtnText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.wizardBody} keyboardShouldPersistTaps="handled">
        {/* Brand Logo Mark */}
        <View style={styles.logoCenter}>
          <BrandLogo size="medium" disableNavigation />
        </View>

        {/* STEP 1: Basic Information */}
        {step === 1 ? (
          <View style={styles.stepFormStack}>
            <View style={styles.titleCopyCenter}>
              <Text style={[styles.formTitle, { color: theme.ink }]}>
                Business Information
              </Text>
              <Text style={[styles.formSubtitle, { color: theme.muted }]}>
                Tell us about your business to get started.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                Business Name *
              </Text>
              <View style={[styles.inputPillShell, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}>
                <Ionicons name="business-outline" size={19} color="#64748B" style={{ marginLeft: 14 }} />
                <TextInput
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Enter business name"
                  placeholderTextColor={theme.muted}
                  style={[styles.pillTextInput, { color: theme.ink }]}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                Owner / Contact Name
              </Text>
              <View style={[styles.inputPillShell, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}>
                <Ionicons name="person-outline" size={19} color="#64748B" style={{ marginLeft: 14 }} />
                <TextInput
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Enter owner name"
                  placeholderTextColor={theme.muted}
                  style={[styles.pillTextInput, { color: theme.ink }]}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                Business Email
              </Text>
              <View style={[styles.inputPillShell, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}>
                <Ionicons name="mail-outline" size={19} color="#64748B" style={{ marginLeft: 14 }} />
                <TextInput
                  value={businessEmail}
                  onChangeText={setBusinessEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Enter business email"
                  placeholderTextColor={theme.muted}
                  style={[styles.pillTextInput, { color: theme.ink }]}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                Phone Number
              </Text>
              <View style={[styles.inputPillShell, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}>
                <Ionicons name="call-outline" size={19} color="#64748B" style={{ marginLeft: 14 }} />
                <TextInput
                  value={businessPhone}
                  onChangeText={setBusinessPhone}
                  keyboardType="phone-pad"
                  placeholder="Enter phone number"
                  placeholderTextColor={theme.muted}
                  style={[styles.pillTextInput, { color: theme.ink }]}
                />
              </View>
            </View>

            <Pressable
              onPress={() => {
                if (!businessName.trim()) {
                  Alert.alert("Required", "Please enter business name.");
                  return;
                }
                setStep(2);
              }}
              style={({ pressed }) => [styles.orangeBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.orangeBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}

        {/* STEP 2: Business Type */}
        {step === 2 ? (
          <View style={styles.stepFormStack}>
            <View style={styles.titleCopyCenter}>
              <Text style={[styles.formTitle, { color: theme.ink }]}>
                Business Category
              </Text>
              <Text style={[styles.formSubtitle, { color: theme.muted }]}>
                Choose the category that best describes your business.
              </Text>
            </View>

            <View style={styles.categoryGrid}>
              {["Service", "Retail", "Wholesale", "Healthcare", "Construction", "Education", "Other"].map((cat) => {
                const isSel = businessType === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setBusinessType(cat)}
                    style={[
                      styles.categoryOption,
                      { backgroundColor: theme.inputSurface, borderColor: theme.line },
                      isSel && { borderColor: BrandColors.primary, backgroundColor: theme.orangeSoft },
                    ]}
                  >
                    <Ionicons name={isSel ? "checkmark-circle" : "ellipse-outline"} size={20} color={isSel ? BrandColors.primary : "#94A3B8"} />
                    <Text style={[styles.categoryOptionText, { color: theme.ink }, isSel && { color: BrandColors.primary, fontWeight: "700" }]}>{cat}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setStep(3)}
              style={({ pressed }) => [styles.orangeBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.orangeBtnText}>Continue to Address</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}

        {/* STEP 3: Business Address (Matching Image 1 Mockup) */}
        {step === 3 ? (
          <View style={styles.stepFormStack}>
            <View style={styles.titleCopyCenter}>
              <Text style={[styles.formTitle, { color: theme.ink }]}>
                Business Address
              </Text>
              <Text style={[styles.formSubtitle, { color: theme.muted }]}>
                Add your business address to personalize your documents.
              </Text>
            </View>

            {/* Address Line 1 */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                Address Line 1 *
              </Text>
              <View style={[styles.inputPillShell, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}>
                <Ionicons name="business-outline" size={19} color="#64748B" style={{ marginLeft: 14 }} />
                <TextInput
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                  placeholder="Enter address line 1"
                  placeholderTextColor={theme.muted}
                  style={[styles.pillTextInput, { color: theme.ink }]}
                />
              </View>
            </View>

            {/* Address Line 2 */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                Address Line 2 (Optional)
              </Text>
              <View style={[styles.inputPillShell, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}>
                <Ionicons name="business-outline" size={19} color="#64748B" style={{ marginLeft: 14 }} />
                <TextInput
                  value={addressLine2}
                  onChangeText={setAddressLine2}
                  placeholder="Enter address line 2"
                  placeholderTextColor={theme.muted}
                  style={[styles.pillTextInput, { color: theme.ink }]}
                />
              </View>
            </View>

            {/* City, State, ZIP Row */}
            <View style={styles.tripleFieldRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                  City *
                </Text>
                <View style={[styles.inputPillShell, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}>
                  <Ionicons name="location-outline" size={17} color="#64748B" style={{ marginLeft: 10 }} />
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="Enter city"
                    placeholderTextColor={theme.muted}
                    style={[styles.pillTextInput, { color: theme.ink, fontSize: 13 }]}
                  />
                </View>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                  State *
                </Text>
                <View style={[styles.inputPillShell, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}>
                  <Ionicons name="map-outline" size={17} color="#64748B" style={{ marginLeft: 10 }} />
                  <TextInput
                    value={stateProvince}
                    onChangeText={setStateProvince}
                    placeholder="Enter state"
                    placeholderTextColor={theme.muted}
                    style={[styles.pillTextInput, { color: theme.ink, fontSize: 13 }]}
                  />
                </View>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                  ZIP Code *
                </Text>
                <View style={[styles.inputPillShell, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}>
                  <Ionicons name="mail-outline" size={17} color="#64748B" style={{ marginLeft: 10 }} />
                  <TextInput
                    value={zipCode}
                    onChangeText={setZipCode}
                    placeholder="Enter ZIP code"
                    placeholderTextColor={theme.muted}
                    style={[styles.pillTextInput, { color: theme.ink, fontSize: 13 }]}
                  />
                </View>
              </View>
            </View>

            {/* Country Picker Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                Country *
              </Text>
              <Pressable
                onPress={() => setShowCountryPicker(true)}
                style={[styles.inputPillShell, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}
              >
                <Ionicons name="globe-outline" size={19} color="#64748B" style={{ marginLeft: 14 }} />
                <Text style={[styles.countrySelectText, { color: country ? theme.ink : theme.muted }]}>
                  {country || "Select country"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748B" style={{ marginRight: 14 }} />
              </Pressable>
            </View>

            {/* Company Logo Upload */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.ink }]}>
                Company Logo (Optional)
              </Text>
              <Text style={[styles.logoHint, { color: theme.muted }]}>
                Upload your logo and we will automatically remove the white background for invoices, quotations, receipts, and visiting cards.
              </Text>

              <View style={[styles.logoUploadCard, { backgroundColor: theme.inputSurface, borderColor: theme.line }]}>
                <View style={[styles.logoPreviewBox, { backgroundColor: theme.background, borderColor: theme.line }]}>
                  {logoPreviewUrl ? (
                    <Image source={{ uri: logoPreviewUrl }} style={styles.logoPreviewImage} contentFit="contain" />
                  ) : (
                    <Ionicons name="image-outline" size={28} color="#94A3B8" />
                  )}
                </View>

                <View style={styles.logoUploadActions}>
                  <Pressable
                    onPress={handlePickLogo}
                    disabled={logoProcessing}
                    style={({ pressed }) => [styles.logoActionBtn, { borderColor: BrandColors.primary, backgroundColor: theme.accentSurface }, pressed && { opacity: 0.85 }]}
                  >
                    {logoProcessing ? (
                      <ActivityIndicator size="small" color={BrandColors.primary} />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={16} color={BrandColors.primary} />
                        <Text style={styles.logoActionTextPrimary}>{logoPreviewUrl ? "Replace Logo" : "Upload Logo"}</Text>
                      </>
                    )}
                  </Pressable>

                  {logoPreviewUrl ? (
                    <Pressable onPress={handleRemoveLogo} style={({ pressed }) => [styles.logoActionBtn, { borderColor: theme.line }, pressed && { opacity: 0.85 }]}>
                      <Ionicons name="trash-outline" size={16} color={theme.muted} />
                      <Text style={[styles.logoActionTextSecondary, { color: theme.muted }]}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Info Callout Box */}
            <View style={[styles.infoBox, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
              <Ionicons name="information-circle" size={22} color={BrandColors.primary} style={{ marginTop: 1 }} />
              <Text style={[styles.infoBoxText, { color: theme.infoText }]}>
                Country selection will be used to set your default currency and tax settings. You can change these anytime from Settings.
              </Text>
            </View>

            {/* Complete Setup Button */}
            <Pressable
              onPress={handleCompleteSetup}
              disabled={loading}
              style={({ pressed }) => [styles.orangeBtn, pressed && { opacity: 0.85 }]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.orangeBtnText}>Complete Setup</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            {/* Lock Footer Hint */}
            <View style={styles.lockFooterHint}>
              <Ionicons name="lock-closed" size={14} color="#D97706" />
              <Text style={styles.lockFooterText}>
                You can edit all these details anytime from Settings.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Country Selection Modal */}
      <Modal transparent visible={showCountryPicker} animationType="fade" onRequestClose={() => setShowCountryPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCountryPicker(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.ink }]}>Select Country</Text>

            <TextInput
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="Search country..."
              placeholderTextColor={theme.muted}
              style={[styles.searchInput, { color: theme.ink, borderColor: theme.line }]}
            />

            <ScrollView style={{ maxHeight: 320, marginTop: 10 }}>
              {filteredCountries.map((item) => (
                <Pressable
                  key={item.countryCode}
                  onPress={() => handleCountrySelect(item)}
                  style={({ pressed }) => [
                    styles.countryItemRow,
                    { borderBottomColor: theme.line },
                    countryCode === item.countryCode && { backgroundColor: theme.orangeSoft },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.countryItemName, { color: theme.ink }]}>{item.country}</Text>
                  <Text style={{ fontSize: 13, color: theme.muted }}>{item.currencyCode}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  wizardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  headerBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  stepIndicatorText: {
    fontSize: 14,
    fontWeight: "700",
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: BrandColors.primary,
    textAlign: "right",
  },
  wizardBody: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
  },
  logoCenter: {
    alignItems: "center",
    marginVertical: 16,
  },
  stepFormStack: {
    gap: 16,
  },
  titleCopyCenter: {
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  formSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  inputPillShell: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 50,
  },
  pillTextInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 10,
    fontSize: 14.5,
    fontWeight: "500",
  },
  countrySelectText: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14.5,
    fontWeight: "500",
  },
  tripleFieldRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryGrid: {
    gap: 10,
    marginVertical: 10,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  categoryOptionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginVertical: 8,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },
  orangeBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: BrandColors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  orangeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  lockFooterHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  lockFooterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  centerContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    maxWidth: 480,
    alignSelf: "center",
    width: "100%",
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
  },
  countryItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  countryItemName: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  logoHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  logoUploadCard: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  logoPreviewBox: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 84,
    justifyContent: "center",
    overflow: "hidden",
    width: 84,
  },
  logoPreviewImage: {
    height: "100%",
    width: "100%",
  },
  logoUploadActions: {
    flex: 1,
    gap: 8,
  },
  logoActionBtn: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoActionTextPrimary: {
    color: BrandColors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  logoActionTextSecondary: {
    fontSize: 13,
    fontWeight: "700",
  },
});
