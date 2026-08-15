import { MarketingInfoPage } from "@/components/marketing/BrandMarketing";

export default function ContactScreen() {
  return (
    <MarketingInfoPage
      eyebrow="Contact"
      title="Talk to BrandDocs about your business document workflow."
      body="Reach the BrandDocs team for sales, support, partnerships, and product questions."
      items={["Sales", "Support", "Partnerships", "Product Questions"]}
    />
  );
}
