import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

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
  white: "#FFFFFF",
  card: "#FFFFFF",
  ink: "#191A17",
  text: "#343631",
  muted: "#676B63",
  line: "#E8E5DE",
  orange: "#F6A21A",
  orangeDark: "#D98200",
  orangeSoft: "#FFF7EA",
  wash: "#F5F4F0",
  accentSurface: "#FFFBF5",
  accentBorder: "#FED7AA",
  searchSurface: "#F2F1EC",
  inputSurface: "#FAFAFA",
  infoText: "#7C2D12",
};

export const darkPalette: ThemePalette = {
  background: "#121110",
  white: "#1C1B19",
  card: "#1F1E1C",
  ink: "#F7F4EF",
  text: "#C8C3B8",
  muted: "#9C968C",
  line: "#34312D",
  orange: "#F6A21A",
  orangeDark: "#FFAA2A",
  orangeSoft: "#2B2318",
  wash: "#171615",
  accentSurface: "#241C14",
  accentBorder: "#4A3824",
  searchSurface: "#232220",
  inputSurface: "#232220",
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
    if (themeMode === "system") {
      void setThemeMode(isDark ? "light" : "dark");
      return;
    }
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
