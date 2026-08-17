import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useAppTheme } from "@/theme/theme-context";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/toast-context";
import { Platform } from "react-native";

function RootLayoutContent() {
  const { isDark, theme } = useAppTheme();

  return (
    <>
      <StatusBar
        style={isDark ? "light" : "dark"}
        translucent={Platform.OS === "android"}
        backgroundColor="transparent"
      />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === "ios" ? "slide_from_right" : "fade",
          gestureEnabled: Platform.OS === "ios",
          fullScreenGestureEnabled: false,
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      />
    </>
  );
}

export default function RootLayout() {
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