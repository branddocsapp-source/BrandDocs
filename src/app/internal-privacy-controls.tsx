import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { legalDocuments } from "@/services/legal-content";

export default function InternalPrivacyControlsRoute() {
  return <LegalDocumentScreen document={legalDocuments.adminPrivacy} />;
}
