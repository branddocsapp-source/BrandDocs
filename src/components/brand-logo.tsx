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
  brandDark: require("@/assets/images/branddocs-logo-dark.jpg"),
  brandLight: require("@/assets/images/branddocs-logo-light.jpg"),
};

const brandStackSizes = {
  small: { width: 126, height: 66 },
  medium: { width: 160, height: 83 },
  large: { width: 194, height: 100 },
  xlarge: { width: 238, height: 122 },
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
