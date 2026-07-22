import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function RefundPolicyScreen() {
  return <LegalDocumentScreen document={legalDocuments.refund} />;
}
