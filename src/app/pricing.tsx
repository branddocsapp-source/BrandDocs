import { MarketingInfoPage } from "@/components/marketing/BrandMarketing";

export default function PricingScreen() {
  return (
    <MarketingInfoPage
      eyebrow="Pricing"
      title="Simple pricing for businesses that want sharper paperwork."
      body="Start with the free plan, move into Pro for premium workflows, or choose Business for multi-company document operations."
      items={["Free", "Pro", "Business"]}
    />
  );
}
