import { User } from "firebase/auth";
import {
  addDoc,
  collection,
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

export type DocumentType = "tax_invoice" | "bill_of_supply";
export type InvoiceStatus = "draft" | "pending" | "paid";
export type InvoiceTaxMode = "No GST" | "CGST + SGST" | "IGST";

export type InvoiceItem = {
  id: string;
  item: string;
  description: string;
  ssnCode?: string;
  hsnSac?: string;
  quantity: string;
  rate: string;
  tax?: string;
  discount?: string;
};

export type InvoiceRecord = {
  id?: string;
  businessId?: string;
  userId?: string;
  documentType: DocumentType;
  documentNumber: string;
  invoiceNumber: string;
  numberingSequence: number;
  invoiceTitle: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  taxMode: InvoiceTaxMode;
  businessProfileSnapshot?: Partial<BusinessProfile> | null;
  company: {
    logoUrl?: string | null;
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    country: string;
    state?: string;
    stateCode?: string;
    pin?: string;
    currency: string;
    taxRegistrationNumber: string;
    pan?: string;
    stampUrl?: string | null;
    signatureUrl?: string | null;
  };
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    state?: string;
    stateCode?: string;
    pin?: string;
    gstin?: string;
  };
  bank: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchAddress: string;
  };
  items: InvoiceItem[];
  notes: string;
  terms: string;
  discount: number;
  freightCharges: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  subtotal: number;
  taxableValue: number;
  taxTotal: number;
  grandTotal: number;
  amountInWords: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InvoiceSaveResult = {
  invoice: InvoiceRecord;
  source: "firebase" | "local-fallback";
  warning?: string;
};

const LOCAL_INVOICE_KEY_PREFIX = "branddocs.invoices";
const LEGAL_SUFFIXES = new Set([
  "llc",
  "inc",
  "incorporated",
  "pvt",
  "private",
  "ltd",
  "limited",
  "llp",
  "corp",
  "corporation",
  "co",
  "company",
]);

function getLocalStorage() {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }

  return globalThis.localStorage;
}

function getLocalKey(userId?: string, businessId?: string) {
  return `${LOCAL_INVOICE_KEY_PREFIX}.${userId || "guest"}.${businessId || "no-business"}`;
}

function normalizeStatus(value: unknown): InvoiceStatus {
  const normalized = String(value || "draft")
    .trim()
    .toLowerCase();
  if (normalized === "paid") return "paid";
  if (normalized === "pending") return "pending";
  return "draft";
}

export function getDocumentLabel(documentType: DocumentType) {
  return documentType === "bill_of_supply" ? "Bill of Supply" : "Tax Invoice";
}

export function getDocumentTitle(documentType: DocumentType) {
  return documentType === "bill_of_supply" ? "BILL OF SUPPLY" : "TAX INVOICE";
}

export function getDocumentPrefix(documentType: DocumentType) {
  return documentType === "bill_of_supply" ? "BOS" : "TAX";
}

export function isTaxInvoice(record: Pick<InvoiceRecord, "documentType">) {
  return record.documentType === "tax_invoice";
}

function normalizeDocumentType(value: any): DocumentType {
  if (value?.documentType === "bill_of_supply") return "bill_of_supply";

  return "tax_invoice";
}

function getNumber(value: unknown) {
  const parsed =
    typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getLineAmount(item: InvoiceItem) {
  const amount = getNumber(item.quantity) * getNumber(item.rate);
  return Math.max(0, amount - getNumber(item.discount));
}

export function getInvoiceTaxSummaryRows(
  invoice: Pick<
    InvoiceRecord,
    | "items"
    | "discount"
    | "freightCharges"
    | "taxMode"
    | "cgstPercent"
    | "sgstPercent"
    | "igstPercent"
  >,
) {
  const subtotal = invoice.items.reduce(
    (total, item) => total + getLineAmount(item),
    0,
  );
  const taxableValue = Math.max(
    0,
    subtotal - getNumber(invoice.discount) + getNumber(invoice.freightCharges),
  );

  // If tax mode is "No GST", taxes are 0. 
  // Otherwise, calculate the taxes based on whatever percentages the user inputs.
  const isTaxable = invoice.taxMode !== "No GST";

  const cgstAmount = isTaxable 
    ? taxableValue * (getNumber(invoice.cgstPercent) / 100) 
    : 0;
    
  const sgstAmount = isTaxable 
    ? taxableValue * (getNumber(invoice.sgstPercent) / 100) 
    : 0;
    
  const igstAmount = isTaxable 
    ? taxableValue * (getNumber(invoice.igstPercent) / 100) 
    : 0;

  return [
    { key: "cgst", label: "CGST", amount: cgstAmount },
    { key: "sgst", label: "SGST", amount: sgstAmount },
    { key: "igst", label: "IGST", amount: igstAmount },
  ] as const;
}

export function calculateTaxInvoiceTotals(
  invoice: Pick<
    InvoiceRecord,
    | "items"
    | "discount"
    | "freightCharges"
    | "taxMode"
    | "cgstPercent"
    | "sgstPercent"
    | "igstPercent"
  >,
) {
  const subtotal = invoice.items.reduce(
    (total, item) => total + getLineAmount(item),
    0,
  );
  const taxableValue = Math.max(
    0,
    subtotal - getNumber(invoice.discount) + getNumber(invoice.freightCharges),
  );
  const taxRows = getInvoiceTaxSummaryRows(invoice);
  const cgstAmount = taxRows[0].amount;
  const sgstAmount = taxRows[1].amount;
  const igstAmount = taxRows[2].amount;
  const taxTotal = cgstAmount + sgstAmount + igstAmount;

  return {
    subtotal,
    taxableValue,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxTotal,
    grandTotal: taxableValue + taxTotal,
  };
}

export function calculateBillOfSupplyTotals(
  invoice: Pick<InvoiceRecord, "items" | "discount" | "freightCharges">,
) {
  const subtotal = invoice.items.reduce(
    (total, item) => total + getLineAmount(item),
    0,
  );
  const grandTotal = Math.max(
    0,
    subtotal - getNumber(invoice.discount) + getNumber(invoice.freightCharges),
  );

  return {
    subtotal,
    taxableValue: grandTotal,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    taxTotal: 0,
    grandTotal,
  };
}

export function calculateDocumentTotals(
  invoice: Pick<
    InvoiceRecord,
    | "documentType"
    | "items"
    | "discount"
    | "freightCharges"
    | "taxMode"
    | "cgstPercent"
    | "sgstPercent"
    | "igstPercent"
  >,
) {
  if (invoice.documentType === "bill_of_supply") {
    return calculateBillOfSupplyTotals(invoice);
  }

  return calculateTaxInvoiceTotals(invoice);
}

function getMeaningfulWords(companyName: string) {
  const words = companyName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const meaningfulWords = words.filter(
    (word) => !LEGAL_SUFFIXES.has(word.toLowerCase()),
  );
  return meaningfulWords.length ? meaningfulWords : words;
}

export function getInvoiceCompanyCode(companyName?: string) {
  const originalWords = (companyName || "BrandDocs")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const meaningfulWords = getMeaningfulWords(companyName || "BrandDocs");
  const legalSuffix = originalWords.find((word) =>
    LEGAL_SUFFIXES.has(word.toLowerCase()),
  );

  if (meaningfulWords.length >= 3) {
    return meaningfulWords
      .slice(0, 3)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  if (meaningfulWords.length === 2) {
    const [first, second] = meaningfulWords;
    const firstLooksLikeCode =
      first.length <= 3 && first === first.toUpperCase();
    return `${firstLooksLikeCode ? first : first[0]}${second[0]}`.toUpperCase();
  }

  const onlyWord = meaningfulWords[0] || "BD";
  if (legalSuffix && onlyWord.length > 3) {
    return `${onlyWord[0]}${legalSuffix[0]}`.toUpperCase();
  }

  return onlyWord
    .slice(0, Math.min(3, Math.max(2, onlyWord.length)))
    .toUpperCase();
}

function getSequenceFromDocumentNumber(
  documentNumber: string,
  year: string,
  documentType: DocumentType,
) {
  const prefix = getDocumentPrefix(documentType);
  const match = documentNumber.match(/^([A-Z0-9]+)-(\d{4})-\d{2}-(\d{3})$/);
  if (!match || match[1] !== prefix || match[2] !== year) return 0;

  return Number(match[3] || 0);
}

function getLegacySequence(invoiceNumber: string, year: string) {
  const match = invoiceNumber.match(/^[A-Z0-9]+-(\d{4})-\d{2}-(\d{3})$/);
  if (!match || match[1] !== year) return 0;

  return Number(match[2] || 0);
}

export function generateNextDocumentNumber(
  documentType: DocumentType,
  invoices: InvoiceRecord[],
  date = new Date(),
) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const maxSequence = invoices
    .filter((invoice) => invoice.documentType === documentType)
    .reduce((currentMax, invoice) => {
      const documentSequence = getSequenceFromDocumentNumber(
        invoice.documentNumber || invoice.invoiceNumber,
        year,
        documentType,
      );
      const savedSequence = String(
        invoice.documentNumber || invoice.invoiceNumber,
      ).includes(`-${year}-`)
        ? Number(invoice.numberingSequence || 0)
        : 0;
      const legacySequence =
        documentType === "tax_invoice"
          ? getLegacySequence(invoice.invoiceNumber, year)
          : 0;
      return Math.max(
        currentMax,
        documentSequence,
        savedSequence,
        legacySequence,
      );
    }, 0);
  const nextSequence = maxSequence + 1;

  return {
    documentNumber: `${getDocumentPrefix(documentType)}-${year}-${month}-${String(nextSequence).padStart(3, "0")}`,
    numberingSequence: nextSequence,
  };
}

export function generateNextInvoiceNumber(
  companyName: string | undefined,
  invoices: InvoiceRecord[],
  date = new Date(),
) {
  const companyCode = getInvoiceCompanyCode(companyName);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const maxSequence = invoices.reduce((currentMax, invoice) => {
    return Math.max(currentMax, getLegacySequence(invoice.invoiceNumber, year));
  }, 0);
  const nextSequence = String(maxSequence + 1).padStart(3, "0");

  return `${companyCode}-${year}-${month}-${nextSequence}`;
}

function normalizeInvoice(value: any): InvoiceRecord | null {
  if (!value || typeof value !== "object") return null;

  const documentType = normalizeDocumentType(value);
  const fallbackNumber = value.documentNumber || value.invoiceNumber;
  if (!fallbackNumber) return null;

  const documentNumber = String(fallbackNumber);
  const invoiceNumber = String(value.invoiceNumber || documentNumber);
  const totals = {
    subtotal: getNumber(value.subtotal),
    taxableValue: getNumber(value.taxableValue || value.subtotal),
    taxTotal: documentType === "bill_of_supply" ? 0 : getNumber(value.taxTotal),
    grandTotal: getNumber(value.grandTotal),
  };

  return {
    ...value,
    documentType,
    documentNumber,
    invoiceNumber,
    numberingSequence: getNumber(value.numberingSequence),
    invoiceTitle: value.invoiceTitle || getDocumentTitle(documentType),
    invoiceDate:
      value.invoiceDate ||
      value.documentDate ||
      new Date().toISOString().slice(0, 10),
    dueDate: value.dueDate || "",
    status: normalizeStatus(value.status),
    taxMode:
      documentType === "bill_of_supply" ? "No GST" : value.taxMode || "No GST",
    company: {
      logoUrl: value.company?.logoUrl || null,
      name: value.company?.name || "",
      address: value.company?.address || "",
      email: value.company?.email || "",
      phone: value.company?.phone || "",
      website: value.company?.website || "",
      country: value.company?.country || "",
      state: value.company?.state || "",
      stateCode: value.company?.stateCode || "",
      pin: value.company?.pin || "",
      currency: value.company?.currency || "INR",
      taxRegistrationNumber: value.company?.taxRegistrationNumber || "",
      pan: value.company?.pan || "",
      stampUrl: value.company?.stampUrl || null,
      signatureUrl: value.company?.signatureUrl || null,
    },
    customer: {
      name: value.customer?.name || "",
      phone: value.customer?.phone || "",
      email: value.customer?.email || "",
      address: value.customer?.address || "",
      state: value.customer?.state || "",
      stateCode: value.customer?.stateCode || "",
      pin: value.customer?.pin || "",
      gstin: value.customer?.gstin || "",
    },
    bank: value.bank || {
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      branchAddress: "",
    },
    items: Array.isArray(value.items) ? value.items : [],
    notes: value.notes || "",
    terms: value.terms || "",
    discount: getNumber(value.discount),
    freightCharges: getNumber(value.freightCharges),
    cgstPercent:
      documentType === "bill_of_supply" ? 0 : getNumber(value.cgstPercent),
    sgstPercent:
      documentType === "bill_of_supply" ? 0 : getNumber(value.sgstPercent),
    igstPercent:
      documentType === "bill_of_supply" ? 0 : getNumber(value.igstPercent),
    subtotal: totals.subtotal,
    taxableValue: totals.taxableValue,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    amountInWords: value.amountInWords || "",
  };
}

function saveLocalInvoices(
  userId: string | undefined,
  businessId: string | undefined,
  invoices: InvoiceRecord[],
) {
  const storage = getLocalStorage();
  if (!storage) return;

  storage.setItem(getLocalKey(userId, businessId), JSON.stringify(invoices));
}

function loadLocalInvoices(userId?: string, businessId?: string) {
  const storage = getLocalStorage();
  if (!storage) return [];

  const rawInvoices = storage.getItem(getLocalKey(userId, businessId));
  if (!rawInvoices) return [];

  try {
    const parsed = JSON.parse(rawInvoices);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeInvoice)
      .filter((invoice): invoice is InvoiceRecord => Boolean(invoice));
  } catch (error) {
    console.warn("BrandDocs local invoices could not be parsed.", error);
    return [];
  }
}

function sortDocuments(first: InvoiceRecord, second: InvoiceRecord) {
  const dateDifference =
    new Date(second.invoiceDate).getTime() -
    new Date(first.invoiceDate).getTime();
  if (dateDifference !== 0) return dateDifference;

  return second.documentNumber.localeCompare(first.documentNumber);
}

function isVisibleToUser(invoice: InvoiceRecord, userId?: string) {
  return !invoice.userId || !userId || invoice.userId === userId;
}

function filterDocuments(
  invoices: InvoiceRecord[],
  documentType?: DocumentType,
  userId?: string,
  maxCount = 50,
) {
  return invoices
    .filter((invoice) => isVisibleToUser(invoice, userId))
    .filter((invoice) => !documentType || invoice.documentType === documentType)
    .sort(sortDocuments)
    .slice(0, maxCount);
}

export async function loadInvoices(
  user: User | null,
  profile: BusinessProfile | null,
  documentType?: DocumentType,
  maxCount = 50,
): Promise<InvoiceRecord[]> {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId) {
    try {
      const constraints =
        documentType === "bill_of_supply"
          ? [
              where("businessId", "==", businessId),
              where("documentType", "==", "bill_of_supply"),
            ]
          : [where("businessId", "==", businessId)];
      const invoiceQuery = query(collection(db, "invoices"), ...constraints);
      const invoiceSnap = await getDocs(invoiceQuery);
      const invoices = filterDocuments(
        invoiceSnap.docs
          .map((invoiceDoc) =>
            normalizeInvoice({ id: invoiceDoc.id, ...invoiceDoc.data() }),
          )
          .filter((invoice): invoice is InvoiceRecord => Boolean(invoice)),
        documentType,
        userId,
        maxCount,
      );

      saveLocalInvoices(
        userId,
        businessId,
        mergeInvoices(loadLocalInvoices(userId, businessId), invoices),
      );
      return invoices;
    } catch (error) {
      console.warn(
        "BrandDocs Firebase invoice load failed; using local fallback if available.",
        error,
      );
    }
  }

  return filterDocuments(
    loadLocalInvoices(userId, businessId),
    documentType,
    userId,
    maxCount,
  );
}

function mergeInvoices(existing: InvoiceRecord[], incoming: InvoiceRecord[]) {
  const byKey = new Map<string, InvoiceRecord>();
  [...existing, ...incoming].forEach((invoice) => {
    byKey.set(invoice.id || invoice.documentNumber, invoice);
  });
  return Array.from(byKey.values()).sort(sortDocuments);
}

export async function loadInvoiceById(
  user: User | null,
  profile: BusinessProfile | null,
  invoiceId: string,
): Promise<InvoiceRecord | null> {
  const userId = user?.uid;
  const businessId = profile?.id;

  if (user && businessId && !invoiceId.startsWith("local-")) {
    try {
      const invoiceSnap = await getDoc(doc(db, "invoices", invoiceId));
      const invoice = invoiceSnap.exists()
        ? normalizeInvoice({ id: invoiceSnap.id, ...invoiceSnap.data() })
        : null;

      if (
        invoice &&
        invoice.businessId === businessId &&
        isVisibleToUser(invoice, userId)
      )
        return invoice;
    } catch (error) {
      console.warn(
        "BrandDocs Firebase invoice preview load failed; using local fallback if available.",
        error,
      );
    }
  }

  return (
    loadLocalInvoices(userId, businessId).find(
      (invoice) => invoice.id === invoiceId,
    ) || null
  );
}

export async function saveInvoice(
  user: User | null,
  profile: BusinessProfile | null,
  invoice: InvoiceRecord,
): Promise<InvoiceSaveResult> {
  const businessId = profile?.id;
  const userId = user?.uid;
  const totals = calculateDocumentTotals(invoice);
  const now = new Date().toISOString();
  const invoicePayload: InvoiceRecord = {
    ...invoice,
    businessId,
    userId,
    documentNumber: invoice.documentNumber || invoice.invoiceNumber,
    invoiceNumber: invoice.invoiceNumber || invoice.documentNumber,
    numberingSequence: Number(invoice.numberingSequence || 0),
    invoiceTitle: getDocumentTitle(invoice.documentType),
    status: normalizeStatus(invoice.status),
    taxMode:
      invoice.documentType === "bill_of_supply" ? "No GST" : invoice.taxMode,
    cgstPercent:
      invoice.documentType === "bill_of_supply" ? 0 : invoice.cgstPercent,
    sgstPercent:
      invoice.documentType === "bill_of_supply" ? 0 : invoice.sgstPercent,
    igstPercent:
      invoice.documentType === "bill_of_supply" ? 0 : invoice.igstPercent,
    subtotal: totals.subtotal,
    taxableValue: totals.taxableValue,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    createdAt: invoice.createdAt || now,
    updatedAt: now,
    businessProfileSnapshot: invoice.businessProfileSnapshot || profile || null,
  };

  const upsertLocal = (savedInvoice: InvoiceRecord) => {
    const localInvoices = loadLocalInvoices(userId, businessId);
    saveLocalInvoices(
      userId,
      businessId,
      mergeInvoices(
        localInvoices.filter((current) => current.id !== savedInvoice.id),
        [savedInvoice],
      ),
    );
  };

  if (user && businessId) {
    try {
      if (invoicePayload.id && !invoicePayload.id.startsWith("local-")) {
        const existingId = invoicePayload.id;
        await setDoc(
          doc(db, "invoices", existingId),
          {
            ...invoicePayload,
            createdAt: invoice.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        upsertLocal(invoicePayload);

        return { invoice: invoicePayload, source: "firebase" };
      }

      const invoiceRef = await addDoc(collection(db, "invoices"), {
        ...invoicePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const savedInvoice = { ...invoicePayload, id: invoiceRef.id };
      upsertLocal(savedInvoice);

      return { invoice: savedInvoice, source: "firebase" };
    } catch (error: any) {
      console.warn(
        "BrandDocs Firebase invoice save failed; invoice saved to local fallback.",
        error,
      );

      const localInvoice = {
        ...invoicePayload,
        id: invoicePayload.id || `local-${Date.now()}`,
      };
      upsertLocal(localInvoice);

      return {
        invoice: localInvoice,
        source: "local-fallback",
        warning:
          error?.message ||
          "Firebase invoice save failed. Document was saved locally on this device.",
      };
    }
  }

  const localInvoice = {
    ...invoicePayload,
    id: invoicePayload.id || `local-${Date.now()}`,
  };
  upsertLocal(localInvoice);

  return {
    invoice: localInvoice,
    source: "local-fallback",
    warning:
      "No active Firebase user or business profile was available, so the document was saved locally on this device.",
  };
}
