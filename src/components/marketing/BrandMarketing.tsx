import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
    Image,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";

import {
    detectPricingCountry,
    formatPremiumPrice,
    premiumPricingByCountry,
    PricingCountryCode,
    selectablePricingCountries,
} from "@/config/pricing";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { BrandLogo } from "@/components/brand-logo";
import { useAppTheme } from "@/theme/theme-context";

type SectionKey = "documents" | "features" | "pricing" | "faq" | "about";

const navItems: { label: string; section?: SectionKey; href?: Href }[] = [
  { label: "Documents", section: "documents" },
  { label: "Features", section: "features" },
  { label: "Pricing", section: "pricing" },
  { label: "FAQ", section: "faq" },
  { label: "About", section: "about" },
  { label: "Support", href: "/support" },
  { label: "Contact Us", href: "/contact" },
];

const documentCards = [
  {
    title: "Tax Invoice",
    icon: "receipt-outline",
    description: "Create professional, tax-compliant invoices with automated numbering and line-item tax calculations.",
  },
  {
    title: "Digital Visiting Card",
    icon: "card-outline",
    description: "Design interactive digital business cards with QR codes, social links, and one-tap contact save.",
  },
  {
    title: "Business Quotation",
    icon: "document-text-outline",
    description: "Draft polished, itemized cost estimates and sales quotations with terms & validity periods.",
  },
  {
    title: "Table Quotation",
    icon: "grid-outline",
    description: "Build clear, structured tabular quotations ideal for product catalogs and multi-item orders.",
  },
  {
    title: "Branded Letterhead",
    icon: "mail-outline",
    description: "Generate executive branded letterheads with company headers, footers, and official digital stamps.",
  },
  {
    title: "Payment Receipt",
    icon: "wallet-outline",
    description: "Issue instant payment receipts for cash, bank transfers, deposits, or advance payments.",
  },
  {
    title: "Document Scanner & OCR",
    icon: "scan-outline",
    description: "Scan paper receipts or vendor bills and automatically extract key fields for document creation.",
  },
] as const;

const featureCards = [
  {
    title: "Multi-Company Management",
    icon: "business-outline",
    description: "Manage multiple business profiles, logos, tax IDs, and addresses under one workspace.",
  },
  {
    title: "Automated Sequential Numbering",
    icon: "list-outline",
    description: "Set customized prefix formats and automatic document sequence numbering.",
  },
  {
    title: "Cloud & Email Backup",
    icon: "cloud-upload-outline",
    description: "Sync your document data securely to Cloud Storage and receive scheduled email backups.",
  },
  {
    title: "Global Tax & Multi-Currency",
    icon: "globe-outline",
    description: "Support for GST, VAT, Sales Tax, and multi-currency formatting worldwide.",
  },
  {
    title: "Instant PDF & Share",
    icon: "arrow-down-circle-outline",
    description: "Export clean vector PDFs ready for printing or instant sharing via WhatsApp, Email, and Web links.",
  },
  {
    title: "AI Writing Assistant",
    icon: "sparkles-outline",
    description: "Draft professional document descriptions, terms, and notes with integrated AI assistance.",
  },
] as const;

const faqItems = [
  {
    q: "What is BrandDocs and how does it help my business?",
    a: "BrandDocs is an all-in-one platform for creating professional tax invoices, digital visiting cards, quotations, letterheads, and receipts. It ensures your client-facing documents look modern, compliant, and consistently branded.",
  },
  {
    q: "Is there a free plan available?",
    a: "Yes! BrandDocs offers a generous Free tier that includes monthly allowances for invoices, quotations, letterheads, digital cards, and receipts without requiring a credit card.",
  },
  {
    q: "Are the generated invoices tax compliant?",
    a: "Absolutely. BrandDocs supports regional tax rules (GST, VAT, Sales Tax) with breakdown tables, tax registration numbers, and mandatory business details.",
  },
  {
    q: "How do Digital Visiting Cards work?",
    a: "You can customize your digital business card with your logo, contact information, branding theme, and social handles. It generates a dynamic QR code that allows clients to save your contact info with one tap.",
  },
  {
    q: "Does BrandDocs back up my documents?",
    a: "Yes. All data can be synced to secure cloud storage, and you can enable automated email backups to keep your records safe.",
  },
];

const freePlanItems = [
  "5 Tax Invoices per month",
  "20 Quotations per month",
  "20 Table Quotations per month",
  "20 Letterheads per month",
  "5 Receipts per month",
  "5 Document Scanner uses per month",
  "1 Company Profile",
  "Weekly Email Backup",
];

const premiumPlanItems = [
  "Unlimited Document Creation",
  "Unlimited Digital Visiting Cards",
  "Unlimited Company Profiles",
  "Cloud & Instant Email Backup",
  "AI Document Assistant",
  "Custom Digital Stamps & Signatures",
  "Priority Support",
];

function goToRoute(href: Href) {
  router.push(href as never);
}

function MarketingButton({
  label,
  href,
  onPress,
  variant = "primary",
  icon,
}: {
  label: string;
  href?: Href;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "text";
  icon?: string;
}) {
  const [active, setActive] = useState(false);
  const { isDark, theme } = useAppTheme();
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onHoverIn={() => setActive(true)}
      onHoverOut={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onPress={onPress || (() => href && goToRoute(href))}
      style={({ pressed }) => [
        styles.button,
        isPrimary && { backgroundColor: theme.orange },
        isSecondary && { backgroundColor: theme.white, borderColor: theme.orange, borderWidth: 1 },
        variant === "text" && { backgroundColor: "transparent" },
        (active || pressed) && styles.buttonActive,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon as never}
          size={18}
          color={isPrimary ? "#FFFFFF" : isSecondary ? theme.orangeDark : theme.ink}
          style={{ marginRight: 6 }}
        />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          isPrimary && { color: "#FFFFFF" },
          isSecondary && { color: theme.orangeDark },
          variant === "text" && { color: theme.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Header({
  onNavigateSection,
  compact = false,
}: {
  onNavigateSection?: (section: SectionKey) => void;
  compact?: boolean;
}) {
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const { isDark, theme, toggleTheme } = useAppTheme();
  const isMobile = width < 980;

  function handleItem(item: { section?: SectionKey; href?: Href }) {
    setOpen(false);
    if (item.section && onNavigateSection) {
      onNavigateSection(item.section);
      return;
    }
    if (item.section) {
      goToRoute("/landing");
      return;
    }
    if (item.href) goToRoute(item.href);
  }

  return (
    <View style={[styles.headerShell, { backgroundColor: isDark ? "rgba(22,24,28,0.95)" : "rgba(255,255,255,0.95)", borderBottomColor: theme.line }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="BrandDocs home"
          onPress={() => goToRoute("/")}
          style={styles.logoButton}
        >
          <BrandLogo size="medium" />
        </Pressable>

        {isMobile ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
              onPress={toggleTheme}
              style={[styles.themeToggleBtn, { backgroundColor: theme.card, borderColor: theme.line }]}
            >
              <Ionicons
                name={isDark ? "sunny" : "moon"}
                size={18}
                color={isDark ? "#FFAA2A" : theme.ink}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={open ? "Close navigation menu" : "Open navigation menu"}
              onPress={() => setOpen((value) => !value)}
              style={[styles.menuButton, { backgroundColor: theme.card, borderColor: theme.line }]}
            >
              <Ionicons name={open ? "close-outline" : "menu-outline"} size={24} color={theme.ink} />
              <Text style={[styles.menuText, { color: theme.ink }]}>{open ? "Close" : "Menu"}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.headerCenterNav}>
              {navItems.map((item) => (
                <Pressable
                  accessibilityRole="link"
                  key={item.label}
                  onPress={() => handleItem(item)}
                  style={({ pressed }) => [styles.navLink, pressed && styles.navLinkPressed]}
                >
                  <Text style={[styles.navText, { color: theme.ink }]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.headerRightActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
                onPress={toggleTheme}
                style={[styles.themeToggleBtn, { backgroundColor: theme.card, borderColor: theme.line }]}
              >
                <Ionicons
                  name={isDark ? "sunny" : "moon"}
                  size={18}
                  color={isDark ? "#FFAA2A" : theme.ink}
                />
                <Text style={[styles.themeToggleText, { color: theme.ink }]}>
                  {isDark ? "Light" : "Night"}
                </Text>
              </Pressable>
              <MarketingButton label="Sign In" href="/signin" variant="text" />
              <MarketingButton label="Get Started Free" href="/signup" />
            </View>
          </>
        )}
      </View>

      {isMobile && open ? (
        <View style={styles.mobileMenu}>
          {[...navItems, { label: "Sign In", href: "/signin" as Href }, { label: "Get Started Free", href: "/signup" as Href }].map(
            (item) => (
              <Pressable
                accessibilityRole="link"
                key={item.label}
                onPress={() => handleItem(item)}
                style={({ pressed }) => [styles.mobileMenuItem, { backgroundColor: theme.card, borderColor: theme.line }, pressed && styles.mobileMenuItemPressed]}
              >
                <Text style={[styles.mobileMenuText, { color: theme.ink }]}>{item.label}</Text>
              </Pressable>
            )
          )}
        </View>
      ) : null}

      {!compact ? <View style={[styles.headerLine, { backgroundColor: theme.line }]} /> : null}
    </View>
  );
}

function SectionHeading({ title, body, eyebrow }: { title: string; body?: string; eyebrow?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.sectionHeading}>
      {eyebrow ? <Text style={[styles.eyebrowBadge, { color: theme.orangeDark }]}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.ink }]}>
        {title}
      </Text>
      {body ? <Text style={[styles.sectionBody, { color: theme.muted }]}>{body}</Text> : null}
    </View>
  );
}

function OutlineIcon({ name }: { name: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.outlineIcon, { backgroundColor: theme.orangeSoft, borderColor: theme.line }]}>
      <Ionicons name={name as never} size={25} color={theme.orangeDark} />
    </View>
  );
}

/* Interactive Document Live Playground */
function InteractiveDocumentPlayground({ compact }: { compact: boolean }) {
  type DocTab = "invoice" | "visiting_card" | "quotation" | "letterhead" | "receipt";
  const [activeTab, setActiveTab] = useState<DocTab>("invoice");
  const { isDark, theme } = useAppTheme();

  const tabs: { key: DocTab; label: string; icon: string }[] = [
    { key: "invoice", label: "Tax Invoice", icon: "receipt-outline" },
    { key: "visiting_card", label: "Visiting Card", icon: "card-outline" },
    { key: "quotation", label: "Quotation", icon: "document-text-outline" },
    { key: "letterhead", label: "Letterhead", icon: "mail-outline" },
    { key: "receipt", label: "Receipt", icon: "wallet-outline" },
  ];

  return (
    <View style={[styles.playgroundShell, { backgroundColor: theme.white, borderColor: theme.line }, compact && styles.playgroundShellCompact]}>
      {/* Top Tab Switcher */}
      <View style={styles.playgroundTabs}>
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.playgroundTab,
                { backgroundColor: theme.wash, borderColor: theme.line },
                isSelected && { backgroundColor: theme.orange, borderColor: theme.orange },
              ]}
            >
              <Ionicons
                name={tab.icon as never}
                size={16}
                color={isSelected ? "#FFFFFF" : theme.text}
              />
              <Text style={[styles.playgroundTabText, { color: theme.text }, isSelected && { color: "#FFFFFF" }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Rendered Live Preview Document */}
      <View style={[styles.playgroundPreviewCard, { backgroundColor: theme.wash, borderColor: theme.line }]}>
        {activeTab === "invoice" && (
          <View style={styles.docCanvas}>
            <View style={styles.docTopRow}>
              <View>
                <Text style={[styles.docBrandName, { color: theme.ink }]}>NEXUS CREATIVE LABS</Text>
                <Text style={[styles.docSubtext, { color: theme.muted }]}>GSTIN: 27AAAAA0000A1Z5 • Mumbai, MH</Text>
              </View>
              <View style={[styles.docBadge, { backgroundColor: theme.orangeSoft, borderColor: theme.line }]}>
                <Text style={[styles.docBadgeText, { color: theme.orangeDark }]}>TAX INVOICE</Text>
                <Text style={[styles.docNumText, { color: theme.ink }]}>#INV-2026-1048</Text>
              </View>
            </View>

            <View style={[styles.docDivider, { backgroundColor: theme.line }]} />

            <View style={styles.docMetaRow}>
              <View>
                <Text style={[styles.docMetaLabel, { color: theme.muted }]}>BILLED TO:</Text>
                <Text style={[styles.docMetaValue, { color: theme.ink }]}>Starlight Enterprises Ltd.</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.docMetaLabel, { color: theme.muted }]}>DATE / DUE:</Text>
                <Text style={[styles.docMetaValue, { color: theme.ink }]}>20 Jul 2026 / 04 Aug 2026</Text>
              </View>
            </View>

            {/* Line Items Table */}
            <View style={[styles.docTable, { borderColor: theme.line }]}>
              <View style={[styles.docTableHeader, { backgroundColor: theme.card, borderBottomColor: theme.line }]}>
                <Text style={[styles.docTableCellHeader, { color: theme.muted, flex: 2 }]}>DESCRIPTION</Text>
                <Text style={[styles.docTableCellHeader, { color: theme.muted }]}>QTY</Text>
                <Text style={[styles.docTableCellHeader, { color: theme.muted }]}>RATE</Text>
                <Text style={[styles.docTableCellHeader, { color: theme.muted, textAlign: "right" }]}>AMOUNT</Text>
              </View>
              <View style={[styles.docTableRow, { borderBottomColor: theme.line }]}>
                <Text style={[styles.docTableCell, { color: theme.ink, flex: 2 }]}>Brand Identity & Digital Assets</Text>
                <Text style={[styles.docTableCell, { color: theme.ink }]}>1</Text>
                <Text style={[styles.docTableCell, { color: theme.ink }]}>$1,200.00</Text>
                <Text style={[styles.docTableCell, { color: theme.ink, textAlign: "right" }]}>$1,200.00</Text>
              </View>
              <View style={[styles.docTableRow, { borderBottomColor: theme.line }]}>
                <Text style={[styles.docTableCell, { color: theme.ink, flex: 2 }]}>UI/UX Design System</Text>
                <Text style={[styles.docTableCell, { color: theme.ink }]}>1</Text>
                <Text style={[styles.docTableCell, { color: theme.ink }]}>$800.00</Text>
                <Text style={[styles.docTableCell, { color: theme.ink, textAlign: "right" }]}>$800.00</Text>
              </View>
            </View>

            {/* Total Block */}
            <View style={styles.docTotalBlock}>
              <View style={styles.docTotalRow}>
                <Text style={[styles.docTotalLabel, { color: theme.muted }]}>Subtotal:</Text>
                <Text style={[styles.docTotalValue, { color: theme.ink }]}>$2,000.00</Text>
              </View>
              <View style={styles.docTotalRow}>
                <Text style={[styles.docTotalLabel, { color: theme.muted }]}>GST / Tax (18%):</Text>
                <Text style={[styles.docTotalValue, { color: theme.ink }]}>$360.00</Text>
              </View>
              <View style={[styles.docTotalRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderColor: theme.line }]}>
                <Text style={[styles.docGrandTotalLabel, { color: theme.ink }]}>Total Amount Due:</Text>
                <Text style={[styles.docGrandTotalValue, { color: theme.orangeDark }]}>$2,360.00</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === "visiting_card" && (
          <View style={styles.visitingCardCanvas}>
            <View style={styles.vCardHeader}>
              <View style={[styles.vCardAvatar, { backgroundColor: theme.orangeSoft }]}>
                <Ionicons name="person" size={28} color={theme.orangeDark} />
              </View>
              <View>
                <Text style={[styles.vCardName, { color: theme.ink }]}>Alex Mercer</Text>
                <Text style={[styles.vCardRole, { color: theme.orangeDark }]}>Founder & Creative Director</Text>
                <Text style={[styles.vCardCompany, { color: theme.muted }]}>Nexus Creative Studio</Text>
              </View>
            </View>

            <View style={styles.vCardContactGrid}>
              <View style={styles.vCardContactItem}>
                <Ionicons name="call-outline" size={15} color={theme.orangeDark} />
                <Text style={[styles.vCardContactText, { color: theme.text }]}>+1 (555) 234-5678</Text>
              </View>
              <View style={styles.vCardContactItem}>
                <Ionicons name="mail-outline" size={15} color={theme.orangeDark} />
                <Text style={[styles.vCardContactText, { color: theme.text }]}>alex@nexuscreative.io</Text>
              </View>
              <View style={styles.vCardContactItem}>
                <Ionicons name="globe-outline" size={15} color={theme.orangeDark} />
                <Text style={[styles.vCardContactText, { color: theme.text }]}>www.nexuscreative.io</Text>
              </View>
            </View>

            <View style={[styles.vCardFooter, { backgroundColor: theme.card }]}>
              <View style={[styles.qrMock, { backgroundColor: theme.white }]}>
                <Ionicons name="qr-code-outline" size={44} color={theme.ink} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.qrTitle, { color: theme.ink }]}>Scan to Save Contact</Text>
                <Text style={[styles.qrSubtitle, { color: theme.muted }]}>Instant vCard & Digital Profile</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === "quotation" && (
          <View style={styles.docCanvas}>
            <View style={styles.docTopRow}>
              <View>
                <Text style={[styles.docBrandName, { color: theme.ink }]}>APEX TECH SOLUTIONS</Text>
                <Text style={[styles.docSubtext, { color: theme.muted }]}>Enterprise Software & Cloud Services</Text>
              </View>
              <View style={[styles.docBadge, { backgroundColor: theme.orangeSoft, borderColor: theme.line }]}>
                <Text style={[styles.docBadgeText, { color: theme.orangeDark }]}>QUOTATION</Text>
                <Text style={[styles.docNumText, { color: theme.ink }]}>#QT-2026-089</Text>
              </View>
            </View>
            <View style={[styles.docDivider, { backgroundColor: theme.line }]} />
            <Text style={[styles.docMetaLabel, { color: theme.muted }]}>PREPARED FOR:</Text>
            <Text style={[styles.docMetaValue, { color: theme.ink }]}>Global Logistics Corp</Text>
            <View style={[styles.docTable, { marginTop: 12, borderColor: theme.line }]}>
              <View style={[styles.docTableRow, { borderBottomColor: theme.line }]}>
                <Text style={[styles.docTableCell, { color: theme.ink, flex: 2 }]}>Custom Mobile & Web App Architecture</Text>
                <Text style={[styles.docTableCell, { color: theme.ink, textAlign: "right" }]}>$4,500.00</Text>
              </View>
              <View style={[styles.docTableRow, { borderBottomColor: theme.line }]}>
                <Text style={[styles.docTableCell, { color: theme.ink, flex: 2 }]}>Cloud Database & Security Audit</Text>
                <Text style={[styles.docTableCell, { color: theme.ink, textAlign: "right" }]}>$1,500.00</Text>
              </View>
            </View>
            <View style={styles.docTotalBlock}>
              <Text style={[styles.docGrandTotalValue, { color: theme.orangeDark }]}>Estimated Total: $6,000.00</Text>
              <Text style={[styles.docSubtext, { color: theme.muted }]}>Valid until: August 30, 2026</Text>
            </View>
          </View>
        )}

        {activeTab === "letterhead" && (
          <View style={styles.docCanvas}>
            <View style={{ alignItems: "center", borderBottomWidth: 2, borderColor: theme.orange, paddingBottom: 12, marginBottom: 14 }}>
              <Text style={[styles.docBrandName, { color: theme.ink, fontSize: 20 }]}>BRANDDOCS GLOBAL SOLUTIONS</Text>
              <Text style={[styles.docSubtext, { color: theme.muted }]}>100 Innovation Parkway, Suite 400 • New York, NY</Text>
            </View>
            <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 8 }}>Date: July 20, 2026</Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: theme.ink, marginBottom: 8 }}>TO WHOM IT MAY CONCERN</Text>
            <Text style={{ fontSize: 13, color: theme.text, lineHeight: 20 }}>
              This letter serves as formal authorization and verification for company documentation standards under BrandDocs governance protocols.
            </Text>
            <View style={{ marginTop: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.ink }}>Authorized Signatory</Text>
                <Text style={{ fontSize: 12, color: theme.muted }}>Executive Director</Text>
              </View>
              <View style={[styles.stampMock, { borderColor: theme.orangeDark }]}>
                <Text style={[styles.stampText, { color: theme.orangeDark }]}>VERIFIED</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === "receipt" && (
          <View style={styles.docCanvas}>
            <View style={styles.docTopRow}>
              <View>
                <Text style={[styles.docBrandName, { color: theme.ink }]}>STARLIGHT MEDIA</Text>
                <Text style={[styles.docSubtext, { color: theme.muted }]}>Official Payment Proof</Text>
              </View>
              <View style={[styles.docBadge, { backgroundColor: isDark ? "#122A1E" : "#E6F7ED", borderColor: isDark ? "#1E4D34" : "#A8E5BC" }]}>
                <Text style={[styles.docBadgeText, { color: isDark ? "#43D888" : "#1E824C" }]}>PAYMENT RECEIVED</Text>
                <Text style={[styles.docNumText, { color: theme.ink }]}>#RCT-994</Text>
              </View>
            </View>
            <View style={[styles.docDivider, { backgroundColor: theme.line }]} />
            <Text style={[styles.docMetaLabel, { color: theme.muted }]}>RECEIVED FROM:</Text>
            <Text style={[styles.docMetaValue, { color: theme.ink }]}>Horizon Ventures</Text>
            <View style={{ marginTop: 14, backgroundColor: theme.card, padding: 14, borderRadius: 12 }}>
              <Text style={{ fontSize: 13, color: theme.muted }}>Amount Paid:</Text>
              <Text style={{ fontSize: 26, fontWeight: "900", color: theme.ink }}>$1,450.00</Text>
              <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>Payment Method: Bank Wire Transfer</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function PricingSelector({
  selectedCountry,
  onSelectCountry,
}: {
  selectedCountry: PricingCountryCode;
  onSelectCountry: (country: PricingCountryCode) => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.pricingSelector, { backgroundColor: theme.wash, borderColor: theme.line }]} accessibilityLabel="Country and currency selector">
      {selectablePricingCountries.map((countryCode) => {
        const country = premiumPricingByCountry[countryCode];
        const selected = selectedCountry === countryCode;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={countryCode}
            onPress={() => onSelectCountry(countryCode)}
            style={[styles.countryButton, selected && { backgroundColor: theme.white, borderColor: theme.line, borderWidth: 1 }]}
          >
            <Text style={[styles.countryButtonText, { color: theme.muted }, selected && { color: theme.ink }]}>{country.countryName}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PricingSection() {
  const initialCountry = useMemo(() => detectPricingCountry(), []);
  const [selectedCountry, setSelectedCountry] = useState<PricingCountryCode>(initialCountry);
  const { theme } = useAppTheme();
  const premiumPricing = premiumPricingByCountry[selectedCountry];
  const premiumPrice = formatPremiumPrice(premiumPricing);

  return (
    <View style={styles.pricingWrap}>
      <PricingSelector selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />
      <View style={styles.pricingGrid}>
        <View style={[styles.planCard, { backgroundColor: theme.white, borderColor: theme.line }]}>
          <Text style={[styles.planName, { color: theme.ink }]}>Free</Text>
          <Text style={[styles.planPrice, { color: theme.ink }]}>Free</Text>
          <Text style={[styles.planSubtext, { color: theme.muted }]}>Start creating approved BrandDocs documents.</Text>
          <View style={styles.planItems}>
            {freePlanItems.map((item) => (
              <View key={item} style={styles.planItem}>
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.orangeDark} />
                <Text style={[styles.planItemText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>
          <MarketingButton label="Start Free" href="/signup" variant="secondary" />
        </View>

        <View style={[styles.planCard, { backgroundColor: theme.white, borderColor: theme.orangeDark }]}>
          <View style={[styles.popularBadge, { backgroundColor: theme.orange }]}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
          <Text style={[styles.planName, { color: theme.ink }]}>Premium</Text>
          <Text style={[styles.planPrice, { color: theme.ink }]}>{premiumPrice}</Text>
          <Text style={[styles.planSubtext, { color: theme.muted }]}>
            {premiumPricing.approved ? "per month" : "Final price for this region has not been approved yet."}
          </Text>
          <View style={styles.planItems}>
            {premiumPlanItems.map((item) => (
              <View key={item} style={styles.planItem}>
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.orangeDark} />
                <Text style={[styles.planItemText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>
          <MarketingButton label="Upgrade to Premium" href="/signup" />
        </View>
      </View>
      <View style={[styles.billingNote, { backgroundColor: theme.white, borderColor: theme.line }]}>
        <View style={[styles.billingIcon, { backgroundColor: theme.orangeSoft }]}>
          <Ionicons name="information-circle-outline" size={22} color={theme.orangeDark} />
        </View>
        <View style={styles.billingCopy}>
          <Text style={[styles.billingTitle, { color: theme.ink }]}>Subscription & Cancellation</Text>
          <Text style={[styles.billingText, { color: theme.muted }]}>
            Your Premium subscription renews automatically each month unless you cancel it before the next renewal date. If you cancel, Premium access will continue until the end of your current paid billing period. Payments already made are non-refundable, including unused or partially used time.
          </Text>
          <Pressable accessibilityRole="link" onPress={() => goToRoute("/subscription-cancellation")} style={styles.billingLinkWrap}>
            <Text style={[styles.billingLink, { color: theme.orangeDark }]}>View full billing terms →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { theme } = useAppTheme();

  return (
    <View style={styles.faqList}>
      {faqItems.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <Pressable
            key={item.q}
            onPress={() => setOpenIndex(isOpen ? null : index)}
            style={[styles.faqItem, { backgroundColor: theme.white, borderColor: theme.line }]}
          >
            <View style={styles.faqHeader}>
              <Text style={[styles.faqQuestion, { color: theme.ink }]}>{item.q}</Text>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.orangeDark}
              />
            </View>
            {isOpen ? <Text style={[styles.faqAnswer, { color: theme.muted }]}>{item.a}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function MailLink({ label, email }: { label: string; email: string }) {
  const { theme } = useAppTheme();
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${email}`)} style={[styles.mailLink, { backgroundColor: theme.wash, borderColor: theme.line }]}>
      <Text style={[styles.contactLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.contactEmail, { color: theme.orangeDark }]}>{email}</Text>
    </Pressable>
  );
}

export function LandingPage() {
  const scrollRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Partial<Record<SectionKey, number>>>({});
  const { width } = useWindowDimensions();
  const { isDark, theme } = useAppTheme();
  const isNarrow = width < 940;
  const isMobile = width < 680;

  function setSectionPosition(section: SectionKey, y: number) {
    sectionPositions.current[section] = y;
  }

  function scrollToSection(section: SectionKey) {
    const y = sectionPositions.current[section] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(y - 76, 0), animated: true });
  }

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <Header onNavigateSection={scrollToSection} />
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* HERO SECTION */}
        <View style={[styles.hero, isNarrow && styles.heroNarrow]}>
          <View style={styles.heroCopy}>
            <View style={[styles.badgeShell, { backgroundColor: theme.orangeSoft, borderColor: theme.line }]}>
              <Ionicons name="sparkles" size={14} color={theme.orangeDark} />
              <Text style={[styles.badgeText, { color: theme.orangeDark }]}>#1 ALL-IN-ONE BUSINESS DOCUMENT PLATFORM</Text>
            </View>

            <Text accessibilityRole="header" style={[styles.heroTitle, { color: theme.ink }, isMobile && styles.heroTitleMobile]}>
              Professional Business Documents,{"\n"}
              <Text style={{ color: theme.orange }}>Made Effortless</Text>
            </Text>

            <Text style={[styles.heroText, { color: theme.muted }]}>
              Create tax invoices, digital business cards, quotations, letterheads, and payment receipts in seconds. Cloud-backed, instant PDF export, and tax-compliant.
            </Text>

            <View style={styles.heroHighlights}>
              {["100% Tax Compliant", "Multi-Company Support", "Digital Visiting Cards", "Cloud & Email Sync"].map((item) => (
                <View key={item} style={[styles.heroHighlight, { backgroundColor: theme.white, borderColor: theme.line }]}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.orangeDark} />
                  <Text style={[styles.heroHighlightText, { color: theme.text }]}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.heroButtons}>
              <MarketingButton label="Get Started Free" href="/signup" icon="arrow-forward-outline" />
              <MarketingButton label="Explore Live Demo" onPress={() => scrollToSection("documents")} variant="secondary" icon="play-circle-outline" />
            </View>

            <Text style={[styles.heroNote, { color: theme.muted }]}>No credit card required • Instant setup in 60 seconds</Text>
          </View>

          {/* Interactive Playground */}
          <InteractiveDocumentPlayground compact={isMobile} />
        </View>

        {/* TRUST METRICS BAR */}
        <View style={[styles.metricsBar, { backgroundColor: theme.white, borderColor: theme.line }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricNumber, { color: theme.ink }]}>10,000+</Text>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>Documents Generated</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.line }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricNumber, { color: theme.ink }]}>100%</Text>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>Tax & GST Compliant</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.line }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricNumber, { color: theme.ink }]}>4.9 / 5 ⭐</Text>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>User Satisfaction</Text>
          </View>
        </View>

        {/* DOCUMENT SHOWCASE */}
        <View
          onLayout={(event) => setSectionPosition("documents", event.nativeEvent.layout.y)}
          style={styles.section}
        >
          <SectionHeading
            eyebrow="COMPLETE DOCUMENT ECOSYSTEM"
            title="Everything You Need to Run Your Business"
            body="Generate clean, professional, and compliant client-facing documents in seconds."
          />
          <View style={styles.documentGrid}>
            {documentCards.map((document) => (
              <View key={document.title} style={[styles.card, { backgroundColor: theme.white, borderColor: theme.line }]}>
                <OutlineIcon name={document.icon} />
                <Text style={[styles.cardTitle, { color: theme.ink }]}>{document.title}</Text>
                <Text style={[styles.cardText, { color: theme.muted }]}>{document.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* FEATURES GRID */}
        <View
          onLayout={(event) => setSectionPosition("features", event.nativeEvent.layout.y)}
          style={[styles.section, { backgroundColor: theme.wash }]}
        >
          <SectionHeading
            eyebrow="BUILT FOR EFFICIENCY"
            title="Powerful Features for Modern Businesses"
            body="Automate your document workflow with cloud backup, multi-company profiles, and tax calculation engines."
          />
          <View style={styles.featureGrid}>
            {featureCards.map((feature) => (
              <View key={feature.title} style={[styles.featureCard, { backgroundColor: theme.white, borderColor: theme.line }]}>
                <OutlineIcon name={feature.icon} />
                <Text style={[styles.cardTitle, { color: theme.ink }]}>{feature.title}</Text>
                <Text style={[styles.cardText, { color: theme.muted }]}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* PRICING SECTION */}
        <View
          onLayout={(event) => setSectionPosition("pricing", event.nativeEvent.layout.y)}
          style={styles.section}
        >
          <SectionHeading
            eyebrow="TRANSPARENT TIERING"
            title="Simple, Transparent Pricing"
            body="Start for free and upgrade as your business grows."
          />
          <PricingSection />
        </View>

        {/* FAQ SECTION */}
        <View
          onLayout={(event) => setSectionPosition("faq", event.nativeEvent.layout.y)}
          style={[styles.section, { backgroundColor: theme.wash }]}
        >
          <SectionHeading
            eyebrow="FREQUENTLY ASKED QUESTIONS"
            title="Got Questions? We Have Answers."
            body="Everything you need to know about BrandDocs."
          />
          <FaqSection />
        </View>

        {/* ABOUT & CONTACT SECTION */}
        <View
          onLayout={(event) => setSectionPosition("about", event.nativeEvent.layout.y)}
          style={[styles.section, styles.aboutSection]}
        >
          <View style={styles.aboutGrid}>
            <View style={[styles.aboutCopy, { backgroundColor: theme.orangeSoft, borderColor: theme.line }]}>
              <Text accessibilityRole="header" style={[styles.sectionTitleLeft, { color: theme.ink }]}>
                About BrandDocs
              </Text>
              <Text style={[styles.aboutText, { color: theme.text }]}>
                BrandDocs empowers entrepreneurs, freelancers, and businesses to generate clean, consistent, and professional business documents with speed and brand integrity.
              </Text>
            </View>
            <View style={[styles.contactPanel, { backgroundColor: theme.white, borderColor: theme.line }]}>
              <MailLink label="General Inquiries" email="branddocs.app@gmail.com" />
              <MailLink label="Customer Support" email="branddocs.support@gmail.com" />
              <View style={[styles.noReplyBox, { borderColor: theme.line }]}>
                <Text style={[styles.contactLabel, { color: theme.muted }]}>Automated Notifications Only</Text>
                <Text style={[styles.noReplyEmail, { color: theme.text }]}>branddocs.noreply@gmail.com</Text>
              </View>
            </View>
          </View>
        </View>

        <Footer onNavigateSection={scrollToSection} />
      </ScrollView>
      <CookieConsentBanner />
    </View>
  );
}

export function MarketingInfoPage({
  eyebrow,
  title,
  body,
  items = [],
}: {
  eyebrow: string;
  title: string;
  body: string;
  items?: string[];
}) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <Header />
      <ScrollView contentContainerStyle={[styles.section, { paddingVertical: 80 }]} showsVerticalScrollIndicator={false}>
        <SectionHeading eyebrow={eyebrow} title={title} body={body} />

        {items.length > 0 ? (
          <View style={styles.featureGrid}>
            {items.map((item) => (
              <View key={item} style={[styles.card, { backgroundColor: theme.white, borderColor: theme.line }]}>
                <OutlineIcon name="shield-checkmark-outline" />
                <Text style={[styles.cardTitle, { color: theme.ink }]}>{item}</Text>
                <Text style={[styles.cardText, { color: theme.muted }]}>
                  Dedicated assistance and guidance for {item.toLowerCase()} in your BrandDocs workspace.
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 40, alignItems: "center" }}>
          <MarketingButton label="Back to Home" href="/" icon="arrow-back-outline" />
        </View>
      </ScrollView>
      <Footer />
    </View>
  );
}

function Footer({ onNavigateSection }: { onNavigateSection?: (section: SectionKey) => void }) {
  const { isDark, theme } = useAppTheme();

  function handleFooterLink(link: { section?: SectionKey; href?: Href }) {
    if (link.section && onNavigateSection) {
      onNavigateSection(link.section);
      return;
    }
    if (link.section) {
      goToRoute("/landing");
      return;
    }
    if (link.href) goToRoute(link.href);
  }

  const productsLinks: { label: string; section?: SectionKey; href?: Href }[] = [
    { label: "Tax Invoice Generator", section: "documents" },
    { label: "Digital Visiting Card", section: "documents" },
    { label: "Business Quotation", section: "documents" },
    { label: "Table Quotation", section: "documents" },
    { label: "Branded Letterhead", section: "documents" },
    { label: "Payment Receipt", section: "documents" },
    { label: "OCR Receipt Scanner", section: "documents" },
  ];

  const companyLinks: { label: string; section?: SectionKey; href?: Href }[] = [
    { label: "About BrandDocs", section: "about" },
    { label: "Features Overview", section: "features" },
    { label: "Pricing Tiers", section: "pricing" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Cookie Preferences", href: "/cookie-preferences" },
    { label: "Security & Compliance", href: "/security-overview" },
    { label: "Account Deletion", href: "/account-deletion" },
  ];

  const supportLinks: { label: string; section?: SectionKey; href?: Href }[] = [
    { label: "Customer Support", href: "/support" },
    { label: "Contact Us", href: "/contact" },
    { label: "Subscription Terms", href: "/subscription-cancellation" },
    { label: "Frequently Asked Questions", section: "faq" },
  ];

  return (
    <View style={[styles.footerContainer, { backgroundColor: theme.white, borderTopColor: theme.line }]}>
      <View style={styles.footerInner}>
        {/* TOP ROW: MULTI-COLUMN LAYOUT */}
        <View style={styles.footerColumns}>
          {/* COLUMN 1: BRAND & MISSION */}
          <View style={styles.footerBrandCol}>
            <BrandLogo size="medium" />
            <Text style={[styles.footerTagline, { color: theme.muted }]}>
              The all-in-one business document & digital branding workspace. Designed for speed, precision, and compliance.
            </Text>

            {/* LIVE SYSTEM STATUS PILL */}
            <View style={[styles.statusPill, { backgroundColor: isDark ? "#122A1E" : "#E6F7ED", borderColor: isDark ? "#1E4D34" : "#A8E5BC" }]}>
              <View style={[styles.statusDot, { backgroundColor: isDark ? "#43D888" : "#1E824C" }]} />
              <Text style={[styles.statusText, { color: isDark ? "#43D888" : "#1E824C" }]}>All Systems Operational • 99.9% Uptime</Text>
            </View>

            {/* SECURITY BADGE */}
            <View style={[styles.securityBadge, { backgroundColor: theme.orangeSoft, borderColor: theme.line }]}>
              <Ionicons name="shield-checkmark" size={16} color={theme.orangeDark} />
              <Text style={[styles.securityBadgeText, { color: theme.orangeDark }]}>256-bit SSL • Bank-Grade Encrypted</Text>
            </View>
          </View>

          {/* COLUMN 2: PRODUCTS */}
          <View style={styles.footerCol}>
            <Text style={[styles.footerColTitle, { color: theme.ink }]}>Document Tools</Text>
            {productsLinks.map((link) => (
              <Pressable key={link.label} onPress={() => handleFooterLink(link)} style={styles.footerLinkItem}>
                <Text style={[styles.footerLinkText, { color: theme.muted }]}>{link.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* COLUMN 3: COMPANY & LEGAL */}
          <View style={styles.footerCol}>
            <Text style={[styles.footerColTitle, { color: theme.ink }]}>Company & Legal</Text>
            {companyLinks.map((link) => (
              <Pressable key={link.label} onPress={() => handleFooterLink(link)} style={styles.footerLinkItem}>
                <Text style={[styles.footerLinkText, { color: theme.muted }]}>{link.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* COLUMN 4: SUPPORT & SOCIAL */}
          <View style={styles.footerCol}>
            <Text style={[styles.footerColTitle, { color: theme.ink }]}>Support & Contact</Text>
            {supportLinks.map((link) => (
              <Pressable key={link.label} onPress={() => handleFooterLink(link)} style={styles.footerLinkItem}>
                <Text style={[styles.footerLinkText, { color: theme.muted }]}>{link.label}</Text>
              </Pressable>
            ))}

            <Text style={[styles.footerColTitle, { color: theme.ink, marginTop: 20 }]}>Connect With Us</Text>
            <View style={styles.socialIconsRow}>
              {[
                { name: "logo-twitter", label: "Twitter" },
                { name: "logo-linkedin", label: "LinkedIn" },
                { name: "logo-github", label: "GitHub" },
                { name: "logo-youtube", label: "YouTube" },
              ].map((social) => (
                <Pressable
                  key={social.label}
                  accessibilityLabel={social.label}
                  style={[styles.socialIconBtn, { backgroundColor: theme.wash, borderColor: theme.line }]}
                  onPress={() => goToRoute("/support")}
                >
                  <Ionicons name={social.name as never} size={18} color={theme.ink} />
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* BOTTOM DIVIDER & COPYRIGHT BAR */}
        <View style={[styles.footerBottomBar, { borderTopColor: theme.line }]}>
          <Text style={[styles.copyrightText, { color: theme.muted }]}>
            Copyright © 2026 BrandDocs. All rights reserved. Built for modern businesses worldwide.
          </Text>
          <View style={styles.footerBadgesRow}>
            <View style={[styles.miniBadge, { backgroundColor: theme.wash, borderColor: theme.line }]}>
              <Text style={[styles.miniBadgeText, { color: theme.muted }]}>Expo SDK 57</Text>
            </View>
            <View style={[styles.miniBadge, { backgroundColor: theme.wash, borderColor: theme.line }]}>
              <Text style={[styles.miniBadgeText, { color: theme.muted }]}>React Native Web</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const webShadow = Platform.select({
  web: {
    boxShadow: "0 22px 60px rgba(0, 0, 0, 0.12)",
  },
  default: {
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
});

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  headerShell: {
    position: "sticky" as never,
    top: 0,
    zIndex: 20,
  },
  headerShellDark: {
    backgroundColor: "rgba(22,24,28,0.95)",
  },
  themeToggleBtn: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  themeToggleBtnDark: {
    backgroundColor: "#181A16",
    borderColor: "#2E322A",
  },
  themeToggleText: {
    fontSize: 13,
    fontWeight: "800",
  },
  themeToggleTextDark: {
    color: "#F5F3ED",
  },
  navTextDark: {
    color: "#F5F3ED",
  },
  menuButtonDark: {
    backgroundColor: "#181A16",
    borderColor: "#2E322A",
  },
  menuTextDark: {
    color: "#F5F3ED",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 82,
    paddingHorizontal: 24,
    width: "100%",
  },
  logoButton: {
    alignItems: "flex-start",
    height: 70,
    justifyContent: "center",
  },
  headerCenterNav: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  headerRightActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  navLink: {
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  navLinkPressed: {
    opacity: 0.72,
  },
  navText: {
    fontSize: 14,
    fontWeight: "750" as never,
  },
  headerLine: {
    height: 1,
    opacity: 0.76,
  },
  menuButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "800",
  },
  mobileMenu: {
    alignSelf: "center",
    gap: 8,
    paddingBottom: 18,
    paddingHorizontal: 24,
    width: "100%",
  },
  mobileMenuItem: {
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  mobileMenuItemPressed: {
    opacity: 0.8,
  },
  mobileMenuText: {
    fontSize: 16,
    fontWeight: "800",
  },
  button: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 22,
  },
  buttonActive: {
    opacity: 0.92,
    transform: [{ translateY: -1 }],
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "900",
  },
  badgeShell: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  hero: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 40,
    maxWidth: 1280,
    minHeight: 620,
    paddingHorizontal: 28,
    paddingVertical: 50,
    width: "100%",
  },
  heroNarrow: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 36,
    minHeight: 0,
  },
  heroCopy: {
    flex: 1,
    maxWidth: 540,
  },
  heroTitle: {
    fontSize: 54,
    fontWeight: "950" as never,
    letterSpacing: -0.5,
    lineHeight: 62,
  },
  heroTitleMobile: {
    fontSize: 38,
    lineHeight: 46,
  },
  heroText: {
    fontSize: 18,
    lineHeight: 29,
    marginTop: 18,
    maxWidth: 520,
  },
  heroHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 22,
  },
  heroHighlight: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  heroHighlightText: {
    fontSize: 13,
    fontWeight: "800",
  },
  heroButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 28,
  },
  heroNote: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 16,
  },

  /* Interactive Document Playground */
  playgroundShell: {
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    maxWidth: 620,
    minHeight: 480,
    minWidth: 360,
    overflow: "hidden",
    padding: 20,
    ...webShadow,
  },
  playgroundShellCompact: {
    minHeight: 420,
    minWidth: 0,
    width: "100%",
  },
  playgroundTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  playgroundTab: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playgroundTabText: {
    fontSize: 13,
    fontWeight: "800",
  },
  playgroundPreviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 20,
  },
  docCanvas: {
    flex: 1,
  },
  docTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  docBrandName: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  docSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  docBadge: {
    alignItems: "flex-end",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  docNumText: {
    fontSize: 12,
    fontWeight: "800",
  },
  docDivider: {
    height: 1,
    marginVertical: 14,
  },
  docMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  docMetaLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  docMetaValue: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  docTable: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  docTableHeader: {
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  docTableCellHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
  },
  docTableRow: {
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  docTableCell: {
    flex: 1,
    fontSize: 13,
  },
  docTotalBlock: {
    alignSelf: "flex-end",
    marginTop: 14,
    width: 220,
  },
  docTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  docTotalLabel: {
    fontSize: 13,
  },
  docTotalValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  docGrandTotalLabel: {
    fontSize: 14,
    fontWeight: "900",
  },
  docGrandTotalValue: {
    fontSize: 16,
    fontWeight: "900",
  },

  /* Visiting Card Preview */
  visitingCardCanvas: {
    flex: 1,
    justifyContent: "space-between",
  },
  vCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  vCardAvatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  vCardName: {
    fontSize: 18,
    fontWeight: "900",
  },
  vCardRole: {
    fontSize: 13,
    fontWeight: "800",
  },
  vCardCompany: {
    fontSize: 12,
  },
  vCardContactGrid: {
    gap: 8,
    marginVertical: 14,
  },
  vCardContactItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  vCardContactText: {
    fontSize: 13,
    fontWeight: "700",
  },
  vCardFooter: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    padding: 10,
  },
  qrMock: {
    alignItems: "center",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  qrTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  qrSubtitle: {
    fontSize: 11,
  },
  stampMock: {
    borderRadius: 6,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    transform: [{ rotate: "-8deg" }],
  },
  stampText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* Metrics Bar */
  metricsBar: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginVertical: 24,
    maxWidth: 1140,
    paddingVertical: 22,
    width: "100%",
    ...webShadow,
  },
  metricItem: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: "950" as never,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  metricDivider: {
    height: 36,
    width: 1,
  },

  section: {
    alignSelf: "center",
    maxWidth: 1280,
    paddingHorizontal: 28,
    paddingVertical: 70,
    width: "100%",
  },
  sectionHeading: {
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 42,
    maxWidth: 780,
  },
  eyebrowBadge: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 40,
    fontWeight: "950" as never,
    lineHeight: 48,
    textAlign: "center",
  },
  sectionTitleLeft: {
    fontSize: 36,
    fontWeight: "950" as never,
    lineHeight: 44,
  },
  sectionBody: {
    fontSize: 17,
    lineHeight: 27,
    marginTop: 14,
    textAlign: "center",
  },
  documentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "center",
    width: "100%",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 200,
    padding: 24,
    width: 360,
  },
  outlineIcon: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    marginBottom: 18,
    width: 48,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 22,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "center",
    width: "100%",
  },
  featureCard: {
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 200,
    padding: 24,
    width: 360,
  },
  pricingWrap: {
    gap: 24,
  },
  pricingSelector: {
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    padding: 6,
  },
  countryButton: {
    borderRadius: 999,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  countryButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  pricingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "center",
  },
  planCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
    position: "relative",
    width: 450,
    ...webShadow,
  },
  popularBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    position: "absolute",
    right: 24,
    top: -12,
  },
  popularBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 22,
    fontWeight: "950" as never,
  },
  planPrice: {
    fontSize: 42,
    fontWeight: "950" as never,
    lineHeight: 50,
    marginTop: 16,
  },
  planSubtext: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  planItems: {
    gap: 12,
    marginBottom: 24,
    marginTop: 24,
  },
  planItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  planItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  billingNote: {
    alignSelf: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    maxWidth: 920,
    padding: 22,
    width: "100%",
  },
  billingIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  billingCopy: {
    flex: 1,
  },
  billingTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  billingText: {
    fontSize: 15,
    lineHeight: 24,
  },
  billingLinkWrap: {
    alignSelf: "flex-start",
    marginTop: 12,
    minHeight: 32,
    justifyContent: "center",
  },
  billingLink: {
    fontSize: 15,
    fontWeight: "900",
  },

  /* FAQ Styles */
  faqList: {
    alignSelf: "center",
    gap: 12,
    maxWidth: 800,
    width: "100%",
  },
  faqItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  faqHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  faqQuestion: {
    fontSize: 17,
    fontWeight: "900",
    flex: 1,
    paddingRight: 10,
  },
  faqAnswer: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
  },

  aboutSection: {
    paddingBottom: 92,
  },
  aboutGrid: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
  },
  aboutCopy: {
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minWidth: 300,
    padding: 30,
  },
  aboutText: {
    fontSize: 17,
    lineHeight: 28,
    marginTop: 16,
  },
  contactPanel: {
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    minWidth: 300,
    padding: 24,
  },
  mailLink: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 72,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
  noReplyBox: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 72,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  noReplyEmail: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 3,
  },
  footerContainer: {
    borderTopWidth: 1,
    marginTop: 40,
    width: "100%",
  },
  footerInner: {
    alignSelf: "center",
    maxWidth: 1280,
    paddingHorizontal: 28,
    paddingTop: 54,
    paddingBottom: 36,
    width: "100%",
  },
  footerColumns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 36,
    justifyContent: "space-between",
  },
  footerBrandCol: {
    maxWidth: 320,
    minWidth: 260,
  },
  footerLogo: {
    height: 52,
    width: 200,
  },
  footerTagline: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  securityBadge: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  securityBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  footerCol: {
    minWidth: 170,
  },
  footerColTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 14,
  },
  footerLinkItem: {
    marginVertical: 4,
  },
  footerLinkText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
  },
  socialIconsRow: {
    flexDirection: "row",
    gap: 10,
  },
  socialIconBtn: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  footerBottomBar: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    marginTop: 44,
    paddingTop: 24,
  },
  copyrightText: {
    fontSize: 13,
    fontWeight: "700",
  },
  footerBadgesRow: {
    flexDirection: "row",
    gap: 8,
  },
  miniBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
