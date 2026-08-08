import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
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

export function BrandIconMark({ size = 48 }: { size?: number }) {
  const width = size;
  const height = size * 1.08;

  return (
    <View style={{ width, height, position: "relative" }}>
      {/* Outer B Shape in Warm Brand Orange (#DE7A2D) */}
      <View style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#DE7A2D",
        borderTopLeftRadius: size * 0.18,
        borderBottomLeftRadius: size * 0.18,
        borderTopRightRadius: size * 0.44,
        borderBottomRightRadius: size * 0.44,
        overflow: "hidden",
        position: "relative",
      }}>
        {/* Left Document Paper Overlay (#FFFDF9 with Folded Corner) */}
        <View style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "48%",
          height: "100%",
          backgroundColor: "#FFFDF9",
          borderTopLeftRadius: size * 0.14,
          borderBottomLeftRadius: size * 0.14,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: "12%",
          gap: size * 0.08,
        }}>
          {/* Top Fold Corner Highlight */}
          <View style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size * 0.16,
            height: size * 0.16,
            backgroundColor: "#E28B47",
            borderBottomRightRadius: size * 0.08,
          }} />
          {/* 3 Document Lines */}
          <View style={{ width: "100%", height: size * 0.065, backgroundColor: "#DE7A2D", borderRadius: 99 }} />
          <View style={{ width: "100%", height: size * 0.065, backgroundColor: "#DE7A2D", borderRadius: 99 }} />
          <View style={{ width: "70%", height: size * 0.065, backgroundColor: "#DE7A2D", borderRadius: 99, alignSelf: "flex-start" }} />
        </View>

        {/* Center Indentation for B Lobe */}
        <View style={{
          position: "absolute",
          top: "44%",
          right: "-12%",
          width: size * 0.28,
          height: size * 0.14,
          backgroundColor: "#FFFDF9",
          borderRadius: 99,
        }} />
      </View>
    </View>
  );
}

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

  const titleFontSize = isSmall ? 22 : isLarge ? 32 : isXLarge ? 46 : 28;
  const subtitleFontSize = isSmall ? 8.5 : isLarge ? 12 : isXLarge ? 20 : 10;
  const iconSize = isSmall ? 36 : isLarge ? 56 : isXLarge ? 160 : 46;

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
      {/* Crisp Transparent Vector B-Document Logo Mark */}
      <BrandIconMark size={iconSize} />

      {/* Typography */}
      <View style={[(stacked || isXLarge) ? styles.textGroupCentered : styles.textGroup]}>
        <Text style={[styles.titleText, { fontSize: titleFontSize, color: isDark ? "#FFFFFF" : "#2D2B2A" }]}>
          BrandDocs
        </Text>

        {showTagline || isXLarge ? (
          <Text style={[styles.taglineText, { fontSize: subtitleFontSize, color: isDark ? "#A09D9A" : "#595551" }]}>
            Professional documents.{"\n"}Ready in seconds.
          </Text>
        ) : (
          <Text style={[styles.subtitleText, { fontSize: subtitleFontSize, color: isDark ? "#A09D9A" : "#78746F" }]}>
            DOCUMENTS • BRANDING • BUSINESS
          </Text>
        )}
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
    gap: 14,
  },
  containerStacked: {
    flexDirection: "column",
    gap: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  textGroup: {
    justifyContent: "center",
  },
  textGroupCentered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  titleText: {
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subtitleText: {
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: -2,
    textTransform: "uppercase",
  },
  taglineText: {
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 28,
  },
});
