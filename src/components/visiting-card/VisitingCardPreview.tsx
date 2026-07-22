import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import {
  buildQrPayload,
  getCardPhysicalSize,
  getVisitingCardTemplate,
  VisitingCardRecord,
} from "@/services/visiting-cards";
import { getCompanyInitials } from "@/services/business-profile";
import { BrandColors, BrandRadius, BrandSpacing } from "@/theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

const contactIcons: { key: string; icon: IconName; label: string }[] = [
  { key: "mobileNumber", icon: "call-outline", label: "Phone" },
  { key: "email", icon: "mail-outline", label: "Email" },
  { key: "website", icon: "globe-outline", label: "Website" },
  { key: "address", icon: "location-outline", label: "Address" },
];

const socialIcons: { key: keyof VisitingCardRecord["socialLinks"]; icon: IconName; label: string }[] = [
  { key: "whatsapp", icon: "logo-whatsapp", label: "WhatsApp" },
  { key: "linkedIn", icon: "logo-linkedin", label: "LinkedIn" },
  { key: "instagram", icon: "logo-instagram", label: "Instagram" },
  { key: "facebook", icon: "logo-facebook", label: "Facebook" },
  { key: "x", icon: "logo-twitter", label: "X" },
  { key: "youtube", icon: "logo-youtube", label: "YouTube" },
  { key: "custom", icon: "link-outline", label: "Link" },
];

export function VisitingCardPreview({
  card,
  side = "front",
  compact,
  showActualSizeLabel,
  style,
}: {
  card: VisitingCardRecord;
  side?: "front" | "back";
  compact?: boolean;
  showActualSizeLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const template = getVisitingCardTemplate(card.templateId);
  const design = card.designSettings;
  const isDark = design.backgroundColor.toLowerCase() === "#232323" || design.backgroundColor.toLowerCase() === "#111827";
  const physicalSize = getCardPhysicalSize(card.cardSize, card.orientation);
  const isVertical = card.orientation === "vertical";
  const cardStyle = [
    styles.card,
    isVertical && styles.verticalCard,
    compact && styles.compactCard,
    {
      backgroundColor: design.backgroundColor,
      borderColor: isDark ? "rgba(255,255,255,0.18)" : BrandColors.borderStrong,
    },
    style,
  ];

  return (
    <View style={styles.shell}>
      <View style={cardStyle}>
        {design.showBleed ? <View pointerEvents="none" style={[styles.bleedGuide, { borderColor: design.accentColor }]} /> : null}
        {design.showSafeArea ? <View pointerEvents="none" style={[styles.safeGuide, { borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(35,35,35,0.14)" }]} /> : null}
        {template.templateId === "orange_accent" ? <View style={[styles.accentBand, { backgroundColor: design.accentColor }]} /> : null}
        {template.templateId === "modern_minimal" ? <View style={[styles.cornerMark, { borderColor: design.accentColor }]} /> : null}
        {template.templateId === "dark_premium" ? <View style={[styles.darkGlow, { backgroundColor: design.accentColor }]} /> : null}

        {side === "front" ? <FrontSide card={card} compact={compact} /> : <BackSide card={card} compact={compact} />}
      </View>
      {showActualSizeLabel ? (
        <Text style={styles.actualSizeLabel}>
          {physicalSize.label} • {physicalSize.widthMm} x {physicalSize.heightMm} mm • Print at 100% / Actual Size
        </Text>
      ) : null}
    </View>
  );
}

function FrontSide({ card, compact }: { card: VisitingCardRecord; compact?: boolean }) {
  const template = getVisitingCardTemplate(card.templateId);
  const design = card.designSettings;
  const textColor = design.textColor;
  const secondaryColor = design.secondaryTextColor;
  const useCentered = design.textAlign === "center" || template.templateId === "logo_focus" || template.templateId === "vertical_professional";
  const showPhoto = template.templateId === "photo_profile" && card.profilePhotoUrl && !card.iconOnlyMode;
  const showLogo = card.logoUrl && !showPhoto;

  return (
    <View style={[styles.cardContent, useCentered && styles.centeredContent]}>
      <View style={[styles.identityRow, useCentered && styles.centeredIdentityRow]}>
        {showPhoto ? (
          <Image source={{ uri: card.profilePhotoUrl || "" }} style={[styles.photo, { height: design.photoSize, width: design.photoSize, borderColor: design.accentColor }]} contentFit="cover" />
        ) : showLogo ? (
          <Image source={{ uri: card.logoUrl || "" }} style={[styles.logo, { height: design.logoSize, width: design.logoSize }]} contentFit="contain" />
        ) : (
          <View style={[styles.initialsMark, { backgroundColor: design.accentColor, height: design.logoSize, width: design.logoSize }]}>
            <Text style={styles.initialsText}>{getCompanyInitials(card.businessName || card.fullName)}</Text>
          </View>
        )}

        <View style={[styles.identityCopy, useCentered && styles.centeredCopy]}>
          <Text style={[styles.name, { color: textColor, fontSize: compact ? 13 : design.nameSize, textAlign: design.textAlign }]} numberOfLines={2}>
            {card.fullName || "Full Name"}
          </Text>
          {card.jobTitle || card.department ? (
            <Text style={[styles.role, { color: secondaryColor, fontSize: compact ? 8 : design.jobTitleSize, textAlign: design.textAlign }]} numberOfLines={2}>
              {[card.jobTitle, card.department].filter(Boolean).join(" • ")}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.businessBlock, useCentered && styles.centeredCopy]}>
        <Text style={[styles.businessName, { color: textColor, textAlign: design.textAlign }]} numberOfLines={2}>
          {card.businessName || "Business Name"}
        </Text>
        {card.companyTagline || card.professionalLine ? (
          <Text style={[styles.tagline, { color: secondaryColor, textAlign: design.textAlign }]} numberOfLines={3}>
            {card.companyTagline || card.professionalLine}
          </Text>
        ) : null}
      </View>

      <View style={[styles.frontFooter, useCentered && styles.centeredFooter]}>
        <View style={[styles.accentRule, { backgroundColor: design.accentColor }]} />
        {card.showTaxId && card.taxId ? <Text style={[styles.microText, { color: secondaryColor }]}>Tax ID: {card.taxId}</Text> : null}
      </View>
    </View>
  );
}

function BackSide({ card, compact }: { card: VisitingCardRecord; compact?: boolean }) {
  const design = card.designSettings;
  const textColor = design.textColor;
  const secondaryColor = design.secondaryTextColor;
  const contacts = contactIcons
    .map((item) => ({ ...item, value: String((card as any)[item.key] || "") }))
    .filter((item) => item.value);
  const socials = socialIcons
    .map((item) => ({ ...item, value: card.socialLinks[item.key] }))
    .filter((item) => item.value);
  const qrPayload = buildQrPayload(card);

  return (
    <View style={styles.cardContent}>
      <View style={styles.backHeader}>
        {card.logoUrl ? <Image source={{ uri: card.logoUrl }} style={styles.backLogo} contentFit="contain" /> : <View style={[styles.tinyMark, { backgroundColor: design.accentColor }]} />}
        <View style={styles.backHeaderCopy}>
          <Text style={[styles.businessName, { color: textColor }]} numberOfLines={1}>{card.businessName || "Business Name"}</Text>
          {card.customMessage ? <Text style={[styles.tagline, { color: secondaryColor }]} numberOfLines={2}>{card.customMessage}</Text> : null}
        </View>
      </View>

      <View style={styles.backBody}>
        <View style={styles.contactList}>
          {contacts.map((item) => (
            <View key={item.key} accessibilityLabel={`${item.label}: ${item.value}`} style={styles.contactLine}>
              <Ionicons name={item.icon} size={compact ? 9 : 11} color={design.accentColor} />
              <Text style={[styles.contactText, { color: textColor, fontSize: compact ? 7 : design.contactSize }]} numberOfLines={2}>{item.value}</Text>
            </View>
          ))}
          {socials.slice(0, 4).map((item) => (
            <View key={item.key} accessibilityLabel={`${item.label}: ${item.value}`} style={styles.contactLine}>
              <Ionicons name={item.icon} size={compact ? 9 : 11} color={design.accentColor} />
              <Text style={[styles.contactText, { color: textColor, fontSize: compact ? 7 : design.contactSize }]} numberOfLines={1}>{item.value}</Text>
            </View>
          ))}
        </View>

        {card.qrEnabled ? (
          <View style={[styles.qrBox, { borderColor: design.accentColor, height: compact ? 38 : design.qrSize, width: compact ? 38 : design.qrSize }]}>
            <Text style={[styles.qrText, { color: textColor }]} numberOfLines={2}>{qrPayload ? "QR DATA" : "NO QR"}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: BrandSpacing.sm,
  },
  card: {
    aspectRatio: 3.5 / 2,
    borderRadius: BrandRadius.small,
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
    position: "relative",
    width: "100%",
  },
  verticalCard: {
    aspectRatio: 2 / 3.5,
  },
  compactCard: {
    padding: 9,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    position: "relative",
    zIndex: 2,
  },
  centeredContent: {
    alignItems: "center",
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  centeredIdentityRow: {
    flexDirection: "column",
    gap: 7,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  centeredCopy: {
    alignItems: "center",
    flex: 0,
  },
  logo: {
    borderRadius: BrandRadius.small,
  },
  photo: {
    borderRadius: 999,
    borderWidth: 2,
  },
  initialsMark: {
    alignItems: "center",
    borderRadius: BrandRadius.small,
    justifyContent: "center",
  },
  initialsText: {
    color: BrandColors.background,
    fontSize: 15,
    fontWeight: "900",
  },
  name: {
    fontWeight: "900",
    letterSpacing: 0,
  },
  role: {
    fontWeight: "700",
    letterSpacing: 0,
    marginTop: 2,
  },
  businessBlock: {
    gap: 2,
  },
  businessName: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
  },
  tagline: {
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0,
  },
  frontFooter: {
    gap: 4,
  },
  centeredFooter: {
    alignItems: "center",
  },
  accentRule: {
    borderRadius: 999,
    height: 3,
    width: 58,
  },
  microText: {
    fontSize: 7,
    fontWeight: "700",
  },
  backHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  backLogo: {
    height: 24,
    width: 42,
  },
  tinyMark: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  backHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  backBody: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 9,
    justifyContent: "space-between",
  },
  contactList: {
    flex: 1,
    gap: 4,
  },
  contactLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  contactText: {
    flex: 1,
    fontWeight: "700",
    letterSpacing: 0,
  },
  qrBox: {
    alignItems: "center",
    borderRadius: BrandRadius.small,
    borderWidth: 1.5,
    justifyContent: "center",
    padding: 3,
  },
  qrText: {
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center",
  },
  actualSizeLabel: {
    color: BrandColors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
  },
  safeGuide: {
    borderRadius: BrandRadius.small,
    borderStyle: "dashed",
    borderWidth: 1,
    bottom: 9,
    left: 9,
    position: "absolute",
    right: 9,
    top: 9,
    zIndex: 1,
  },
  bleedGuide: {
    borderRadius: BrandRadius.small,
    borderStyle: "dotted",
    borderWidth: 1,
    bottom: 3,
    left: 3,
    position: "absolute",
    right: 3,
    top: 3,
    zIndex: 1,
  },
  accentBand: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: "28%",
    zIndex: 0,
  },
  cornerMark: {
    borderRightWidth: 2,
    borderTopWidth: 2,
    height: 34,
    position: "absolute",
    right: 10,
    top: 10,
    width: 34,
    zIndex: 0,
  },
  darkGlow: {
    borderRadius: 999,
    height: 120,
    opacity: 0.14,
    position: "absolute",
    right: -42,
    top: -42,
    width: 120,
    zIndex: 0,
  },
});
