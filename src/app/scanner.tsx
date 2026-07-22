import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Need camera permission</Text>
        <Pressable onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back">
        <View style={styles.buttonContainer}>
          <Pressable style={styles.captureButton} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Scan Document</Text>
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  button: { backgroundColor: '#F26E22', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 8 },
  buttonContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 50 },
  captureButton: { backgroundColor: '#F26E22', padding: 20, borderRadius: 30, width: 200, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold' },
  text: { marginBottom: 20 }
});
