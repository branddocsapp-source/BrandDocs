import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/theme/theme-context";
import { auth } from "@/firebase";
import { BrandColors } from "@/theme/brand-colors";

type BrandLogoProps = {
  size?: "small" | "medium" | "large" | "xlarge";
  variant?: "mark" | "full";
  layout?: "inline" | "sidebar";
  onPress?: () => void;
  disableNavigation?: boolean;
  stacked?: boolean;
  showTagline?: boolean;
  tagline?: string;
};

const logoAssets = {
  icon: require("@/assets/images/branddocs-logo-icon.png"),
  full: require("@/assets/images/branddocs-logo-full.png"),
  light: require("@/assets/images/branddocs-logo-light.jpg"),
  dark: require("@/assets/images/branddocs-logo-dark.jpg"),
};

function getMarkSize(size: BrandLogoProps["size"]) {
  if (size === "small") return 36;
  if (size === "large") return 52;
  if (size === "xlarge") return 72;
  return 44;
}

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

  const markSize = getMarkSize(size);
  return { width: markSize, height: markSize };
}

export function BrandLogo({
  size = "medium",
  variant = "mark",
  layout = "inline",
  onPress,
  disableNavigation = false,
  stacked = false,
  showTagline = false,
  tagline = "DELIVERING TRUSTED RESULTS",
}: BrandLogoProps) {
  const { isDark } = useAppTheme();
  const router = useRouter();
  const isXLarge = size === "xlarge";
  const isSmall = size === "small";
  const isLarge = size === "large";
  const fontSize = isSmall ? 20 : isLarge ? 28 : isXLarge ? 44 : 24;
  const taglineSize = isXLarge ? 18 : isSmall ? 9 : 10;
  const inkColor = isDark ? "#FFFFFF" : BrandColors.text;
  const mutedColor = isDark ? "#8E8E8E" : "#595551";
  const dimensions = getLogoDimensions(size, variant);
  const markSize = getMarkSize(size);
  const useSidebarLayout = layout === "sidebar";
  const useStackedMark = useSidebarLayout || stacked || isXLarge;

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const target = auth.currentUser ? "/dashboard" : "/";
    router.push(target as any);
  };

  const content = useStackedMark ? (
    <View style={[styles.containerStacked, useSidebarLayout && styles.sidebarStack]}>
      <Image
        source={logoAssets.icon}
        style={[
          { width: markSize, height: markSize },
          Platform.OS === "web" ? ({ backgroundColor: "transparent" } as object) : null,
        ]}
        contentFit="contain"
        transition={0}
        accessibilityLabel="BrandDocs mark"
      />
      <View style={[styles.wordmarkBlock, useSidebarLayout && styles.sidebarWordmarkBlock]}>
        <Text style={[styles.wordmark, { fontSize }]}>
          <Text style={{ color: BrandColors.primary, fontWeight: "800" }}>Brand</Text>
          <Text style={{ color: inkColor, fontWeight: "800" }}>Docs</Text>
        </Text>
        {(showTagline || useSidebarLayout || isXLarge) ? (
          <Text style={[styles.tagline, { color: mutedColor, fontSize: taglineSize }]}>
            {isXLarge ? "Professional documents.\nReady in seconds." : tagline}
          </Text>
        ) : null}
      </View>
    </View>
  ) : variant === "full" ? (
    <View style={styles.container}>
      <Image
        source={isDark ? logoAssets.dark : logoAssets.light}
        style={[
          dimensions,
          Platform.OS === "web" ? ({ backgroundColor: "transparent" } as object) : null,
        ]}
        contentFit="contain"
        transition={0}
        accessibilityLabel="BrandDocs"
      />
    </View>
  ) : (
    <View style={styles.container}>
      <Image
        source={logoAssets.icon}
        style={[
          dimensions,
          Platform.OS === "web" ? ({ backgroundColor: "transparent" } as object) : null,
        ]}
        contentFit="contain"
        transition={0}
        accessibilityLabel="BrandDocs"
      />
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
    gap: 12,
    justifyContent: "center",
  },
  sidebarStack: {
    alignItems: "flex-start",
    gap: 10,
    width: "100%",
  },
  wordmarkBlock: {
    alignItems: "center",
  },
  sidebarWordmarkBlock: {
    alignItems: "flex-start",
  },
  wordmark: {
    letterSpacing: -0.4,
  },
  tagline: {
    fontWeight: "600",
    letterSpacing: 0.8,
    marginTop: 4,
    textTransform: "uppercase",
  },
});
