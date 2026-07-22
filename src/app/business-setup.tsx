import { Ionicons } from "@expo/vector-icons";
import { launchImageLibraryAsync, MediaTypeOptions, requestMediaLibraryPermissionsAsync } from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    StyleProp,
    Text,
    TextInput,
    View,
    ViewStyle,
} from "react-native";

import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import {
  BusinessProfile,
  BusinessProfileAssetInput,
  BusinessProfileAssetKind,
  BusinessProfileAssetResult,
  BUSINESS_PROFILE_IMAGE_UPLOADS_DISABLED_MESSAGE,
  BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED,
  loadBusinessProfile,
  saveBusinessProfile,
} from "@/services/business-profile";
import { getCountryOptions, getCountryRule, getCurrencyOptions } from "@/services/country-rules";
import { Colors } from "@/theme/colors";
import { Typography } from "@/theme/typography";

const DEFAULT_CURRENCY = "USD";
const BUSINESS_TYPES = ["Retail", "Wholesale", "Service", "Manufacturing", "Restaurant", "Healthcare", "Construction", "Education", "Other"];
const COUNTRY_OPTIONS = getCountryOptions();
const CURRENCY_OPTION_CODES = getCurrencyOptions();

type ImageSelection = {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
  type?: string;
  fileName?: string;
  file?: File | null;
  fileSize?: number | null;
} | null;

type Step = 1 | 2;
type AssetStatusState = Record<BusinessProfileAssetKind, { status: "idle" | BusinessProfileAssetResult["status"]; message?: string }>;

const defaultAssetStatuses: AssetStatusState = {
  logo: { status: "idle" },
  stamp: { status: "idle" },
  signature: { status: "idle" },
  photo: { status: "idle" },
};

export default function BusinessSetupScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";
  const [step, setStep] = useState<Step>(1);
  const [existingProfileId, setExistingProfileId] = useState<string | undefined>();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessEmail, setBusinessEmail] = useState(auth.currentUser?.email ?? "");
  const [businessPhone, setBusinessPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [country, setCountry] = useState("United States");
  const [countryCode, setCountryCode] = useState("US");
  const [stateProvince, setStateProvince] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState("");
  const [taxFields, setTaxFields] = useState<Record<string, string>>({});
  const [logoAsset, setLogoAsset] = useState<ImageSelection>(null);
  const [previousAssets, setPreviousAssets] = useState<{
    logo?: { url?: string | null; storagePath?: string | null };
    stamp?: { url?: string | null; storagePath?: string | null };
    signature?: { url?: string | null; storagePath?: string | null };
    photo?: { url?: string | null; storagePath?: string | null };
  }>({});
  const [stampAsset, setStampAsset] = useState<ImageSelection>(null);
  const [signatureAsset, setSignatureAsset] = useState<ImageSelection>(null);
  const [photoAsset, setPhotoAsset] = useState<ImageSelection>(null);
  const [assetStatuses, setAssetStatuses] = useState<AssetStatusState>(defaultAssetStatuses);
  const [showBusinessTypePicker, setShowBusinessTypePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [currencySearch, setCurrencySearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const { isWebsite, isTablet, isDesktop, isAppPreview } = useResponsiveLayout();
  const useTwoColumns = isDesktop;

  const withPreviewRoute = useCallback((pathname: "/signin" | "/dashboard" | "/profile") => {
    if (!isAppPreview) return pathname;
    return { pathname, params: { appPreview: "1" } };
  }, [isAppPreview]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateExistingProfile() {
      const profile = await loadBusinessProfile(auth.currentUser);
      if (!isMounted || !profile) return;

      if (!isEditMode) {
        router.replace(withPreviewRoute("/dashboard") as never);
        return;
      }

      setExistingProfileId(profile.id);
      setBusinessName(profile.name || "");
      setOwnerName(profile.ownerName || "");
      setBusinessEmail(profile.email || auth.currentUser?.email || "");
      setBusinessPhone(profile.phone || "");
      setWebsite(profile.website || "");
      setBusinessType(profile.businessType || BUSINESS_TYPES[0]);
      setCountry(profile.country || "United States");
      setCountryCode(profile.countryCode || getCountryRule(profile.country || "United States").countryCode);
      setStateProvince(profile.stateProvince || "");
      setCity(profile.city || "");
      setZipCode(profile.zipCode || "");
      setAddress(profile.address || "");
      setCurrency(profile.currencyCode || profile.defaultCurrency || DEFAULT_CURRENCY);
      setTaxRegistrationNumber(profile.taxRegistrationNumber || "");
      setTaxFields(profile.taxFields || {});
      setPreviousAssets({
        logo: { url: profile.branding?.logoUrl || null, storagePath: profile.branding?.logoStoragePath || null },
        stamp: { url: profile.branding?.stampUrl || null, storagePath: profile.branding?.stampStoragePath || null },
        signature: { url: profile.branding?.signatureUrl || null, storagePath: profile.branding?.signatureStoragePath || null },
        photo: { url: profile.branding?.photoUrl || null, storagePath: profile.branding?.photoStoragePath || null },
      });
      setLogoAsset(profile.branding?.logoUrl ? { uri: profile.branding.logoUrl, fileName: "Company logo" } : null);
      setStampAsset(profile.branding?.stampUrl ? { uri: profile.branding.stampUrl, fileName: "Company stamp" } : null);
      setSignatureAsset(profile.branding?.signatureUrl ? { uri: profile.branding.signatureUrl, fileName: "Company signature" } : null);
      setPhotoAsset(profile.branding?.photoUrl ? { uri: profile.branding.photoUrl, fileName: "Profile photo" } : null);
      setAssetStatuses(defaultAssetStatuses);
    }

    hydrateExistingProfile();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, withPreviewRoute]);

  function validateStepOne() {
    if (!businessName.trim()) {
      Alert.alert("Company Name Required", "Please enter your company name to continue.");
      return false;
    }

    return true;
  }

  function validateStepTwo() {
    if (!country.trim()) {
      Alert.alert("Country Required", "Please select your country to continue.");
      return false;
    }

    return true;
  }

  async function pickImage(target: "logo" | "stamp" | "signature" | "photo") {
    if (!BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED) {
      setAssetStatuses((current) => ({
        ...current,
        [target]: { status: "idle", message: BUSINESS_PROFILE_IMAGE_UPLOADS_DISABLED_MESSAGE },
      }));
      return;
    }

    const permission = await requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert("Permission Needed", "Please allow access to your photos to upload a business asset.");
      return;
    }

    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const selectedAsset = {
          uri: asset.uri,
          base64: asset.base64 ?? null,
          mimeType: asset.mimeType ?? "image/jpeg",
          type: asset.type ?? "image/jpeg",
          fileName: asset.fileName ?? `${target}.jpg`,
          file: Platform.OS === "web" ? ((asset as any).file as File | undefined) ?? null : null,
          fileSize: asset.fileSize ?? ((asset as any).file as File | undefined)?.size ?? null,
        };

        if (target === "logo") {
          setLogoAsset(selectedAsset);
        } else if (target === "stamp") {
          setStampAsset(selectedAsset);
        } else if (target === "signature") {
          setSignatureAsset(selectedAsset);
        } else {
          setPhotoAsset(selectedAsset);
        }
        setAssetStatuses((current) => ({ ...current, [target]: { status: "idle" } }));
      }
    } catch (error: any) {
      Alert.alert("Upload Failed", error?.message || "We could not access the selected image.");
    }
  }

  function getSelectedAsset(kind: BusinessProfileAssetKind) {
    if (kind === "logo") return logoAsset;
    if (kind === "stamp") return stampAsset;
    if (kind === "signature") return signatureAsset;
    return photoAsset;
  }

  function getAssetStatusLabel(status: AssetStatusState[BusinessProfileAssetKind]) {
    if (status.status === "uploaded") return "Uploaded";
    if (status.status === "kept") return "Saved";
    if (status.status === "removed") return "Removed";
    if (status.status === "failed") return "Upload failed";
    if (status.status === "skipped") return "Not selected";
    return "";
  }

  function applyAssetResults(results?: BusinessProfileAssetResult[]) {
    if (!results?.length) {
      setAssetStatuses(defaultAssetStatuses);
      return;
    }

    setAssetStatuses((current) => {
      const next = { ...current };
      results.forEach((result) => {
        next[result.kind] = result.status === "skipped"
          ? { status: "idle" }
          : { status: result.status, message: result.userMessage };
      });
      return next;
    });
  }

  async function retryAssetUpload(kind: BusinessProfileAssetKind) {
    if (!BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED) return;
    if (loading) return;
    const selectedAsset = getSelectedAsset(kind);

    if (!selectedAsset?.uri) {
      Alert.alert("Choose Image", `Select a ${kind === "logo" ? "logo" : kind === "stamp" ? "company stamp" : "company signature"} before retrying upload.`);
      return;
    }

    await handleBusinessSetup({ retryOnly: kind });
  }

  async function handleBusinessSetup(options?: { retryOnly?: BusinessProfileAssetKind }) {
    if (!validateStepTwo()) return;

    setSaveError("");

    const user = auth.currentUser;

    console.log("[BrandDocs] Finish Setup pressed.", {
      hasCurrentUser: !!user,
      userId: user?.uid,
      email: user?.email,
    });

    if (!user) {
      console.error("[BrandDocs] Finish Setup blocked: Firebase Authentication currentUser is null.");
      Alert.alert("Session Expired", "Please sign in again to finish setup.");
      router.replace(withPreviewRoute("/signin") as never);
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      const retryOnly = options?.retryOnly;
      const shouldUploadAsset = (kind: BusinessProfileAssetKind) => BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED && (!retryOnly || retryOnly === kind);
      const getBrandingUri = (kind: BusinessProfileAssetKind, selected: ImageSelection) => {
        if (!BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED) return previousAssets[kind]?.url ?? null;
        if (shouldUploadAsset(kind)) return selected?.uri ?? null;
        return previousAssets[kind]?.url ?? null;
      };

      setAssetStatuses((current) => {
        const next = { ...current };
        (["logo", "stamp", "signature", "photo"] as BusinessProfileAssetKind[]).forEach((kind) => {
          if (shouldUploadAsset(kind) && getSelectedAsset(kind)?.uri && !/^https?:\/\//i.test(getSelectedAsset(kind)?.uri || "")) {
            next[kind] = { status: "idle", message: "Uploading..." };
          }
        });
        return next;
      });

      const normalizedTaxFields = Object.entries(taxFields).reduce<Record<string, string>>((accumulator, [key, value]) => {
        if (value.trim()) {
          accumulator[key] = value.trim();
        }
        return accumulator;
      }, {});

      const profile: BusinessProfile = {
        id: existingProfileId,
        name: businessName.trim(),
        legalName: businessName.trim(),
        ownerName: ownerName.trim(),
        email: businessEmail.trim() || user.email || "",
        phone: businessPhone.trim(),
        website: website.trim(),
        businessType: businessType.trim(),
        country: country.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        stateProvince: stateProvince.trim(),
        city: city.trim(),
        zipCode: zipCode.trim(),
        address: address.trim(),
        defaultCurrency: currency.trim().toUpperCase(),
        currencyCode: currency.trim().toUpperCase(),
        taxRegistrationNumber: taxRegistrationNumber.trim(),
        taxFields: normalizedTaxFields,
        countryMeta: {
          countryCode: countryCode.trim().toUpperCase(),
          currencyCode: currency.trim().toUpperCase(),
          postalCode: zipCode.trim(),
          taxIdentifiers: normalizedTaxFields,
          businessRegistrationIdentifiers: Object.entries(normalizedTaxFields).reduce<Record<string, string>>((accumulator, [key, value]) => {
            if (key.toLowerCase().includes("registration") || key.toLowerCase().includes("business")) {
              accumulator[key] = value;
            }
            return accumulator;
          }, {}),
          bankDetails: {},
          documentDefaults: {},
        },
        branding: {
          primaryColor: Colors.primary,
          logoUrl: getBrandingUri("logo", logoAsset),
          stampUrl: getBrandingUri("stamp", stampAsset),
          signatureUrl: getBrandingUri("signature", signatureAsset),
          photoUrl: getBrandingUri("photo", photoAsset),
        },
      };

      const currentAssets: BusinessProfileAssetInputs = {
        logo: BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED && shouldUploadAsset("logo") ? logoAsset : null,
        stamp: BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED && shouldUploadAsset("stamp") ? stampAsset : null,
        signature: BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED && shouldUploadAsset("signature") ? signatureAsset : null,
        photo: BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED && shouldUploadAsset("photo") ? photoAsset : null,
      };

      const result = await saveBusinessProfile(user, profile, previousAssets, currentAssets);

      setExistingProfileId(result.profile.id);
      setPreviousAssets({
        logo: { url: result.profile.branding?.logoUrl || null, storagePath: result.profile.branding?.logoStoragePath || null },
        stamp: { url: result.profile.branding?.stampUrl || null, storagePath: result.profile.branding?.stampStoragePath || null },
        signature: { url: result.profile.branding?.signatureUrl || null, storagePath: result.profile.branding?.signatureStoragePath || null },
        photo: { url: result.profile.branding?.photoUrl || null, storagePath: result.profile.branding?.photoStoragePath || null },
      });
      const logoResult = result.assetResults?.find((assetResult) => assetResult.kind === "logo");
      const stampResult = result.assetResults?.find((assetResult) => assetResult.kind === "stamp");
      const signatureResult = result.assetResults?.find((assetResult) => assetResult.kind === "signature");
      const photoResult = result.assetResults?.find((assetResult) => assetResult.kind === "photo");
      setLogoAsset(logoResult?.status === "failed" ? logoAsset : result.profile.branding?.logoUrl ? { uri: result.profile.branding.logoUrl, fileName: "Company logo" } : null);
      setStampAsset(stampResult?.status === "failed" ? stampAsset : result.profile.branding?.stampUrl ? { uri: result.profile.branding.stampUrl, fileName: "Company stamp" } : null);
      setSignatureAsset(signatureResult?.status === "failed" ? signatureAsset : result.profile.branding?.signatureUrl ? { uri: result.profile.branding.signatureUrl, fileName: "Company signature" } : null);
      setPhotoAsset(photoResult?.status === "failed" ? photoAsset : result.profile.branding?.photoUrl ? { uri: result.profile.branding.photoUrl, fileName: "Profile photo" } : null);
      applyAssetResults(result.assetResults);

      const nextRoute = withPreviewRoute(isEditMode ? "/profile" : "/dashboard") as never;

      if (result.assetWarnings?.length) {
        const warningMessage = `Company profile saved. ${result.assetWarnings.join(" ")}`;
        console.error("[BrandDocs] Profile saved with asset upload warning:", result.assetWarnings);
        setSaveError(warningMessage);
        Alert.alert("Profile Saved With Asset Warning", warningMessage, [
          { text: "Stay and Retry" },
          { text: "Continue", onPress: () => router.replace(nextRoute) },
        ]);
        return;
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.replace(nextRoute);
      }, 2000);
    } catch (error: any) {
      const failureReason = error?.message || "We could not save your business profile. Please try again.";
      console.error("[BrandDocs] Finish Setup failed:", failureReason, error);
      setSaveError(failureReason);
      Alert.alert("Setup Failed", failureReason);
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (!validateStepOne()) return;
    setStep(2);
  }

  function handleBack() {
    setStep(1);
  }

  function handleCountrySelect(value: string) {
    const selectedRule = getCountryRule(value);
    setCountry(value);
    setCountryCode(selectedRule.countryCode);
    setCurrency(selectedRule.defaultCurrency || DEFAULT_CURRENCY);
    setCountrySearch("");
    setShowCountryPicker(false);
  }

  function handleBusinessTypeSelect(value: string) {
    setBusinessType(value);
    setShowBusinessTypePicker(false);
  }

  function handleCurrencySelect(value: string) {
    setCurrency(value);
    setCurrencySearch("");
    setShowCurrencyPicker(false);
  }

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((option) => option.toLowerCase().includes(query));
  }, [countrySearch]);

  const filteredCurrencies = useMemo(() => {
    const query = currencySearch.trim().toLowerCase();
    if (!query) return CURRENCY_OPTION_CODES;
    return CURRENCY_OPTION_CODES.filter((option) => option.toLowerCase().includes(query));
  }, [currencySearch]);

  const countryRule = useMemo(() => getCountryRule(country), [country]);
  const postalLabel = countryRule.postalLabel || "Postal Code";
  const stateLabel = countryRule.stateLabel || "State / Province";
  const dynamicTaxFields = useMemo(() => countryRule.taxFields || [], [countryRule]);
  const dynamicRegistrationFields = useMemo(() => {
    const taxFieldKeys = new Set(dynamicTaxFields.map((field) => field.key));
    return (countryRule.businessRegistrationFields || []).filter((field) => !taxFieldKeys.has(field.key));
  }, [countryRule, dynamicTaxFields]);
  const countryHelperText = countryRule.helperText;

  function renderPickerModal(
    visible: boolean,
    onClose: () => void,
    options: string[],
    selectedValue: string,
    onSelect: (value: string) => void,
    title: string,
    searchValue: string,
    onSearchChange: (value: string) => void,
    placeholder: string
  ) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable onPress={onClose}>
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>
            <TextInput
              placeholder={placeholder}
              placeholderTextColor="#999"
              style={styles.searchInput}
              value={searchValue}
              onChangeText={onSearchChange}
            />
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const isSelected = option === selectedValue;
                return (
                  <Pressable key={option} onPress={() => onSelect(option)} style={[styles.optionRow, isSelected && styles.optionRowSelected]}>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderUploadField(
    kind: BusinessProfileAssetKind,
    label: string,
    hint: string,
    value: ImageSelection,
    onPress: () => void,
    onRemove?: () => void,
    style?: StyleProp<ViewStyle>
  ) {
    const status = assetStatuses[kind];
    const statusLabel = getAssetStatusLabel(status);
    const failed = BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED && status.status === "failed" && Boolean(value?.uri);
    const uploadDisabled = !BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED;

    return (
      <View style={[styles.uploadField, style]}>
        <View style={styles.uploadHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldHint}>{hint}</Text>
            {statusLabel || status.message ? (
              <Text style={[styles.assetStatusText, failed && styles.assetStatusTextFailed]}>
                {status.message || statusLabel}
              </Text>
            ) : null}
          </View>
          <View style={styles.uploadActions}>
            {failed ? (
              <Pressable style={[styles.uploadButton, styles.retryUploadButton]} onPress={() => retryAssetUpload(kind)} disabled={loading}>
                <Text style={styles.retryUploadButtonText}>Retry</Text>
              </Pressable>
            ) : null}
            {value && !uploadDisabled ? (
              <Pressable style={[styles.uploadButton, styles.secondaryUploadButton]} onPress={onRemove}>
                <Text style={styles.secondaryUploadButtonText}>Remove</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.uploadButton, uploadDisabled && styles.uploadButtonDisabled]} onPress={onPress} disabled={uploadDisabled}>
              <Text style={[styles.uploadButtonText, uploadDisabled && styles.uploadButtonDisabledText]}>
                {uploadDisabled ? "Coming Soon" : value ? "Change" : "Upload"}
              </Text>
            </Pressable>
          </View>
        </View>
        {value ? (
          <View style={styles.previewBox}>
            <Image source={{ uri: value.uri }} style={styles.previewImage} resizeMode="cover" />
            <Text style={styles.previewText}>{value.fileName || "Selected image"}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCard}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={48} color="#24A148" />
          </View>
          <Text style={styles.successTitle}>Setup Complete!</Text>
          <Text style={styles.successSubtitle}>
            Your business profile has been saved successfully. Redirecting you to the dashboard...
          </Text>
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.container, isWebsite && styles.webContainer]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.card, isTablet && styles.tabletCard, isDesktop && styles.desktopCard]}>
            <View style={styles.header}>
              {step === 1 ? (
                <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
                  <Ionicons name="chevron-back" size={20} color={Colors.text} />
                </Pressable>
              ) : null}
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>Step {step} of 2</Text>
              </View>
              <Text style={styles.title}>{step === 1 ? "Create Your Business Profile" : "Business Details"}</Text>
              <Text style={styles.subtitle}>
                {step === 1
                  ? "Set up your business once. BrandDocs will automatically use this information across your documents."
                  : "Add the location and asset details that will support your professional documents."}
              </Text>
            </View>

            {step === 1 ? (
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>Business Information</Text>
                {BUSINESS_PROFILE_IMAGE_UPLOADS_DISABLED_MESSAGE ? (
                  <Text style={styles.uploadInfoText}>{BUSINESS_PROFILE_IMAGE_UPLOADS_DISABLED_MESSAGE}</Text>
                ) : null}

                {renderUploadField("logo", "Company Logo (Optional Upload)", "PNG, JPG, JPEG, WEBP up to 8 MB", logoAsset, () => pickImage("logo"), () => {
                  Alert.alert(
                    "Remove company logo",
                    "This will remove the current company logo and show initials instead.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: () => {
                          setLogoAsset(null);
                          setAssetStatuses((current) => ({ ...current, logo: { status: "idle", message: "Logo will be removed on save." } }));
                        },
                      },
                    ]
                  );
                })}

                <View style={[useTwoColumns && styles.fieldRow]}>
                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>Company Name *</Text>
                    <TextInput
                      placeholder="Enter company name"
                      placeholderTextColor="#999"
                      style={styles.input}
                      value={businessName}
                      onChangeText={setBusinessName}
                    />
                  </View>

                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>Business Owner Name</Text>
                    <TextInput
                      placeholder="Enter owner name"
                      placeholderTextColor="#999"
                      style={styles.input}
                      value={ownerName}
                      onChangeText={setOwnerName}
                    />
                  </View>
                </View>

                <View style={[useTwoColumns && styles.fieldRow]}>
                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>Business Email</Text>
                    <TextInput
                      placeholder="Enter business email"
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.input}
                      value={businessEmail}
                      onChangeText={setBusinessEmail}
                    />
                  </View>

                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>Business Phone</Text>
                    <TextInput
                      placeholder="Enter phone number"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      style={styles.input}
                      value={businessPhone}
                      onChangeText={setBusinessPhone}
                    />
                  </View>
                </View>

                <View style={[useTwoColumns && styles.fieldRow]}>
                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>Website (Optional)</Text>
                    <TextInput
                      placeholder="Enter website"
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      keyboardType="url"
                      style={styles.input}
                      value={website}
                      onChangeText={setWebsite}
                    />
                  </View>

                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>Business Type</Text>
                    <Pressable style={styles.inputRow} onPress={() => setShowBusinessTypePicker(true)}>
                      <Text style={styles.inputRowText}>{businessType}</Text>
                      <Text style={styles.inputRowHint}>▾</Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading}>
                  <Text style={styles.buttonText}>Continue</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>Business Details</Text>

                <View style={[useTwoColumns && styles.fieldRow]}>
                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>Country *</Text>
                    <Pressable style={styles.inputRow} onPress={() => setShowCountryPicker(true)}>
                      <Text style={styles.inputRowText}>{country}</Text>
                      <Text style={styles.inputRowHint}>▾</Text>
                    </Pressable>
                  </View>

                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>{stateLabel}</Text>
                    <TextInput
                      placeholder="Enter state or province"
                      placeholderTextColor="#999"
                      style={styles.input}
                      value={stateProvince}
                      onChangeText={setStateProvince}
                    />
                  </View>
                </View>

                <View style={[useTwoColumns && styles.fieldRow]}>
                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>City</Text>
                    <TextInput
                      placeholder="Enter city"
                      placeholderTextColor="#999"
                      style={styles.input}
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>

                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>{postalLabel}</Text>
                    <TextInput
                      placeholder={`Enter ${postalLabel.toLowerCase()}`}
                      placeholderTextColor="#999"
                      style={styles.input}
                      value={zipCode}
                      onChangeText={setZipCode}
                    />
                  </View>
                </View>

                <View style={[useTwoColumns && styles.fieldRow]}>
                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>Full Address</Text>
                    <TextInput
                      placeholder="Enter full address"
                      placeholderTextColor="#999"
                      style={styles.input}
                      value={address}
                      onChangeText={setAddress}
                    />
                  </View>

                  <View style={[useTwoColumns && styles.fieldColumn]}>
                    <Text style={styles.fieldLabel}>Currency</Text>
                    <Pressable style={styles.inputRow} onPress={() => setShowCurrencyPicker(true)}>
                      <Text style={styles.inputRowText}>{currency}</Text>
                      <Text style={styles.inputRowHint}>▾</Text>
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Tax & Registration Details (Optional)</Text>
                <TextInput
                  placeholder="Enter an additional tax number if needed"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={taxRegistrationNumber}
                  onChangeText={setTaxRegistrationNumber}
                />

                {countryHelperText ? <Text style={styles.helperText}>{countryHelperText}</Text> : null}

                {dynamicTaxFields.length ? (
                  <View>
                    {dynamicTaxFields.map((field) => (
                      <View key={field.key}>
                        <Text style={styles.fieldLabel}>{field.label} (Optional)</Text>
                        <TextInput
                          placeholder={field.placeholder}
                          placeholderTextColor="#999"
                          style={styles.input}
                          value={taxFields[field.key] || ""}
                          onChangeText={(value) => setTaxFields((current) => ({ ...current, [field.key]: value }))}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}

                {dynamicRegistrationFields.length ? (
                  <View>
                    {dynamicRegistrationFields.map((field) => (
                      <View key={field.key}>
                        <Text style={styles.fieldLabel}>{field.label} (Optional)</Text>
                        <TextInput
                          placeholder={field.placeholder}
                          placeholderTextColor="#999"
                          style={styles.input}
                          value={taxFields[field.key] || ""}
                          onChangeText={(value) => setTaxFields((current) => ({ ...current, [field.key]: value }))}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}

                <Text style={styles.sectionTitle}>Optional Business Assets</Text>
                {BUSINESS_PROFILE_IMAGE_UPLOADS_DISABLED_MESSAGE ? (
                  <Text style={styles.uploadInfoText}>{BUSINESS_PROFILE_IMAGE_UPLOADS_DISABLED_MESSAGE}</Text>
                ) : null}
                <View style={[useTwoColumns && styles.fieldRow]}>
                  {renderUploadField("signature", "Company Signature (Optional Upload)", "PNG, JPG, JPEG, WEBP up to 8 MB", signatureAsset, () => pickImage("signature"), () => {
                    Alert.alert(
                      "Remove company signature",
                      "This will remove the current company signature from the profile.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => {
                            setSignatureAsset(null);
                            setAssetStatuses((current) => ({ ...current, signature: { status: "idle", message: "Company signature will be removed on save." } }));
                          },
                        },
                      ]
                    );
                  }, useTwoColumns ? styles.fieldColumn : undefined)}
                  {renderUploadField("photo", "Owner/Business Photo (Optional)", "PNG, JPG, JPEG, WEBP up to 8 MB", photoAsset, () => pickImage("photo"), () => {
                    Alert.alert(
                      "Remove photo",
                      "This will remove the current photo from the profile.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => {
                            setPhotoAsset(null);
                            setAssetStatuses((current) => ({ ...current, photo: { status: "idle", message: "Photo will be removed on save." } }));
                          },
                        },
                      ]
                    );
                  }, useTwoColumns ? styles.fieldColumn : undefined)}
                </View>
                <View style={[useTwoColumns && styles.fieldRow, { marginTop: 12 }]}>
                  {renderUploadField("stamp", "Company Stamp (Optional Upload)", "PNG, JPG, JPEG, WEBP up to 8 MB", stampAsset, () => pickImage("stamp"), () => {
                    Alert.alert(
                      "Remove company stamp",
                      "This will remove the current company stamp from the profile.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => {
                            setStampAsset(null);
                            setAssetStatuses((current) => ({ ...current, stamp: { status: "idle", message: "Company stamp will be removed on save." } }));
                          },
                        },
                      ]
                    );
                  }, useTwoColumns ? styles.fieldColumn : undefined)}
                  {useTwoColumns ? <View style={styles.fieldColumn} /> : null}
                </View>

                <Text style={styles.helperText}>You can skip these now and upload them later from Settings.</Text>

                <View style={styles.buttonRow}>
                  <Pressable style={[styles.secondaryButton, loading && styles.buttonDisabled]} onPress={handleBack} disabled={loading}>
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </Pressable>
                  <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={() => handleBusinessSetup()} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Finish Setup</Text>}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderPickerModal(showBusinessTypePicker, () => setShowBusinessTypePicker(false), BUSINESS_TYPES, businessType, handleBusinessTypeSelect, "Business Type", "", () => undefined, "")}
      {renderPickerModal(showCountryPicker, () => setShowCountryPicker(false), filteredCountries, country, handleCountrySelect, "Country", countrySearch, setCountrySearch, "Search countries")}
      {renderPickerModal(showCurrencyPicker, () => setShowCurrencyPicker(false), filteredCurrencies, currency, handleCurrencySelect, "Currency", currencySearch, setCurrencySearch, "Search currencies")}
      {saveError ? (
        <View style={styles.snackbar} accessibilityRole="alert">
          <Text style={styles.snackbarTitle}>{saveError.startsWith("Company profile saved.") ? "Profile saved with asset warning" : "Save failed"}</Text>
          <Text style={styles.snackbarText}>{saveError}</Text>
          <View style={styles.snackbarActions}>
            {(Object.entries(assetStatuses) as [BusinessProfileAssetKind, AssetStatusState[BusinessProfileAssetKind]][])
              .filter(([kind, status]) => BUSINESS_PROFILE_IMAGE_UPLOADS_ENABLED && status.status === "failed" && Boolean(getSelectedAsset(kind)?.uri))
              .map(([kind]) => (
                <Pressable key={kind} onPress={() => retryAssetUpload(kind)} style={styles.snackbarRetryButton} disabled={loading}>
                  <Text style={styles.snackbarRetryText}>Retry {kind === "logo" ? "Logo" : kind === "stamp" ? "Stamp" : "Signature"}</Text>
                </Pressable>
              ))}
          </View>
          <Pressable onPress={() => setSaveError("")} style={styles.snackbarClose} accessibilityRole="button" accessibilityLabel="Dismiss save error">
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  webContainer: {
    paddingHorizontal: 40,
    paddingVertical: 48,
    backgroundColor: Colors.surface,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: Colors.background,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  tabletCard: {
    maxWidth: 720,
    paddingHorizontal: 34,
    paddingVertical: 36,
  },
  desktopCard: {
    maxWidth: 1040,
    paddingHorizontal: 44,
    paddingVertical: 42,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: Colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    marginBottom: 12,
    width: 40,
  },
  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF5E3",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  stepBadgeText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    width: "100%",
  },
  fieldRow: {
    flexDirection: "row",
    gap: 18,
  },
  fieldColumn: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 16,
  },
  fieldLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 2,
  },
  fieldHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 15,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    fontSize: 16,
    color: Colors.text,
  },
  inputRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputRowText: {
    color: Colors.text,
    fontSize: 16,
  },
  inputRowHint: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#FFF5E3",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...Typography.button,
    color: "#FFFFFF",
  },
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.primary,
  },
  uploadField: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#FCFCFC",
  },
  uploadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  uploadActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  uploadButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  secondaryUploadButton: {
    backgroundColor: "#FFF5E3",
  },
  retryUploadButton: {
    backgroundColor: "#EAF7EF",
  },
  uploadButtonDisabled: {
    backgroundColor: "#ECEFF3",
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  uploadButtonDisabledText: {
    color: Colors.textSecondary,
  },
  secondaryUploadButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  retryUploadButtonText: {
    color: "#1E7A3B",
    fontSize: 13,
    fontWeight: "700",
  },
  assetStatusText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  assetStatusTextFailed: {
    color: "#B42318",
  },
  uploadInfoText: {
    backgroundColor: "#EAF1FF",
    borderColor: "#C8D9FF",
    borderRadius: 12,
    borderWidth: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  previewText: {
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(47, 47, 47, 0.35)",
  },
  modalCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  modalClose: {
    color: Colors.primary,
    fontWeight: "700",
  },
  modalList: {
    maxHeight: 320,
  },
  snackbar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: "#B42318",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 44,
    ...Platform.select({
      web: {
        boxShadow: "0px 8px 18px rgba(0, 0, 0, 0.16)",
      },
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
        elevation: 8,
      },
    }),
  },
  snackbarTitle: {
    color: "#FFFFFF",
    ...Typography.button,
    fontSize: 14,
    marginBottom: 3,
  },
  snackbarText: {
    ...Typography.caption,
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
  },
  snackbarActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  snackbarRetryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  snackbarRetryText: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "800",
  },
  snackbarClose: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 36,
  },
  optionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionRowSelected: {
    backgroundColor: "#FFF8ED",
  },
  optionText: {
    color: Colors.text,
    fontSize: 16,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: "700",
  },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    maxWidth: 420,
    width: "100%",
    ...Platform.select({
      web: {
        boxShadow: "0px 12px 32px rgba(0, 0, 0, 0.08)",
      },
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4,
      },
    }),
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
