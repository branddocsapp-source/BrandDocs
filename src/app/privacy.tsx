import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function PrivacyScreen() {
  return <LegalDocumentScreen document={legalDocuments.privacy} />;
}
