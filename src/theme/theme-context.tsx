import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import { BrandColors } from "@/theme/brand-colors";

export type ThemeMode = "light" | "dark" | "system";

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
  background: "#0B0F19",
  white: "#151C2C",
  card: "#151C2C",
  ink: "#F8FAFC",
  text: "#E2E8F0",
  muted: "#94A3B8",
  line: "#2A344A",
  orange: BrandColors.primary,
  orangeDark: "#FF9533",
  orangeSoft: "#332115",
  wash: "#0B0F19",
  accentSurface: "#1B2438",
  accentBorder: "#3B4B68",
  searchSurface: "#192236",
  inputSurface: "#192236",
  infoText: "#FDBA74",
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

const THEME_STORAGE_KEY = "branddocs.theme_mode";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function applyWebThemeClass(isDark: boolean) {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  document.body.classList.toggle("dark-mode", isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateThemeMode() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && isThemeMode(saved)) {
          setThemeModeState(saved);
        }
      } catch {
        // Ignore storage read errors
      } finally {
        if (isMounted) setHydrated(true);
      }
    }

    hydrateThemeMode();

    return () => {
      isMounted = false;
    };
  }, []);

  const isDark = themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");
  const theme = isDark ? darkPalette : lightPalette;

  useEffect(() => {
    if (!hydrated) return;
    applyWebThemeClass(isDark);
  }, [hydrated, isDark]);

  async function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore storage write errors
    }
  }

  function toggleTheme() {
    void setThemeMode(isDark ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        theme,
        toggleTheme,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
