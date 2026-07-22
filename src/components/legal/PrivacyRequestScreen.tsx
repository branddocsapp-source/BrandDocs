import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ConsentControls } from "@/components/legal/ConsentControls";
import { auth } from "@/firebase";
import { createPrivacyRequest } from "@/services/consent";
import { legalDocuments } from "@/services/legal-content";
import { BrandColors, BrandLayout, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";

const requestTypes = ["Access My Data", "Correct Profile Data", "Export My Data", "Delete Account/Data", "Withdraw Optional Consent", "Marketing Preferences", "Contact Privacy Support"];

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={19} color={BrandColors.text} />
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function CookiePreferencesScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Header
          title="Cookie Preferences"
          subtitle="Manage Website cookie and storage choices. Strictly Necessary services remain enabled for login, security and core functionality."
        />
        <ConsentControls websiteMode />
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{legalDocuments.cookie.title}</Text>
          <Text style={styles.infoText}>{legalDocuments.cookie.summary}</Text>
          <Pressable accessibilityRole="link" onPress={() => router.push("/cookie-policy" as never)} style={styles.linkButton}>
            <Text style={styles.linkText}>Read Cookie Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function PrivacyRequestScreen() {
  const [requestType, setRequestType] = useState(requestTypes[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function submitRequest() {
    setMessage("");

    if (!auth.currentUser) {
      setMessage("Please sign in to submit a verified privacy request, or email support below.");
      return;
    }

    try {
      setSubmitting(true);
      const requestId = await createPrivacyRequest(auth.currentUser, requestType, {
        details: details.trim(),
        legalReviewRequired: true,
      });
      setMessage(`Request received. Reference: ${requestId}`);
      setDetails("");
    } catch (error: any) {
      console.error("[BrandDocs] Privacy request failed:", error);
      setMessage(error?.message || "Could not submit this request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Header
          title="Privacy Request Form"
          subtitle="Submit access, correction, export, deletion or consent requests. Draft - Legal Review Required."
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Request Type</Text>
          <View style={styles.chips}>
            {requestTypes.map((type) => {
              const selected = requestType === type;
              return (
                <Pressable key={type} onPress={() => setRequestType(type)} style={[styles.chip, selected && styles.chipSelected]}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{type}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Details</Text>
          <TextInput
            multiline
            placeholder="Describe your request. Do not include passwords, payment cards or sensitive secrets."
            placeholderTextColor={BrandColors.textMuted}
            style={styles.textArea}
            value={details}
            onChangeText={setDetails}
          />

          <View style={styles.actions}>
            <Pressable style={styles.secondaryButton} onPress={() => Linking.openURL("mailto:branddocs.support@gmail.com")}>
              <Text style={styles.secondaryButtonText}>Email Support</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} disabled={submitting} onPress={submitRequest}>
              {submitting ? <ActivityIndicator color={BrandColors.background} /> : <Text style={styles.primaryButtonText}>Submit Request</Text>}
            </Pressable>
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function ComingSoonNotice({ label }: { label: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoTitle}>{label}</Text>
      <Text style={styles.infoText}>Coming in Commercial Version. This placeholder is visible so the button is not silent or misleading.</Text>
    </View>
  );
}

export function showComingSoon(label: string) {
  Alert.alert(label, "Coming in Commercial Version. This placeholder is visible so the button is not silent or misleading.");
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  container: {
    alignSelf: "center",
    maxWidth: BrandLayout.maxContentWidth,
    paddingHorizontal: BrandSpacing["2xl"],
    paddingVertical: BrandSpacing["3xl"],
    width: "100%",
  },
  header: {
    marginBottom: BrandSpacing["2xl"],
  },
  backButton: {
    alignItems: "center",
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    marginBottom: BrandSpacing.lg,
    width: 40,
  },
  title: {
    ...BrandTypography.displayHeading,
    color: BrandColors.text,
  },
  subtitle: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
    marginTop: BrandSpacing.sm,
    maxWidth: 780,
  },
  card: {
    backgroundColor: BrandColors.card,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    gap: BrandSpacing.md,
    padding: BrandSpacing.lg,
  },
  sectionTitle: {
    ...BrandTypography.sectionHeading,
    color: BrandColors.text,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.sm,
  },
  chip: {
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
  },
  chipSelected: {
    backgroundColor: BrandColors.primarySoft,
    borderColor: BrandColors.primary,
  },
  chipText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.textSecondary,
  },
  chipTextSelected: {
    color: BrandColors.primary,
  },
  textArea: {
    ...BrandTypography.body,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    color: BrandColors.text,
    minHeight: 140,
    padding: BrandSpacing.md,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
    justifyContent: "flex-end",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.pill,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 140,
    paddingHorizontal: BrandSpacing.lg,
  },
  primaryButtonText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.background,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: BrandColors.primary,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: BrandSpacing.lg,
  },
  secondaryButtonText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.primary,
  },
  message: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
  },
  infoBox: {
    backgroundColor: BrandColors.surface,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    marginTop: BrandSpacing.lg,
    padding: BrandSpacing.lg,
  },
  infoTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  infoText: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
    marginTop: BrandSpacing.xs,
  },
  linkButton: {
    marginTop: BrandSpacing.md,
  },
  linkText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.primary,
  },
});
