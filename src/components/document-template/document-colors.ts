import {
  getActiveTemplateColor,
  normalizeTemplateColor,
  primaryColorToTemplateColor,
  setActiveTemplateColor,
  TemplateColor,
} from "@/theme/template-colors";

const templatePalette = {
  blue: {
    accent: "#2563EB",
    accentDark: "#1D4ED8",
    accentSoft: "#EFF6FF",
    accentBorder: "#BFDBFE",
    accentMuted: "#DBEAFE",
  },
  green: {
    accent: "#16A34A",
    accentDark: "#15803D",
    accentSoft: "#ECFDF3",
    accentBorder: "#BBF7D0",
    accentMuted: "#DCFCE7",
  },
  orange: {
    accent: "#FF7A00",
    accentDark: "#D95F00",
    accentSoft: "#FFF3E8",
    accentBorder: "#FFE1C4",
    accentMuted: "#FFE1C4",
  },
} as const;

function buildDocumentColors(color: TemplateColor) {
  const accents = templatePalette[color];
  return {
    accent: accents.accent,
    accentDark: accents.accentDark,
    accentSoft: accents.accentSoft,
    accentBorder: accents.accentBorder,
    accentMuted: accents.accentMuted,
    ink: "#0F172A",
    inkSecondary: "#334155",
    muted: "#475569",
    mutedLight: "#64748B",
    line: "#E2E8F0",
    lineStrong: "#CBD5E1",
    paper: "#FFFFFF",
    tableHeaderBg: accents.accent,
    tableHeaderText: "#FFFFFF",
    grandTotalBg: accents.accent,
    grandTotalText: "#FFFFFF",
    rowAlt: "#FAFAFA",
  } as const;
}

export let DocumentColors = buildDocumentColors(getActiveTemplateColor());

export function setDocumentTemplateColor(color?: string | null) {
  const normalized = setActiveTemplateColor(color);
  DocumentColors = buildDocumentColors(normalized);
  return DocumentColors;
}

export function setDocumentTemplateColorFromPrimary(primaryColor?: string | null) {
  const mapped = primaryColorToTemplateColor(primaryColor);
  return setDocumentTemplateColor(mapped);
}

export function getDocumentColors(color?: string | null) {
  return buildDocumentColors(normalizeTemplateColor(color));
}

export const DOCUMENT_PAPER_WIDTH = 794;
export const DOCUMENT_PAPER_MIN_HEIGHT = 1123;
