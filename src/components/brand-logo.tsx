import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/theme/theme-context";
import { auth } from "@/firebase";
import { BrandColors } from "@/theme/tokens";

type BrandLogoProps = {
  size?: "small" | "medium" | "large" | "xlarge";
  variant?: "mark" | "full";
  onPress?: () => void;
  disableNavigation?: boolean;
  stacked?: boolean;
  showTagline?: boolean;
};

const logoAssets = {
  icon: require("@/assets/images/branddocs-logo-icon.png"),
  full: require("@/assets/images/branddocs-logo-full.png"),
  light: require("@/assets/images/branddocs-logo-light.jpg"),
  dark: require("@/assets/images/branddocs-logo-dark.jpg"),
};

function getLogoDimensions(size: BrandLogoProps["size"], variant: BrandLogoProps["variant"]) {
  const isSmall = size === "small";
  const isLarge = size === "large";
  const isXLarge = size === "xlarge";

  if (variant === "full") {
    return {
      width: isSmall ? 220 : isLarge ? 340 : isXLarge ? 380 : 280,
      height: isSmall ? 65 : isLarge ? 100 : isXLarge ? 112 : 85,
    };
  }

  const markSize = isSmall ? 32 : isLarge ? 44 : isXLarge ? 72 : 38;
  return { width: markSize, height: markSize };
}

export function BrandLogo({
  size = "medium",
  variant = "mark",
  onPress,
  disableNavigation = false,
  stacked = false,
  showTagline = false,
}: BrandLogoProps) {
  const { isDark } = useAppTheme();
  const router = useRouter();
  const isXLarge = size === "xlarge";
  const taglineSize = isXLarge ? 18 : size === "small" ? 10 : 11;
  const mutedColor = isDark ? "#A09D9A" : "#595551";
  const dimensions = getLogoDimensions(size, variant);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const target = auth.currentUser ? "/dashboard" : "/";
    router.push(target as any);
  };

  const logoSource = variant === "full"
    ? (isDark ? logoAssets.dark : logoAssets.light)
    : logoAssets.icon;

  const content = (
    <View style={[styles.container, (stacked || isXLarge) && styles.containerStacked]}>
      <Image
        source={logoSource}
        style={[
          dimensions,
          Platform.OS === "web" ? ({ backgroundColor: "transparent" } as object) : null,
        ]}
        contentFit="contain"
        transition={0}
        accessibilityLabel="BrandDocs"
      />
      {(showTagline || isXLarge) ? (
        <Text style={[styles.tagline, { color: mutedColor, fontSize: taglineSize }]}>
          {isXLarge ? "Professional documents.\nReady in seconds." : "DOCUMENTS • BRANDING • BUSINESS"}
        </Text>
      ) : null}
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
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 10,
  },
  containerStacked: {
    alignItems: "center",
    flexDirection: "column",
    gap: 16,
    justifyContent: "center",
  },
  tagline: {
    fontWeight: "600",
    letterSpacing: 0.6,
    marginTop: 4,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
