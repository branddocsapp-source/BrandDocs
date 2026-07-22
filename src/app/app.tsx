import { AppEntryGate } from "@/components/app-entry-gate";

export default function AppPreviewEntryScreen() {
  return (
    <AppEntryGate
      destinations={{
        signedOut: { pathname: "/signin", params: { appPreview: "1" } },
        needsProfile: { pathname: "/business-setup", params: { appPreview: "1" } },
        ready: { pathname: "/dashboard", params: { appPreview: "1" } },
      }}
    />
  );
}
