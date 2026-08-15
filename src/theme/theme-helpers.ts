import { ThemePalette } from "./theme-context";

/** Shared surface styles — use these instead of hardcoded light/dark colors. */
export const themed = {
  screen: (theme: ThemePalette) => ({ backgroundColor: theme.background }),
  card: (theme: ThemePalette) => ({ backgroundColor: theme.card, borderColor: theme.line }),
  input: (theme: ThemePalette) => ({ backgroundColor: theme.inputSurface, borderColor: theme.line }),
  accentCard: (theme: ThemePalette) => ({ backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }),
  ink: (theme: ThemePalette) => ({ color: theme.ink }),
  muted: (theme: ThemePalette) => ({ color: theme.muted }),
  infoBox: (theme: ThemePalette) => ({
    backgroundColor: theme.accentSurface,
    borderColor: theme.accentBorder,
  }),
  infoText: (theme: ThemePalette) => ({ color: theme.infoText }),
  iconTint: (light: string, dark: string, isDark: boolean) => ({
    backgroundColor: isDark ? dark : light,
  }),
};
