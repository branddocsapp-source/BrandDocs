import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function ThirdPartyServicesScreen() {
  return <LegalDocumentScreen document={legalDocuments.thirdParty} />;
}
