import React from "react";
import { Image } from "expo-image";
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/theme/theme-context";
import { auth } from "@/firebase";

export type BrandLogoVariant = "horizontal" | "stacked" | "icon";
export type BrandLogoSize = "small" | "medium" | "large" | "xlarge";
export type BrandLogoAlign = "left" | "center" | "right";

type BrandLogoProps = {
  size?: BrandLogoSize;
  align?: BrandLogoAlign;
  variant?: BrandLogoVariant;
  onPress?: () => void;
  disableNavigation?: boolean;
  style?: StyleProp<ViewStyle>;
};

const logoAssets = {
  horizontalDark: require("@/assets/images/branddocs-logo-horizontal-dark.png"),
  horizontalLight: require("@/assets/images/branddocs-logo-horizontal-light.png"),
  stackedDark: require("@/assets/images/branddocs-logo-dark-trans.png"),
  stackedLight: require("@/assets/images/branddocs-logo-light-trans.png"),
  icon: require("@/assets/images/branddocs-logo-icon.png"),
};

// Sizing calibrated to exact asset aspect ratios without any clipping
const logoSizePresets = {
  horizontal: {
    small: { width: 130, height: 36 },
    medium: { width: 154, height: 43 },
    large: { width: 194, height: 54 },
    xlarge: { width: 240, height: 67 },
  },
  stacked: {
    small: { width: 110, height: 79 },
    medium: { width: 140, height: 101 },
    large: { width: 180, height: 130 },
    xlarge: { width: 230, height: 165 },
  },
  icon: {
    small: { width: 32, height: 32 },
    medium: { width: 42, height: 42 },
    large: { width: 56, height: 56 },
    xlarge: { width: 72, height: 72 },
  },
} as const;

export function BrandLogo({
  size = "medium",
  align = "left",
  variant = "horizontal",
  onPress,
  disableNavigation = false,
  style,
}: BrandLogoProps) {
  const { isDark } = useAppTheme();
  const router = useRouter();

  const currentSize = logoSizePresets[variant][size];

  const source = React.useMemo(() => {
    if (variant === "icon") {
      return logoAssets.icon;
    }
    if (variant === "stacked") {
      return isDark ? logoAssets.stackedDark : logoAssets.stackedLight;
    }
    return isDark ? logoAssets.horizontalDark : logoAssets.horizontalLight;
  }, [variant, isDark]);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const target = auth.currentUser ? "/dashboard" : "/";
    router.push(target as any);
  };

  const alignStyle =
    align === "center"
      ? styles.alignCenter
      : align === "right"
      ? styles.alignRight
      : styles.alignLeft;

  const content = (
    <View style={[styles.stackWrap, alignStyle, style]}>
      <Image
        source={source}
        style={[
          currentSize,
          styles.logoImage,
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
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  logoImage: {
    backgroundColor: "transparent",
  },
  alignCenter: {
    alignItems: "center",
  },
  alignLeft: {
    alignItems: "flex-start",
  },
  alignRight: {
    alignItems: "flex-end",
  },
});
