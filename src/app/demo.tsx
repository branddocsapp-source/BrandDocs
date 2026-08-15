import { MarketingInfoPage } from "@/components/marketing/BrandMarketing";

export default function DemoScreen() {
  return (
    <MarketingInfoPage
      eyebrow="Live Demo"
      title="Preview the BrandDocs workspace before creating your account."
      body="Explore how BrandDocs presents invoices, quotations, receipts, and letterheads across desktop, tablet, and phone workflows."
      items={["Invoice Preview", "Quotation Preview", "Receipt Preview", "Letterhead Preview"]}
    />
  );
}
