import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function TermsScreen() {
  return <LegalDocumentScreen document={legalDocuments.terms} />;
}
