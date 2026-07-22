import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function AcceptableUsePolicyScreen() {
  return <LegalDocumentScreen document={legalDocuments.acceptableUse} />;
}
