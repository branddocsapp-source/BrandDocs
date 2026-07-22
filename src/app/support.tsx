import { MarketingInfoPage } from "@/components/marketing/BrandMarketing";

export default function SupportScreen() {
  return (
    <MarketingInfoPage
      eyebrow="Support"
      title="Support for teams building a cleaner document workflow."
      body="Get help with account access, company setup, document templates, exports, and sharing workflows."
      items={["Account Help", "Business Setup", "Template Guidance", "Export Support"]}
    />
  );
}
