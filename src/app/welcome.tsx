import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Colors } from "@/theme/colors";
import { Typography } from "@/theme/typography";

export default function WelcomeScreen() {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <Image
        source={require("../../assets/images/branddocs-logo-full.png")}
        style={styles.logo}
        resizeMode="contain"
      />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  logo: {
    width: 210,
    height: 60,
    marginBottom: 40,
  },

  title: {
    ...Typography.h1,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 16,
  },

  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 50,
  },

  button: {
    backgroundColor: Colors.primary,
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
    color: Colors.textSecondary,
  },

  signInBold: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "700",
  },
});
