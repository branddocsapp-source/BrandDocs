import React from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/theme/theme-context";
import { useRouter } from "expo-router";
import { auth } from "@/firebase";

type BrandLogoProps = {
  size?: "small" | "medium" | "large" | "xlarge";
  onPress?: () => void;
  disableNavigation?: boolean;
  stacked?: boolean;
  showTagline?: boolean;
};

export function BrandLogo({
  size = "medium",
  onPress,
  disableNavigation = false,
  stacked = false,
  showTagline = false,
}: BrandLogoProps) {
  const { isDark } = useAppTheme();
  const router = useRouter();

  const isSmall = size === "small";
  const isLarge = size === "large";
  const isXLarge = size === "xlarge";

  // Ideal dimensions for the PNG logo asset
  const logoWidth = isSmall ? 220 : isLarge ? 340 : isXLarge ? 420 : 280;
  const logoHeight = isSmall ? 65 : isLarge ? 100 : isXLarge ? 120 : 85;

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const target = auth.currentUser ? "/dashboard" : "/";
    router.push(target as any);
  };

  const content = (
    <View style={[styles.container, (stacked || isXLarge) && styles.containerStacked]}>
      {isXLarge || stacked ? (
        <View style={{ alignItems: "center", gap: 16 }}>
          <Image
            source={require("@/assets/images/branddocs-logo-icon.png")}
            style={{ width: 180, height: 180 }}
            contentFit="contain"
          />
          <Text style={{ fontSize: 44, fontWeight: "800", color: isDark ? "#FFFFFF" : "#2D2B2A", letterSpacing: -0.8 }}>
            BrandDocs
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "500", color: isDark ? "#A09D9A" : "#595551", textAlign: "center", lineHeight: 28 }}>
            Professional documents.{"\n"}Ready in seconds.
          </Text>
        </View>
      ) : (
        <Image
          source={require("@/assets/images/branddocs-logo-full.png")}
          style={{ width: logoWidth, height: logoHeight }}
          contentFit="contain"
        />
      )}
    </View>
  );

  if (disableNavigation) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="BrandDocs Home"
      onPress={handlePress}
      style={({ pressed }) => [{ opacity: pressed ? 0.78 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
  },
  containerStacked: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
});
