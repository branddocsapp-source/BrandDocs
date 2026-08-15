import { User } from "firebase/auth";

import { BusinessProfile } from "@/services/business-profile";
import { loadInvoices } from "@/services/invoices";
import { loadQuotations } from "@/services/quotations";
import { loadReceipts } from "@/services/receipts";

export type SavedCustomerProfile = {
  key: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  stateCode: string;
  pin: string;
  gstin: string;
  companyName: string;
  lastUsedAt: string;
};

function normalizeText(value?: string) {
  return (value || "").trim();
}

function customerKey(name: string, gstin?: string, phone?: string) {
  const gst = normalizeText(gstin).toUpperCase();
  if (gst.length >= 4) return `gst:${gst}`;
  const normalizedName = normalizeText(name).toLowerCase();
  if (normalizedName) return `name:${normalizedName}`;
  const normalizedPhone = normalizeText(phone).replace(/\D/g, "");
  if (normalizedPhone.length >= 6) return `phone:${normalizedPhone}`;
  return "";
}

function mergeProfiles(existing: SavedCustomerProfile, incoming: Partial<SavedCustomerProfile>, lastUsedAt: string) {
  return {
    ...existing,
    name: normalizeText(incoming.name) || existing.name,
    phone: normalizeText(incoming.phone) || existing.phone,
    email: normalizeText(incoming.email) || existing.email,
    address: normalizeText(incoming.address) || existing.address,
    state: normalizeText(incoming.state) || existing.state,
    stateCode: normalizeText(incoming.stateCode) || existing.stateCode,
    pin: normalizeText(incoming.pin) || existing.pin,
    gstin: normalizeText(incoming.gstin).toUpperCase() || existing.gstin,
    companyName: normalizeText(incoming.companyName) || existing.companyName,
    lastUsedAt: lastUsedAt > existing.lastUsedAt ? lastUsedAt : existing.lastUsedAt,
  };
}

function upsertCustomer(
  map: Map<string, SavedCustomerProfile>,
  partial: Partial<SavedCustomerProfile>,
  lastUsedAt: string,
) {
  const key = customerKey(partial.name || "", partial.gstin, partial.phone);
  if (!key || !normalizeText(partial.name)) return;

  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      key,
      name: normalizeText(partial.name),
      phone: normalizeText(partial.phone),
      email: normalizeText(partial.email),
      address: normalizeText(partial.address),
      state: normalizeText(partial.state),
      stateCode: normalizeText(partial.stateCode),
      pin: normalizeText(partial.pin),
      gstin: normalizeText(partial.gstin).toUpperCase(),
      companyName: normalizeText(partial.companyName),
      lastUsedAt,
    });
    return;
  }

  map.set(key, mergeProfiles(existing, partial, lastUsedAt));
}

export async function loadSavedCustomers(
  user: User | null,
  profile: BusinessProfile | null,
): Promise<SavedCustomerProfile[]> {
  const [invoices, quotations, receipts] = await Promise.all([
    loadInvoices(user, profile, undefined, 200),
    loadQuotations(user, profile, undefined, 200),
    loadReceipts(user, profile, 200),
  ]);

  const map = new Map<string, SavedCustomerProfile>();

  invoices.forEach((invoice) => {
    const lastUsedAt = invoice.updatedAt || invoice.createdAt || invoice.invoiceDate || "";
    upsertCustomer(map, invoice.customer, lastUsedAt);
  });

  quotations.forEach((quotation) => {
    const lastUsedAt = quotation.updatedAt || quotation.createdAt || quotation.quotationDate || "";
    upsertCustomer(
      map,
      {
        name: quotation.client.name,
        companyName: quotation.client.companyName,
        address: quotation.client.address,
        email: quotation.client.email,
        phone: quotation.client.phone,
      },
      lastUsedAt,
    );
  });

  receipts.forEach((receipt) => {
    const lastUsedAt = receipt.updatedAt || receipt.createdAt || receipt.receiptDate || "";
    upsertCustomer(map, receipt.receivedFrom, lastUsedAt);
  });

  return Array.from(map.values()).sort((left, right) => right.lastUsedAt.localeCompare(left.lastUsedAt));
}

export function searchSavedCustomers(customers: SavedCustomerProfile[], query: string, limit = 8) {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) return [];

  const compactQuery = normalizedQuery.replace(/\s+/g, "");

  return customers
    .filter((customer) => {
      const name = (customer.name || "").toLowerCase();
      const company = (customer.companyName || "").toLowerCase();
      const gstin = (customer.gstin || "").toLowerCase();
      const phone = (customer.phone || "").replace(/\D/g, "");
      const email = (customer.email || "").toLowerCase();
      const queryDigits = normalizedQuery.replace(/\D/g, "");

      return (
        name.includes(normalizedQuery) ||
        company.includes(normalizedQuery) ||
        gstin.includes(compactQuery) ||
        email.includes(normalizedQuery) ||
        (queryDigits.length >= 3 && phone.includes(queryDigits))
      );
    })
    .slice(0, limit);
}

export function formatCustomerSuggestionLabel(customer: SavedCustomerProfile) {
  const details = [customer.gstin, customer.phone, customer.companyName].filter(Boolean);
  if (!details.length) return customer.name;
  return `${customer.name} • ${details[0]}`;
}
