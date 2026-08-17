import { User } from "firebase/auth";

import { BusinessProfile } from "@/services/business-profile";
import { DocumentType, InvoiceRecord, loadInvoiceById, loadInvoices } from "@/services/invoices";
import { loadReceiptById, loadReceipts, ReceiptRecord } from "@/services/receipts";

export type BillStatementSelection = {
  taxInvoiceId: string;
  billOfSupplyId: string;
  receiptId: string;
};

export type BillStatementCandidates = {
  taxInvoices: InvoiceRecord[];
  billsOfSupply: InvoiceRecord[];
  receipts: ReceiptRecord[];
};

export type BillStatementBundle = {
  taxInvoice: InvoiceRecord;
  billOfSupply: InvoiceRecord;
  receipt: ReceiptRecord;
};

export type BillStatementDateRange = {
  startDate?: string;
  endDate?: string;
};

export type BillStatementPdfRequest = {
  selection: BillStatementSelection;
  dateRange?: BillStatementDateRange;
};

function normalizeDateValue(value?: string | null) {
  return (value || "").trim().slice(0, 10);
}

function isWithinDateRange(dateValue: string | undefined, range?: BillStatementDateRange) {
  if (!range?.startDate && !range?.endDate) return true;
  const source = normalizeDateValue(dateValue);
  if (!source) return false;
  const start = normalizeDateValue(range.startDate);
  const end = normalizeDateValue(range.endDate);
  if (start && source < start) return false;
  if (end && source > end) return false;
  return true;
}

function filterInvoicesByDateRange(records: InvoiceRecord[], range?: BillStatementDateRange) {
  return records.filter((record) => isWithinDateRange(record.invoiceDate, range));
}

function filterReceiptsByDateRange(records: ReceiptRecord[], range?: BillStatementDateRange) {
  return records.filter((record) => isWithinDateRange(record.receiptDate, range));
}

function validateDateRange(range?: BillStatementDateRange) {
  if (!range) return;
  const start = normalizeDateValue(range.startDate);
  const end = normalizeDateValue(range.endDate);
  if (start && end && start > end) {
    throw new Error("From Date cannot be after To Date.");
  }
}

export async function loadBillStatementCandidates(
  user: User | null,
  profile: BusinessProfile | null,
  dateRange?: BillStatementDateRange,
  maxCount = 50,
): Promise<BillStatementCandidates> {
  validateDateRange(dateRange);
  const [taxInvoices, billsOfSupply, receipts] = await Promise.all([
    loadInvoices(user, profile, "tax_invoice", maxCount),
    loadInvoices(user, profile, "bill_of_supply", maxCount),
    loadReceipts(user, profile, maxCount),
  ]);

  return {
    taxInvoices: filterInvoicesByDateRange(taxInvoices, dateRange),
    billsOfSupply: filterInvoicesByDateRange(billsOfSupply, dateRange),
    receipts: filterReceiptsByDateRange(receipts, dateRange),
  };
}

async function loadInvoiceByType(
  user: User | null,
  profile: BusinessProfile | null,
  id: string,
  expectedType: DocumentType,
): Promise<InvoiceRecord> {
  const record = await loadInvoiceById(user, profile, id);
  if (!record) {
    throw new Error(`Selected ${expectedType === "tax_invoice" ? "Tax Invoice" : "Bill of Supply"} was not found.`);
  }
  if (record.documentType !== expectedType) {
    throw new Error(`Selected document does not match ${expectedType === "tax_invoice" ? "Tax Invoice" : "Bill of Supply"} type.`);
  }
  return record;
}

export async function buildBillStatementBundle(
  user: User | null,
  profile: BusinessProfile | null,
  selection: BillStatementSelection,
  dateRange?: BillStatementDateRange,
): Promise<BillStatementBundle> {
  validateDateRange(dateRange);
  if (!selection.taxInvoiceId || !selection.billOfSupplyId || !selection.receiptId) {
    throw new Error("Please select one Tax Invoice, one Bill of Supply, and one OCR Receipt.");
  }

  const [taxInvoice, billOfSupply, receipt] = await Promise.all([
    loadInvoiceByType(user, profile, selection.taxInvoiceId, "tax_invoice"),
    loadInvoiceByType(user, profile, selection.billOfSupplyId, "bill_of_supply"),
    loadReceiptById(user, profile, selection.receiptId),
  ]);

  if (!receipt) {
    throw new Error("Selected OCR Receipt was not found.");
  }

  if (!isWithinDateRange(taxInvoice.invoiceDate, dateRange)) {
    throw new Error("Selected Tax Invoice is outside the selected date range.");
  }
  if (!isWithinDateRange(billOfSupply.invoiceDate, dateRange)) {
    throw new Error("Selected Bill of Supply is outside the selected date range.");
  }
  if (!isWithinDateRange(receipt.receiptDate, dateRange)) {
    throw new Error("Selected OCR Receipt is outside the selected date range.");
  }

  return {
    taxInvoice,
    billOfSupply,
    receipt,
  };
}

export async function requestBillStatementPdf(
  user: User | null,
  profile: BusinessProfile | null,
  request: BillStatementPdfRequest,
): Promise<Blob> {
  if (!user?.uid) {
    throw new Error("Please sign in to download bill statements.");
  }

  validateDateRange(request.dateRange);
  const bundle = await buildBillStatementBundle(user, profile, request.selection, request.dateRange);
  const idToken = await user.getIdToken();
  const endpoint = process.env.EXPO_PUBLIC_BILL_STATEMENT_API_URL || "/api/bill-statements/download";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      businessId: profile?.id || null,
      templateColor: profile?.templateColor || "orange",
      dateRange: request.dateRange || null,
      selection: request.selection,
      documents: {
        taxInvoice: bundle.taxInvoice,
        billOfSupply: bundle.billOfSupply,
        receipt: bundle.receipt,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Bill statement download failed (${response.status}).`);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error("Downloaded statement file is empty.");
  }
  return blob;
}

export function downloadPdfBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
