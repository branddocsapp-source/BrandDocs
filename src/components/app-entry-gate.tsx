import { Href, router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
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

const SPLASH_DISPLAY_MS = Platform.OS === "web" ? 2500 : 1200;

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
  const { theme } = useAppTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(500)}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.contentCenter}>
        <BrandLogo size="xlarge" disableNavigation />
      </View>
    </Animated.View>
  );
}

export function AppEntryGate({ destinations = DEFAULT_DESTINATIONS }: AppEntryGateProps) {
  useEffect(() => {
    let isMounted = true;

    const navigate = (href: Href) => {
      if (!isMounted) return;
      SplashScreen.hideAsync().catch(() => {});
      router.replace(href);
    };

    const authTimeout = setTimeout(() => {
      navigate(destinations.signedOut);
    }, SPLASH_DISPLAY_MS + 4000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(authTimeout);

      await waitForSplashDisplay();
      if (!isMounted) return;

      if (!user) {
        navigate(destinations.signedOut);
        return;
      }

      const profile = await loadBusinessProfile(user);
      if (!isMounted) return;
      navigate(profile ? destinations.ready : destinations.needsProfile);
    });

    return () => {
      isMounted = false;
      clearTimeout(authTimeout);
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
});
