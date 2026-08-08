import { Href, router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { BrandLogo } from "@/components/brand-logo";
import { auth } from "@/firebase";
import { loadBusinessProfile } from "@/services/business-profile";
import { useAppTheme } from "@/theme/theme-context";

type AppEntryDestinations = {
  signedOut: Href;
  needsProfile: Href;
  ready: Href;
};

type AppEntryGateProps = {
  destinations?: AppEntryDestinations;
};

const SPLASH_DISPLAY_MS = 5000; // 5 Seconds Splash Screen as requested by user

const DEFAULT_DESTINATIONS: AppEntryDestinations = {
  signedOut: "/signin",
  needsProfile: "/business-setup",
  ready: "/dashboard",
};

function waitForSplashDisplay() {
  return new Promise((resolve) => {
    setTimeout(resolve, SPLASH_DISPLAY_MS);
  });
}

export function BrandDocsSplashScreen() {
  const { isDark } = useAppTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      exiting={FadeOut.duration(500)}
      style={[
        styles.container,
        { backgroundColor: isDark ? "#0F172A" : "#FAF8F5" },
      ]}
    >
      <View style={styles.contentCenter}>
        {/* Large Brand B-Logo Mark */}
        <BrandLogo size="large" disableNavigation />

        {/* BrandDocs Title */}
        <Text style={[styles.titleText, { color: isDark ? "#FFFFFF" : "#171717" }]}>
          Brand<Text style={{ color: "#EA580C" }}>Docs</Text>
        </Text>

        {/* Subtitle Tagline */}
        <Text style={[styles.subtitleText, { color: isDark ? "#94A3B8" : "#525252" }]}>
          Professional documents.{"\n"}Ready in seconds.
        </Text>
      </View>
    </Animated.View>
  );
}

export function AppEntryGate({ destinations = DEFAULT_DESTINATIONS }: AppEntryGateProps) {
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const [, profile] = await Promise.all([
        waitForSplashDisplay(),
        user ? loadBusinessProfile(user) : Promise.resolve(null),
      ]);

      if (!isMounted) return;

      if (!user) {
        router.replace(destinations.signedOut);
        return;
      }

      router.replace(profile ? destinations.ready : destinations.needsProfile);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [destinations]);

  return <BrandDocsSplashScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  contentCenter: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  titleText: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 26,
  },
});
