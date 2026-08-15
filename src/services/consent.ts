import { User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Platform } from "react-native";

import { db } from "@/firebase";
import { CONSENT_VERSION, COOKIE_POLICY_VERSION, PRIVACY_POLICY_VERSION, TERMS_VERSION } from "@/services/legal-content";

export type ConsentPreferences = {
  userId?: string | null;
  anonymousId?: string;
  consentVersion: string;
  privacyPolicyVersion: string;
  termsVersion: string;
  cookiePolicyVersion: string;
  essential: true;
  preferences: boolean;
  analytics: boolean;
  crashDiagnostics: boolean;
  marketing: boolean;
  productUpdates: boolean;
  personalizedAdvertising: boolean;
  thirdPartyContent: boolean;
  acceptedAt?: string;
  updatedAt: string;
  expiresAt?: string;
  platform: string;
  countryOrRegion?: string;
  sourceScreen: string;
};

const LOCAL_CONSENT_KEY = "branddocs.consentPreferences";
const LOCAL_SESSION_KEY = "branddocs.anonymousSessionId";
const CONSENT_EXPIRY_DAYS = 365;

function getLocalStorage() {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  return globalThis.localStorage;
}

export function getPlatformLabel() {
  return Platform.OS === "web" ? "website" : `${Platform.OS}-app`;
}

export function getCountryOrRegion() {
  if (typeof navigator !== "undefined") return navigator.language || undefined;
  return undefined;
}

export function getAnonymousSessionId() {
  const storage = getLocalStorage();
  if (!storage) return `session-${Date.now()}`;
  const existing = storage.getItem(LOCAL_SESSION_KEY);
  if (existing) return existing;
  const generated = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  storage.setItem(LOCAL_SESSION_KEY, generated);
  return generated;
}

function getExpiryDate(from = new Date()) {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + CONSENT_EXPIRY_DAYS);
  return expiresAt.toISOString();
}

export function createDefaultConsent(sourceScreen = "default"): ConsentPreferences {
  const now = new Date();
  return {
    anonymousId: getAnonymousSessionId(),
    consentVersion: CONSENT_VERSION,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    termsVersion: TERMS_VERSION,
    cookiePolicyVersion: COOKIE_POLICY_VERSION,
    essential: true,
    preferences: false,
    analytics: false,
    crashDiagnostics: false,
    marketing: false,
    productUpdates: false,
    personalizedAdvertising: false,
    thirdPartyContent: false,
    updatedAt: now.toISOString(),
    expiresAt: getExpiryDate(now),
    platform: getPlatformLabel(),
    countryOrRegion: getCountryOrRegion(),
    sourceScreen,
  };
}

export function loadLocalConsent(): ConsentPreferences | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  const raw = storage.getItem(LOCAL_CONSENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentPreferences;
    if (parsed.consentVersion !== CONSENT_VERSION) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) return null;
    return { ...createDefaultConsent(parsed.sourceScreen || "local"), ...parsed, essential: true };
  } catch (error) {
    console.warn("BrandDocs consent preferences could not be parsed.", error);
    return null;
  }
}

export function saveLocalConsent(preferences: ConsentPreferences) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(LOCAL_CONSENT_KEY, JSON.stringify(preferences));
}

export function hasConsentCategory(category: "analytics" | "marketing" | "preferences" | "personalizedAdvertising" | "thirdPartyContent" | "crashDiagnostics" | "productUpdates") {
  return Boolean(loadLocalConsent()?.[category]);
}

export async function loadConsentPreferences(user?: User | null): Promise<ConsentPreferences | null> {
  const localPreferences = loadLocalConsent();
  if (!user) return localPreferences;

  try {
    const consentSnap = await getDoc(doc(db, "consentPreferences", user.uid));
    if (!consentSnap.exists()) return localPreferences;
    const remote = consentSnap.data() as ConsentPreferences;
    if (!localPreferences) return { ...remote, essential: true as true };
    return new Date(remote.updatedAt || 0).getTime() >= new Date(localPreferences.updatedAt || 0).getTime()
      ? { ...remote, essential: true as true }
      : localPreferences;
  } catch (error) {
    console.warn("BrandDocs consent preference load failed; using local preferences.", error);
    return localPreferences;
  }
}

export async function saveConsentPreferences(preferences: Partial<ConsentPreferences>, user?: User | null, sourceScreen = "consent-center") {
  const now = new Date();
  const existing = (await loadConsentPreferences(user)) || createDefaultConsent(sourceScreen);
  const nextPreferences: ConsentPreferences = {
    ...existing,
    ...preferences,
    userId: user?.uid || existing.userId || null,
    anonymousId: existing.anonymousId || getAnonymousSessionId(),
    consentVersion: CONSENT_VERSION,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    termsVersion: TERMS_VERSION,
    cookiePolicyVersion: COOKIE_POLICY_VERSION,
    essential: true,
    acceptedAt: existing.acceptedAt || now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: getExpiryDate(now),
    platform: getPlatformLabel(),
    countryOrRegion: getCountryOrRegion(),
    sourceScreen,
  };

  saveLocalConsent(nextPreferences);

  if (user) {
    try {
      await setDoc(doc(db, "consentPreferences", user.uid), nextPreferences, { merge: true });
      await addDoc(collection(db, "consentHistory"), { ...nextPreferences, userId: user.uid, recordedAt: serverTimestamp() });
    } catch (error) {
      console.warn("BrandDocs consent preference sync failed; local choice was saved.", error);
    }
  }

  return nextPreferences;
}

export async function saveLegalAcceptance(user: User, marketingOptIn: boolean, sourceScreen = "signup") {
  const acceptedAt = new Date().toISOString();
  await saveConsentPreferences({ marketing: marketingOptIn, productUpdates: marketingOptIn, acceptedAt }, user, sourceScreen);

  try {
    const record = {
      userId: user.uid,
      termsVersion: TERMS_VERSION,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      acceptedAt,
      platform: getPlatformLabel(),
      sourceScreen,
    };
    await setDoc(doc(db, "legalAcceptances", user.uid), { ...record, updatedAt: serverTimestamp() }, { merge: true });
    await addDoc(collection(db, "legalAcceptanceHistory"), { ...record, recordedAt: serverTimestamp() });
  } catch (error) {
    console.warn("BrandDocs legal acceptance sync failed; consent was saved locally.", error);
  }
}

export async function createPrivacyRequest(user: User | null, requestType: string, details: Record<string, unknown>) {
  if (!user) throw new Error("Please sign in before submitting this request.");
  const requestRef = await addDoc(collection(db, "privacyRequests"), {
    userId: user.uid,
    email: user.email || null,
    requestType,
    details,
    status: "received",
    platform: getPlatformLabel(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return requestRef.id;
}
