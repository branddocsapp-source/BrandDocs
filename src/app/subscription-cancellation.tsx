import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function SubscriptionCancellationScreen() {
  return <LegalDocumentScreen document={legalDocuments.subscription} />;
}
