import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function DataExportRequestInfoScreen() {
  return <LegalDocumentScreen document={legalDocuments.dataExport} />;
}
