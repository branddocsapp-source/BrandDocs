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
import { getInvoiceCompanyCode } from "@/services/invoices";

export type QuotationDocumentType = "standard_quotation" | "table_quotation";
export type QuotationStatus = "draft" | "final" | "cancelled";

export type QuotationItem = {
  id: string;
  description: string;
  itemCode?: string;
  quantity: string;
  unit: string;
  rate: string;
  discount: string;
};

export type QuotationRecord = {
  id?: string;
  businessId?: string;
  userId?: string;
  documentType: QuotationDocumentType;
  quotationNumber: string;
  numberingSequence: number;
  quotationDate: string;
  validUntil: string;
  status: QuotationStatus;
  currency: string;
  businessProfileSnapshot?: Partial<BusinessProfile> | null;
  company: {
    logoUrl?: string | null;
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    signatureUrl?: string | null;
    stampUrl?: string | null;
  };
  client: {
    name: string;
    companyName: string;
    address: string;
    email: string;
    phone: string;
  };
  subject: string;
  greeting: string;
  intro: string;
  scope: string;
  milestones: string;
  closing: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  otherCharges: number;
  grandTotal: number;
  amountInWords: string;
  notes: string;
  terms: string;
  cancellationReason?: string;
  finalizedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type QuotationSaveResult = {
  quotation: QuotationRecord;
  source: "firebase" | "local-fallback";
  warning?: string;
};

const LOCAL_QUOTATION_KEY_PREFIX = "branddocs.quotations";

function getLocalStorage() {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  return globalThis.localStorage;
}

function getLocalKey(userId?: string, businessId?: string) {
  return `${LOCAL_QUOTATION_KEY_PREFIX}.${userId || "guest"}.${businessId || "no-business"}`;
}

function toNumber(value: unknown) {
  const parsed = typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: unknown): QuotationStatus {
  const normalized = String(value || "draft").trim().toLowerCase();
  if (normalized === "final" || normalized === "sent" || normalized === "accepted") return "final";
  if (normalized === "cancelled" || normalized === "rejected") return "cancelled";
  return "draft";
}

export function isQuotationLocked(status: QuotationStatus): boolean {
  return status === "final" || status === "cancelled";
}

function normalizeDocumentType(value: any): QuotationDocumentType {
  return value?.documentType === "table_quotation" ? "table_quotation" : "standard_quotation";
}

export function getQuotationLabel(documentType: QuotationDocumentType) {
  return documentType === "table_quotation" ? "Table Quotation" : "Standard Quotation";
}

export function getQuotationTitle(documentType: QuotationDocumentType) {
  return documentType === "table_quotation" ? "TABLE QUOTATION" : "QUOTATION";
}

function getQuotationPrefix(documentType: QuotationDocumentType) {
  return documentType === "table_quotation" ? "TQ" : "QUO";
}

function getSequenceFromQuotationNumber(quotationNumber: string, year: string, documentType: QuotationDocumentType) {
  const prefix = getQuotationPrefix(documentType);
  const match = quotationNumber.match(/^[A-Z0-9]+-(QUO|TQ)-(\d{4})-\d{2}-(\d{3})$/);
  if (!match || match[1] !== prefix || match[2] !== year) return 0;
  return Number(match[3] || 0);
}

export function generateNextQuotationNumber(
  documentType: QuotationDocumentType,
  companyName: string | undefined,
  quotations: QuotationRecord[],
  date = new Date()
) {
  const companyCode = getInvoiceCompanyCode(companyName);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const maxSequence = quotations
    .filter((quotation) => quotation.documentType === documentType)
    .reduce((currentMax, quotation) => {
      const savedSequence = String(quotation.quotationNumber).includes(`-${year}-`) ? Number(quotation.numberingSequence || 0) : 0;
      return Math.max(currentMax, savedSequence, getSequenceFromQuotationNumber(quotation.quotationNumber, year, documentType));
    }, 0);
  const nextSequence = maxSequence + 1;

  return {
    quotationNumber: `${companyCode}-${getQuotationPrefix(documentType)}-${year}-${month}-${String(nextSequence).padStart(3, "0")}`,
    numberingSequence: nextSequence,
  };
}

export function getQuotationItemAmount(item: QuotationItem) {
  const amount = toNumber(item.quantity) * toNumber(item.rate);
  return Math.max(0, amount - toNumber(item.discount));
}

export function calculateQuotationTotals(quotation: Pick<QuotationRecord, "items" | "discount" | "otherCharges">) {
  const subtotal = quotation.items.reduce((total, item) => total + getQuotationItemAmount(item), 0);
  const grandTotal = Math.max(0, subtotal - toNumber(quotation.discount) + toNumber(quotation.otherCharges));
  return { subtotal, grandTotal };
}

function normalizeQuotation(value: any): QuotationRecord | null {
  if (!value || typeof value !== "object") return null;

  const documentType = normalizeDocumentType(value);
  const quotationNumber = String(value.quotationNumber || value.number || "");
  if (!quotationNumber) return null;

  return {
    ...value,
    documentType,
    quotationNumber,
    numberingSequence: toNumber(value.numberingSequence),
    quotationDate: value.quotationDate || value.date || new Date().toISOString().slice(0, 10),
    validUntil: value.validUntil || "",
    status: normalizeStatus(value.status),
    currency: value.currency || value.company?.currency || "INR",
    company: {
      logoUrl: value.company?.logoUrl || null,
      name: value.company?.name || "",
      address: value.company?.address || "",
      email: value.company?.email || "",
      phone: value.company?.phone || "",
      website: value.company?.website || "",
      signatureUrl: value.company?.signatureUrl || null,
      stampUrl: value.company?.stampUrl || null,
    },
    client: {
      name: value.client?.name || value.customerName || "",
      companyName: value.client?.companyName || "",
      address: value.client?.address || "",
      email: value.client?.email || "",
      phone: value.client?.phone || "",
    },
    subject: value.subject || "",
    greeting: value.greeting || "Dear Client,",
    intro: value.intro || "",
    scope: value.scope || "",
    milestones: value.milestones || "",
    closing: value.closing || "We look forward to working with you.",
    items: Array.isArray(value.items) ? value.items : [],
    subtotal: toNumber(value.subtotal),
    discount: toNumber(value.discount),
    otherCharges: toNumber(value.otherCharges),
    grandTotal: toNumber(value.grandTotal),
    amountInWords: value.amountInWords || "",
    notes: value.notes || "",
    terms: value.terms || "",
  };
}

function saveLocalQuotations(userId: string | undefined, businessId: string | undefined, quotations: QuotationRecord[]) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(getLocalKey(userId, businessId), JSON.stringify(quotations));
}

function loadLocalQuotations(userId?: string, businessId?: string) {
  const storage = getLocalStorage();
  if (!storage) return [];

  const rawQuotations = storage.getItem(getLocalKey(userId, businessId));
  if (!rawQuotations) return [];

  try {
    const parsed = JSON.parse(rawQuotations);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeQuotation)
      .filter((quotation): quotation is QuotationRecord => Boolean(quotation));
  } catch (error) {
    console.warn("BrandDocs local quotations could not be parsed.", error);
    return [];
  }
}

function sortQuotations(first: QuotationRecord, second: QuotationRecord) {
  const dateDifference = new Date(second.quotationDate).getTime() - new Date(first.quotationDate).getTime();
  if (dateDifference !== 0) return dateDifference;
  return second.quotationNumber.localeCompare(first.quotationNumber);
}

function isVisibleToUser(quotation: QuotationRecord, userId?: string) {
  return !quotation.userId || !userId || quotation.userId === userId;
}

function filterQuotations(quotations: QuotationRecord[], documentType?: QuotationDocumentType, userId?: string, maxCount = 50) {
  return quotations
    .filter((quotation) => isVisibleToUser(quotation, userId))
    .filter((quotation) => !documentType || quotation.documentType === documentType)
    .sort(sortQuotations)
    .slice(0, maxCount);
}

function mergeQuotations(existing: QuotationRecord[], incoming: QuotationRecord[]) {
  const byKey = new Map<string, QuotationRecord>();
  [...existing, ...incoming].forEach((quotation) => {
    byKey.set(quotation.id || quotation.quotationNumber, quotation);
  });
  return Array.from(byKey.values()).sort(sortQuotations);
}

export async function loadQuotations(
  user: User | null,
  profile: BusinessProfile | null,
  documentType?: QuotationDocumentType,
  maxCount = 50
): Promise<QuotationRecord[]> {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId) {
    try {
      const constraints = documentType === "table_quotation"
        ? [where("businessId", "==", businessId), where("documentType", "==", "table_quotation")]
        : [where("businessId", "==", businessId)];
      const quotationQuery = query(collection(db, "quotations"), ...constraints);
      const quotationSnap = await getDocs(quotationQuery);
      const quotations = filterQuotations(
        quotationSnap.docs
          .map((quotationDoc) => normalizeQuotation({ id: quotationDoc.id, ...quotationDoc.data() }))
          .filter((quotation): quotation is QuotationRecord => Boolean(quotation)),
        documentType,
        userId,
        maxCount
      );
      saveLocalQuotations(userId, businessId, mergeQuotations(loadLocalQuotations(userId, businessId), quotations));
      return quotations;
    } catch (error) {
      console.warn("BrandDocs Firebase quotation load failed; using local fallback if available.", error);
    }
  }

  return filterQuotations(loadLocalQuotations(userId, businessId), documentType, userId, maxCount);
}

export async function loadQuotationById(user: User | null, profile: BusinessProfile | null, quotationId: string): Promise<QuotationRecord | null> {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId && !quotationId.startsWith("local-")) {
    try {
      const quotationSnap = await getDoc(doc(db, "quotations", quotationId));
      const quotation = quotationSnap.exists() ? normalizeQuotation({ id: quotationSnap.id, ...quotationSnap.data() }) : null;
      if (quotation && quotation.businessId === businessId && isVisibleToUser(quotation, userId)) return quotation;
    } catch (error) {
      console.warn("BrandDocs Firebase quotation preview load failed; using local fallback if available.", error);
    }
  }

  return loadLocalQuotations(userId, businessId).find((quotation) => quotation.id === quotationId) || null;
}

export async function saveQuotation(user: User | null, profile: BusinessProfile | null, quotation: QuotationRecord): Promise<QuotationSaveResult> {
  // Backend guard: prevent modifying finalized or cancelled documents
  if (quotation.id && isQuotationLocked(normalizeStatus(quotation.status))) {
    throw new Error("This quotation is finalized or cancelled and cannot be modified.");
  }

  const businessId = profile?.id;
  const userId = user?.uid;
  const totals = calculateQuotationTotals(quotation);
  const now = new Date().toISOString();
  const quotationPayload: QuotationRecord = {
    ...quotation,
    businessId,
    userId,
    status: normalizeStatus(quotation.status),
    subtotal: totals.subtotal,
    grandTotal: totals.grandTotal,
    createdAt: quotation.createdAt || now,
    updatedAt: now,
    businessProfileSnapshot: quotation.businessProfileSnapshot || profile || null,
  };

  const upsertLocal = (savedQuotation: QuotationRecord) => {
    const localQuotations = loadLocalQuotations(userId, businessId);
    saveLocalQuotations(userId, businessId, mergeQuotations(localQuotations.filter((current) => current.id !== savedQuotation.id), [savedQuotation]));
  };

  if (user && businessId) {
    try {
      if (quotationPayload.id && !quotationPayload.id.startsWith("local-")) {
        // Double-check current status in DB before overwriting
        try {
          const existingSnap = await getDoc(doc(db, "quotations", quotationPayload.id));
          if (existingSnap.exists()) {
            const existingStatus = normalizeStatus(existingSnap.data()?.status);
            if (isQuotationLocked(existingStatus)) {
              throw new Error("This quotation is finalized or cancelled and cannot be modified.");
            }
          }
        } catch (guardError: any) {
          if (guardError?.message?.includes("finalized or cancelled")) throw guardError;
        }

        await setDoc(doc(db, "quotations", quotationPayload.id), {
          ...quotationPayload,
          createdAt: quotation.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        upsertLocal(quotationPayload);
        return { quotation: quotationPayload, source: "firebase" };
      }

      const quotationRef = await addDoc(collection(db, "quotations"), {
        ...quotationPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const savedQuotation = { ...quotationPayload, id: quotationRef.id };
      upsertLocal(savedQuotation);
      return { quotation: savedQuotation, source: "firebase" };
    } catch (error: any) {
      if (error?.message?.includes("finalized or cancelled")) throw error;

      console.warn("BrandDocs Firebase quotation save failed; quotation saved to local fallback.", error);
      const localQuotation = { ...quotationPayload, id: quotationPayload.id || `local-${Date.now()}` };
      upsertLocal(localQuotation);
      return {
        quotation: localQuotation,
        source: "local-fallback",
        warning: error?.message || "Firebase quotation save failed. Quotation was saved locally on this device.",
      };
    }
  }

  const localQuotation = { ...quotationPayload, id: quotationPayload.id || `local-${Date.now()}` };
  upsertLocal(localQuotation);
  return {
    quotation: localQuotation,
    source: "local-fallback",
    warning: "No active Firebase user or business profile was available, so the quotation was saved locally on this device.",
  };
}

// ─── Finalize ────────────────────────────────────────────────

export async function finalizeQuotation(
  user: User | null,
  profile: BusinessProfile | null,
  quotation: QuotationRecord,
): Promise<QuotationSaveResult> {
  if (isQuotationLocked(normalizeStatus(quotation.status))) {
    throw new Error("This quotation is already finalized or cancelled.");
  }

  const now = new Date().toISOString();
  const finalized: QuotationRecord = {
    ...quotation,
    status: "final",
    finalizedAt: now,
    businessProfileSnapshot: profile || quotation.businessProfileSnapshot || null,
  };

  return internalQuotationSaveWithStatus(user, profile, finalized);
}

// ─── Cancel ──────────────────────────────────────────────────

export async function cancelQuotation(
  user: User | null,
  profile: BusinessProfile | null,
  quotation: QuotationRecord,
  reason: string,
): Promise<QuotationSaveResult> {
  if (normalizeStatus(quotation.status) !== "final") {
    throw new Error("Only finalized quotations can be cancelled.");
  }

  const cancelled: QuotationRecord = {
    ...quotation,
    status: "cancelled",
    cancellationReason: reason,
  };

  return internalQuotationSaveWithStatus(user, profile, cancelled);
}

// ─── Duplicate ───────────────────────────────────────────────

export function duplicateQuotationAsDraft(
  original: QuotationRecord,
  allQuotations: QuotationRecord[],
  companyName?: string,
): QuotationRecord {
  const { quotationNumber, numberingSequence } = generateNextQuotationNumber(
    original.documentType,
    companyName,
    allQuotations,
  );

  return {
    ...original,
    id: undefined,
    status: "draft",
    quotationNumber,
    numberingSequence,
    quotationDate: new Date().toISOString().slice(0, 10),
    validUntil: "",
    finalizedAt: undefined,
    cancellationReason: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  };
}

// ─── Delete (draft only) ─────────────────────────────────────

export async function deleteQuotation(
  user: User | null,
  profile: BusinessProfile | null,
  quotation: QuotationRecord,
): Promise<void> {
  if (isQuotationLocked(normalizeStatus(quotation.status))) {
    throw new Error("Finalized or cancelled quotations cannot be deleted.");
  }

  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId && quotation.id && !quotation.id.startsWith("local-")) {
    try {
      await deleteDoc(doc(db, "quotations", quotation.id));
    } catch (error) {
      console.warn("BrandDocs Firebase quotation delete failed.", error);
    }
  }

  const local = loadLocalQuotations(userId, businessId);
  saveLocalQuotations(
    userId,
    businessId,
    local.filter((r) => r.id !== quotation.id && r.quotationNumber !== quotation.quotationNumber),
  );
}

// ─── Internal save (used by finalize/cancel) ─────────────────

async function internalQuotationSaveWithStatus(
  user: User | null,
  profile: BusinessProfile | null,
  quotation: QuotationRecord,
): Promise<QuotationSaveResult> {
  const businessId = profile?.id;
  const userId = user?.uid;
  const now = new Date().toISOString();
  const payload: QuotationRecord = {
    ...quotation,
    updatedAt: now,
    businessProfileSnapshot: quotation.businessProfileSnapshot || profile || null,
  };

  const upsertLocal = (saved: QuotationRecord) => {
    const local = loadLocalQuotations(userId, businessId);
    saveLocalQuotations(
      userId,
      businessId,
      mergeQuotations(
        local.filter((current) => current.id !== saved.id),
        [saved],
      ),
    );
  };

  if (user && businessId && payload.id && !payload.id.startsWith("local-")) {
    try {
      await setDoc(
        doc(db, "quotations", payload.id),
        { ...payload, updatedAt: serverTimestamp() },
        { merge: true },
      );
      upsertLocal(payload);
      return { quotation: payload, source: "firebase" };
    } catch (error: any) {
      console.warn("BrandDocs Firebase quotation status update failed.", error);
      upsertLocal(payload);
      return {
        quotation: payload,
        source: "local-fallback",
        warning: error?.message || "Status update saved locally.",
      };
    }
  }

  upsertLocal(payload);
  return { quotation: payload, source: "local-fallback" };
}
