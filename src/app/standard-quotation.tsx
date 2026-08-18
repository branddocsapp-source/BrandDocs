import { Redirect, useLocalSearchParams } from "expo-router";

export default function StandardQuotationScreen() {
  const params = useLocalSearchParams<{ appPreview?: string }>();

  return (
    <Redirect
      href={{
        pathname: "/quotation",
        params: {
          startType: "standard_quotation",
          ...(params.appPreview === "1" ? { appPreview: "1" } : {}),
        },
      }}
    />
  );
}
