import { DocumentModuleScreen } from "@/components/DocumentModuleScreen";

export default function ReceiptScreen() {
  return (
    <DocumentModuleScreen
      title="Receipt"
      createLabel="Create New Receipt"
      previousLabel="Previous Receipts"
      emptyTitle="No receipts created yet"
      emptyMessage="Created receipts will appear here, sorted by the latest date first."
      icon="receipt-outline"
    />
  );
}
