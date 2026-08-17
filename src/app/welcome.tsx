import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useAppTheme, ThemePalette } from "@/theme/theme-context";
import { Typography } from "@/theme/typography";

import { BrandLogo } from "@/components/brand-logo";

export default function WelcomeScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <BrandLogo size="large" variant="stacked" align="center" disableNavigation />

      <Text style={styles.title}>Welcome to BrandDocs</Text>

      <Text style={styles.subtitle}>
        Business Documents.
        {"\n"}
        Beautifully Crafted.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/signin")}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/signin")}>
        <Text style={styles.signIn}>
          Already have an account?{" "}
          <Text style={styles.signInBold}>Sign In</Text>
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  title: {
    ...Typography.h1,
    color: theme.ink,
    textAlign: "center",
    marginBottom: 16,
  },

  subtitle: {
    ...Typography.body,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 50,
  },

  button: {
    backgroundColor: theme.orange,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 28,
  },

  buttonText: {
    ...Typography.button,
    color: "#FFFFFF",
  },

  signIn: {
    ...Typography.caption,
    color: theme.muted,
  },

  signInBold: {
    ...Typography.caption,
    color: theme.orange,
    fontWeight: "700",
  },
});
