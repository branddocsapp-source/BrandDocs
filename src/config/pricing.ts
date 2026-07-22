export type PricingCountryCode = "US" | "IN" | "OTHER";

export type PremiumPricing = {
  countryCode: PricingCountryCode;
  countryName: string;
  currency: string;
  locale: string;
  monthlyPrice: number | null;
  approved: boolean;
};

export const premiumPricingByCountry: Record<PricingCountryCode, PremiumPricing> = {
  US: {
    countryCode: "US",
    countryName: "United States",
    currency: "USD",
    locale: "en-US",
    monthlyPrice: 17,
    approved: true,
  },
  IN: {
    countryCode: "IN",
    countryName: "India",
    currency: "INR",
    locale: "en-IN",
    monthlyPrice: 197,
    approved: true,
  },
  OTHER: {
    countryCode: "OTHER",
    countryName: "Other country",
    currency: "USD",
    locale: "en-US",
    monthlyPrice: null,
    approved: false,
  },
};

export const selectablePricingCountries: PricingCountryCode[] = ["US", "IN", "OTHER"];

export function detectPricingCountry(locale?: string): PricingCountryCode {
  const detectedLocale =
    locale ||
    (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : undefined) ||
    "";
  const country = detectedLocale.split("-").pop()?.toUpperCase();

  if (country === "IN") return "IN";
  if (country === "US") return "US";
  return "OTHER";
}

export function formatPremiumPrice(pricing: PremiumPricing) {
  if (!pricing.approved || pricing.monthlyPrice === null) {
    return "Local price coming soon";
  }

  return new Intl.NumberFormat(pricing.locale, {
    style: "currency",
    currency: pricing.currency,
    maximumFractionDigits: 0,
  }).format(pricing.monthlyPrice);
}
