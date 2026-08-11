import React, { createContext, useContext, useEffect } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import { BrandColors } from "@/theme/brand-colors";

export type ThemeMode = "system";

export type ThemePalette = {
  background: string;
  white: string;
  card: string;
  ink: string;
  text: string;
  muted: string;
  line: string;
  orange: string;
  orangeDark: string;
  orangeSoft: string;
  wash: string;
  accentSurface: string;
  accentBorder: string;
  searchSurface: string;
  inputSurface: string;
  infoText: string;
};

export const lightPalette: ThemePalette = {
  background: "#FBFAF7",
  white: BrandColors.background,
  card: BrandColors.card,
  ink: BrandColors.text,
  text: "#343631",
  muted: BrandColors.textSecondary,
  line: BrandColors.border,
  orange: BrandColors.primary,
  orangeDark: BrandColors.primaryDark,
  orangeSoft: BrandColors.primarySoft,
  wash: BrandColors.surface,
  accentSurface: BrandColors.primarySoft,
  accentBorder: BrandColors.primarySubtle,
  searchSurface: "#F2F1EC",
  inputSurface: "#FAFAFA",
  infoText: "#7C2D12",
};

export const darkPalette: ThemePalette = {
  background: "#0A0A0A",
  white: "#141414",
  card: "#141414",
  ink: "#FFFFFF",
  text: "#D6D6D6",
  muted: "#8E8E8E",
  line: "#262626",
  orange: BrandColors.primary,
  orangeDark: "#FF9533",
  orangeSoft: "#241A10",
  wash: "#0A0A0A",
  accentSurface: "#1A1510",
  accentBorder: "#3D2E1F",
  searchSurface: "#161616",
  inputSurface: "#161616",
  infoText: "#E8C4A8",
};

type ThemeContextType = {
  themeMode: ThemeMode;
  isDark: boolean;
  theme: ThemePalette;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "system",
  isDark: false,
  theme: lightPalette,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

function applyWebThemeClass(isDark: boolean) {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  document.body.classList.toggle("dark-mode", isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const isDark = systemColorScheme === "dark";
  const theme = isDark ? darkPalette : lightPalette;

  useEffect(() => {
    applyWebThemeClass(isDark);
  }, [isDark]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode: "system",
        isDark,
        theme,
        toggleTheme: () => {},
        setThemeMode: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
