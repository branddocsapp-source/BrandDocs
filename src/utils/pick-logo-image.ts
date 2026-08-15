import { launchImageLibraryAsync, MediaTypeOptions, requestMediaLibraryPermissionsAsync } from "expo-image-picker";
import { Platform } from "react-native";

import { BusinessProfileAssetInput } from "@/services/business-profile";

import { removeLogoBackground } from "./remove-logo-background";

export type PickLogoImageResult = {
  asset: BusinessProfileAssetInput;
  backgroundRemoved: boolean;
};

/** Opens the gallery, removes the logo background, and returns a transparent PNG asset. */
export async function pickLogoImage(): Promise<PickLogoImageResult | null> {
  const permission = await requestMediaLibraryPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Please allow photo access to upload your company logo.");
  }

  const result = await launchImageLibraryAsync({
    mediaTypes: MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    base64: true,
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const picked = result.assets[0];
  const selectedAsset: BusinessProfileAssetInput = {
    uri: picked.uri,
    base64: picked.base64 ?? null,
    mimeType: picked.mimeType ?? "image/jpeg",
    fileName: picked.fileName ?? "logo.jpg",
    file: Platform.OS === "web" ? ((picked as { file?: File }).file ?? null) : null,
    fileSize: picked.fileSize ?? null,
  };

  const processed = await removeLogoBackground(selectedAsset);
  return {
    asset: {
      ...selectedAsset,
      uri: processed.uri,
      base64: processed.base64 || selectedAsset.base64 || null,
      mimeType: processed.mimeType,
      fileName: processed.fileName,
      file: processed.file ?? selectedAsset.file ?? null,
      fileSize: processed.fileSize || selectedAsset.fileSize || null,
    },
    backgroundRemoved: processed.backgroundRemoved,
  };
}
