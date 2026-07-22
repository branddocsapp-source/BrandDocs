import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function LegalNoticesScreen() {
  return <LegalDocumentScreen document={legalDocuments.notices} />;
}
