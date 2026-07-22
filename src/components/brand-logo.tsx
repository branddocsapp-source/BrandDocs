import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/theme-context";

type BrandLogoProps = {
  size?: "small" | "medium" | "large";
};

export function BrandLogo({ size = "medium" }: BrandLogoProps) {
  const { isDark } = useAppTheme();

  const isSmall = size === "small";
  const isLarge = size === "large";

  const titleFontSize = isSmall ? 20 : isLarge ? 32 : 26;
  const subtitleFontSize = isSmall ? 7 : isLarge ? 9.5 : 8.5;
  const iconSize = isSmall ? 34 : isLarge ? 50 : 42;

  return (
    <View style={styles.container}>
      {/* Brand Icon Mark */}
      <View style={[styles.iconOuter, { width: iconSize, height: iconSize }]}>
        <View style={styles.iconBBack}>
          <View style={[styles.iconPaper, { backgroundColor: isDark ? "#14161B" : "#FFFFFF" }]}>
            <View style={styles.iconLine} />
            <View style={styles.iconLine} />
            <View style={styles.iconLineShort} />
          </View>
        </View>
      </View>

      {/* Brand Typography */}
      <View style={styles.textGroup}>
        <View style={styles.titleRow}>
          <Text style={[styles.brandOrange, { fontSize: titleFontSize }]}>Brand</Text>
          <Text style={[styles.docsText, { fontSize: titleFontSize, color: isDark ? "#FFFFFF" : "#1D1F24" }]}>
            Docs
          </Text>
        </View>
        <Text style={[styles.subtitleText, { fontSize: subtitleFontSize, color: isDark ? "#D0D4DC" : "#676B63" }]}>
          DOCUMENTS • BRANDING • BUSINESS
        </Text>
      </View>
    </View>
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
    backgroundColor: "#F6A21A",
    borderRadius: 12,
    justifyContent: "center",
    position: "relative",
  },
  iconBBack: {
    alignItems: "center",
    backgroundColor: "#F6A21A",
    borderRadius: 10,
    height: "85%",
    justifyContent: "center",
    width: "85%",
  },
  iconPaper: {
    borderRadius: 4,
    gap: 3,
    height: "65%",
    justifyContent: "center",
    padding: 3,
    width: "55%",
  },
  iconLine: {
    backgroundColor: "#F6A21A",
    borderRadius: 2,
    height: 2.5,
    width: "100%",
  },
  iconLineShort: {
    backgroundColor: "#F6A21A",
    borderRadius: 2,
    height: 2.5,
    width: "65%",
  },
  textGroup: {
    justifyContent: "center",
  },
  titleRow: {
    alignItems: "baseline",
    flexDirection: "row",
  },
  brandOrange: {
    color: "#F6A21A",
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  docsText: {
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitleText: {
    fontWeight: "800",
    letterSpacing: 1.1,
    marginTop: -2,
    textTransform: "uppercase",
  },
});
