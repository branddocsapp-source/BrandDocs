/** Marketing site layout tokens — mobile and desktop saved separately */
export const MARKETING_BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
  wide: 1440,
} as const;

export const MARKETING_MOBILE = {
  contentMaxWidth: "100%" as const,
  paddingHorizontal: 16,
  headerPaddingHorizontal: 16,
  headerMinHeight: 64,
  sectionPaddingVertical: 48,
  heroPaddingVertical: 32,
  heroGap: 28,
  heroTitleSize: 34,
  heroTitleLineHeight: 42,
  logoMarkSize: 32,
  logoFontSize: 20,
  logoGap: 8,
  navGap: 0,
} as const;

export const MARKETING_DESKTOP = {
  contentMaxWidth: 1400,
  paddingHorizontal: 40,
  headerPaddingHorizontal: 40,
  headerMinHeight: 76,
  sectionPaddingVertical: 72,
  heroPaddingVertical: 56,
  heroGap: 48,
  heroTitleSize: 52,
  heroTitleLineHeight: 60,
  logoMarkSize: 38,
  logoFontSize: 24,
  logoGap: 10,
  navGap: 20,
} as const;

export type MarketingViewport = "mobile" | "desktop";

export function getMarketingViewport(width: number): MarketingViewport {
  return width < MARKETING_BREAKPOINTS.mobile ? "mobile" : "desktop";
}

export function getMarketingLayout(width: number) {
  const viewport = getMarketingViewport(width);
  const tokens = viewport === "mobile" ? MARKETING_MOBILE : MARKETING_DESKTOP;
  const useCompactNav = width < MARKETING_BREAKPOINTS.tablet;

  return {
    viewport,
    isMobile: viewport === "mobile",
    isDesktop: viewport === "desktop",
    isTablet: width >= MARKETING_BREAKPOINTS.mobile && width < MARKETING_BREAKPOINTS.tablet,
    isWideDesktop: width >= MARKETING_BREAKPOINTS.wide,
    useCompactNav,
    tokens,
    container: {
      width: "100%" as const,
      maxWidth: tokens.contentMaxWidth,
      paddingHorizontal: tokens.paddingHorizontal,
      alignSelf: "center" as const,
    },
  };
}

/** Collapse marketing navbar into hamburger + left drawer below tablet width. */
export function shouldUseCompactMarketingNav(width: number) {
  return width < MARKETING_BREAKPOINTS.tablet;
}
