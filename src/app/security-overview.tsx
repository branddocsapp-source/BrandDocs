import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function SecurityOverviewScreen() {
  return <LegalDocumentScreen document={legalDocuments.security} />;
}
