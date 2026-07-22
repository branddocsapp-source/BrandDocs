import { DocumentModuleScreen } from "@/components/DocumentModuleScreen";

export default function ScanReceiptScreen() {
  return (
    <DocumentModuleScreen
      title="Scan Receipt"
      createLabel="Scan Receipt"
      previousLabel="Previous Scanned Receipts"
      emptyTitle="No scanned receipts created yet"
      emptyMessage="Scanned receipts will appear here, sorted by the latest date first."
      icon="scan-circle-outline"
      onCreateRoute="/scanner"
    />
  );
}
