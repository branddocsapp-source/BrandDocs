import { User } from "firebase/auth";
import {
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

export type ReceiptStatus = "draft" | "final" | "cancelled";
export type PaymentMethod = "cash" | "bank_transfer" | "cheque" | "card" | "upi" | "other";

export type ReceiptRecord = {
  id?: string;
  businessId?: string;
  userId?: string;
  receiptNumber: string;
  numberingSequence: number;
  receiptTitle: string;
  receiptDate: string;
  status: ReceiptStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  amount: number;
  amountInWords?: string;
  notes?: string;
  receivedFrom: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  company: {
    logoUrl?: string | null;
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    country: string;
    currency: string;
    taxRegistrationNumber?: string;
    signatureUrl?: string | null;
    stampUrl?: string | null;
  };
  cancellationReason?: string;
  finalizedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ReceiptSaveResult = {
  receipt: ReceiptRecord;
  source: "firebase" | "local-fallback";
  warning?: string;
};

const LOCAL_RECEIPT_KEY_PREFIX = "branddocs.receipts";

export function getPaymentMethodLabel(method: PaymentMethod): string {
  if (method === "bank_transfer") return "Bank Transfer";
  if (method === "card") return "Credit/Debit Card";
  if (method === "upi") return "UPI";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

function getLocalStorage() {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  return globalThis.localStorage;
}

function getLocalKey(userId?: string, businessId?: string) {
  return `${LOCAL_RECEIPT_KEY_PREFIX}.${userId || "guest"}.${businessId || "no-business"}`;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: unknown): ReceiptStatus {
  const normalized = String(value || "draft").toLowerCase();
  if (normalized === "final") return "final";
  if (normalized === "cancelled") return "cancelled";
  return "draft";
}

export function isReceiptLocked(status: ReceiptStatus): boolean {
  return status === "final" || status === "cancelled";
}

export function generateNextReceiptNumber(
  receipts: ReceiptRecord[] = [],
  date = new Date(),
) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const maxSequence = (receipts || []).reduce((currentMax, receipt) => {
    if (!receipt || !receipt.receiptNumber) return currentMax;
    const match = String(receipt.receiptNumber).match(/(\d{3,4})$/);
    const parsed = match ? parseInt(match[1], 10) : 0;
    const seq = Number(receipt.numberingSequence) || parsed || 0;
    return Math.max(currentMax, seq);
  }, 0);

  const nextSequence = maxSequence + 1;
  const sequenceStr = String(nextSequence).padStart(3, "0");
  const receiptNumber = `REC-${year}-${month}-${sequenceStr}`;

  return {
    receiptNumber,
    numberingSequence: nextSequence,
  };
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const normalized = String(value || "cash").toLowerCase();
  if (normalized === "bank_transfer" || normalized === "cheque" || normalized === "card" || normalized === "upi" || normalized === "other") {
    return normalized;
  }
  return "cash";
}

function normalizeReceipt(value: any): ReceiptRecord | null {
  if (!value || typeof value !== "object") return null;

  const receiptNumber = String(value.receiptNumber || value.number || "");
  if (!receiptNumber) return null;

  return {
    ...value,
    receiptNumber,
    numberingSequence: toNumber(value.numberingSequence),
    receiptTitle: value.receiptTitle || "PAYMENT RECEIPT",
    receiptDate: value.receiptDate || value.date || new Date().toISOString().slice(0, 10),
    status: normalizeStatus(value.status),
    paymentMethod: normalizePaymentMethod(value.paymentMethod),
    paymentReference: value.paymentReference || "",
    amount: toNumber(value.amount),
    amountInWords: value.amountInWords || "",
    notes: value.notes || "",
    receivedFrom: {
      name: value.receivedFrom?.name || "",
      phone: value.receivedFrom?.phone || "",
      email: value.receivedFrom?.email || "",
      address: value.receivedFrom?.address || "",
    },
    company: {
      logoUrl: value.company?.logoUrl || null,
      name: value.company?.name || "",
      address: value.company?.address || "",
      email: value.company?.email || "",
      phone: value.company?.phone || "",
      website: value.company?.website || "",
      country: value.company?.country || "",
      currency: value.company?.currency || "INR",
      taxRegistrationNumber: value.company?.taxRegistrationNumber || "",
      signatureUrl: value.company?.signatureUrl || null,
      stampUrl: value.company?.stampUrl || null,
    },
  };
}

function saveLocalReceipts(userId: string | undefined, businessId: string | undefined, receipts: ReceiptRecord[]) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(getLocalKey(userId, businessId), JSON.stringify(receipts));
}

export function loadLocalReceipts(userId?: string, businessId?: string) {
  const storage = getLocalStorage();
  if (!storage) return [];

  const rawReceipts = storage.getItem(getLocalKey(userId, businessId));
  if (!rawReceipts) return [];

  try {
    const parsed = JSON.parse(rawReceipts);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeReceipt)
      .filter((receipt): receipt is ReceiptRecord => Boolean(receipt));
  } catch (error) {
    console.warn("BrandDocs local receipts could not be parsed.", error);
    return [];
  }
}

function sortReceipts(first: ReceiptRecord, second: ReceiptRecord) {
  const dateDifference = new Date(second.receiptDate).getTime() - new Date(first.receiptDate).getTime();
  if (dateDifference !== 0) return dateDifference;
  return second.receiptNumber.localeCompare(first.receiptNumber);
}

function isVisibleToUser(receipt: ReceiptRecord, userId?: string) {
  return !receipt.userId || !userId || receipt.userId === userId;
}

function mergeReceipts(existing: ReceiptRecord[], incoming: ReceiptRecord[]) {
  const byKey = new Map<string, ReceiptRecord>();
  [...existing, ...incoming].forEach((receipt) => {
    byKey.set(receipt.id || receipt.receiptNumber, receipt);
  });
  return Array.from(byKey.values()).sort(sortReceipts);
}

export async function loadReceipts(user: User | null, profile: BusinessProfile | null, maxCount = 50): Promise<ReceiptRecord[]> {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId) {
    try {
      const q = query(collection(db, "receipts"), where("businessId", "==", businessId));
      const querySnapshot = await getDocs(q);
      const receipts = querySnapshot.docs
        .map((receiptDoc) => normalizeReceipt({ id: receiptDoc.id, ...receiptDoc.data() }))
        .filter((receipt): receipt is ReceiptRecord => Boolean(receipt))
        .filter((receipt) => isVisibleToUser(receipt, userId))
        .sort(sortReceipts)
        .slice(0, maxCount);

      saveLocalReceipts(userId, businessId, mergeReceipts(loadLocalReceipts(userId, businessId), receipts));
      return receipts;
    } catch (error) {
      console.warn("BrandDocs Firebase receipt load failed; using local fallback if available.", error);
    }
  }

  return loadLocalReceipts(userId, businessId)
    .filter((receipt) => isVisibleToUser(receipt, userId))
    .sort(sortReceipts)
    .slice(0, maxCount);
}

export async function loadReceiptById(user: User | null, profile: BusinessProfile | null, receiptId: string): Promise<ReceiptRecord | null> {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId && !receiptId.startsWith("local-")) {
    try {
      const docRef = doc(db, "receipts", receiptId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const receipt = normalizeReceipt({ id: docSnap.id, ...docSnap.data() });
        if (receipt && receipt.businessId === businessId && isVisibleToUser(receipt, userId)) {
          return receipt;
        }
      }
    } catch (error) {
      console.warn("BrandDocs Firebase receipt load by ID failed; using local fallback if available.", error);
    }
  }

  return loadLocalReceipts(userId, businessId).find((receipt) => receipt.id === receiptId) || null;
}

export async function saveReceipt(
  user: User | null,
  profile: BusinessProfile | null,
  receipt: ReceiptRecord
): Promise<ReceiptSaveResult> {
  // Backend guard: prevent modifying finalized or cancelled documents
  if (receipt.id && isReceiptLocked(normalizeStatus(receipt.status))) {
    throw new Error("This receipt is finalized or cancelled and cannot be modified.");
  }

  const userId = user?.uid;
  const businessId = profile?.id;
  const now = new Date().toISOString();

  const receiptPayload: ReceiptRecord = {
    ...receipt,
    userId,
    businessId,
    status: normalizeStatus(receipt.status),
    paymentMethod: normalizePaymentMethod(receipt.paymentMethod),
    createdAt: receipt.createdAt || now,
    updatedAt: now,
  };

  const upsertLocal = (savedReceipt: ReceiptRecord) => {
    const local = loadLocalReceipts(userId, businessId);
    const updated = mergeReceipts(local.filter((r) => r.id !== savedReceipt.id), [savedReceipt]);
    saveLocalReceipts(userId, businessId, updated);
  };

  if (user && businessId) {
    const docRef = receiptPayload.id && !receiptPayload.id.startsWith("local-")
      ? doc(db, "receipts", receiptPayload.id)
      : doc(collection(db, "receipts"));

    // Double-check current status in DB before overwriting
    if (receiptPayload.id && !receiptPayload.id.startsWith("local-")) {
      try {
        const existingSnap = await getDoc(docRef);
        if (existingSnap.exists()) {
          const existingStatus = normalizeStatus(existingSnap.data()?.status);
          if (isReceiptLocked(existingStatus)) {
            throw new Error("This receipt is finalized or cancelled and cannot be modified.");
          }
        }
      } catch (guardError: any) {
        if (guardError?.message?.includes("finalized or cancelled")) throw guardError;
      }
    }

    try {
      const firestorePayload = {
        ...receiptPayload,
        id: docRef.id,
        createdAt: receipt.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(docRef, firestorePayload, { merge: true });

      const savedReceipt = { ...receiptPayload, id: docRef.id };
      upsertLocal(savedReceipt);
      return { receipt: savedReceipt, source: "firebase" };
    } catch (error: any) {
      if (error?.message?.includes("finalized or cancelled")) throw error;

      console.error("BrandDocs Firebase receipt save failed.", error);
      const fallbackId = receiptPayload.id || `local-${Date.now()}`;
      const savedReceipt = { ...receiptPayload, id: fallbackId };
      upsertLocal(savedReceipt);
      return {
        receipt: savedReceipt,
        source: "local-fallback",
        warning: error?.message || "Saved locally on this device.",
      };
    }
  }

  const fallbackId = receiptPayload.id || `local-${Date.now()}`;
  const savedReceipt = { ...receiptPayload, id: fallbackId };
  upsertLocal(savedReceipt);
  return {
    receipt: savedReceipt,
    source: "local-fallback",
    warning: "Saved locally on this device.",
  };
}

export async function deleteReceipt(user: User | null, profile: BusinessProfile | null, receipt: ReceiptRecord) {
  // Backend guard: prevent deleting finalized or cancelled documents
  if (isReceiptLocked(normalizeStatus(receipt.status))) {
    throw new Error("Finalized or cancelled receipts cannot be deleted.");
  }

  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId && receipt.id && !receipt.id.startsWith("local-")) {
    try {
      await deleteDoc(doc(db, "receipts", receipt.id));
    } catch (error) {
      console.warn("BrandDocs Hard delete failed for receipt.", error);
    }
  }

  const local = loadLocalReceipts(userId, businessId);
  saveLocalReceipts(userId, businessId, local.filter((r) => r.id !== receipt.id && r.receiptNumber !== receipt.receiptNumber));
}

// ─── Finalize ────────────────────────────────────────────────

export async function finalizeReceipt(
  user: User | null,
  profile: BusinessProfile | null,
  receipt: ReceiptRecord,
): Promise<ReceiptSaveResult> {
  if (isReceiptLocked(normalizeStatus(receipt.status))) {
    throw new Error("This receipt is already finalized or cancelled.");
  }

  const now = new Date().toISOString();
  const finalized: ReceiptRecord = {
    ...receipt,
    status: "final",
    finalizedAt: now,
  };

  return internalReceiptSaveWithStatus(user, profile, finalized);
}

// ─── Cancel ──────────────────────────────────────────────────

export async function cancelReceipt(
  user: User | null,
  profile: BusinessProfile | null,
  receipt: ReceiptRecord,
  reason: string,
): Promise<ReceiptSaveResult> {
  if (normalizeStatus(receipt.status) !== "final") {
    throw new Error("Only finalized receipts can be cancelled.");
  }

  const cancelled: ReceiptRecord = {
    ...receipt,
    status: "cancelled",
    cancellationReason: reason,
  };

  return internalReceiptSaveWithStatus(user, profile, cancelled);
}

// ─── Duplicate ───────────────────────────────────────────────

export function duplicateReceiptAsDraft(
  original: ReceiptRecord,
  allReceipts: ReceiptRecord[],
): ReceiptRecord {
  const { receiptNumber, numberingSequence } = generateNextReceiptNumber(allReceipts);

  return {
    ...original,
    id: undefined,
    status: "draft",
    receiptNumber,
    numberingSequence,
    receiptDate: new Date().toISOString().slice(0, 10),
    finalizedAt: undefined,
    cancellationReason: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  };
}

// ─── Internal save (used by finalize/cancel) ─────────────────

async function internalReceiptSaveWithStatus(
  user: User | null,
  profile: BusinessProfile | null,
  receipt: ReceiptRecord,
): Promise<ReceiptSaveResult> {
  const businessId = profile?.id;
  const userId = user?.uid;
  const now = new Date().toISOString();
  const payload: ReceiptRecord = {
    ...receipt,
    updatedAt: now,
  };

  const upsertLocal = (saved: ReceiptRecord) => {
    const local = loadLocalReceipts(userId, businessId);
    saveLocalReceipts(
      userId,
      businessId,
      mergeReceipts(
        local.filter((current) => current.id !== saved.id),
        [saved],
      ),
    );
  };

  if (user && businessId && payload.id && !payload.id.startsWith("local-")) {
    try {
      await setDoc(
        doc(db, "receipts", payload.id),
        { ...payload, updatedAt: serverTimestamp() },
        { merge: true },
      );
      upsertLocal(payload);
      return { receipt: payload, source: "firebase" };
    } catch (error: any) {
      console.warn("BrandDocs Firebase receipt status update failed.", error);
      upsertLocal(payload);
      return {
        receipt: payload,
        source: "local-fallback",
        warning: error?.message || "Status update saved locally.",
      };
    }
  }

  upsertLocal(payload);
  return { receipt: payload, source: "local-fallback" };
}

export function validateReceipt(receipt: ReceiptRecord) {
  const errors: Record<string, string> = {};
  if (!receipt.receivedFrom?.name?.trim()) {
    errors["receivedFrom.name"] = "Received From name is required.";
  }
  if (!receipt.amount || receipt.amount <= 0) {
    errors.amount = "Receipt amount must be greater than zero.";
  }
  return errors;
}
