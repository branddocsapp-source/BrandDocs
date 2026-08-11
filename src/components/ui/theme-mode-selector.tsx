import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { ThemeMode, useAppTheme } from "@/theme/theme-context";
import { BrandColors, BrandRadius, BrandSpacing, BrandTypography } from "@/theme/tokens";

type ThemeOption = {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    mode: "light",
    label: "Light",
    description: "Bright premium workspace",
    icon: "sunny-outline",
  },
  {
    mode: "dark",
    label: "Dark",
    description: "Warm night mode",
    icon: "moon-outline",
  },
  {
    mode: "system",
    label: "System Default",
    description: "Follow device settings",
    icon: "phone-portrait-outline",
  },
];

function getThemeIcon(mode: ThemeMode, isDark: boolean) {
  if (mode === "light") return "sunny-outline";
  if (mode === "dark") return "moon-outline";
  return isDark ? "moon-outline" : "sunny-outline";
}

export function ThemeModeSelector({ compact }: { compact?: boolean }) {
  const { themeMode, isDark, theme, setThemeMode } = useAppTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose theme mode"
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.trigger,
          compact && styles.triggerCompact,
          { backgroundColor: theme.card, borderColor: theme.line },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name={getThemeIcon(themeMode, isDark)} size={compact ? 18 : 20} color={theme.ink} />
        {!compact ? <Text style={[styles.triggerText, { color: theme.muted }]}>Theme</Text> : null}
      </Pressable>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.line }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.title, { color: theme.ink }]}>Appearance</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>Choose how BrandDocs looks on this device.</Text>

            <View style={styles.options}>
              {THEME_OPTIONS.map((option) => {
                const selected = themeMode === option.mode;
                return (
                  <Pressable
                    key={option.mode}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    onPress={() => {
                      setThemeMode(option.mode);
                      setVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: selected ? theme.orangeSoft : theme.background,
                        borderColor: selected ? BrandColors.primary : theme.line,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: selected ? "rgba(246, 162, 26, 0.16)" : theme.white }]}>
                      <Ionicons name={option.icon} size={18} color={selected ? BrandColors.primary : theme.muted} />
                    </View>
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionLabel, { color: theme.ink }]}>{option.label}</Text>
                      <Text style={[styles.optionDescription, { color: theme.muted }]}>{option.description}</Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={BrandColors.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    borderRadius: BrandRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 40,
    paddingHorizontal: 12,
  },
  triggerCompact: {
    minWidth: 40,
    paddingHorizontal: 0,
  },
  triggerText: {
    ...BrandTypography.caption,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(10, 10, 10, 0.48)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    maxWidth: 420,
    padding: 20,
    width: "100%",
  },
  title: {
    ...BrandTypography.sectionHeading,
    fontSize: 20,
  },
  subtitle: {
    ...BrandTypography.body,
    fontSize: 13,
  },
  options: {
    gap: 10,
    marginTop: 4,
  },
  option: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  optionIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    ...BrandTypography.buttonLabel,
  },
  optionDescription: {
    ...BrandTypography.caption,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.82,
  },
});
