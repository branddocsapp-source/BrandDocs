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
  wash: "#FBFAF7",
};

export const darkPalette: ThemePalette = {
  background: "#0C0D0E",
  white: "#16181C",
  card: "#1C1E24",
  ink: "#FFFFFF",
  text: "#D0D4DC",
  muted: "#949AA5",
  line: "#2A2E38",
  orange: "#F6A21A",
  orangeDark: "#FFAA2A",
  orangeSoft: "#282012",
  wash: "#111317",
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
        if (saved === "light" || saved === "dark" || saved === "system") {
          setThemeModeState(saved);
        }
      }
    } catch {
      // Ignore local storage read errors
    }
  }, []);

  function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
        if (mode === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
          document.body.classList.add("dark-mode");
        } else if (mode === "light") {
          document.documentElement.setAttribute("data-theme", "light");
          document.body.classList.remove("dark-mode");
        } else {
          document.documentElement.removeAttribute("data-theme");
          document.body.classList.remove("dark-mode");
        }
      }
    } catch {
      // Ignore local storage write errors
    }
  }

  const isDark =
    themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isDark) {
        document.documentElement.setAttribute("data-theme", "dark");
        document.body.classList.add("dark-mode");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.body.classList.remove("dark-mode");
      }
    }
  }, [isDark]);

  const theme = isDark ? darkPalette : lightPalette;

  function toggleTheme() {
    setThemeMode(isDark ? "light" : "dark");
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
