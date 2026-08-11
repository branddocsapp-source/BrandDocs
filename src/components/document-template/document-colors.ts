import { BrandColors } from "@/theme/tokens";

/** Unified orange document template palette — aligned with BrandDocs brand colors */
export const DocumentColors = {
  accent: BrandColors.primary,
  accentDark: BrandColors.primaryDark,
  accentSoft: BrandColors.primarySoft,
  accentBorder: BrandColors.primarySubtle,
  accentMuted: BrandColors.primarySubtle,
  ink: "#0F172A",
  inkSecondary: "#334155",
  muted: "#475569",
  mutedLight: "#64748B",
  line: "#E2E8F0",
  lineStrong: "#CBD5E1",
  paper: "#FFFFFF",
  tableHeaderBg: BrandColors.primary,
  tableHeaderText: "#FFFFFF",
  grandTotalBg: BrandColors.primary,
  grandTotalText: "#FFFFFF",
  rowAlt: "#FAFAFA",
} as const;

export const DOCUMENT_PAPER_WIDTH = 794;
export const DOCUMENT_PAPER_MIN_HEIGHT = 1123;
