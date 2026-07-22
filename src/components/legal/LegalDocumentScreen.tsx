import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { legalCenterLinks, LegalDocument } from "@/services/legal-content";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors, BrandLayout, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";

export function LegalDocumentScreen({ document }: { document: LegalDocument }) {
  const { theme } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.line }]}>
              <Ionicons name="chevron-back" size={19} color={theme.ink} />
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.push("/legal-center" as never)} style={styles.centerLink}>
              <Text style={styles.centerLinkText}>Legal & Privacy Center</Text>
            </Pressable>
          </View>

          <View style={[styles.hero, { backgroundColor: theme.card, borderColor: theme.line }]}>
            <Text style={styles.badge}>Draft - Legal Review Required</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.ink }]}>{document.title}</Text>
            <Text style={[styles.summary, { color: theme.muted }]}>{document.summary}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: theme.muted }]}>Last Updated: {document.lastUpdated}</Text>
              <Text style={[styles.metaText, { color: theme.muted }]}>Version: {document.version}</Text>
              <Text style={[styles.metaText, { color: theme.muted }]}>Language: en</Text>
            </View>
          </View>

          <View style={[styles.toc, { backgroundColor: theme.card, borderColor: theme.line }]}>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>Contents</Text>
            {document.tableOfContents.map((item) => (
              <View key={item} style={styles.tocRow}>
                <Ionicons name="ellipse" size={6} color={BrandColors.primary} />
                <Text style={[styles.tocText, { color: theme.ink }]}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sections}>
            {document.sections.map((section) => (
              <View key={section.heading} style={[styles.section, { backgroundColor: theme.card, borderColor: theme.line }]}>
                <Text style={[styles.sectionTitle, { color: theme.ink }]}>{section.heading}</Text>
                {section.body.map((paragraph) => (
                  <Text key={paragraph} style={[styles.paragraph, { color: theme.muted }]}>{paragraph}</Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

export function LegalCenterScreen() {
  const { theme } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={19} color={BrandColors.text} />
            </Pressable>
          </View>
          <View style={styles.hero}>
            <Text style={styles.badge}>Draft - Legal Review Required</Text>
            <Text accessibilityRole="header" style={styles.title}>Legal & Privacy Center</Text>
            <Text style={styles.summary}>
              Central access to BrandDocs draft legal, privacy, security, export and account-control documents.
            </Text>
          </View>
          <View style={styles.grid}>
            {legalCenterLinks.map((item) => (
              <Pressable
                accessibilityRole="link"
                key={item.key}
                onPress={() => router.push(item.route as never)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="document-text-outline" size={20} color={BrandColors.primary} />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardText}>{item.summary}</Text>
                <Text style={styles.cardMeta}>Version {item.version}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  container: {
    alignSelf: "center",
    maxWidth: BrandLayout.maxContentWidth,
    paddingHorizontal: BrandSpacing["2xl"],
    paddingVertical: BrandSpacing["3xl"],
    width: "100%",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: BrandSpacing["2xl"],
  },
  backButton: {
    alignItems: "center",
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  centerLink: {
    padding: BrandSpacing.sm,
  },
  centerLinkText: {
    ...BrandTypography.buttonLabel,
    color: BrandColors.primary,
  },
  hero: {
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    paddingBottom: BrandSpacing["3xl"],
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: BrandColors.warningSoft,
    borderRadius: BrandRadius.pill,
    color: BrandColors.warning,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: BrandSpacing.md,
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
  },
  title: {
    ...BrandTypography.displayHeading,
    color: BrandColors.text,
  },
  summary: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
    marginTop: BrandSpacing.md,
    maxWidth: 760,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.md,
    marginTop: BrandSpacing.lg,
  },
  metaText: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
  },
  toc: {
    backgroundColor: BrandColors.surface,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    marginTop: BrandSpacing["2xl"],
    padding: BrandSpacing.lg,
  },
  tocRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: BrandSpacing.sm,
    marginTop: BrandSpacing.sm,
  },
  tocText: {
    ...BrandTypography.body,
    color: BrandColors.text,
  },
  sections: {
    gap: BrandSpacing["2xl"],
    marginTop: BrandSpacing["3xl"],
  },
  section: {
    gap: BrandSpacing.sm,
  },
  sectionTitle: {
    ...BrandTypography.sectionHeading,
    color: BrandColors.text,
  },
  paragraph: {
    ...BrandTypography.body,
    color: BrandColors.textSecondary,
    maxWidth: 860,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BrandSpacing.lg,
    marginTop: BrandSpacing["3xl"],
  },
  card: {
    backgroundColor: BrandColors.card,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: 300,
    minHeight: 184,
    padding: BrandSpacing.lg,
  },
  cardIcon: {
    alignItems: "center",
    backgroundColor: BrandColors.primarySoft,
    borderRadius: BrandRadius.medium,
    height: 42,
    justifyContent: "center",
    marginBottom: BrandSpacing.md,
    width: 42,
  },
  cardTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  cardText: {
    ...BrandTypography.caption,
    color: BrandColors.textSecondary,
    marginTop: BrandSpacing.sm,
  },
  cardMeta: {
    ...BrandTypography.caption,
    color: BrandColors.primary,
    marginTop: "auto",
  },
  pressed: {
    opacity: 0.72,
  },
});
