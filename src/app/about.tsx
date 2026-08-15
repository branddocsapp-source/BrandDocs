import { MarketingInfoPage } from "@/components/marketing/BrandMarketing";

export default function AboutScreen() {
  return (
    <MarketingInfoPage
      eyebrow="About BrandDocs"
      title="A premium workspace for professional business communication."
      body="BrandDocs is built for founders, operators, and teams who want every invoice, quotation, receipt, and letterhead to look intentional from the first send."
      items={["Professional", "Secure", "Fast", "Modern"]}
    />
  );
}
