import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function DataRetentionPolicyScreen() {
  return <LegalDocumentScreen document={legalDocuments.retention} />;
}
