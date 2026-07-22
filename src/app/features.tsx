import { MarketingInfoPage } from "@/components/marketing/BrandMarketing";

export default function FeaturesScreen() {
  return (
    <MarketingInfoPage
      eyebrow="Features"
      title="Everything a modern document workspace should feel like."
      body="BrandDocs brings multi-company profiles, cloud backup, fast sharing, global currency, tax support, and dark mode into one polished SaaS experience."
      items={["Multi Company", "Cloud Backup", "Email", "WhatsApp Sharing", "Global Currency", "Tax Support", "Dark Mode"]}
    />
  );
}
