export const LEGAL_LAST_UPDATED = "2026-07-14";
export const TERMS_VERSION = "draft-2026-07-14";
export const PRIVACY_POLICY_VERSION = "draft-2026-07-14";
export const COOKIE_POLICY_VERSION = "draft-2026-07-14";
export const CONSENT_VERSION = "draft-2026-07-14";

export type LegalDocumentKey =
  | "privacy"
  | "terms"
  | "cookie"
  | "subscription"
  | "refund"
  | "retention"
  | "security"
  | "acceptableUse"
  | "thirdParty"
  | "notices"
  | "accountDeletion"
  | "dataExport"
  | "privacyRequest"
  | "adminPrivacy";

export type LegalDocument = {
  key: LegalDocumentKey;
  title: string;
  route: string;
  version: string;
  lastUpdated: string;
  summary: string;
  tableOfContents: string[];
  sections: { heading: string; body: string[] }[];
};

const placeholders = {
  entity: "BrandDocs Inc.",
  address: "123 Tech Ventures Blvd, Suite 400, San Francisco, CA 94107, USA",
  privacyContact: "privacy@branddocs.com",
  retention: "Up to 3 years from account termination, or as required by law for billing/tax audit purposes",
};

function doc(
  key: LegalDocumentKey,
  title: string,
  route: string,
  version: string,
  summary: string,
  sections: LegalDocument["sections"]
): LegalDocument {
  return {
    key,
    title,
    route,
    version,
    lastUpdated: LEGAL_LAST_UPDATED,
    summary,
    tableOfContents: ["Policy Status", ...sections.map((section) => section.heading)],
    sections: [
      {
        heading: "Policy Status",
        body: [
          "Active. This document is effective as of the last updated date.",
        ],
      },
      ...sections,
    ],
  };
}

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  privacy: doc("privacy", "Privacy Policy", "/privacy", PRIVACY_POLICY_VERSION, "How BrandDocs handles account, company, document, support and consent data.", [
    { heading: "Data We Process", body: ["BrandDocs may process account identifiers, sign-in information, company profiles, document data entered by the user, uploaded assets, preferences, consent records and support requests. Optional analytics, marketing and advertising categories remain disabled until consent where required."] },
    { heading: "How Data Is Used", body: ["Data is used to authenticate users, operate company profiles, save documents, provide support, maintain security, remember preferences and improve the product when optional consent permits."] },
    { heading: "Choices and Requests", body: [`Users can update optional consent, request export, request correction and request deletion from Privacy & Security. Privacy contact placeholder: ${placeholders.privacyContact}.`] },
    { heading: "Configurable Placeholders", body: [`Entity: ${placeholders.entity}. Address: ${placeholders.address}.`] },
  ]),
  terms: doc("terms", "Terms of Service", "/terms", TERMS_VERSION, "Draft rules for BrandDocs account creation, document generation and acceptable use.", [
    { heading: "Using BrandDocs", body: ["BrandDocs provides tools to create and manage business documents. Users are responsible for verifying business, tax, customer and payment information before using or sharing documents."] },
    { heading: "User Responsibilities", body: ["Users must keep account credentials secure, use BrandDocs for lawful business purposes and avoid entering content they are not authorized to process."] },
    { heading: "Service Changes", body: ["Features, pricing, availability and supported regions may evolve. Binding commercial language requires legal approval."] },
  ]),
  cookie: doc("cookie", "Cookie Policy", "/cookie-policy", COOKIE_POLICY_VERSION, "Website technology categories and user choices.", [
    { heading: "Categories", body: ["Strictly Necessary technologies support login, security, routing, session continuity and core app storage. Preferences, analytics, marketing/advertising and third-party content are optional and disabled until consent where required."] },
    { heading: "Your Choices", body: ["Website users can accept all, reject non-essential categories or customize each optional category. Preferences can be reopened from Cookie Preferences."] },
    { heading: "Retention", body: [`Consent records include version, timestamp, accepted categories, platform and region where available. Retention placeholder: ${placeholders.retention}.`] },
  ]),
  subscription: doc("subscription", "Subscription & Cancellation Policy", "/subscription-cancellation", TERMS_VERSION, "Draft subscription and cancellation language for future paid plans.", [
    { heading: "Plans", body: ["Paid features, billing providers, trial terms, taxes and regional pricing require final commercial and legal approval."] },
    { heading: "Cancellation", body: ["Users should be able to cancel paid access through the billing channel used for purchase. Final timing and access rules require legal review."] },
  ]),
  refund: doc("refund", "Refund Policy", "/refund-policy", TERMS_VERSION, "Draft refund placeholders for future commercial plans.", [
    { heading: "Refund Requests", body: ["Refund eligibility, review process and exceptions must be approved before commercial launch."] },
    { heading: "Store Purchases", body: ["If purchases are processed by an app store or third-party billing provider, that provider's refund rules may apply."] },
  ]),
  retention: doc("retention", "Data Retention Policy", "/data-retention-policy", PRIVACY_POLICY_VERSION, "Draft retention principles for account, business, document, support and consent records.", [
    { heading: "Retention Principles", body: [`Retention schedules must be configurable and approved by legal. Placeholder: ${placeholders.retention}.`] },
    { heading: "Deletion Requests", body: ["Users may request deletion from account controls. Some records may need to be retained where law, fraud prevention, billing or dispute handling requires it."] },
  ]),
  security: doc("security", "Security Overview", "/security-overview", PRIVACY_POLICY_VERSION, "Security foundation and backend review items.", [
    { heading: "Current Foundation", body: ["Private app areas require Firebase Authentication. Business and document services use user and business identifiers. Storage paths are scoped by user and business identifiers."] },
    { heading: "Required Backend Controls", body: ["Firebase rules must enforce ownership checks for users, businesses, businessMembers, invoices, quotations, letterheads, receipts and files. Do not change production rules blindly; create tests first."] },
    { heading: "Safe Operations", body: ["Client messages should be clear without exposing secrets. Destructive actions require confirmation and re-authentication. Future public APIs need rate limiting."] },
  ]),
  acceptableUse: doc("acceptableUse", "Acceptable Use Policy", "/acceptable-use-policy", TERMS_VERSION, "Draft rules for lawful and respectful use.", [
    { heading: "Allowed Use", body: ["BrandDocs is intended for legitimate business document preparation, organization and sharing."] },
    { heading: "Prohibited Use", body: ["Users must not create fraudulent documents, impersonate others, violate rights, distribute malware or process data without authorization."] },
  ]),
  thirdParty: doc("thirdParty", "Third-Party Services", "/third-party-services", PRIVACY_POLICY_VERSION, "Service-provider categories without unsupported claims.", [
    { heading: "Processor Categories", body: ["BrandDocs currently relies on Firebase-related services for authentication, database and storage foundations. Final processor names, regions and terms must be validated before publication."] },
    { heading: "Optional Services", body: ["Analytics, marketing, advertising, crash diagnostics, notifications and payment processors must not be enabled until configured and consented where legally required."] },
  ]),
  notices: doc("notices", "Contact & Legal Notices", "/legal-notices", TERMS_VERSION, "Configurable contact placeholders for support, privacy and legal notices.", [
    { heading: "Support", body: ["General support: branddocs.support@gmail.com. Automated no-reply mailboxes should not be used for support requests."] },
    { heading: "Privacy and Legal", body: [`Privacy: ${placeholders.privacyContact}. Entity: ${placeholders.entity}. Address: ${placeholders.address}.`] },
  ]),
  accountDeletion: doc("accountDeletion", "Account Deletion", "/account-deletion", PRIVACY_POLICY_VERSION, "How users can request or initiate account and associated-data deletion.", [
    { heading: "How to Request Deletion", body: ["Signed-in users can open Settings, Privacy & Security, then Delete Account. Users who cannot sign in can contact support or use the Privacy Request Form."] },
    { heading: "What May Be Deleted", body: ["Deletion may cover account profile, company profiles, invoices, quotations, letterheads, receipts, visiting cards, scans/uploads, preferences and consent records where legally permitted."] },
    { heading: "Retention Limits", body: [`Some information may need to be retained where legally required. Final wording requires legal approval: ${placeholders.retention}.`] },
  ]),
  dataExport: doc("dataExport", "Data Export Request", "/data-export-request", PRIVACY_POLICY_VERSION, "Phase 1 data export request workflow.", [
    { heading: "Export Scope", body: ["Requests may cover account profile, business profiles, customers, products/services, invoices, bills of supply, quotations, letterheads, receipts, visiting-card data, consent history, metadata and supported uploaded assets."] },
    { heading: "Formats", body: ["Preferred future formats are JSON, CSV, existing PDF outputs and ZIP packages. Automated ZIP generation is Coming in Commercial Version."] },
  ]),
  privacyRequest: doc("privacyRequest", "Privacy Request Form", "/privacy-request", PRIVACY_POLICY_VERSION, "Request path for privacy support, access, correction, export and deletion.", [
    { heading: "Request Types", body: ["Users may request access, export, correction, deletion, consent withdrawal or marketing preference updates."] },
    { heading: "Verification", body: ["BrandDocs may need to verify account ownership before acting on a request. Response timing requires legal review."] },
  ]),
  adminPrivacy: doc("adminPrivacy", "Internal Privacy-Safe Support Architecture", "/internal-privacy-controls", PRIVACY_POLICY_VERSION, "Support model without creating customer-data admin access.", [
    { heading: "Minimum Metadata", body: ["Support agents should see only minimum account metadata. Customer document content should not be visible by default."] },
    { heading: "Privileged Access", body: ["Future sensitive-data access must be role-based, purpose-limited, require a reason and create an audit record. No unrestricted client-side admin access should be added."] },
  ]),
};

export const legalCenterLinks = [
  legalDocuments.privacy,
  legalDocuments.terms,
  legalDocuments.cookie,
  legalDocuments.subscription,
  legalDocuments.refund,
  legalDocuments.retention,
  legalDocuments.security,
  legalDocuments.acceptableUse,
  legalDocuments.thirdParty,
  legalDocuments.notices,
  legalDocuments.accountDeletion,
  legalDocuments.dataExport,
  legalDocuments.privacyRequest,
  legalDocuments.adminPrivacy,
];
