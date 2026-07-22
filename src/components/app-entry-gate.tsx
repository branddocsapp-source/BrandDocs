import { Href, router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, View } from "react-native";

import { auth } from "@/firebase";
import { loadBusinessProfile } from "@/services/business-profile";
import { Colors } from "@/theme/colors";

type AppEntryDestinations = {
  signedOut: Href;
  needsProfile: Href;
  ready: Href;
};

type AppEntryGateProps = {
  destinations?: AppEntryDestinations;
};

const SPLASH_DISPLAY_MS = 900;
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
  return (
    <View style={styles.container}>
      <View style={styles.logoFrame}>
        <Image
          source={require("../../assets/images/branddocs-logo-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
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
    gap: 30,
    backgroundColor: "#FFFFFF",
  },
  logoFrame: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      web: {
        boxShadow: "0px 14px 28px rgba(0, 0, 0, 0.08)",
      },
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.08,
        shadowRadius: 28,
        elevation: 8,
      },
    }),
  },
  logo: {
    width: 74,
    height: 74,
  },
});
