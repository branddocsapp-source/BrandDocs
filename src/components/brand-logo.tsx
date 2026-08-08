import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme/theme-context";
import { useRouter } from "expo-router";
import { auth } from "@/firebase";

type BrandLogoProps = {
  size?: "small" | "medium" | "large";
  onPress?: () => void;
  disableNavigation?: boolean;
};

export function BrandLogo({ size = "medium", onPress, disableNavigation = false }: BrandLogoProps) {
  const { isDark } = useAppTheme();
  const router = useRouter();

  const isSmall = size === "small";
  const isLarge = size === "large";

  const titleFontSize = isSmall ? 20 : isLarge ? 32 : 26;
  const subtitleFontSize = isSmall ? 7.5 : isLarge ? 10 : 8.5;
  const iconSize = isSmall ? 36 : isLarge ? 54 : 44;

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const target = auth.currentUser ? "/dashboard" : "/";
    router.push(target as any);
  };

  const content = (
    <View style={styles.container}>
      {/* Brand Icon Mark */}
      <View style={[styles.iconOuter, { width: iconSize, height: iconSize, borderRadius: iconSize * 0.28 }]}>
        <Ionicons name="document-text" size={iconSize * 0.58} color="#FFFFFF" />
      </View>

      {/* Brand Typography */}
      <View style={styles.textGroup}>
        <View style={styles.titleRow}>
          <Text style={[styles.brandOrange, { fontSize: titleFontSize }]}>Brand</Text>
          <Text style={[styles.docsText, { fontSize: titleFontSize, color: isDark ? "#FFFFFF" : "#0F172A" }]}>
            Docs
          </Text>
        </View>
        <Text style={[styles.subtitleText, { fontSize: subtitleFontSize, color: isDark ? "#94A3B8" : "#64748B" }]}>
          DOCUMENTS • BRANDING • BUSINESS
        </Text>
      </View>
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
      style={({ pressed }) => [
        { opacity: pressed ? 0.75 : 1 }
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  iconOuter: {
    alignItems: "center",
    backgroundColor: "#EA580C",
    justifyContent: "center",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  textGroup: {
    justifyContent: "center",
  },
  titleRow: {
    alignItems: "baseline",
    flexDirection: "row",
  },
  brandOrange: {
    color: "#EA580C",
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  docsText: {
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: -2,
    textTransform: "uppercase",
  },
});
