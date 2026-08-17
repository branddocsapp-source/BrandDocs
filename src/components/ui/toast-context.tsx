import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme/theme-context";
import { BrandColors, BrandRadius, BrandShadows } from "@/theme/tokens";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  message: string;
  type?: ToastType;
  duration?: number;
};

type ToastItem = ToastOptions & {
  id: string;
};

type ToastContextType = {
  showToast: (options: ToastOptions | string) => void;
  hideToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { isDark, theme } = useAppTheme();

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions | string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toastObj: ToastItem =
      typeof options === "string"
        ? { id, message: options, type: "success", duration: 3000 }
        : { id, message: options.message, type: options.type || "success", duration: options.duration || 3000 };

    setToasts((prev) => [...prev, toastObj]);

    if (toastObj.duration && toastObj.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, toastObj.duration);
    }
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map((toast) => {
          let iconName: keyof typeof Ionicons.glyphMap = "checkmark-circle";
          let badgeColor: string = BrandColors.success;
          let bgSoft: string = isDark ? "rgba(36, 161, 72, 0.2)" : BrandColors.successSoft;

          if (toast.type === "error") {
            iconName = "alert-circle";
            badgeColor = BrandColors.error;
            bgSoft = isDark ? "rgba(217, 45, 32, 0.2)" : BrandColors.errorSoft;
          } else if (toast.type === "warning") {
            iconName = "warning";
            badgeColor = BrandColors.warning;
            bgSoft = isDark ? "rgba(245, 158, 11, 0.2)" : BrandColors.warningSoft;
          } else if (toast.type === "info") {
            iconName = "information-circle";
            badgeColor = BrandColors.info;
            bgSoft = isDark ? "rgba(37, 99, 235, 0.2)" : BrandColors.infoSoft;
          }

          return (
            <View
              key={toast.id}
              style={[
                styles.toastCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                },
                BrandShadows.raised,
              ]}
            >
              <View style={[styles.iconBadge, { backgroundColor: bgSoft }]}>
                <Ionicons name={iconName} size={18} color={badgeColor} />
              </View>
              <Text style={[styles.toastText, { color: theme.ink }]} numberOfLines={2}>
                {toast.message}
              </Text>
              <Pressable
                onPress={() => hideToast(toast.id)}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color={theme.muted} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback stub if context isn't wrapped
    return {
      showToast: (msg: ToastOptions | string) => {
        const text = typeof msg === "string" ? msg : msg.message;
        console.log("[Toast]:", text);
      },
      hideToast: () => {},
    };
  }
  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 24 : 36,
    right: Platform.OS === "web" ? 24 : 16,
    left: Platform.OS === "web" ? undefined : 16,
    zIndex: 99999,
    gap: 8,
    maxWidth: Platform.OS === "web" ? 380 : undefined,
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BrandRadius.medium,
    borderWidth: 1,
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 4,
  },
});
