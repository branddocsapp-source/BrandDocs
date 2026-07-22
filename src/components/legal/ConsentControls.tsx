import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { auth } from "@/firebase";
import { ConsentPreferences, createDefaultConsent, loadConsentPreferences, saveConsentPreferences } from "@/services/consent";
import { CONSENT_VERSION } from "@/services/legal-content";
import { BrandColors, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";

import { useAppTheme } from "@/theme/theme-context";

type ConsentKey = "preferences" | "analytics" | "crashDiagnostics" | "marketing" | "productUpdates" | "personalizedAdvertising" | "thirdPartyContent";

const controls: { key: ConsentKey; title: string; description: string; processor: string }[] = [
  { key: "preferences", title: "Preferences", description: "Stores interface choices such as region, display and product preferences.", processor: "Stored by BrandDocs/Firebase where sync is enabled." },
  { key: "analytics", title: "Product Analytics", description: "Helps understand aggregate feature usage and improve the service.", processor: "No analytics SDK is loaded until configured and consented." },
  { key: "crashDiagnostics", title: "Crash Diagnostics", description: "May collect technical crash context to diagnose reliability issues.", processor: "Processor details require configuration before collection." },
  { key: "marketing", title: "Marketing Communications", description: "Allows promotional communications. You can withdraw this choice any time.", processor: "Email provider details require commercial configuration." },
  { key: "productUpdates", title: "Product Updates", description: "Allows product-update messages about BrandDocs features and account notices.", processor: "Email provider details require commercial configuration." },
  { key: "personalizedAdvertising", title: "Personalized Advertising / Tracking", description: "Reserved for future tracking or ads features; off by default.", processor: "No advertising SDK is loaded until configured and consented." },
  { key: "thirdPartyContent", title: "Third-Party Content", description: "Allows optional third-party embedded content where applicable.", processor: "Third-party content providers must be listed before use." },
];

export function ConsentToggleRow({
  title,
  description,
  processor,
  enabled,
  locked,
  onToggle,
}: {
  title: string;
  description: string;
  processor: string;
  enabled: boolean;
  locked?: boolean;
  onToggle?: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.line }]}>
      <View style={styles.copy}>
        <Text style={[styles.rowTitle, { color: theme.ink }]}>{title}</Text>
        <Text style={[styles.rowDescription, { color: theme.muted }]}>{description}</Text>
        <Text style={[styles.processor, { color: theme.muted }]}>{processor}</Text>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled, disabled: locked }}
        disabled={locked}
        onPress={onToggle}
        style={[styles.switch, enabled && styles.switchOn, locked && styles.switchLocked]}
      >
        <View style={[styles.knob, enabled && styles.knobOn]} />
      </Pressable>
    </View>
  );
}

export function ConsentControls({ compact = false, websiteMode = false }: { compact?: boolean; websiteMode?: boolean }) {
  const [preferences, setPreferences] = useState<ConsentPreferences>(() => createDefaultConsent(websiteMode ? "cookie-preferences" : "privacy-consent-center"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    loadConsentPreferences(auth.currentUser).then((savedPreferences) => {
      if (!mounted) return;
      setPreferences(savedPreferences || createDefaultConsent(websiteMode ? "cookie-preferences" : "privacy-consent-center"));
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [websiteMode]);

  async function save(next: ConsentPreferences) {
    setSaving(true);
    setMessage("");
    try {
      const saved = await saveConsentPreferences(next, auth.currentUser, websiteMode ? "cookie-preferences" : "privacy-consent-center");
      setPreferences(saved);
      setMessage("Privacy choices saved.");
    } catch (error: any) {
      setMessage(error?.message || "Could not save privacy choices.");
    } finally {
      setSaving(false);
    }
  }

  function updateKey(key: ConsentKey) {
    const next: ConsentPreferences = { ...preferences, [key]: !preferences[key], essential: true };
    setPreferences(next);
  }

  const { theme } = useAppTheme();

  if (loading) {
    return <ActivityIndicator color={BrandColors.primary} />;
  }

  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }, compact && styles.compactPanel]}>
      <View style={styles.versionRow}>
        <Ionicons name="shield-checkmark-outline" size={20} color={BrandColors.primary} />
        <Text style={[styles.versionText, { color: theme.ink }]}>Consent version {CONSENT_VERSION}</Text>
      </View>
      <ConsentToggleRow
        title="Strictly Necessary / Essential Services"
        description="Required for login, security, core routing, account state and document workflows."
        processor="Always enabled. Cannot be turned off while using BrandDocs."
        enabled
        locked
      />
      {controls.map((control) => (
        <ConsentToggleRow
          key={control.key}
          title={control.title}
          description={control.description}
          processor={control.processor}
          enabled={Boolean(preferences[control.key])}
          onToggle={() => updateKey(control.key)}
        />
      ))}
      <View style={styles.actions}>
        <Pressable style={[styles.secondaryButton, { backgroundColor: theme.card, borderColor: BrandColors.primary }]} onPress={() => save(createDefaultConsent(websiteMode ? "cookie-reject" : "privacy-reject"))} disabled={saving}>
          <Text style={styles.secondaryButtonText}>Reject Non-Essential</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => save(preferences)} disabled={saving}>
          {saving ? <ActivityIndicator color={BrandColors.background} /> : <Text style={styles.primaryButtonText}>Save Choices</Text>}
        </Pressable>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: BrandColors.card,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.large,
    borderWidth: 1,
    gap: BrandSpacing.md,
    padding: BrandSpacing.lg,
  },
  compactPanel: {
    borderRadius: BrandRadius.medium,
  },
  versionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.sm,
    marginBottom: BrandSpacing.sm,
  },
  versionText: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
  },
  row: {
    alignItems: "center",
    borderTopColor: BrandColors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: BrandSpacing.md,
    paddingTop: BrandSpacing.md,
  },
  copy: {
    flex: 1,
  },
  rowTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  rowDescription: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
    marginTop: 3,
  },
  processor: {
    ...BrandTypography.helperText,
    color: BrandColors.textMuted,
    marginTop: 4,
  },
  switch: {
    backgroundColor: BrandColors.borderStrong,
    borderRadius: BrandRadius.pill,
    height: 30,
    padding: 3,
    width: 54,
  },
  switchOn: {
    backgroundColor: BrandColors.primary,
  },
  switchLocked: {
    opacity: 0.72,
  },
  knob: {
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    height: 24,
    width: 24,
  },
  knobOn: {
    transform: [{ translateX: 24 }],
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
    justifyContent: "flex-end",
    marginTop: BrandSpacing.md,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.pill,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 130,
    paddingHorizontal: BrandSpacing.lg,
  },
  primaryButtonText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.background,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: BrandColors.background,
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
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
    textAlign: "right",
  },
});
