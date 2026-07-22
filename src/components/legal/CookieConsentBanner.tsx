import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ConsentControls } from "@/components/legal/ConsentControls";
import { auth } from "@/firebase";
import { createDefaultConsent, loadLocalConsent, saveConsentPreferences } from "@/services/consent";
import { BrandColors, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => Platform.OS === "web" && !loadLocalConsent());
  const [customizing, setCustomizing] = useState(false);

  if (Platform.OS !== "web" || !visible) return null;

  async function saveAll() {
    await saveConsentPreferences({
      preferences: true,
      analytics: true,
      crashDiagnostics: true,
      marketing: true,
      productUpdates: true,
      personalizedAdvertising: true,
      thirdPartyContent: true,
    }, auth.currentUser, "cookie-banner-accept-all");
    setVisible(false);
  }

  async function rejectNonEssential() {
    await saveConsentPreferences(createDefaultConsent("cookie-banner-reject"), auth.currentUser, "cookie-banner-reject");
    setVisible(false);
  }

  return (
    <>
      <View style={styles.banner} accessibilityRole="alert">
        <View style={styles.copy}>
          <Text style={styles.title}>Your Privacy Choices</Text>
          <Text style={styles.message}>
            We use essential technologies to operate BrandDocs. With your permission, we may also use analytics and preference technologies to improve the service.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={saveAll}>
            <Text style={styles.primaryButtonText}>Accept All</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={rejectNonEssential}>
            <Text style={styles.secondaryButtonText}>Reject Non-Essential</Text>
          </Pressable>
          <Pressable style={styles.textButton} onPress={() => setCustomizing(true)}>
            <Text style={styles.textButtonText}>Customize</Text>
          </Pressable>
        </View>
      </View>
      <Modal visible={customizing} transparent animationType="fade" onRequestClose={() => setCustomizing(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Cookie Preferences</Text>
            <Text style={styles.message}>Strictly Necessary is always enabled. Optional categories are off unless you turn them on.</Text>
            <ConsentControls compact websiteMode />
            <Pressable
              style={styles.doneButton}
              onPress={() => {
                setCustomizing(false);
                setVisible(false);
              }}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    bottom: 20,
    flexDirection: "row",
    gap: BrandSpacing.lg,
    left: 20,
    padding: BrandSpacing.lg,
    position: "fixed" as never,
    right: 20,
    zIndex: 100,
  },
  copy: {
    flex: 1,
  },
  title: {
    ...BrandTypography.sectionHeading,
    color: BrandColors.text,
  },
  message: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
    marginTop: BrandSpacing.xs,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
    justifyContent: "flex-end",
  },
  primaryButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.pill,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: BrandSpacing.lg,
  },
  primaryButtonText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.background,
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.primary,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: BrandSpacing.lg,
  },
  secondaryButtonText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.primary,
    textAlign: "center",
  },
  textButton: {
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: BrandSpacing.md,
  },
  textButtonText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.text,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(35, 35, 35, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: BrandSpacing.lg,
  },
  modalCard: {
    backgroundColor: BrandColors.background,
    borderRadius: BrandRadius.large,
    gap: BrandSpacing.md,
    maxWidth: 720,
    padding: BrandSpacing["2xl"],
    width: "100%",
  },
  doneButton: {
    alignSelf: "flex-end",
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.pill,
    minHeight: 44,
    justifyContent: "center",
    marginTop: BrandSpacing.sm,
    paddingHorizontal: BrandSpacing.lg,
  },
});
