import React from "react";
import { Image } from "expo-image";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/theme/theme-context";
import { auth } from "@/firebase";

type BrandLogoProps = {
  size?: "small" | "medium" | "large" | "xlarge";
  align?: "left" | "center";
  onPress?: () => void;
  disableNavigation?: boolean;
};

const logoAssets = {
  brandDark: require("@/assets/images/branddocs-logo-dark-trans.png"),
  brandLight: require("@/assets/images/branddocs-logo-light-trans.png"),
};

const brandStackSizes = {
  small: { width: 120, height: 76 },
  medium: { width: 154, height: 98 },
  large: { width: 190, height: 120 },
  xlarge: { width: 230, height: 146 },
} as const;

export function BrandLogo({
  size = "medium",
  align = "center",
  onPress,
  disableNavigation = false,
}: BrandLogoProps) {
  const { isDark } = useAppTheme();
  const router = useRouter();
  const stackSize = brandStackSizes[size];

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const target = auth.currentUser ? "/dashboard" : "/";
    router.push(target as any);
  };

  const content = (
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
    overflow: "hidden",
  },
  alignCenter: {
    alignItems: "center",
  },
  alignLeft: {
    alignItems: "flex-start",
  },
});
