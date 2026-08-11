import React from "react";
import { Platform, StyleSheet, View, Pressable, Text } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme/theme-context";
import { useRouter } from "expo-router";
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

function LogoMark({ size }: { size: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Ionicons name="document-text" size={Math.round(size * 0.5)} color="#FFFFFF" />
    </View>
  );
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

  const isSmall = size === "small";
  const isLarge = size === "large";
  const isXLarge = size === "xlarge";

  const markSize = isSmall ? 32 : isLarge ? 44 : isXLarge ? 72 : 38;
  const fontSize = isSmall ? 20 : isLarge ? 28 : isXLarge ? 44 : 24;
  const taglineSize = isXLarge ? 18 : isSmall ? 10 : 11;
  const inkColor = isDark ? "#FFFFFF" : "#232323";
  const mutedColor = isDark ? "#A09D9A" : "#595551";

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const target = auth.currentUser ? "/dashboard" : "/";
    router.push(target as any);
  };

  const useMark = variant === "mark" || stacked || isXLarge;

  const content = useMark ? (
    <View style={[styles.container, (stacked || isXLarge) && styles.containerStacked, !stacked && !isXLarge && styles.containerRow]}>
      <LogoMark size={markSize} />
      <View style={[(stacked || isXLarge) && styles.stackedTextBlock]}>
        <Text style={[styles.wordmark, { fontSize }]}>
          <Text style={{ color: BrandColors.primary, fontWeight: "800" }}>Brand</Text>
          <Text style={{ color: inkColor, fontWeight: "800" }}>Docs</Text>
        </Text>
        {(showTagline || isXLarge) ? (
          <Text style={[styles.tagline, { color: mutedColor, fontSize: taglineSize }]}>
            {isXLarge ? "Professional documents.\nReady in seconds." : "DOCUMENTS • BRANDING • BUSINESS"}
          </Text>
        ) : null}
      </View>
    </View>
  ) : (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/branddocs-logo-full.png")}
        style={{
          width: isSmall ? 220 : isLarge ? 340 : 280,
          height: isSmall ? 65 : isLarge ? 100 : 85,
          ...(Platform.OS === "web"
            ? ({ backgroundColor: "transparent" } as object)
            : null),
        }}
        contentFit="contain"
        transition={0}
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
  },
  containerRow: {
    alignItems: "center",
    gap: 10,
  },
  containerStacked: {
    alignItems: "center",
    flexDirection: "column",
    gap: 16,
    justifyContent: "center",
  },
  stackedTextBlock: {
    alignItems: "center",
  },
  mark: {
    alignItems: "center",
    backgroundColor: BrandColors.primary,
    justifyContent: "center",
    overflow: "hidden",
  },
  wordmark: {
    letterSpacing: -0.4,
    lineHeight: undefined,
  },
  tagline: {
    fontWeight: "600",
    letterSpacing: 0.6,
    marginTop: 4,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
