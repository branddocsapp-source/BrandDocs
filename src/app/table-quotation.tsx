import { Redirect, useLocalSearchParams } from "expo-router";

export default function TableQuotationScreen() {
  const params = useLocalSearchParams<{ appPreview?: string }>();

  return (
    <Redirect
      href={{
        pathname: "/quotation",
        params: {
          startType: "table_quotation",
          ...(params.appPreview === "1" ? { appPreview: "1" } : {}),
        },
      }}
    />
  );
}
