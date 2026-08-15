import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { Colors } from "@/theme/colors";
import { useAppTheme } from "@/theme/theme-context";

type PreviousDocument = {
  id: string;
  number: string;
  date: string;
  customerName: string;
  amount: string;
};

type DocumentModuleScreenProps = {
  title: string;
  createLabel: string;
  previousLabel: string;
  emptyTitle: string;
  emptyMessage: string;
  icon: keyof typeof Ionicons.glyphMap;
  documents?: PreviousDocument[];
  onCreateRoute?: string;
};

const shadow = Platform.select({
  web: {
    boxShadow: "0px 8px 18px rgba(0, 0, 0, 0.07)",
  },
  default: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webSafeArea: {
    backgroundColor: Colors.surface,
  },
  container: {
    alignSelf: "center",
    maxWidth: 520,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    width: "100%",
  },
  webContainer: {
    maxWidth: 1040,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 52,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EFEFEF",
    borderRadius: 18,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
    ...shadow,
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  headerSpacer: {
    width: 40,
  },
  createButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 24,
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    padding: 18,
    ...Platform.select({
      web: {
        boxShadow: "0px 12px 20px rgba(255, 122, 0, 0.22)",
      },
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
        elevation: 5,
      },
    }),
  },
  createIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  createText: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EFEFEF",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    ...shadow,
  },
  webListCard: {
    padding: 24,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },
  documentRow: {
    alignItems: "center",
    borderTopColor: "#EFEFEF",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingVertical: 14,
  },
  documentIcon: {
    alignItems: "center",
    backgroundColor: "#FFF4E3",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    marginRight: 12,
    width: 40,
  },
  documentCopy: {
    flex: 1,
  },
  documentNumber: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  documentMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  documentAmount: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 10,
  },
  emptyState: {
    alignItems: "center",
    borderColor: "#F1F1F1",
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 34,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: "#FFF4E3",
    borderRadius: 22,
    height: 56,
    justifyContent: "center",
    marginBottom: 14,
    width: 56,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyMessage: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});

export function DocumentModuleScreen({
  title,
  createLabel,
  previousLabel,
  emptyTitle,
  emptyMessage,
  icon,
  documents = [],
  onCreateRoute,
}: DocumentModuleScreenProps) {
  const router = useRouter();
  const { isWebsite, isDesktop, isAppPreview } = useResponsiveLayout();
  const { isDark, theme } = useAppTheme();
  const sortedDocuments = [...documents].sort((first, second) => {
    return new Date(second.date).getTime() - new Date(first.date).getTime();
  });

  function appRoute(pathname: string) {
    if (!isAppPreview) return pathname;
    return { pathname, params: { appPreview: "1" } };
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }, isWebsite && styles.webSafeArea]}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }, isWebsite && styles.webContainer]} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.line }]} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={22} color={theme.ink} />
            </Pressable>
            <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Pressable
            style={styles.createButton}
            onPress={() => {
              if (onCreateRoute) {
                router.push(appRoute(onCreateRoute) as never);
                return;
              }

              Alert.alert("Coming Soon", `${createLabel} will open the editor when this module is built.`);
            }}
          >
            <View style={styles.createIcon}>
              <Ionicons name={icon} size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.createText}>{createLabel}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={[styles.listCard, { backgroundColor: theme.white, borderColor: theme.line }, isDesktop && styles.webListCard]}>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>{previousLabel}</Text>

            {sortedDocuments.length > 0 ? (
              sortedDocuments.map((document) => (
                <View key={document.id} style={[styles.documentRow, { borderBottomColor: theme.line }]}>
                  <View style={[styles.documentIcon, { backgroundColor: theme.orangeSoft }]}>
                    <Ionicons name="document-text-outline" size={18} color={theme.orangeDark} />
                  </View>
                  <View style={styles.documentCopy}>
                    <Text style={[styles.documentNumber, { color: theme.ink }]}>{document.number}</Text>
                    <Text style={[styles.documentMeta, { color: theme.muted }]}>
                      {document.date} • {document.customerName}
                    </Text>
                  </View>
                  <Text style={[styles.documentAmount, { color: theme.orangeDark }]}>{document.amount}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.orangeSoft }]}>
                  <Ionicons name={icon} size={28} color={theme.orangeDark} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.ink }]}>{emptyTitle}</Text>
                <Text style={[styles.emptyMessage, { color: theme.muted }]}>{emptyMessage}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
