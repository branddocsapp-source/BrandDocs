import { useLocalSearchParams, usePathname } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ appPreview?: string }>();
  const isAppPreview =
    Platform.OS === "web" && (params.appPreview === "1" || pathname === "/app");
  const isWebsite = Platform.OS === "web" && !isAppPreview;
  const isPhone = width < 768;
  const isCompactPhone = width < 390;
  const isTabletWidth = width >= 768 && width < 1024;
  const isDesktopWidth = width >= 1024;

  return {
    width,
    isAppPreview,
    isWebsite,
    isPhone,
    isCompactPhone,
    isTablet: isTabletWidth,
    isDesktop: isWebsite && isDesktopWidth,
    isWideDesktop: isWebsite && width >= 1280,
    usesSidebar: isWebsite ? isDesktopWidth : width >= 900,
  };
}
