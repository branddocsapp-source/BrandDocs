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

export type ReceiptStatus = "draft" | "final";
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
  return String(value || "draft").toLowerCase() === "final" ? "final" : "draft";
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

export function generateNextReceiptNumber(receipts: ReceiptRecord[], date = new Date()) {
  const year = String(date.getFullYear());
  const maxSequence = receipts.reduce((currentMax, receipt) => {
    const savedSequence = String(receipt.receiptNumber).includes(`RCT-${year}-`) ? Number(receipt.numberingSequence || 0) : 0;
    return Math.max(currentMax, savedSequence, getSequenceFromNumber(receipt.receiptNumber, year));
  }, 0);
  const nextSequence = maxSequence + 1;

  return {
    receiptNumber: `RCT-${year}-${String(nextSequence).padStart(4, "0")}`,
    numberingSequence: nextSequence,
  };
}

function getSequenceFromNumber(receiptNumber: string, year: string) {
  const match = receiptNumber.match(/^RCT-(\d{4})-(\d{4})$/);
  if (!match || match[1] !== year) return 0;
  return Number(match[2] || 0);
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
