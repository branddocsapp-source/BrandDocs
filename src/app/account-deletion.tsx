import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function AccountDeletionInfoScreen() {
  return <LegalDocumentScreen document={legalDocuments.accountDeletion} />;
}
