import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

import {
  DocumentBrandHeader,
  DocumentColors,
  DocumentFooter,
  DocumentTaxBar,
  DocumentWatermark,
} from "@/components/document-template";
import { useAppTheme, ThemePalette } from "@/theme/theme-context";
import { Colors } from "@/theme/colors";
import { BrandColors, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { BusinessProfile, getCompanyInitials, loadBusinessProfile } from "@/services/business-profile";
import {
  deleteLetterhead,
  generateNextLetterheadNumber,
  LetterheadRecord,
  loadLetterheadById,
  loadLetterheads,
  saveLetterhead,
  SignatureMode,
  TextAlignment,
} from "@/services/letterheads";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getCompanyAddress(profile: BusinessProfile | null) {
  return [profile?.address, profile?.city, profile?.stateProvince, profile?.zipCode, profile?.country]
    .filter(Boolean)
    .join(", ");
}

function getTaxValue(profile: BusinessProfile | null) {
  return profile?.taxRegistrationNumber || Object.values(profile?.taxFields || {})[0] || "";
}

function getRegistrationValue(profile: BusinessProfile | null) {
  return profile?.countryMeta?.businessRegistrationIdentifiers
    ? Object.values(profile.countryMeta.businessRegistrationIdentifiers)[0] || ""
    : "";
}

function getBankDetails(profile: BusinessProfile | null) {
  const details = profile?.countryMeta?.bankDetails || {};
  return Object.entries(details)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function buildDraftLetterhead(profile: BusinessProfile | null, letterheads: LetterheadRecord[]): LetterheadRecord {
  const { letterheadNumber, numberingSequence } = generateNextLetterheadNumber(letterheads);

  return {
    letterheadNumber,
    numberingSequence,
    documentName: "Official Letter",
    documentDate: todayISO(),
    status: "draft",
    businessProfileSnapshot: profile,
    company: {
      logoUrl: profile?.branding?.logoUrl || null,
      name: profile?.name || "Your Company Name",
      tagline: profile?.businessType || "",
      address: profile?.address || getCompanyAddress(profile) || "Company address",
      city: profile?.city || "",
      state: profile?.stateProvince || "",
      country: profile?.country || "",
      postalCode: profile?.zipCode || "",
      phone: profile?.phone || "Business phone",
      email: profile?.email || "business@example.com",
      website: profile?.website || "",
      taxNumber: getTaxValue(profile),
      registrationNumber: getRegistrationValue(profile),
      bankDetails: getBankDetails(profile),
      signatureUrl: profile?.branding?.signatureUrl || null,
      stampUrl: profile?.branding?.stampUrl || null,
    },
    body: "Type your letter here.\n\nUse the formatting controls above to adjust the full body style, lists, spacing, and alignment.",
    bodyFormatting: {
      bold: false,
      italic: false,
      underline: false,
      alignment: "left",
      spacing: "normal",
    },
    signatureMode: profile?.branding?.signatureUrl ? "business" : "none",
    manualSignature: "",
    showStamp: Boolean(profile?.branding?.stampUrl),
    showPageNumber: true,
  };
}

function getStatusLabel(status: LetterheadRecord["status"]) {
  return status === "final" ? "Final" : "Draft";
}

export default function LetterheadScreen() {
  const { theme, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const router = useRouter();
  const { editLetterheadId } = useLocalSearchParams<{ editLetterheadId?: string }>();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [letterheads, setLetterheads] = useState<LetterheadRecord[]>([]);
  const [draftLetterhead, setDraftLetterhead] = useState<LetterheadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bodyHistory, setBodyHistory] = useState<string[]>([]);
  const [redoHistory, setRedoHistory] = useState<string[]>([]);
  const { width, isWebsite, isDesktop, isAppPreview } = useResponsiveLayout();
  const isPhone = width < 640;
  const baseWidth = 794;
  const baseHeight = 1123;
  const scale = width < 820 ? (width - 28) / baseWidth : 1;

  function appRoute(pathname: string, params?: Record<string, string>) {
    if (!isAppPreview) return params ? { pathname, params } : pathname;
    return { pathname, params: { ...params, appPreview: "1" } };
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateLetterheads() {
      const savedProfile = await loadBusinessProfile(auth.currentUser);
      const savedLetterheads = await loadLetterheads(auth.currentUser, savedProfile, 50);
      const editingLetterhead = editLetterheadId ? await loadLetterheadById(auth.currentUser, savedProfile, editLetterheadId) : null;

      if (isMounted) {
        setProfile(savedProfile);
        setLetterheads(savedLetterheads);
        if (editingLetterhead) setDraftLetterhead(editingLetterhead);
        setLoading(false);
      }
    }

    hydrateLetterheads();

    return () => {
      isMounted = false;
    };
  }, [editLetterheadId]);

  function refreshLetterheads(next?: LetterheadRecord) {
    loadLetterheads(auth.currentUser, profile, 50).then((savedLetterheads) => {
      setLetterheads(savedLetterheads.length ? savedLetterheads : next ? [next, ...letterheads] : letterheads);
    });
  }

  function startLetterhead() {
    setBodyHistory([]);
    setRedoHistory([]);
    setDraftLetterhead(buildDraftLetterhead(profile, letterheads));
  }

  function updateLetterheadField(field: keyof LetterheadRecord, value: string | boolean) {
    setDraftLetterhead((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateCompanyField(field: keyof LetterheadRecord["company"], value: string) {
    setDraftLetterhead((current) => (current ? { ...current, company: { ...current.company, [field]: value } } : current));
  }

  function updateBody(value: string) {
    setDraftLetterhead((current) => {
      if (!current) return current;
      setBodyHistory((history) => [...history.slice(-24), current.body]);
      setRedoHistory([]);
      return { ...current, body: value };
    });
  }

  function undoBody() {
    setDraftLetterhead((current) => {
      if (!current || !bodyHistory.length) return current;
      const previous = bodyHistory[bodyHistory.length - 1];
      setBodyHistory((history) => history.slice(0, -1));
      setRedoHistory((history) => [current.body, ...history.slice(0, 24)]);
      return { ...current, body: previous };
    });
  }

  function redoBody() {
    setDraftLetterhead((current) => {
      if (!current || !redoHistory.length) return current;
      const next = redoHistory[0];
      setRedoHistory((history) => history.slice(1));
      setBodyHistory((history) => [...history.slice(-24), current.body]);
      return { ...current, body: next };
    });
  }

  function toggleBodyFormat(field: "bold" | "italic" | "underline") {
    setDraftLetterhead((current) => (
      current ? { ...current, bodyFormatting: { ...current.bodyFormatting, [field]: !current.bodyFormatting[field] } } : current
    ));
  }

  function setAlignment(alignment: TextAlignment) {
    setDraftLetterhead((current) => (
      current ? { ...current, bodyFormatting: { ...current.bodyFormatting, alignment } } : current
    ));
  }

  function setSpacing(spacing: LetterheadRecord["bodyFormatting"]["spacing"]) {
    setDraftLetterhead((current) => (
      current ? { ...current, bodyFormatting: { ...current.bodyFormatting, spacing } } : current
    ));
  }

  function insertListMarker(marker: "bullet" | "number") {
    setDraftLetterhead((current) => {
      if (!current) return current;
      const prefix = marker === "bullet" ? "\n• " : "\n1. ";
      setBodyHistory((history) => [...history.slice(-24), current.body]);
      return { ...current, body: `${current.body}${prefix}` };
    });
  }

  function duplicateLetterhead(letterhead: LetterheadRecord) {
    const { letterheadNumber, numberingSequence } = generateNextLetterheadNumber(letterheads);
    setDraftLetterhead({
      ...letterhead,
      id: undefined,
      letterheadNumber,
      numberingSequence,
      documentName: `${letterhead.documentName} Copy`,
      documentDate: todayISO(),
      status: "draft",
      createdAt: undefined,
      updatedAt: undefined,
    });
  }

  async function handleDelete(letterhead: LetterheadRecord) {
    try {
      await deleteLetterhead(auth.currentUser, profile, letterhead);
      setLetterheads((current) => current.filter((item) => item.id !== letterhead.id && item.letterheadNumber !== letterhead.letterheadNumber));
    } catch (error: any) {
      Alert.alert("Delete Failed", error?.message || "We could not delete this letterhead.");
    }
  }

  async function persistLetterhead(status: LetterheadRecord["status"], goToPreview = false) {
    if (!draftLetterhead) return;
    if (!draftLetterhead.documentName.trim()) {
      Alert.alert("Document Name Required", "Enter a document name before saving.");
      return;
    }

    try {
      setSaving(true);
      const result = await saveLetterhead(auth.currentUser, profile, { ...draftLetterhead, status });
      refreshLetterheads(result.letterhead);

      if (goToPreview) {
        router.push(appRoute("/preview", { type: "letterhead", letterheadId: result.letterhead.id || "" }) as never);
      } else {
        setDraftLetterhead(null);
        Alert.alert("Letterhead Saved", result.warning || `Saved as ${getStatusLabel(result.letterhead.status)}.`);
      }
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "We could not save this letterhead.");
    } finally {
      setSaving(false);
    }
  }

  if (draftLetterhead) {
    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.editorHeader}>
              <Pressable style={styles.headerButton} onPress={() => setDraftLetterhead(null)} accessibilityRole="button" accessibilityLabel="Back">
                <Ionicons name="chevron-back" size={22} color={theme.ink} />
              </Pressable>
              <Text style={styles.editorTitle}>Letterhead</Text>
              <View style={styles.editorActions}>
                <Pressable style={styles.secondaryButton} onPress={() => persistLetterhead("draft")} disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Draft</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => persistLetterhead("final")} disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Final</Text>
                </Pressable>
                <Pressable style={[styles.saveButton, saving && styles.disabledButton]} onPress={() => persistLetterhead("draft", true)} disabled={saving}>
                  <Text style={styles.saveButtonText}>Preview</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.toolbar}>
              <ToolbarButton label="B" active={draftLetterhead.bodyFormatting.bold} onPress={() => toggleBodyFormat("bold")} />
              <ToolbarButton label="I" active={draftLetterhead.bodyFormatting.italic} onPress={() => toggleBodyFormat("italic")} />
              <ToolbarButton label="U" active={draftLetterhead.bodyFormatting.underline} onPress={() => toggleBodyFormat("underline")} />
              <ToolbarButton icon="list-outline" onPress={() => insertListMarker("bullet")} />
              <ToolbarButton icon="reorder-three-outline" onPress={() => insertListMarker("number")} />
              <ToolbarButton icon="arrow-undo-outline" onPress={undoBody} />
              <ToolbarButton icon="arrow-redo-outline" onPress={redoBody} />
              <ToolbarButton label="L" active={draftLetterhead.bodyFormatting.alignment === "left"} onPress={() => setAlignment("left")} />
              <ToolbarButton label="C" active={draftLetterhead.bodyFormatting.alignment === "center"} onPress={() => setAlignment("center")} />
              <ToolbarButton label="R" active={draftLetterhead.bodyFormatting.alignment === "right"} onPress={() => setAlignment("right")} />
              <ToolbarButton label="1x" active={draftLetterhead.bodyFormatting.spacing === "compact"} onPress={() => setSpacing("compact")} />
              <ToolbarButton label="1.5x" active={draftLetterhead.bodyFormatting.spacing === "normal"} onPress={() => setSpacing("normal")} />
              <ToolbarButton label="2x" active={draftLetterhead.bodyFormatting.spacing === "relaxed"} onPress={() => setSpacing("relaxed")} />
            </View>

            <View style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={[styles.editorContent, isWebsite && styles.webEditorContent, width < 820 && { minWidth: 0 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={
                  width < 820 ? {
                    width: baseWidth * scale,
                    height: baseHeight * scale,
                    overflow: "hidden",
                    justifyContent: "center",
                    alignItems: "center",
                    alignSelf: "center",
                  } : undefined
                }>
                  <LetterheadPaper
                    letterhead={draftLetterhead}
                    updateLetterheadField={updateLetterheadField}
                    updateCompanyField={updateCompanyField}
                    updateBody={updateBody}
                    scale={width < 820 ? scale : undefined}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.moduleContent, isWebsite && styles.webModuleContent]} showsVerticalScrollIndicator={false}>
          <View style={styles.moduleHeader}>
            <Pressable style={styles.headerButton} onPress={() => router.push(appRoute("/dashboard") as never)} accessibilityRole="button" accessibilityLabel="Dashboard">
              <Ionicons name="chevron-back" size={22} color={theme.ink} />
            </Pressable>
            <Text style={styles.moduleTitle}>Letterhead</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Pressable style={styles.createButton} onPress={startLetterhead}>
            <View style={styles.createIcon}><Ionicons name="newspaper-outline" size={24} color="#FFFFFF" /></View>
            <Text style={styles.createText}>Create New Letterhead</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={styles.previousCard}>
            <Text style={styles.previousTitle}>Previous Letterheads</Text>
            {loading ? (
              <Text style={styles.emptyText}>Loading letterheads...</Text>
            ) : letterheads.length ? (
              letterheads.map((letterhead) => (
                <View key={letterhead.id || letterhead.letterheadNumber} style={styles.previousRow}>
                  <Pressable style={styles.previousMain} onPress={() => router.push(appRoute("/preview", { type: "letterhead", letterheadId: letterhead.id || "" }) as never)}>
                    <View style={styles.previousIcon}><Ionicons name="newspaper-outline" size={18} color={theme.orange} /></View>
                    <View style={styles.previousCopy}>
                      <Text style={styles.previousNumber}>{letterhead.letterheadNumber}</Text>
                      <Text style={styles.previousMeta}>{letterhead.documentName} • {letterhead.documentDate} • {getStatusLabel(letterhead.status)}</Text>
                    </View>
                  </Pressable>
                  <View style={styles.previousActions}>
                    <Pressable style={styles.rowIconButton} onPress={() => router.push(appRoute("/preview", { type: "letterhead", letterheadId: letterhead.id || "" }) as never)}><Ionicons name="eye-outline" size={17} color={theme.muted} /></Pressable>
                    <Pressable style={styles.rowIconButton} onPress={() => setDraftLetterhead(letterhead)}><Ionicons name="create-outline" size={17} color={theme.muted} /></Pressable>
                    <Pressable style={styles.rowIconButton} onPress={() => duplicateLetterhead(letterhead)}><Ionicons name="copy-outline" size={17} color={theme.muted} /></Pressable>
                    <Pressable style={styles.rowIconButton} onPress={() => handleDelete(letterhead)}><Ionicons name="trash-outline" size={17} color={Colors.error} /></Pressable>
                    <Pressable style={styles.rowIconButton} onPress={() => router.push(appRoute("/preview", { type: "letterhead", letterheadId: letterhead.id || "", action: "pdf" }) as never)}><Ionicons name="document-attach-outline" size={17} color={theme.muted} /></Pressable>
                    <Pressable style={styles.rowIconButton} onPress={() => router.push(appRoute("/preview", { type: "letterhead", letterheadId: letterhead.id || "", action: "print" }) as never)}><Ionicons name="print-outline" size={17} color={theme.muted} /></Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}><Ionicons name="newspaper-outline" size={28} color={theme.orange} /></View>
                <Text style={styles.emptyTitle}>No letterheads created yet</Text>
                <Text style={styles.emptyText}>Created letterheads will appear here with number, name, date, and status.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function ToolbarButton({ label, icon, active, onPress }: { label?: string; icon?: keyof typeof Ionicons.glyphMap; active?: boolean; onPress: () => void }) {
  const { theme, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  return (
    <Pressable style={[styles.toolbarButton, active && styles.toolbarButtonActive]} onPress={onPress}>
      {icon ? <Ionicons name={icon} size={17} color={active ? "#FFFFFF" : theme.ink} /> : <Text style={[styles.toolbarText, active && styles.toolbarTextActive]}>{label}</Text>}
    </Pressable>
  );
}

function LetterheadPaper({
  letterhead,
  updateLetterheadField,
  updateCompanyField,
  updateBody,
  scale,
}: {
  letterhead: LetterheadRecord;
  updateLetterheadField: (field: keyof LetterheadRecord, value: string | boolean) => void;
  updateCompanyField: (field: keyof LetterheadRecord["company"], value: string) => void;
  updateBody: (value: string) => void;
  scale?: number;
}) {
  const { theme, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const lineHeight = letterhead.bodyFormatting.spacing === "compact" ? 20 : letterhead.bodyFormatting.spacing === "relaxed" ? 30 : 24;

  return (
    <View style={[
      styles.a4Paper,
      { padding: 32, backgroundColor: DocumentColors.paper, position: "relative" },
      scale !== undefined && {
        transform: [{ scale: scale }],
        position: "absolute",
      }
    ]}>
      <DocumentWatermark />

      <DocumentBrandHeader
        company={{
          name: letterhead.company.name,
          tagline: letterhead.company.tagline,
          address: letterhead.company.address,
          phone: letterhead.company.phone,
          email: letterhead.company.email,
          website: letterhead.company.website,
        }}
        editable
        onCompanyChange={(field, value) => {
          if (field === "name") updateCompanyField("name", value);
          if (field === "tagline") updateCompanyField("tagline", value);
          if (field === "address") updateCompanyField("address", value);
          if (field === "phone") updateCompanyField("phone", value);
          if (field === "email") updateCompanyField("email", value);
          if (field === "website") updateCompanyField("website", value);
        }}
      />

      <DocumentTaxBar gstin={letterhead.company.taxNumber} />

      {/* Document Meta Row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <TextInput style={{ fontSize: 16, fontWeight: "900", color: "#0F172A", flex: 1 }} value={letterhead.documentName} onChangeText={(value) => updateLetterheadField("documentName", value)} />
        <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginRight: 12 }}>{letterhead.letterheadNumber}</Text>
        <TextInput style={{ fontSize: 11, fontWeight: "800", color: "#64748B", borderBottomWidth: 1, borderBottomColor: "#CBD5E1", width: 90, textAlign: "right" }} value={letterhead.documentDate} onChangeText={(value) => updateLetterheadField("documentDate", value)} />
      </View>

      {/* Editable Letter Body */}
      <TextInput
        style={{
          color: "#0F172A",
          flex: 1,
          fontSize: 14,
          minHeight: 520,
          paddingVertical: 12,
          fontWeight: letterhead.bodyFormatting.bold ? "800" : "400",
          fontStyle: letterhead.bodyFormatting.italic ? "italic" : "normal",
          textDecorationLine: letterhead.bodyFormatting.underline ? "underline" : "none",
          textAlign: letterhead.bodyFormatting.alignment,
          lineHeight,
        }}
        value={letterhead.body}
        onChangeText={updateBody}
        multiline
        placeholder="Type official letterhead body content here..."
        placeholderTextColor="#94A3B8"
        textAlignVertical="top"
      />

      {/* Signature Area */}
      <View style={styles.signatureStrip}>
        <View style={styles.signatureControls}>
          {(["none", "business", "manual"] as SignatureMode[]).map((mode) => (
            <Pressable key={mode} style={[styles.signaturePill, letterhead.signatureMode === mode && styles.signaturePillActive]} onPress={() => updateLetterheadField("signatureMode", mode)}>
              <Text style={[styles.signaturePillText, letterhead.signatureMode === mode && styles.signaturePillTextActive]}>{mode === "none" ? "No Signature" : mode === "business" ? "Business Signature" : "Manual Signature"}</Text>
            </Pressable>
          ))}
          <Pressable style={[styles.signaturePill, letterhead.showStamp && styles.signaturePillActive]} onPress={() => updateLetterheadField("showStamp", !letterhead.showStamp)}>
            <Text style={[styles.signaturePillText, letterhead.showStamp && styles.signaturePillTextActive]}>Stamp</Text>
          </Pressable>
        </View>
        <View style={styles.signatureArea}>
          {letterhead.showStamp && letterhead.company.stampUrl ? <Image source={{ uri: letterhead.company.stampUrl }} style={styles.stampImage} contentFit="contain" /> : null}
          {letterhead.signatureMode === "business" && letterhead.company.signatureUrl ? <Image source={{ uri: letterhead.company.signatureUrl }} style={styles.signatureImage} contentFit="contain" /> : null}
          {letterhead.signatureMode === "manual" ? <TextInput style={styles.manualSignatureInput} value={letterhead.manualSignature} onChangeText={(value) => updateLetterheadField("manualSignature", value)} placeholder="Manual signature" /> : null}
        </View>
      </View>

      {/* Bottom Footer Bar */}
      <DocumentFooter phone={letterhead.company.phone} email={letterhead.company.email} website={letterhead.company.website} />
    </View>
  );
}

function InlineInput({ value, onChangeText, multiline, textStyle, placeholder }: { value: string; onChangeText: (value: string) => void; multiline?: boolean; textStyle?: object; placeholder?: string }) {
  const { theme, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  return <TextInput style={[styles.inlineInput, textStyle]} value={value} onChangeText={onChangeText} multiline={multiline} placeholder={placeholder} placeholderTextColor="#A0A0A0" />;
}

const shadow = Platform.select({
  web: {
    boxShadow: "0px 8px 18px rgba(0, 0, 0, 0.07)",
  },
  default: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
});

const createStyles = (theme: ThemePalette, isDark: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  webSafeArea: { backgroundColor: theme.wash },
  keyboardView: { flex: 1 },
  moduleContent: { alignSelf: "center", maxWidth: 680, padding: 18, width: "100%" },
  webModuleContent: { maxWidth: 1040, paddingHorizontal: 40, paddingBottom: 56, paddingTop: 38 },
  moduleHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  headerButton: { alignItems: "center", backgroundColor: theme.card, borderColor: theme.line, borderRadius: 14, borderWidth: 1, height: 40, justifyContent: "center", width: 40, ...shadow },
  headerSpacer: { width: 44 },
  moduleTitle: { color: theme.ink, fontSize: 24, fontWeight: "900" },
  createButton: { alignItems: "center", backgroundColor: theme.orange, borderRadius: 20, flexDirection: "row", gap: 12, marginBottom: 18, padding: 18 },
  createIcon: { alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.18)", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  createText: { color: "#FFFFFF", flex: 1, fontSize: 17, fontWeight: "800" },
  previousCard: { backgroundColor: theme.card, borderColor: theme.line, borderRadius: 20, borderWidth: 1, padding: 18, ...shadow },
  previousTitle: { color: theme.ink, fontSize: 18, fontWeight: "800", marginBottom: 14 },
  previousRow: { borderTopColor: theme.line, borderTopWidth: 1, paddingVertical: 12 },
  previousMain: { alignItems: "center", flexDirection: "row" },
  previousIcon: { alignItems: "center", backgroundColor: theme.orangeSoft, borderRadius: 14, height: 40, justifyContent: "center", marginRight: 12, width: 40 },
  previousCopy: { flex: 1 },
  previousNumber: { color: theme.ink, fontSize: 14, fontWeight: "800", marginBottom: 3 },
  previousMeta: { color: theme.muted, fontSize: 12 },
  previousActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", marginTop: 10 },
  rowIconButton: { alignItems: "center", backgroundColor: theme.wash, borderColor: theme.line, borderRadius: 12, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
  emptyState: { alignItems: "center", borderColor: theme.line, borderRadius: 18, borderStyle: "dashed", borderWidth: 1, paddingHorizontal: 18, paddingVertical: 34 },
  emptyIcon: { alignItems: "center", backgroundColor: theme.orangeSoft, borderRadius: 22, height: 56, justifyContent: "center", marginBottom: 14, width: 56 },
  emptyTitle: { color: theme.ink, fontSize: 17, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  emptyText: { color: theme.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  editorHeader: { alignItems: "center", backgroundColor: theme.card, borderBottomColor: theme.line, borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  editorTitle: { color: theme.ink, flex: 1, fontSize: 18, fontWeight: "800", textAlign: "center" },
  editorActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  saveButton: { backgroundColor: theme.orange, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 },
  saveButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  secondaryButton: { backgroundColor: theme.card, borderColor: theme.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  secondaryButtonText: { color: theme.ink, fontSize: 12, fontWeight: "800" },
  disabledButton: { opacity: 0.7 },
  toolbar: { alignItems: "center", backgroundColor: theme.card, borderBottomColor: theme.line, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  toolbarButton: { alignItems: "center", borderColor: theme.line, borderRadius: 10, borderWidth: 1, height: 34, justifyContent: "center", minWidth: 34, paddingHorizontal: 8 },
  toolbarButtonActive: { backgroundColor: theme.orange, borderColor: theme.orange },
  toolbarText: { color: theme.ink, fontSize: 12, fontWeight: "900" },
  toolbarTextActive: { color: "#FFFFFF" },
  phoneHorizontalWorkspace: { minWidth: 860 },
  editorContent: { alignSelf: "center", minWidth: 820, paddingHorizontal: 14, paddingBottom: 96, paddingTop: 14, width: "100%", backgroundColor: theme.background },
  webEditorContent: { maxWidth: 1120, paddingHorizontal: 40, paddingTop: 24 },
  a4Paper: { alignSelf: "center", aspectRatio: 210 / 297, backgroundColor: "#FFFFFF", borderColor: "#D9D9D9", borderRadius: 2, borderWidth: 1, maxWidth: 794, minHeight: 1123, padding: 28, width: 794, ...shadow },
  paperHeader: { borderBottomColor: theme.orange, borderBottomWidth: 3, flexDirection: "row", gap: 16, paddingBottom: 18 },
  logoBox: { alignItems: "center", borderColor: "#DADADA", borderRadius: 6, borderWidth: 1, height: 78, justifyContent: "center", overflow: "hidden", width: 92 },
  logoImage: { height: "100%", width: "100%" },
  logoInitials: { color: theme.orangeDark, fontSize: 22, fontWeight: "900" },
  companyBlock: { flex: 1 },
  inlineInput: { color: "#111111", padding: 0 },
  inlineRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  companyName: { color: "#111111", fontSize: 27, fontWeight: "900", lineHeight: 34 },
  companyTagline: { color: theme.orangeDark, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  companyAddress: { color: "#333333", fontSize: 11, lineHeight: 16 },
  companyMeta: { color: "#555555", fontSize: 11, lineHeight: 16 },
  documentMetaRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 12 },
  documentNameInput: { color: "#111111", flex: 1, fontSize: 16, fontWeight: "900", padding: 0 },
  letterheadNumber: { color: theme.muted, fontSize: 11, fontWeight: "800" },
  dateInput: { borderBottomColor: "#CFCFCF", borderBottomWidth: 1, color: theme.muted, fontSize: 11, fontWeight: "800", padding: 0, textAlign: "right", width: 92 },
  bodyInput: { color: "#222222", flex: 1, fontSize: 14, minHeight: 710, paddingVertical: 12 },
  signatureStrip: { alignItems: "flex-end", minHeight: 90 },
  signatureControls: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", marginBottom: 8 },
  signaturePill: { borderColor: theme.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  signaturePillActive: { backgroundColor: theme.orangeSoft, borderColor: theme.orange },
  signaturePillText: { color: theme.muted, fontSize: 10, fontWeight: "800" },
  signaturePillTextActive: { color: theme.orangeDark },
  signatureArea: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "flex-end", minHeight: 54 },
  signatureImage: { height: 52, width: 140 },
  stampImage: { height: 58, width: 82 },
  manualSignatureInput: { borderBottomColor: "#BBBBBB", borderBottomWidth: 1, color: "#111111", fontSize: 18, fontStyle: "italic", minWidth: 180, padding: 0, textAlign: "center" },
  paperFooter: { borderTopColor: theme.orange, borderTopWidth: 2, paddingTop: 8 },
  footerText: { color: "#555555", fontSize: 10, lineHeight: 14, textAlign: "center" },
  pageNumber: { color: "#777777", fontSize: 9, marginTop: 4, textAlign: "right" },
});
