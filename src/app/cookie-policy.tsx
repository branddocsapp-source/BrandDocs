import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function CookiePolicyScreen() {
  return <LegalDocumentScreen document={legalDocuments.cookie} />;
}
