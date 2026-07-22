import { Platform } from "react-native";

import { AppEntryGate } from "@/components/app-entry-gate";
import { LandingPage } from "@/components/marketing/BrandMarketing";

export default function NativeEntryScreen() {
  if (Platform.OS === "web") {
    return <LandingPage />;
  }

  return <AppEntryGate />;
}
