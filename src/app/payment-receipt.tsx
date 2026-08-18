import { Redirect, useLocalSearchParams } from "expo-router";

export default function PaymentReceiptScreen() {
  const params = useLocalSearchParams<{ appPreview?: string }>();

  return (
    <Redirect
      href={{
        pathname: "/receipt",
        params: {
          create: "1",
          ...(params.appPreview === "1" ? { appPreview: "1" } : {}),
        },
      }}
    />
  );
}
