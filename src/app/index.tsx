import { Redirect } from "expo-router";
import { Platform } from "react-native";

import { AppEntryGate } from "@/components/app-entry-gate";

export default function EntryScreen() {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    return <Redirect href="/signin" />;
  }

  return <AppEntryGate />;
}
