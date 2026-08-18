import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { CANCELLATION_REASONS } from "@/services/invoices";
import { Colors } from "@/theme/colors";
import { useAppTheme } from "@/theme/theme-context";

// ─── Status Types ────────────────────────────────────────────

export type DocStatus = "draft" | "final" | "cancelled";

// ─── Status Badge ────────────────────────────────────────────

const statusConfig: Record<DocStatus, { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  draft: { label: "Draft", bg: "#F1F5F9", text: "#475569", icon: "create-outline" },
  final: { label: "Final", bg: "#DCFCE7", text: "#15803D", icon: "checkmark-circle-outline" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", text: "#DC2626", icon: "close-circle-outline" },
};

export function DocStatusBadge({ status }: { status: DocStatus }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={12} color={config.text} />
      <Text style={[badgeStyles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: 6,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

// ─── Draft Action Bar ────────────────────────────────────────

export function DraftActionBar({
  saving,
  onSaveDraft,
  onPreview,
  onFinalize,
}: {
  saving: boolean;
  onSaveDraft: () => void;
  onPreview: () => void;
  onFinalize: () => void;
}) {
  const { theme, isDark } = useAppTheme();

  return (
    <View style={[actionBarStyles.bar, { backgroundColor: theme.card, borderTopColor: theme.line }]}>
      <Pressable
        style={[
          actionBarStyles.button,
          {
            backgroundColor: isDark ? "#334155" : "#F1F5F9",
            borderColor: isDark ? "#475569" : "#CBD5E1",
            borderWidth: 1,
          },
          saving && actionBarStyles.disabledButton,
        ]}
        onPress={onSaveDraft}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Save Draft"
      >
        <Ionicons name="save-outline" size={16} color={isDark ? "#F8FAFC" : "#0F172A"} />
        <Text style={[actionBarStyles.buttonText, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>
          Save Draft
        </Text>
      </Pressable>
      <Pressable
        style={[
          actionBarStyles.button,
          {
            backgroundColor: isDark ? "#1E293B" : "#FFF7ED",
            borderColor: isDark ? "#F97316" : "#EA580C",
            borderWidth: 1,
          },
          saving && actionBarStyles.disabledButton,
        ]}
        onPress={onPreview}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Preview"
      >
        <Ionicons name="eye-outline" size={16} color={isDark ? "#FB923C" : "#EA580C"} />
        <Text style={[actionBarStyles.buttonText, { color: isDark ? "#FB923C" : "#EA580C" }]}>
          Preview
        </Text>
      </Pressable>
      <Pressable
        style={[
          actionBarStyles.button,
          actionBarStyles.finalizeButton,
          saving && actionBarStyles.disabledButton,
        ]}
        onPress={onFinalize}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Finalize"
      >
        <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
        <Text style={[actionBarStyles.buttonText, { color: "#FFFFFF" }]}>Finalize</Text>
      </Pressable>
    </View>
  );
}

const actionBarStyles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.5,
  },
  finalizeButton: {
    backgroundColor: "#16A34A",
  },
  secondaryButton: {
    backgroundColor: "#F1F5F9",
  },
});

// ─── Finalize Confirm Modal ──────────────────────────────────

export function FinalizeConfirmModal({
  visible,
  documentLabel,
  onGoBack,
  onConfirm,
  loading,
}: {
  visible: boolean;
  documentLabel: string;
  onGoBack: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onGoBack}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <View style={modalStyles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={28} color="#15803D" />
          </View>
          <Text style={modalStyles.title}>Finalize {documentLabel}?</Text>
          <Text style={modalStyles.message}>
            Once finalized, this document cannot be edited or deleted. If required later, it can only be cancelled.
          </Text>
          <View style={modalStyles.actions}>
            <Pressable style={[modalStyles.actionButton, modalStyles.goBackButton]} onPress={onGoBack} disabled={loading}>
              <Text style={[modalStyles.actionText, { color: "#475569" }]}>Go Back</Text>
            </Pressable>
            <Pressable
              style={[modalStyles.actionButton, modalStyles.confirmButton, loading && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={[modalStyles.actionText, { color: "#FFFFFF" }]}>
                {loading ? "Finalizing..." : "Finalize"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Cancel Confirm Modal ────────────────────────────────────

export function CancelConfirmModal({
  visible,
  documentLabel,
  onGoBack,
  onConfirm,
  loading,
}: {
  visible: boolean;
  documentLabel: string;
  onGoBack: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}) {
  const [selectedReason, setSelectedReason] = useState<string>("");

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onGoBack}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.card, { maxWidth: 380 }]}>
          <View style={[modalStyles.iconCircle, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="close-circle-outline" size={28} color="#DC2626" />
          </View>
          <Text style={modalStyles.title}>Cancel {documentLabel}?</Text>
          <Text style={modalStyles.message}>
            This {documentLabel.toLowerCase()} will be marked as cancelled. It cannot be deleted and will remain as a permanent record.
          </Text>

          <Text style={cancelStyles.reasonLabel}>Cancellation Reason</Text>
          {CANCELLATION_REASONS.map((reason) => (
            <Pressable
              key={reason}
              style={[cancelStyles.reasonOption, selectedReason === reason && cancelStyles.reasonOptionActive]}
              onPress={() => setSelectedReason(reason)}
            >
              <View style={[cancelStyles.radio, selectedReason === reason && cancelStyles.radioActive]}>
                {selectedReason === reason && <View style={cancelStyles.radioFill} />}
              </View>
              <Text style={[cancelStyles.reasonText, selectedReason === reason && cancelStyles.reasonTextActive]}>{reason}</Text>
            </Pressable>
          ))}

          <View style={modalStyles.actions}>
            <Pressable style={[modalStyles.actionButton, modalStyles.goBackButton]} onPress={onGoBack} disabled={loading}>
              <Text style={[modalStyles.actionText, { color: "#475569" }]}>Go Back</Text>
            </Pressable>
            <Pressable
              style={[modalStyles.actionButton, cancelStyles.cancelConfirmButton, (!selectedReason || loading) && { opacity: 0.5 }]}
              onPress={() => selectedReason && onConfirm(selectedReason)}
              disabled={!selectedReason || loading}
            >
              <Ionicons name="close-circle" size={16} color="#FFFFFF" />
              <Text style={[modalStyles.actionText, { color: "#FFFFFF" }]}>
                {loading ? "Cancelling..." : "Cancel Document"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const cancelStyles = StyleSheet.create({
  cancelConfirmButton: {
    backgroundColor: "#DC2626",
    flex: 1,
  },
  radio: {
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    width: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: "#DC2626",
  },
  radioFill: {
    backgroundColor: "#DC2626",
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  reasonLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  reasonOption: {
    alignItems: "center",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
  },
  reasonOptionActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  reasonText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "500",
  },
  reasonTextActive: {
    color: "#DC2626",
    fontWeight: "700",
  },
});

const modalStyles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    width: "100%",
  },
  card: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    elevation: 12,
    maxWidth: 360,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    width: "90%",
  },
  confirmButton: {
    backgroundColor: "#15803D",
    flex: 1,
  },
  goBackButton: {
    backgroundColor: "#F1F5F9",
    flex: 1,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    marginBottom: 12,
    width: 52,
  },
  message: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "center",
  },
  title: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
});

// ─── Three-Dot Menu ──────────────────────────────────────────

export type ThreeDotMenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
};

export function ThreeDotMenu({ items }: { items: ThreeDotMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const { theme } = useAppTheme();
  const triggerRef = useRef<View>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 16 });

  function handleOpen() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const windowWidth = Dimensions.get("window").width;
      const rightOffset = Math.max(12, Math.min(windowWidth - (x + width), windowWidth - 210));
      setMenuPos({ top: y + height + 4, right: rightOffset });
      setOpen(true);
    });
  }

  if (!items.length) return null;

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={handleOpen}
          style={dotMenuStyles.trigger}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.ink} />
        </Pressable>
      </View>

      <Modal transparent visible={open} animationType="none" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={dotMenuStyles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={[dotMenuStyles.menu, { top: menuPos.top, right: menuPos.right, backgroundColor: theme.card, borderColor: theme.line }]}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                style={dotMenuStyles.menuItem}
                onPress={() => {
                  setOpen(false);
                  item.onPress();
                }}
              >
                <Ionicons name={item.icon} size={16} color={item.color || theme.ink} />
                <Text style={[dotMenuStyles.menuItemText, { color: item.color || theme.ink }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const dotMenuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  menu: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderWidth: 1,
    elevation: 10,
    minWidth: 200,
    paddingVertical: 6,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  menuItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "500",
  },
  trigger: {
    alignItems: "center",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
});

// ─── Cancelled Watermark ─────────────────────────────────────

export function CancelledWatermark() {
  return (
    <View style={[watermarkStyles.container, { pointerEvents: "none" } as object]}>
      <View style={watermarkStyles.badge}>
        <Text style={watermarkStyles.text}>CANCELLED</Text>
      </View>
    </View>
  );
}

const watermarkStyles = StyleSheet.create({
  badge: {
    borderColor: "rgba(220, 38, 38, 0.35)",
    borderRadius: 8,
    borderWidth: 3,
    paddingHorizontal: 28,
    paddingVertical: 10,
    transform: [{ rotate: "-18deg" }],
  },
  container: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 100,
  },
  text: {
    color: "rgba(220, 38, 38, 0.35)",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 6,
  },
});

// ─── Delete Confirm Modal ────────────────────────────────────

export function DeleteConfirmModal({
  visible,
  documentLabel,
  documentNumber,
  onGoBack,
  onConfirm,
  loading,
}: {
  visible: boolean;
  documentLabel: string;
  documentNumber: string;
  onGoBack: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onGoBack}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <View style={[modalStyles.iconCircle, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="trash-outline" size={28} color="#DC2626" />
          </View>
          <Text style={modalStyles.title}>Delete Draft?</Text>
          <Text style={modalStyles.message}>
            Are you sure you want to permanently delete {documentLabel.toLowerCase()} {documentNumber}? This action cannot be undone.
          </Text>
          <View style={modalStyles.actions}>
            <Pressable style={[modalStyles.actionButton, modalStyles.goBackButton]} onPress={onGoBack} disabled={loading}>
              <Text style={[modalStyles.actionText, { color: "#475569" }]}>Go Back</Text>
            </Pressable>
            <Pressable
              style={[modalStyles.actionButton, { backgroundColor: "#DC2626" }, loading && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Ionicons name="trash" size={16} color="#FFFFFF" />
              <Text style={[modalStyles.actionText, { color: "#FFFFFF" }]}>
                {loading ? "Deleting..." : "Delete"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Helper: Build 3-dot menu items by status ────────────────

export function getDraftMenuItems(options: {
  onEdit: () => void;
  onPreview: () => void;
  onDelete: () => void;
}): ThreeDotMenuItem[] {
  return [
    { label: "Edit", icon: "create-outline", onPress: options.onEdit },
    { label: "Preview", icon: "eye-outline", onPress: options.onPreview },
    { label: "Delete Draft", icon: "trash-outline", color: Colors.error, onPress: options.onDelete },
  ];
}

export function getFinalMenuItems(options: {
  onView: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
}): ThreeDotMenuItem[] {
  const items: ThreeDotMenuItem[] = [
    { label: "View", icon: "eye-outline", onPress: options.onView },
  ];
  if (options.onShare) items.push({ label: "Share", icon: "share-outline", onPress: options.onShare });
  if (options.onDownload) items.push({ label: "Download PDF", icon: "download-outline", onPress: options.onDownload });
  items.push({ label: "Create Copy", icon: "copy-outline", onPress: options.onDuplicate });
  items.push({ label: "Cancel Document", icon: "close-circle-outline", color: Colors.error, onPress: options.onCancel });
  return items;
}

export function getCancelledMenuItems(options: {
  onView: () => void;
  onDownload?: () => void;
  onDuplicate: () => void;
}): ThreeDotMenuItem[] {
  const items: ThreeDotMenuItem[] = [
    { label: "View", icon: "eye-outline", onPress: options.onView },
  ];
  if (options.onDownload) items.push({ label: "Download PDF", icon: "download-outline", onPress: options.onDownload });
  items.push({ label: "Create Copy", icon: "copy-outline", onPress: options.onDuplicate });
  return items;
}
