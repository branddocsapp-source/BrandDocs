import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ReactNode } from "react";
import { Platform, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";

import { DocumentColors, DOCUMENT_PAPER_MIN_HEIGHT, DOCUMENT_PAPER_WIDTH } from "./document-colors";

type IconName = keyof typeof Ionicons.glyphMap;

const shadow = Platform.select({
  web: { boxShadow: "0px 8px 18px rgba(0, 0, 0, 0.07)" } as any,
  default: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
});

export function HexagonLogo({ size = 48 }: { size?: number }) {
  return (
    <View style={[docStyles.hexWrap, { width: size, height: size, borderRadius: size * 0.18 }]}>
      <Ionicons name="document-text" size={size * 0.55} color={DocumentColors.accent} />
    </View>
  );
}

export function HexagonBadge({ text }: { text: string }) {
  return (
    <View style={docStyles.hexBadge}>
      <Text style={docStyles.hexBadgeText}>{text}</Text>
    </View>
  );
}

export type CompanyBlock = {
  name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string | null;
  taxRegistrationNumber?: string;
  pan?: string;
  registrationNumber?: string;
};

export function DocumentPaperShell({
  children,
  style,
  isDesktop,
  minHeight = DOCUMENT_PAPER_MIN_HEIGHT,
}: {
  children: ReactNode;
  style?: ViewStyle;
  isDesktop?: boolean;
  minHeight?: number;
}) {
  return (
    <View style={[docStyles.paper, isDesktop && docStyles.paperDesktop, { minHeight }, style]}>
      {children}
    </View>
  );
}

export function DocumentBrandHeader({
  company,
  documentTitle,
  documentSubtitle,
  metaRows,
  badgeText,
  editable = false,
  onCompanyChange,
}: {
  company: CompanyBlock;
  documentTitle?: string;
  documentSubtitle?: string;
  metaRows?: { label: string; value: string; onChange?: (v: string) => void }[];
  badgeText?: string;
  editable?: boolean;
  onCompanyChange?: (field: keyof CompanyBlock, value: string) => void;
}) {
  const Field = editable ? EditableLine : ReadonlyLine;

  return (
    <View style={docStyles.headerRow}>
      <View style={docStyles.headerLeft}>
        {company.logoUrl ? (
          <Image source={{ uri: company.logoUrl }} style={docStyles.logoImage} contentFit="contain" />
        ) : (
          <HexagonLogo size={52} />
        )}
        <View style={docStyles.headerCompany}>
          <Field
            value={company.name || "ABC ENTERPRISES PVT. LTD."}
            onChange={onCompanyChange ? (v) => onCompanyChange("name", v) : undefined}
            textStyle={docStyles.companyName}
          />
          {company.tagline !== undefined ? (
            <Field
              value={company.tagline || "Documents that build your business"}
              onChange={onCompanyChange ? (v) => onCompanyChange("tagline", v) : undefined}
              textStyle={docStyles.companyTagline}
            />
          ) : null}
          <ContactLine icon="location-outline" value={company.address} editable={editable} onChange={onCompanyChange ? (v) => onCompanyChange("address", v) : undefined} />
          <ContactLine icon="call-outline" value={company.phone} editable={editable} onChange={onCompanyChange ? (v) => onCompanyChange("phone", v) : undefined} />
          <ContactLine icon="mail-outline" value={company.email} editable={editable} onChange={onCompanyChange ? (v) => onCompanyChange("email", v) : undefined} />
          <ContactLine icon="globe-outline" value={company.website} editable={editable} onChange={onCompanyChange ? (v) => onCompanyChange("website", v) : undefined} />
        </View>
      </View>

      <View style={docStyles.headerRight}>
        {documentTitle ? (
          <View style={docStyles.titleBlock}>
            {documentSubtitle ? <Text style={docStyles.docSubtitle}>{documentSubtitle}</Text> : null}
            <Text style={docStyles.docTitle}>{documentTitle}</Text>
            {badgeText ? <HexagonBadge text={badgeText} /> : null}
          </View>
        ) : null}
        {metaRows?.map((row) => (
          <View key={row.label} style={docStyles.metaRow}>
            <Text style={docStyles.metaLabel}>{row.label}</Text>
            {editable && row.onChange ? (
              <TextInput style={docStyles.metaValueInput} value={row.value} onChangeText={row.onChange} />
            ) : (
              <Text style={docStyles.metaValue}>{row.value}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export function DocumentTaxBar({
  gstin,
  pan,
  cin,
  editable = false,
  onGstinChange,
  onPanChange,
  onCinChange,
}: {
  gstin?: string;
  pan?: string;
  cin?: string;
  editable?: boolean;
  onGstinChange?: (v: string) => void;
  onPanChange?: (v: string) => void;
  onCinChange?: (v: string) => void;
}) {
  return (
    <View style={docStyles.taxBar}>
      <TaxItem label="GSTIN" value={gstin || "27ABCDE1234F1Z5"} editable={editable} onChange={onGstinChange} />
      <View style={docStyles.taxDivider} />
      <TaxItem label="PAN" value={pan || "ABCDE1234F"} editable={editable} onChange={onPanChange} />
      <View style={docStyles.taxDivider} />
      <TaxItem label="CIN" value={cin || "U74999MH2020PTC123456"} editable={editable} onChange={onCinChange} />
    </View>
  );
}

export function DocumentFooter({ phone, email, website }: { phone?: string; email?: string; website?: string }) {
  return (
    <View style={docStyles.footer}>
      <View style={docStyles.footerContacts}>
        {phone ? (
          <View style={docStyles.footerItem}>
            <Ionicons name="call-outline" size={12} color={DocumentColors.accent} />
            <Text style={docStyles.footerText}>{phone}</Text>
          </View>
        ) : null}
        {email ? (
          <View style={docStyles.footerItem}>
            <Ionicons name="mail-outline" size={12} color={DocumentColors.accent} />
            <Text style={docStyles.footerText}>{email}</Text>
          </View>
        ) : null}
        {website ? (
          <View style={docStyles.footerItem}>
            <Ionicons name="globe-outline" size={12} color={DocumentColors.accent} />
            <Text style={docStyles.footerText}>{website}</Text>
          </View>
        ) : null}
      </View>
      <Text style={docStyles.footerThanks}>Thank you for your business!</Text>
    </View>
  );
}

export function DocumentSectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={docStyles.sectionTitleRow}>
      <Ionicons name={icon} size={14} color={DocumentColors.accent} />
      <Text style={docStyles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function DocumentMetaField({
  icon,
  label,
  value,
  editable,
  onChangeText,
  multiline,
}: {
  icon: IconName;
  label: string;
  value: string;
  editable?: boolean;
  onChangeText?: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={docStyles.metaFieldRow}>
      <Ionicons name={icon} size={13} color={DocumentColors.accent} style={{ width: 18 }} />
      <Text style={docStyles.metaFieldLabel}>{label}</Text>
      <Text style={docStyles.metaFieldColon}>:</Text>
      {editable && onChangeText ? (
        <TextInput
          style={[docStyles.metaFieldValue, multiline && { flex: 1 }]}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
        />
      ) : (
        <Text style={[docStyles.metaFieldValue, multiline && { flex: 1 }]}>{value}</Text>
      )}
    </View>
  );
}

export function DocumentTableHeader({ columns }: { columns: { label: string; width?: number; flex?: number; align?: "left" | "center" | "right" }[] }) {
  return (
    <View style={docStyles.tableHeaderRow}>
      {columns.map((col) => (
        <Text
          key={col.label}
          style={[
            docStyles.tableHeaderCell,
            col.width ? { width: col.width } : col.flex ? { flex: col.flex } : undefined,
            col.align === "center" && { textAlign: "center" },
            col.align === "right" && { textAlign: "right" },
          ]}
        >
          {col.label}
        </Text>
      ))}
    </View>
  );
}

export function DocumentGrandTotalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={docStyles.grandTotalRow}>
      <Text style={docStyles.grandTotalLabel}>{label}</Text>
      <Text style={docStyles.grandTotalValue}>{value}</Text>
    </View>
  );
}

export function DocumentWatermark() {
  return (
    <View style={docStyles.watermark} pointerEvents="none">
      <HexagonLogo size={320} />
    </View>
  );
}

function ContactLine({
  icon,
  value,
  editable,
  onChange,
}: {
  icon: IconName;
  value?: string;
  editable?: boolean;
  onChange?: (v: string) => void;
}) {
  if (!value && !editable) return null;
  return (
    <View style={docStyles.contactLine}>
      <Ionicons name={icon} size={11} color={DocumentColors.accent} />
      {editable && onChange ? (
        <TextInput style={docStyles.contactText} value={value || ""} onChangeText={onChange} />
      ) : (
        <Text style={docStyles.contactText}>{value}</Text>
      )}
    </View>
  );
}

function TaxItem({ label, value, editable, onChange }: { label: string; value: string; editable?: boolean; onChange?: (v: string) => void }) {
  return (
    <View style={docStyles.taxItem}>
      <Text style={docStyles.taxLabel}>{label} : </Text>
      {editable && onChange ? (
        <TextInput style={docStyles.taxValueInput} value={value} onChangeText={onChange} />
      ) : (
        <Text style={docStyles.taxValue}>{value}</Text>
      )}
    </View>
  );
}

function EditableLine({ value, onChange, textStyle }: { value: string; onChange?: (v: string) => void; textStyle?: object }) {
  if (onChange) {
    return <TextInput style={[textStyle, { padding: 0 }]} value={value} onChangeText={onChange} />;
  }
  return <Text style={textStyle}>{value}</Text>;
}

function ReadonlyLine({ value, textStyle }: { value: string; textStyle?: object }) {
  return <Text style={textStyle}>{value}</Text>;
}

export const docStyles = StyleSheet.create({
  paper: {
    alignSelf: "center",
    backgroundColor: DocumentColors.paper,
    borderColor: DocumentColors.line,
    borderRadius: 2,
    borderWidth: 1,
    maxWidth: DOCUMENT_PAPER_WIDTH,
    minHeight: DOCUMENT_PAPER_MIN_HEIGHT,
    padding: 32,
    width: DOCUMENT_PAPER_WIDTH,
    ...shadow,
  },
  paperDesktop: { width: DOCUMENT_PAPER_WIDTH },
  hexWrap: {
    alignItems: "center",
    borderColor: DocumentColors.accent,
    borderWidth:  2,
    justifyContent: "center",
  },
  hexBadge: {
    alignItems: "center",
    borderColor: DocumentColors.accent,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hexBadgeText: { color: DocumentColors.accent, fontSize: 14, fontWeight: "800" },
  headerRow: {
    borderBottomColor: DocumentColors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  headerLeft: { flex: 1, flexDirection: "row", gap: 12 },
  logoImage: { height: 52, width: 52 },
  headerCompany: { flex: 1, gap: 2 },
  companyName: { color: DocumentColors.ink, fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  companyTagline: { color: DocumentColors.mutedLight, fontSize: 11, fontWeight: "500", marginTop: 2 },
  contactLine: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 2 },
  contactText: { color: DocumentColors.muted, flex: 1, fontSize: 11, padding: 0 },
  headerRight: { alignItems: "flex-end", gap: 3, maxWidth: 260 },
  titleBlock: { alignItems: "flex-end", gap: 4, marginBottom: 8 },
  docSubtitle: { color: DocumentColors.ink, fontSize: 14, fontWeight: "900" },
  docTitle: { color: DocumentColors.accent, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  metaRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  metaLabel: { color: DocumentColors.muted, fontSize: 11 },
  metaValue: { color: DocumentColors.ink, fontSize: 11, fontWeight: "700" },
  metaValueInput: { color: DocumentColors.ink, fontSize: 11, fontWeight: "700", minWidth: 100, padding: 0, textAlign: "right" },
  taxBar: {
    alignItems: "center",
    backgroundColor: DocumentColors.accentSoft,
    borderColor: DocumentColors.accentBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 12,
    paddingVertical: 7,
  },
  taxDivider: { backgroundColor: DocumentColors.line, height: 16, width: 1 },
  taxItem: { alignItems: "center", flexDirection: "row" },
  taxLabel: { color: DocumentColors.accent, fontSize: 11, fontWeight: "700" },
  taxValue: { color: DocumentColors.ink, fontSize: 11, fontWeight: "700" },
  taxValueInput: { color: DocumentColors.ink, fontSize: 11, fontWeight: "700", minWidth: 80, padding: 0 },
  footer: {
    alignItems: "center",
    borderTopColor: DocumentColors.accent,
    borderTopWidth: 1,
    gap: 6,
    marginTop: "auto",
    paddingTop: 12,
  },
  footerContacts: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  footerItem: { alignItems: "center", flexDirection: "row", gap: 4 },
  footerText: { color: DocumentColors.muted, fontSize: 11 },
  footerThanks: { color: DocumentColors.accent, fontSize: 12, fontWeight: "800" },
  sectionTitleRow: { alignItems: "center", flexDirection: "row", gap: 6, marginBottom: 6 },
  sectionTitle: { color: DocumentColors.accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  metaFieldRow: { alignItems: "flex-start", flexDirection: "row", gap: 4, marginBottom: 6 },
  metaFieldLabel: { color: DocumentColors.ink, fontSize: 12, fontWeight: "700", width: 110 },
  metaFieldColon: { color: DocumentColors.ink, fontSize: 12, fontWeight: "700" },
  metaFieldValue: { color: DocumentColors.inkSecondary, flex: 1, fontSize: 12, fontWeight: "600", padding: 0 },
  tableHeaderRow: {
    backgroundColor: DocumentColors.tableHeaderBg,
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  tableHeaderCell: { color: DocumentColors.tableHeaderText, fontSize: 10, fontWeight: "800" },
  grandTotalRow: {
    alignItems: "center",
    backgroundColor: DocumentColors.grandTotalBg,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  grandTotalLabel: { color: DocumentColors.grandTotalText, fontSize: 12, fontWeight: "900" },
  grandTotalValue: { color: DocumentColors.grandTotalText, fontSize: 13, fontWeight: "900" },
  watermark: { bottom: 40, opacity: 0.06, position: "absolute", right: 40 },
});

export { DocumentColors, DOCUMENT_PAPER_WIDTH, DOCUMENT_PAPER_MIN_HEIGHT };
