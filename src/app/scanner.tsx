import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DocumentColors } from "@/components/document-template";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const styles = createStyles();

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <View style={styles.permissionCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="scan-circle-outline" size={48} color={DocumentColors.accent} />
          </View>
          <Text style={styles.permissionTitle}>OCR Receipt Scanner</Text>
          <Text style={styles.permissionText}>
            Grant camera access to scan paper receipts and extract vendor, amount, and date automatically.
          </Text>
          <Pressable onPress={requestPermission} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Grant Camera Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back">
        <SafeAreaView style={styles.overlay}>
          <View style={styles.topBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.topTitle}>Scan Receipt</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.scanFrameWrap}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scanHint}>Align receipt within the frame</Text>
          </View>

          <View style={styles.bottomBar}>
            <Pressable style={styles.captureButton} onPress={() => router.back()}>
              <Ionicons name="camera" size={28} color="#FFFFFF" />
              <Text style={styles.captureText}>Capture & Extract</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    camera: { flex: 1 },
    permissionScreen: {
      flex: 1,
      backgroundColor: DocumentColors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    permissionCard: {
      backgroundColor: DocumentColors.paper,
      borderRadius: 20,
      padding: 28,
      alignItems: "center",
      maxWidth: 400,
      width: "100%",
      borderWidth: 1,
      borderColor: DocumentColors.accentBorder,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: DocumentColors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    permissionTitle: {
      color: DocumentColors.ink,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 8,
    },
    permissionText: {
      color: DocumentColors.muted,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 20,
    },
    primaryButton: {
      backgroundColor: DocumentColors.accent,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
    overlay: { flex: 1, justifyContent: "space-between" },
    topBar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    backBtn: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.4)",
      borderRadius: 20,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    topTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
    scanFrameWrap: { alignItems: "center", flex: 1, justifyContent: "center" },
    scanFrame: {
      borderColor: DocumentColors.accent,
      borderRadius: 12,
      borderWidth: 2,
      height: 280,
      width: 220,
      position: "relative",
    },
    corner: {
      borderColor: DocumentColors.accent,
      height: 24,
      position: "absolute",
      width: 24,
    },
    cornerTL: { borderLeftWidth: 4, borderTopWidth: 4, left: -2, top: -2 },
    cornerTR: { borderRightWidth: 4, borderTopWidth: 4, right: -2, top: -2 },
    cornerBL: { borderBottomWidth: 4, borderLeftWidth: 4, bottom: -2, left: -2 },
    cornerBR: { borderBottomWidth: 4, borderRightWidth: 4, bottom: -2, right: -2 },
    scanHint: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginTop: 16, opacity: 0.9 },
    bottomBar: { alignItems: "center", paddingBottom: 40 },
    captureButton: {
      alignItems: "center",
      backgroundColor: DocumentColors.accent,
      borderRadius: 16,
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 28,
      paddingVertical: 16,
    },
    captureText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  });
}
