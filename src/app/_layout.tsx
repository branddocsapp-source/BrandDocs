import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";

import { ToastProvider } from "@/components/ui/toast-context";
import { ThemeProvider, useAppTheme } from "@/theme/theme-context";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootLayoutContent() {
  const { isDark, theme } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <RootLayoutContent />
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
