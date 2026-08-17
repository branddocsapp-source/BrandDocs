import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { CustomerSuggestField } from "@/components/customer-suggest-field";
import {
  DocumentBrandHeader,
  DocumentColors,
  DocumentFooter,
  DocumentMetaField,
  DocumentPaperShell,
  DocumentTaxBar,
} from "@/components/document-template";
import { SavedCustomerProfile } from "@/services/customer-directory";
import { getPaymentMethodLabel, ReceiptRecord } from "@/services/receipts";

type ReceiptPaperProps = {
  receipt: ReceiptRecord;
  editable?: boolean;
  onFieldChange?: (field: keyof ReceiptRecord, value: any) => void;
  onReceivedFromChange?: (field: keyof ReceiptRecord["receivedFrom"], value: string) => void;
  onSelectSavedCustomer?: (customer: SavedCustomerProfile) => void;
  isDesktop?: boolean;
};

export function ReceiptPaper({ receipt, editable = false, onFieldChange, onReceivedFromChange, onSelectSavedCustomer, isDesktop }: ReceiptPaperProps) {
  const styles = useReceiptStyles();
  const isPaidReceipt = (receipt.receiptTitle || "").toUpperCase().includes("PAID");
  const currencySymbol = receipt.company.currency === "INR" || !receipt.company.currency ? "₹" : receipt.company.currency;

  const setField = (field: keyof ReceiptRecord, value: any) => onFieldChange?.(field, value);
  const setFrom = (field: keyof ReceiptRecord["receivedFrom"], value: string) => onReceivedFromChange?.(field, value);

  return (
    <DocumentPaperShell isDesktop={isDesktop}>
      <DocumentBrandHeader
        company={{
          name: receipt.company.name,
          tagline: "Documents that build your business",
          address: receipt.company.address,
          phone: receipt.company.phone,
          email: receipt.company.email,
          website: receipt.company.website,
          logoUrl: receipt.company.logoUrl,
        }}
        documentSubtitle={isPaidReceipt ? "MONEY PAID" : "MONEY RECEIVED"}
        documentTitle="RECEIPT"
        badgeText={currencySymbol}
        editable={editable}
        onCompanyChange={editable ? (field, value) => {
          if (field === "name" || field === "address" || field === "phone" || field === "email" || field === "website") {
            // company fields handled via receipt.company - caller should wire if needed
          }
        } : undefined}
        metaRows={[
          { label: "Receipt No.", value: receipt.receiptNumber },
          { label: "Receipt Date", value: receipt.receiptDate, onChange: editable ? (v) => setField("receiptDate", v) : undefined },
        ]}
      />

      <DocumentTaxBar gstin={receipt.company.taxRegistrationNumber} />

      <View style={styles.bodyRow}>
        <View style={styles.metaColumn}>
          <DocumentMetaField icon="document-text-outline" label="Receipt No." value={receipt.receiptNumber} />
          <DocumentMetaField
            icon="calendar-outline"
            label="Receipt Date"
            value={receipt.receiptDate}
            editable={editable}
            onChangeText={editable ? (v) => setField("receiptDate", v) : undefined}
          />
          <View style={styles.metaFieldRow}>
            <Ionicons name="person-outline" size={13} color={DocumentColors.accent} style={{ width: 18 }} />
            <Text style={styles.metaFieldLabel}>{isPaidReceipt ? "Paid To" : "Received From"}</Text>
            <Text style={styles.metaFieldColon}>:</Text>
            {editable ? (
              <CustomerSuggestField
                value={receipt.receivedFrom.name}
                onChangeText={(value) => setFrom("name", value)}
                onSelectCustomer={(customer) => onSelectSavedCustomer?.(customer)}
                containerStyle={{ flex: 1 }}
                inputStyle={styles.metaFieldValue}
              />
            ) : (
              <Text style={styles.metaFieldValue}>{receipt.receivedFrom.name}</Text>
            )}
          </View>
          <DocumentMetaField
            icon="call-outline"
            label="Mobile No."
            value={receipt.receivedFrom.phone}
            editable={editable}
            onChangeText={editable ? (v) => setFrom("phone", v) : undefined}
          />
          <DocumentMetaField
            icon="location-outline"
            label="Address"
            value={receipt.receivedFrom.address}
            editable={editable}
            onChangeText={editable ? (v) => setFrom("address", v) : undefined}
            multiline
          />
          <DocumentMetaField
            icon="card-outline"
            label="Payment Mode"
            value={getPaymentMethodLabel(receipt.paymentMethod)}
          />
          <DocumentMetaField
            icon="bag-outline"
            label={isPaidReceipt ? "Paid For" : "On Account Of"}
            value={receipt.notes}
            editable={editable}
            onChangeText={editable ? (v) => setField("notes", v) : undefined}
            multiline
          />
          <DocumentMetaField
            icon="create-outline"
            label="Reference / Note"
            value={receipt.paymentReference}
            editable={editable}
            onChangeText={editable ? (v) => setField("paymentReference", v) : undefined}
          />
        </View>

        <View style={styles.amountColumn}>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>{isPaidReceipt ? "PAID THE SUM OF" : "RECEIVED THE SUM OF"}</Text>
            {editable ? (
              <TextInput
                style={styles.amountValue}
                value={receipt.amount ? String(receipt.amount) : ""}
                onChangeText={(v) => {
                  const parsed = parseFloat(v);
                  setField("amount", isNaN(parsed) ? 0 : parsed);
                }}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.amountValue}>{currencySymbol} {receipt.amount.toFixed(2)}</Text>
            )}
            {editable ? (
              <TextInput
                style={styles.amountWords}
                value={receipt.amountInWords}
                onChangeText={(v) => setField("amountInWords", v)}
                placeholder="Amount in words"
                multiline
              />
            ) : (
              <Text style={styles.amountWords}>({receipt.amountInWords || "Rupees Only"})</Text>
            )}
          </View>

          <View style={styles.paymentTable}>
            <View style={styles.paymentTableHeader}>
              <Text style={styles.paymentTableHeaderText}>PAYMENT DETAILS</Text>
            </View>
            <View style={styles.paymentTableBody}>
              <SummaryLine label="Amount" value={`${currencySymbol} ${receipt.amount.toFixed(2)}`} />
              <SummaryLine label="Less: TDS (If any)" value={`${currencySymbol} 0.00`} />
              <View style={styles.paymentDivider} />
              <SummaryLine label={`TOTAL AMOUNT ${isPaidReceipt ? "PAID" : "RECEIVED"}`} value={`${currencySymbol} ${receipt.amount.toFixed(2)}`} accent />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.confirmBox}>
        <Text style={styles.confirmTitle}>📜 {isPaidReceipt ? "RECEIVED WITH THANKS" : "PAYMENT ACKNOWLEDGEMENT"}</Text>
        <Text style={styles.confirmText}>
          {isPaidReceipt
            ? `I confirm receipt of ${currencySymbol} ${receipt.amount.toFixed(2)} (${receipt.amountInWords || "Rupees Only"}) from ${receipt.company.name} towards ${receipt.notes || "payment"}.`
            : `We acknowledge receipt of ${currencySymbol} ${receipt.amount.toFixed(2)} (${receipt.amountInWords || "Rupees Only"}) from ${receipt.receivedFrom.name || "the payer"}.`}
        </Text>
      </View>

      <View style={styles.signatureRow}>
        <View style={styles.signBlock}>
          <Text style={styles.signFor}>For {receipt.company.name}</Text>
          {receipt.company.signatureUrl ? (
            <Image source={{ uri: receipt.company.signatureUrl }} style={styles.signatureImage} contentFit="contain" />
          ) : (
            <View style={styles.signLine} />
          )}
          <Text style={styles.signLabel}>Authorized Signatory</Text>
        </View>
        <View style={styles.signBlockRight}>
          <View style={styles.signLineDashed} />
          <Text style={styles.signLabel}>{isPaidReceipt ? "Receiver Signature" : "Payer Signature"}</Text>
          <Text style={styles.signMeta}>Name : {receipt.receivedFrom.name || "—"}</Text>
          <Text style={styles.signMeta}>Date : {receipt.receiptDate}</Text>
        </View>
      </View>

      <View style={styles.notesBox}>
        <Text style={styles.notesTitle}>NOTES:</Text>
        <Text style={styles.notesItem}>• This is a {isPaidReceipt ? "payment made" : "payment received"} receipt.</Text>
        <Text style={styles.notesItem}>• Keep this receipt safely for your records.</Text>
      </View>

      <DocumentFooter phone={receipt.company.phone} email={receipt.company.email} website={receipt.company.website} />
    </DocumentPaperShell>
  );
}

function SummaryLine({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const styles = useReceiptStyles();
  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, accent && { color: DocumentColors.accent, fontWeight: "800" }]}>{label}</Text>
      <Text style={[styles.summaryValue, accent && { color: DocumentColors.accent, fontWeight: "900" }]}>{value}</Text>
    </View>
  );
}

function createReceiptStyles() {
  return StyleSheet.create({
  bodyRow: { flexDirection: "row", gap: 20, marginTop: 16 },
  metaColumn: { flex: 1 },
  metaFieldRow: { alignItems: "center", flexDirection: "row", gap: 6, marginBottom: 8, minHeight: 24 },
  metaFieldLabel: { color: DocumentColors.muted, fontSize: 12, fontWeight: "700", minWidth: 92 },
  metaFieldColon: { color: DocumentColors.muted, fontSize: 12, fontWeight: "700" },
  metaFieldValue: { color: DocumentColors.ink, flex: 1, fontSize: 12, fontWeight: "600", minHeight: 22, padding: 0 },
  amountColumn: { gap: 12, width: 280 },
  amountBox: {
    alignItems: "center",
    backgroundColor: DocumentColors.accentSoft,
    borderColor: DocumentColors.accentBorder,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  amountLabel: { color: DocumentColors.accent, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  amountValue: { color: DocumentColors.ink, fontSize: 32, fontWeight: "900", marginVertical: 8, padding: 0, textAlign: "center" },
  amountWords: { color: DocumentColors.muted, fontSize: 12, fontWeight: "600", padding: 0, textAlign: "center" },
  paymentTable: { borderColor: DocumentColors.line, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  paymentTableHeader: { alignItems: "center", backgroundColor: DocumentColors.accentSoft, padding: 8 },
  paymentTableHeaderText: { color: DocumentColors.accent, fontSize: 11, fontWeight: "800" },
  paymentTableBody: { gap: 6, padding: 10 },
  paymentDivider: { backgroundColor: DocumentColors.line, height: 1 },
  summaryLine: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: DocumentColors.muted, fontSize: 12 },
  summaryValue: { color: DocumentColors.ink, fontSize: 12, fontWeight: "700" },
  confirmBox: {
    backgroundColor: "#FAFAFA",
    borderColor: DocumentColors.line,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 14,
  },
  confirmTitle: { color: DocumentColors.accent, fontSize: 11, fontWeight: "800", marginBottom: 4 },
  confirmText: { color: DocumentColors.inkSecondary, fontSize: 12, lineHeight: 18 },
  signatureRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 24 },
  signBlock: { width: 220 },
  signBlockRight: { alignItems: "flex-end", width: 200 },
  signFor: { color: DocumentColors.ink, fontSize: 12, fontWeight: "700" },
  signatureImage: { height: 44, marginVertical: 4, width: 120 },
  signLine: { borderBottomColor: DocumentColors.lineStrong, borderBottomWidth: 1, height: 44, marginVertical: 4, width: 120 },
  signLineDashed: { borderBottomColor: DocumentColors.lineStrong, borderBottomWidth: 1, borderStyle: "dashed", marginBottom: 6, width: 140 },
  signLabel: { color: DocumentColors.ink, fontSize: 11, fontWeight: "800" },
  signMeta: { color: DocumentColors.mutedLight, fontSize: 11 },
  notesBox: {
    backgroundColor: DocumentColors.accentSoft,
    borderColor: DocumentColors.accentMuted,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    padding: 12,
  },
  notesTitle: { color: DocumentColors.accent, fontSize: 11, fontWeight: "800", marginBottom: 4 },
  notesItem: { color: "#7C2D12", fontSize: 11 },
  });
}

function useReceiptStyles() {
  return createReceiptStyles();
}
