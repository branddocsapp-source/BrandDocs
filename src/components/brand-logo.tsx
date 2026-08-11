import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/theme/theme-context";
import { auth } from "@/firebase";
import { BrandColors } from "@/theme/brand-colors";

type BrandLogoProps = {
  size?: "small" | "medium" | "large" | "xlarge";
  /** Compact inline mark + wordmark for tight headers (no tagline). */
  compact?: boolean;
  align?: "left" | "center";
  onPress?: () => void;
  disableNavigation?: boolean;
};

const logoAssets = {
  brandDark: require("@/assets/images/branddocs-logo-dark.jpg"),
  brandLight: require("@/assets/images/branddocs-logo-light.jpg"),
};

const brandStackSizes = {
  small: { width: 148, height: 78 },
  medium: { width: 188, height: 98 },
  large: { width: 228, height: 118 },
  xlarge: { width: 280, height: 144 },
} as const;

function getCompactMarkSize(size: BrandLogoProps["size"]) {
  if (size === "small") return 32;
  if (size === "large") return 44;
  if (size === "xlarge") return 52;
  return 38;
}

function LogoMark({ size }: { size: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Ionicons name="document-text" size={Math.round(size * 0.5)} color="#FFFFFF" />
    </View>
  );
}

export function BrandLogo({
  size = "medium",
  compact = false,
  align = "center",
  onPress,
  disableNavigation = false,
}: BrandLogoProps) {
  const { isDark } = useAppTheme();
  const router = useRouter();
  const isSmall = size === "small";
  const isLarge = size === "large";
  const isXLarge = size === "xlarge";
  const fontSize = isSmall ? 18 : isLarge ? 26 : isXLarge ? 34 : 22;
  const inkColor = isDark ? "#FFFFFF" : BrandColors.text;
  const stackSize = brandStackSizes[size];

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const target = auth.currentUser ? "/dashboard" : "/";
    router.push(target as any);
  };

  const content = compact ? (
    <View style={[styles.inlineRow, align === "left" ? styles.alignLeft : styles.alignCenter]}>
      <LogoMark size={getCompactMarkSize(size)} />
      <Text style={[styles.wordmark, { fontSize }]}>
        <Text style={{ color: BrandColors.primary, fontWeight: "800" }}>Brand</Text>
        <Text style={{ color: inkColor, fontWeight: "800" }}>Docs</Text>
      </Text>
    </View>
  ) : (
    <View style={[styles.stackWrap, align === "left" ? styles.alignLeft : styles.alignCenter]}>
      <Image
        source={isDark ? logoAssets.brandDark : logoAssets.brandLight}
        style={[
          stackSize,
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
  stackWrap: {
    backgroundColor: "transparent",
  },
  alignCenter: {
    alignItems: "center",
  },
  alignLeft: {
    alignItems: "flex-start",
  },
  inlineRow: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 10,
  },
  mark: {
    alignItems: "center",
    backgroundColor: BrandColors.primary,
    justifyContent: "center",
    overflow: "hidden",
  },
  wordmark: {
    letterSpacing: -0.4,
  },
});
