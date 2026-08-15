import { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/firebase";
import { BusinessProfile } from "@/services/business-profile";

export type LetterheadStatus = "draft" | "final";
export type SignatureMode = "none" | "business" | "manual";
export type TextAlignment = "left" | "center" | "right";

export type LetterheadRecord = {
  id?: string;
  businessId?: string;
  userId?: string;
  letterheadNumber: string;
  numberingSequence: number;
  documentName: string;
  documentDate: string;
  status: LetterheadStatus;
  businessProfileSnapshot?: Partial<BusinessProfile> | null;
  company: {
    logoUrl?: string | null;
    name: string;
    tagline: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    phone: string;
    email: string;
    website: string;
    taxNumber: string;
    registrationNumber: string;
    bankDetails: string;
    signatureUrl?: string | null;
    stampUrl?: string | null;
  };
  body: string;
  bodyFormatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    alignment: TextAlignment;
    spacing: "compact" | "normal" | "relaxed";
  };
  signatureMode: SignatureMode;
  manualSignature: string;
  showStamp: boolean;
  showPageNumber: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LetterheadSaveResult = {
  letterhead: LetterheadRecord;
  source: "firebase" | "local-fallback";
  warning?: string;
};

const LOCAL_LETTERHEAD_KEY_PREFIX = "branddocs.letterheads";

function getLocalStorage() {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  return globalThis.localStorage;
}

function getLocalKey(userId?: string, businessId?: string) {
  return `${LOCAL_LETTERHEAD_KEY_PREFIX}.${userId || "guest"}.${businessId || "no-business"}`;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: unknown): LetterheadStatus {
  return String(value || "draft").toLowerCase() === "final" ? "final" : "draft";
}

function normalizeSignatureMode(value: unknown): SignatureMode {
  if (value === "business" || value === "manual") return value;
  return "none";
}

function getSequenceFromNumber(letterheadNumber: string, year: string) {
  const match = letterheadNumber.match(/^LTR-(\d{4})-(\d{4})$/);
  if (!match || match[1] !== year) return 0;
  return Number(match[2] || 0);
}

export function generateNextLetterheadNumber(letterheads: LetterheadRecord[], date = new Date()) {
  const year = String(date.getFullYear());
  const maxSequence = letterheads.reduce((currentMax, letterhead) => {
    const savedSequence = String(letterhead.letterheadNumber).includes(`LTR-${year}-`) ? Number(letterhead.numberingSequence || 0) : 0;
    return Math.max(currentMax, savedSequence, getSequenceFromNumber(letterhead.letterheadNumber, year));
  }, 0);
  const nextSequence = maxSequence + 1;

  return {
    letterheadNumber: `LTR-${year}-${String(nextSequence).padStart(4, "0")}`,
    numberingSequence: nextSequence,
  };
}

function normalizeLetterhead(value: any): LetterheadRecord | null {
  if (!value || typeof value !== "object") return null;

  const letterheadNumber = String(value.letterheadNumber || value.number || "");
  if (!letterheadNumber) return null;

  return {
    ...value,
    letterheadNumber,
    numberingSequence: toNumber(value.numberingSequence),
    documentName: value.documentName || "Letterhead",
    documentDate: value.documentDate || value.date || new Date().toISOString().slice(0, 10),
    status: normalizeStatus(value.status),
    company: {
      logoUrl: value.company?.logoUrl || null,
      name: value.company?.name || "",
      tagline: value.company?.tagline || "",
      address: value.company?.address || "",
      city: value.company?.city || "",
      state: value.company?.state || "",
      country: value.company?.country || "",
      postalCode: value.company?.postalCode || "",
      phone: value.company?.phone || "",
      email: value.company?.email || "",
      website: value.company?.website || "",
      taxNumber: value.company?.taxNumber || "",
      registrationNumber: value.company?.registrationNumber || "",
      bankDetails: value.company?.bankDetails || "",
      signatureUrl: value.company?.signatureUrl || null,
      stampUrl: value.company?.stampUrl || null,
    },
    body: value.body || "",
    bodyFormatting: {
      bold: Boolean(value.bodyFormatting?.bold),
      italic: Boolean(value.bodyFormatting?.italic),
      underline: Boolean(value.bodyFormatting?.underline),
      alignment: value.bodyFormatting?.alignment || "left",
      spacing: value.bodyFormatting?.spacing || "normal",
    },
    signatureMode: normalizeSignatureMode(value.signatureMode),
    manualSignature: value.manualSignature || "",
    showStamp: Boolean(value.showStamp),
    showPageNumber: value.showPageNumber !== false,
  };
}

function saveLocalLetterheads(userId: string | undefined, businessId: string | undefined, letterheads: LetterheadRecord[]) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(getLocalKey(userId, businessId), JSON.stringify(letterheads));
}

function loadLocalLetterheads(userId?: string, businessId?: string) {
  const storage = getLocalStorage();
  if (!storage) return [];

  const rawLetterheads = storage.getItem(getLocalKey(userId, businessId));
  if (!rawLetterheads) return [];

  try {
    const parsed = JSON.parse(rawLetterheads);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeLetterhead)
      .filter((letterhead): letterhead is LetterheadRecord => Boolean(letterhead));
  } catch (error) {
    console.warn("BrandDocs local letterheads could not be parsed.", error);
    return [];
  }
}

function sortLetterheads(first: LetterheadRecord, second: LetterheadRecord) {
  const dateDifference = new Date(second.documentDate).getTime() - new Date(first.documentDate).getTime();
  if (dateDifference !== 0) return dateDifference;
  return second.letterheadNumber.localeCompare(first.letterheadNumber);
}

function isVisibleToUser(letterhead: LetterheadRecord, userId?: string) {
  return !letterhead.userId || !userId || letterhead.userId === userId;
}

function mergeLetterheads(existing: LetterheadRecord[], incoming: LetterheadRecord[]) {
  const byKey = new Map<string, LetterheadRecord>();
  [...existing, ...incoming].forEach((letterhead) => {
    byKey.set(letterhead.id || letterhead.letterheadNumber, letterhead);
  });
  return Array.from(byKey.values()).sort(sortLetterheads);
}

export async function loadLetterheads(user: User | null, profile: BusinessProfile | null, maxCount = 50): Promise<LetterheadRecord[]> {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId) {
    try {
      const letterheadQuery = query(collection(db, "letterheads"), where("businessId", "==", businessId));
      const letterheadSnap = await getDocs(letterheadQuery);
      const letterheads = letterheadSnap.docs
        .map((letterheadDoc) => normalizeLetterhead({ id: letterheadDoc.id, ...letterheadDoc.data() }))
        .filter((letterhead): letterhead is LetterheadRecord => Boolean(letterhead))
        .filter((letterhead) => isVisibleToUser(letterhead, userId))
        .sort(sortLetterheads)
        .slice(0, maxCount);

      saveLocalLetterheads(userId, businessId, mergeLetterheads(loadLocalLetterheads(userId, businessId), letterheads));
      return letterheads;
    } catch (error) {
      console.warn("BrandDocs Firebase letterhead load failed; using local fallback if available.", error);
    }
  }

  return loadLocalLetterheads(userId, businessId)
    .filter((letterhead) => isVisibleToUser(letterhead, userId))
    .sort(sortLetterheads)
    .slice(0, maxCount);
}

export async function loadLetterheadById(user: User | null, profile: BusinessProfile | null, letterheadId: string): Promise<LetterheadRecord | null> {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId && !letterheadId.startsWith("local-")) {
    try {
      const letterheadSnap = await getDoc(doc(db, "letterheads", letterheadId));
      const letterhead = letterheadSnap.exists() ? normalizeLetterhead({ id: letterheadSnap.id, ...letterheadSnap.data() }) : null;
      if (letterhead && letterhead.businessId === businessId && isVisibleToUser(letterhead, userId)) return letterhead;
    } catch (error) {
      console.warn("BrandDocs Firebase letterhead preview load failed; using local fallback if available.", error);
    }
  }

  return loadLocalLetterheads(userId, businessId).find((letterhead) => letterhead.id === letterheadId) || null;
}

export async function saveLetterhead(user: User | null, profile: BusinessProfile | null, letterhead: LetterheadRecord): Promise<LetterheadSaveResult> {
  const businessId = profile?.id;
  const userId = user?.uid;
  const now = new Date().toISOString();
  const letterheadPayload: LetterheadRecord = {
    ...letterhead,
    businessId,
    userId,
    status: normalizeStatus(letterhead.status),
    createdAt: letterhead.createdAt || now,
    updatedAt: now,
    businessProfileSnapshot: letterhead.businessProfileSnapshot || profile || null,
  };

  const upsertLocal = (savedLetterhead: LetterheadRecord) => {
    const localLetterheads = loadLocalLetterheads(userId, businessId);
    saveLocalLetterheads(userId, businessId, mergeLetterheads(localLetterheads.filter((current) => current.id !== savedLetterhead.id), [savedLetterhead]));
  };

  if (user && businessId) {
    try {
      if (letterheadPayload.id && !letterheadPayload.id.startsWith("local-")) {
        await setDoc(doc(db, "letterheads", letterheadPayload.id), {
          ...letterheadPayload,
          createdAt: letterhead.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        upsertLocal(letterheadPayload);
        return { letterhead: letterheadPayload, source: "firebase" };
      }

      const letterheadRef = await addDoc(collection(db, "letterheads"), {
        ...letterheadPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const savedLetterhead = { ...letterheadPayload, id: letterheadRef.id };
      upsertLocal(savedLetterhead);
      return { letterhead: savedLetterhead, source: "firebase" };
    } catch (error: any) {
      console.warn("BrandDocs Firebase letterhead save failed; letterhead saved to local fallback.", error);
      const localLetterhead = { ...letterheadPayload, id: letterheadPayload.id || `local-${Date.now()}` };
      upsertLocal(localLetterhead);
      return {
        letterhead: localLetterhead,
        source: "local-fallback",
        warning: error?.message || "Firebase letterhead save failed. Letterhead was saved locally on this device.",
      };
    }
  }

  const localLetterhead = { ...letterheadPayload, id: letterheadPayload.id || `local-${Date.now()}` };
  upsertLocal(localLetterhead);
  return {
    letterhead: localLetterhead,
    source: "local-fallback",
    warning: "No active Firebase user or business profile was available, so the letterhead was saved locally on this device.",
  };
}

export async function deleteLetterhead(user: User | null, profile: BusinessProfile | null, letterhead: LetterheadRecord) {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId && letterhead.id && !letterhead.id.startsWith("local-")) {
    await deleteDoc(doc(db, "letterheads", letterhead.id));
  }

  const localLetterheads = loadLocalLetterheads(userId, businessId);
  saveLocalLetterheads(userId, businessId, localLetterheads.filter((current) => {
    return current.id !== letterhead.id && current.letterheadNumber !== letterhead.letterheadNumber;
  }));
}
