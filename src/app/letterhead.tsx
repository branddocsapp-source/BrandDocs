import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

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
import { Colors } from "@/theme/colors";

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

  function printLetterhead() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
      return;
    }
    Alert.alert("Print", "Native PDF/print requires Expo print support; web print is available in this build.");
  }

  if (draftLetterhead) {
    return (
      <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.editorHeader}>
              <Pressable style={styles.headerButton} onPress={() => setDraftLetterhead(null)} accessibilityRole="button" accessibilityLabel="Back">
                <Ionicons name="chevron-back" size={22} color={Colors.text} />
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

            <ScrollView horizontal={isPhone} contentContainerStyle={isPhone ? styles.phoneHorizontalWorkspace : undefined} showsHorizontalScrollIndicator={isPhone}>
              <ScrollView contentContainerStyle={[styles.editorContent, isWebsite && styles.webEditorContent]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <LetterheadPaper
                  letterhead={draftLetterhead}
                  updateLetterheadField={updateLetterheadField}
                  updateCompanyField={updateCompanyField}
                  updateBody={updateBody}
                />
              </ScrollView>
            </ScrollView>
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
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
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
                    <View style={styles.previousIcon}><Ionicons name="newspaper-outline" size={18} color={Colors.primary} /></View>
                    <View style={styles.previousCopy}>
                      <Text style={styles.previousNumber}>{letterhead.letterheadNumber}</Text>
                      <Text style={styles.previousMeta}>{letterhead.documentName} • {letterhead.documentDate} • {getStatusLabel(letterhead.status)}</Text>
                    </View>
                  </Pressable>
                  <View style={styles.previousActions}>
                    <Pressable style={styles.rowIconButton} onPress={() => router.push(appRoute("/preview", { type: "letterhead", letterheadId: letterhead.id || "" }) as never)}><Ionicons name="eye-outline" size={17} color={Colors.textSecondary} /></Pressable>
                    <Pressable style={styles.rowIconButton} onPress={() => setDraftLetterhead(letterhead)}><Ionicons name="create-outline" size={17} color={Colors.textSecondary} /></Pressable>
                    <Pressable style={styles.rowIconButton} onPress={() => duplicateLetterhead(letterhead)}><Ionicons name="copy-outline" size={17} color={Colors.textSecondary} /></Pressable>
                    <Pressable style={styles.rowIconButton} onPress={() => handleDelete(letterhead)}><Ionicons name="trash-outline" size={17} color={Colors.error} /></Pressable>
                    <Pressable style={styles.rowIconButton} onPress={() => router.push(appRoute("/preview", { type: "letterhead", letterheadId: letterhead.id || "", action: "pdf" }) as never)}><Ionicons name="document-attach-outline" size={17} color={Colors.textSecondary} /></Pressable>
                    <Pressable style={styles.rowIconButton} onPress={() => router.push(appRoute("/preview", { type: "letterhead", letterheadId: letterhead.id || "", action: "print" }) as never)}><Ionicons name="print-outline" size={17} color={Colors.textSecondary} /></Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}><Ionicons name="newspaper-outline" size={28} color={Colors.primary} /></View>
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
  return (
    <Pressable style={[styles.toolbarButton, active && styles.toolbarButtonActive]} onPress={onPress}>
      {icon ? <Ionicons name={icon} size={17} color={active ? "#FFFFFF" : Colors.text} /> : <Text style={[styles.toolbarText, active && styles.toolbarTextActive]}>{label}</Text>}
    </Pressable>
  );
}

function LetterheadPaper({
  letterhead,
  updateLetterheadField,
  updateCompanyField,
  updateBody,
}: {
  letterhead: LetterheadRecord;
  updateLetterheadField: (field: keyof LetterheadRecord, value: string | boolean) => void;
  updateCompanyField: (field: keyof LetterheadRecord["company"], value: string) => void;
  updateBody: (value: string) => void;
}) {
  const lineHeight = letterhead.bodyFormatting.spacing === "compact" ? 20 : letterhead.bodyFormatting.spacing === "relaxed" ? 30 : 24;

  return (
    <View style={styles.a4Paper}>
      <View style={styles.paperHeader}>
        <View style={styles.logoBox}>
          {letterhead.company.logoUrl ? <Image source={{ uri: letterhead.company.logoUrl }} style={styles.logoImage} contentFit="contain" /> : <Text style={styles.logoInitials}>{getCompanyInitials(letterhead.company.name)}</Text>}
        </View>
        <View style={styles.companyBlock}>
          <InlineInput value={letterhead.company.name} onChangeText={(value) => updateCompanyField("name", value)} textStyle={styles.companyName} />
          <InlineInput value={letterhead.company.tagline} onChangeText={(value) => updateCompanyField("tagline", value)} textStyle={styles.companyTagline} placeholder="Business Tagline" />
          <InlineInput value={letterhead.company.address} onChangeText={(value) => updateCompanyField("address", value)} textStyle={styles.companyAddress} multiline />
          <View style={styles.inlineRow}>
            <InlineInput value={letterhead.company.city} onChangeText={(value) => updateCompanyField("city", value)} textStyle={styles.companyMeta} placeholder="City" />
            <InlineInput value={letterhead.company.state} onChangeText={(value) => updateCompanyField("state", value)} textStyle={styles.companyMeta} placeholder="State" />
            <InlineInput value={letterhead.company.country} onChangeText={(value) => updateCompanyField("country", value)} textStyle={styles.companyMeta} placeholder="Country" />
            <InlineInput value={letterhead.company.postalCode} onChangeText={(value) => updateCompanyField("postalCode", value)} textStyle={styles.companyMeta} placeholder="Postal Code" />
          </View>
          <View style={styles.inlineRow}>
            <InlineInput value={letterhead.company.phone} onChangeText={(value) => updateCompanyField("phone", value)} textStyle={styles.companyMeta} placeholder="Phone" />
            <InlineInput value={letterhead.company.email} onChangeText={(value) => updateCompanyField("email", value)} textStyle={styles.companyMeta} placeholder="Email" />
            <InlineInput value={letterhead.company.website} onChangeText={(value) => updateCompanyField("website", value)} textStyle={styles.companyMeta} placeholder="Website" />
          </View>
          {letterhead.company.taxNumber ? <InlineInput value={`Tax ID: ${letterhead.company.taxNumber}`} onChangeText={(value) => updateCompanyField("taxNumber", value.replace(/^Tax ID:\s*/i, ""))} textStyle={styles.companyMeta} /> : null}
        </View>
      </View>

      <View style={styles.documentMetaRow}>
        <TextInput style={styles.documentNameInput} value={letterhead.documentName} onChangeText={(value) => updateLetterheadField("documentName", value)} />
        <Text style={styles.letterheadNumber}>{letterhead.letterheadNumber}</Text>
        <TextInput style={styles.dateInput} value={letterhead.documentDate} onChangeText={(value) => updateLetterheadField("documentDate", value)} />
      </View>

      <TextInput
        style={[
          styles.bodyInput,
          {
            fontWeight: letterhead.bodyFormatting.bold ? "800" : "400",
            fontStyle: letterhead.bodyFormatting.italic ? "italic" : "normal",
            textDecorationLine: letterhead.bodyFormatting.underline ? "underline" : "none",
            textAlign: letterhead.bodyFormatting.alignment,
            lineHeight,
          },
        ]}
        value={letterhead.body}
        onChangeText={updateBody}
        multiline
        textAlignVertical="top"
      />

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

      <View style={styles.paperFooter}>
        <Text style={styles.footerText}>{letterhead.company.address} {letterhead.company.city} {letterhead.company.state} {letterhead.company.country} {letterhead.company.postalCode}</Text>
        <Text style={styles.footerText}>{letterhead.company.phone} • {letterhead.company.email} • {letterhead.company.website}</Text>
        {letterhead.company.taxNumber ? <Text style={styles.footerText}>Tax ID: {letterhead.company.taxNumber}</Text> : null}
        {letterhead.showPageNumber ? <Text style={styles.pageNumber}>Page 1</Text> : null}
      </View>
    </View>
  );
}

function InlineInput({ value, onChangeText, multiline, textStyle, placeholder }: { value: string; onChangeText: (value: string) => void; multiline?: boolean; textStyle?: object; placeholder?: string }) {
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  webSafeArea: { backgroundColor: Colors.surface },
  keyboardView: { flex: 1 },
  moduleContent: { alignSelf: "center", maxWidth: 520, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, width: "100%" },
  webModuleContent: { maxWidth: 1040, paddingHorizontal: 40, paddingTop: 28, paddingBottom: 52 },
  moduleHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  headerButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#EFEFEF", borderRadius: 18, borderWidth: 1, height: 40, justifyContent: "center", width: 40, ...shadow },
  headerSpacer: { width: 40 },
  moduleTitle: { color: Colors.text, fontSize: 22, fontWeight: "800" },
  createButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    padding: 18,
    elevation: 5,
    ...Platform.select({
      web: {
        boxShadow: "0px 12px 20px rgba(255, 122, 0, 0.22)",
      },
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
      },
    }),
  },
  createIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 16, height: 44, justifyContent: "center", width: 44 },
  createText: { color: "#FFFFFF", flex: 1, fontSize: 17, fontWeight: "800" },
  previousCard: { backgroundColor: "#FFFFFF", borderColor: "#EFEFEF", borderRadius: 20, borderWidth: 1, padding: 18, ...shadow },
  previousTitle: { color: Colors.text, fontSize: 18, fontWeight: "800", marginBottom: 14 },
  previousRow: { borderTopColor: "#EFEFEF", borderTopWidth: 1, paddingVertical: 12 },
  previousMain: { alignItems: "center", flexDirection: "row" },
  previousIcon: { alignItems: "center", backgroundColor: "#FFF4E3", borderRadius: 14, height: 40, justifyContent: "center", marginRight: 12, width: 40 },
  previousCopy: { flex: 1 },
  previousNumber: { color: Colors.text, fontSize: 14, fontWeight: "800", marginBottom: 3 },
  previousMeta: { color: Colors.textSecondary, fontSize: 12 },
  previousActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", marginTop: 10 },
  rowIconButton: { alignItems: "center", backgroundColor: "#FAFAFA", borderColor: "#EEEEEE", borderRadius: 12, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
  emptyState: { alignItems: "center", borderColor: "#F1F1F1", borderRadius: 18, borderStyle: "dashed", borderWidth: 1, paddingHorizontal: 18, paddingVertical: 34 },
  emptyIcon: { alignItems: "center", backgroundColor: "#FFF4E3", borderRadius: 22, height: 56, justifyContent: "center", marginBottom: 14, width: 56 },
  emptyTitle: { color: Colors.text, fontSize: 17, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  emptyText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: "center" },
  editorHeader: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#EFEFEF", borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  editorTitle: { color: Colors.text, flex: 1, fontSize: 18, fontWeight: "800", textAlign: "center" },
  editorActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  saveButton: { backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 },
  saveButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  secondaryButton: { backgroundColor: "#FFFFFF", borderColor: "#EAEAEA", borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  secondaryButtonText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  disabledButton: { opacity: 0.7 },
  toolbar: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#EFEFEF", borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  toolbarButton: { alignItems: "center", borderColor: "#E6E6E6", borderRadius: 10, borderWidth: 1, height: 34, justifyContent: "center", minWidth: 34, paddingHorizontal: 8 },
  toolbarButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toolbarText: { color: Colors.text, fontSize: 12, fontWeight: "900" },
  toolbarTextActive: { color: "#FFFFFF" },
  phoneHorizontalWorkspace: { minWidth: 860 },
  editorContent: { alignSelf: "center", minWidth: 820, paddingHorizontal: 14, paddingBottom: 96, paddingTop: 14, width: "100%" },
  webEditorContent: { maxWidth: 1120, paddingHorizontal: 40, paddingTop: 24 },
  a4Paper: { alignSelf: "center", aspectRatio: 210 / 297, backgroundColor: "#FFFFFF", borderColor: "#D9D9D9", borderRadius: 2, borderWidth: 1, maxWidth: 794, minHeight: 1123, padding: 28, width: 794, ...shadow },
  paperHeader: { borderBottomColor: Colors.primary, borderBottomWidth: 3, flexDirection: "row", gap: 16, paddingBottom: 18 },
  logoBox: { alignItems: "center", borderColor: "#DADADA", borderRadius: 6, borderWidth: 1, height: 78, justifyContent: "center", overflow: "hidden", width: 92 },
  logoImage: { height: "100%", width: "100%" },
  logoInitials: { color: Colors.primaryDark, fontSize: 22, fontWeight: "900" },
  companyBlock: { flex: 1 },
  inlineInput: { color: Colors.text, padding: 0 },
  inlineRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  companyName: { color: "#111111", fontSize: 27, fontWeight: "900", lineHeight: 34 },
  companyTagline: { color: Colors.primaryDark, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  companyAddress: { color: "#333333", fontSize: 11, lineHeight: 16 },
  companyMeta: { color: "#555555", fontSize: 11, lineHeight: 16 },
  documentMetaRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 12 },
  documentNameInput: { color: "#111111", flex: 1, fontSize: 16, fontWeight: "900", padding: 0 },
  letterheadNumber: { color: Colors.textSecondary, fontSize: 11, fontWeight: "800" },
  dateInput: { borderBottomColor: "#CFCFCF", borderBottomWidth: 1, color: Colors.textSecondary, fontSize: 11, fontWeight: "800", padding: 0, textAlign: "right", width: 92 },
  bodyInput: { color: "#222222", flex: 1, fontSize: 14, minHeight: 710, paddingVertical: 12 },
  signatureStrip: { alignItems: "flex-end", minHeight: 90 },
  signatureControls: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", marginBottom: 8 },
  signaturePill: { borderColor: "#E6E6E6", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  signaturePillActive: { backgroundColor: "#FFF4E3", borderColor: Colors.primary },
  signaturePillText: { color: Colors.textSecondary, fontSize: 10, fontWeight: "800" },
  signaturePillTextActive: { color: Colors.primaryDark },
  signatureArea: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "flex-end", minHeight: 54 },
  signatureImage: { height: 52, width: 140 },
  stampImage: { height: 58, width: 82 },
  manualSignatureInput: { borderBottomColor: "#BBBBBB", borderBottomWidth: 1, color: "#111111", fontSize: 18, fontStyle: "italic", minWidth: 180, padding: 0, textAlign: "center" },
  paperFooter: { borderTopColor: Colors.primary, borderTopWidth: 2, paddingTop: 8 },
  footerText: { color: "#555555", fontSize: 10, lineHeight: 14, textAlign: "center" },
  pageNumber: { color: "#777777", fontSize: 9, marginTop: 4, textAlign: "right" },
});
