import { Platform } from "react-native";

export { BrandColors } from "@/theme/brand-colors";

export const BrandSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

export const BrandRadius = {
  small: 8,
  medium: 12,
  large: 18,
  pill: 999,
} as const;

export const BrandTypography = {
  displayHeading: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  pageHeading: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  sectionHeading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600" as const,
    letterSpacing: 0,
  },
  buttonLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  formLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
} as const;

export const BrandShadows = {
  subtle: Platform.select({
    web: {
      boxShadow: "0px 4px 12px rgba(16, 24, 40, 0.04)",
    } as any,
    default: {
      shadowColor: "#101828",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
  }),
  raised: Platform.select({
    web: {
      boxShadow: "0px 8px 18px rgba(16, 24, 40, 0.05)",
    } as any,
    default: {
      shadowColor: "#101828",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 3,
    },
  }),
} as const;

export const BrandLayout = {
  maxContentWidth: 1320,
  desktopContentWidth: 1200,
  tabletContentWidth: 760,
  mobileContentWidth: 560,
  sidebarWidth: 244,
  bottomNavHeight: 76,
} as const;
