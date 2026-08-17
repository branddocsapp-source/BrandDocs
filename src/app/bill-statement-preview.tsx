import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DocumentBrandHeader,
  DocumentColors,
  DocumentFooter,
  DocumentGrandTotalRow,
  DocumentPaperShell,
  DocumentTableHeader,
  DocumentTaxBar,
} from "@/components/document-template";
import { ReceiptPaper } from "@/components/document-template/ReceiptPaper";
import { auth } from "@/firebase";
import { useResponsiveLayout } from "@/hooks/use-responsive-layout";
import { loadBusinessProfile } from "@/services/business-profile";
import {
  BillStatementBundle,
  BillStatementCandidates,
  BillStatementDateRange,
  downloadPdfBlob,
  BillStatementSelection,
  buildBillStatementBundle,
  loadBillStatementCandidates,
  requestBillStatementPdf,
} from "@/services/bill-statements";
import { getLineAmount, getDocumentLabel, getDocumentTitle, InvoiceRecord } from "@/services/invoices";
import { ThemePalette, useAppTheme } from "@/theme/theme-context";

function formatMoney(amount: number, currency: string) {
  return `${currency || "INR"} ${amount.toFixed(2)}`;
}

export default function BillStatementPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ startDate?: string; endDate?: string }>();
  const { theme, isDark } = useAppTheme();
  const styles = createStyles(theme, isDark);
  const { isWebsite, isDesktop, isAppPreview, width } = useResponsiveLayout();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [candidates, setCandidates] = useState<BillStatementCandidates | null>(null);
  const [selection, setSelection] = useState<BillStatementSelection>({
    taxInvoiceId: "",
    billOfSupplyId: "",
    receiptId: "",
  });
  const [dateRange, setDateRange] = useState<BillStatementDateRange>({
    startDate: (params.startDate || "").slice(0, 10),
    endDate: (params.endDate || "").slice(0, 10),
  });
  const [bundle, setBundle] = useState<BillStatementBundle | null>(null);

  const baseWidth = 794;
  const scale = width < 820 ? (width - 28) / baseWidth : 1;

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      try {
        const profile = await loadBusinessProfile(auth.currentUser);
        const loaded = await loadBillStatementCandidates(auth.currentUser, profile, dateRange, 100);
        if (!isMounted) return;
        setCandidates(loaded);
        setSelection({
          taxInvoiceId: loaded.taxInvoices[0]?.id || "",
          billOfSupplyId: loaded.billsOfSupply[0]?.id || "",
          receiptId: loaded.receipts[0]?.id || "",
        });
      } catch (error: any) {
        if (isMounted) {
          Alert.alert("Load Failed", error?.message || "Could not load bill statement records.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    hydrate();
    return () => {
      isMounted = false;
    };
  }, [dateRange]);

  function appRoute(pathname: string) {
    if (!isAppPreview) return pathname;
    return { pathname, params: { appPreview: "1" } };
  }

  async function handleGenerate() {
    try {
      setGenerating(true);
      const profile = await loadBusinessProfile(auth.currentUser);
      const compiled = await buildBillStatementBundle(auth.currentUser, profile, selection, dateRange);
      setBundle(compiled);
    } catch (error: any) {
      Alert.alert("Statement Error", error?.message || "Could not build the bill statement.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (!bundle) {
      Alert.alert("Select Records", "Please generate the statement first.");
      return;
    }

    if (Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert("Download", "PDF download is available on web in this build.");
      return;
    }

    try {
      setGenerating(true);
      const profile = await loadBusinessProfile(auth.currentUser);
      const blob = await requestBillStatementPdf(auth.currentUser, profile, {
        selection,
        dateRange,
      });
      const fileNameStart = dateRange.startDate || "all";
      const fileNameEnd = dateRange.endDate || "all";
      downloadPdfBlob(blob, `bill-statement-${fileNameStart}-to-${fileNameEnd}.pdf`);
    } catch (error: any) {
      Alert.alert("Download Failed", error?.message || "Could not download statement PDF.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, isWebsite && styles.webSafeArea]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.replace(appRoute("/profile") as never)}>
          <Ionicons name="chevron-back" size={22} color={theme.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Bill Statement Builder</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={DocumentColors.accent} />
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.selectorCard}>
            <Text style={styles.selectorTitle}>Choose records to compile</Text>
            <View style={styles.dateRangeRow}>
              <DateInput
                label="From Date"
                value={dateRange.startDate || ""}
                onChange={(value) => setDateRange((current) => ({ ...current, startDate: value }))}
              />
              <DateInput
                label="To Date"
                value={dateRange.endDate || ""}
                onChange={(value) => setDateRange((current) => ({ ...current, endDate: value }))}
              />
            </View>
            <SelectList
              title="Tax Invoice"
              items={candidates?.taxInvoices || []}
              selectedId={selection.taxInvoiceId}
              getLabel={(invoice) => `${invoice.documentNumber} • ${invoice.customer.name || "Customer"}`}
              onSelect={(id) => setSelection((current) => ({ ...current, taxInvoiceId: id }))}
            />
            <SelectList
              title="Bill of Supply"
              items={candidates?.billsOfSupply || []}
              selectedId={selection.billOfSupplyId}
              getLabel={(invoice) => `${invoice.documentNumber} • ${invoice.customer.name || "Customer"}`}
              onSelect={(id) => setSelection((current) => ({ ...current, billOfSupplyId: id }))}
            />
            <SelectList
              title="OCR Receipt"
              items={candidates?.receipts || []}
              selectedId={selection.receiptId}
              getLabel={(receipt) => `${receipt.receiptNumber} • ${receipt.receivedFrom.name || "Payer"}`}
              onSelect={(id) => setSelection((current) => ({ ...current, receiptId: id }))}
            />
            <View style={styles.actionsRow}>
              <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={handleGenerate} disabled={generating}>
                <Text style={styles.secondaryActionText}>{generating ? "Compiling..." : "Compile Statement"}</Text>
              </Pressable>
              <Pressable style={[styles.actionButton, styles.primaryButton]} onPress={handleDownload} disabled={generating}>
                <Text style={styles.primaryActionText}>{generating ? "Downloading..." : "Download PDF"}</Text>
              </Pressable>
            </View>
          </View>

          {bundle ? (
            <View style={styles.previewStack}>
              <InvoiceStatementPaper invoice={bundle.taxInvoice} titlePrefix="Section 1" isDesktop={isDesktop} scale={scale} width={width} />
              <InvoiceStatementPaper invoice={bundle.billOfSupply} titlePrefix="Section 2" isDesktop={isDesktop} scale={scale} width={width} />
              <View style={width < 820 ? { width: baseWidth * scale, height: 1123 * scale, overflow: "hidden", alignSelf: "center" } : undefined}>
                <View style={width < 820 ? { transform: [{ scale }], position: "absolute" } : undefined}>
                  <ReceiptPaper receipt={bundle.receipt} isDesktop={isDesktop} />
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SelectList<T extends { id?: string }>({
  title,
  items,
  selectedId,
  getLabel,
  onSelect,
}: {
  title: string;
  items: T[];
  selectedId: string;
  getLabel: (item: T) => string;
  onSelect: (id: string) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: theme.ink, fontSize: 13, fontWeight: "800", marginBottom: 8 }}>{title}</Text>
      {items.length ? (
        items.slice(0, 6).map((item) => {
          const id = item.id || "";
          const active = id === selectedId;
          return (
            <Pressable
              key={id}
              style={{
                borderColor: active ? DocumentColors.accent : theme.line,
                borderRadius: 10,
                borderWidth: 1,
                marginBottom: 6,
                paddingHorizontal: 10,
                paddingVertical: 9,
              }}
              onPress={() => onSelect(id)}
            >
              <Text style={{ color: active ? DocumentColors.accent : theme.ink, fontSize: 12, fontWeight: active ? "800" : "600" }}>
                {getLabel(item)}
              </Text>
            </Pressable>
          );
        })
      ) : (
        <Text style={{ color: theme.muted, fontSize: 12 }}>No records found.</Text>
      )}
    </View>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ color: theme.ink, fontSize: 12, fontWeight: "700" }}>{label}</Text>
      {Platform.OS === "web" ? (
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value || "")}
          style={{
            backgroundColor: "transparent",
            borderColor: theme.line,
            borderRadius: 10,
            borderStyle: "solid",
            borderWidth: "1px",
            color: theme.ink,
            fontSize: 12,
            height: "38px",
            outline: "none",
            padding: "0 10px",
            width: "100%",
          }}
        />
      ) : (
        <TextInput
          style={{
            borderColor: theme.line,
            borderRadius: 10,
            borderWidth: 1,
            color: theme.ink,
            fontSize: 12,
            height: 38,
            paddingHorizontal: 10,
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.muted}
          value={value}
          onChangeText={onChange}
        />
      )}
    </View>
  );
}

function InvoiceStatementPaper({
  invoice,
  titlePrefix,
  isDesktop,
  scale,
  width,
}: {
  invoice: InvoiceRecord;
  titlePrefix: string;
  isDesktop?: boolean;
  scale: number;
  width: number;
}) {
  const totals = {
    grandTotal: invoice.grandTotal || 0,
    subtotal: invoice.subtotal || 0,
    taxTotal: invoice.taxTotal || 0,
  };
  const currency = invoice.company.currency || "INR";

  return (
    <View style={width < 820 ? { width: 794 * scale, height: 1123 * scale, overflow: "hidden", alignSelf: "center" } : undefined}>
      <View style={width < 820 ? { transform: [{ scale }], position: "absolute" } : undefined}>
        <DocumentPaperShell isDesktop={isDesktop}>
          <DocumentBrandHeader
            company={{
              name: invoice.company.name,
              tagline: "Documents that build your business",
              address: invoice.company.address,
              phone: invoice.company.phone,
              email: invoice.company.email,
              website: invoice.company.website,
              logoUrl: invoice.company.logoUrl,
            }}
            documentSubtitle={titlePrefix}
            documentTitle={getDocumentTitle(invoice.documentType)}
            badgeText={getDocumentLabel(invoice.documentType)}
            metaRows={[
              { label: "Number", value: invoice.documentNumber },
              { label: "Date", value: invoice.invoiceDate },
            ]}
          />

          <DocumentTaxBar gstin={invoice.company.taxRegistrationNumber} pan={invoice.company.pan} />

          <DocumentTableHeader
            columns={[
              { label: "Item", width: 260 },
              { label: "Qty", width: 80, align: "center" },
              { label: "Rate", width: 120, align: "right" },
              { label: "Amount", flex: 1, align: "right" },
            ]}
          />

          {invoice.items.map((item, index) => (
            <View
              key={item.id}
              style={{
                alignItems: "center",
                backgroundColor: index % 2 ? DocumentColors.rowAlt : DocumentColors.paper,
                borderBottomColor: DocumentColors.line,
                borderBottomWidth: 1,
                flexDirection: "row",
                paddingHorizontal: 6,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: DocumentColors.ink, fontSize: 11, width: 260 }}>{item.description || item.item || "Line Item"}</Text>
              <Text style={{ color: DocumentColors.muted, fontSize: 11, textAlign: "center", width: 80 }}>{item.quantity || "1"}</Text>
              <Text style={{ color: DocumentColors.muted, fontSize: 11, textAlign: "right", width: 120 }}>{formatMoney(Number(item.rate || 0), currency)}</Text>
              <Text style={{ color: DocumentColors.ink, flex: 1, fontSize: 11, fontWeight: "700", textAlign: "right" }}>
                {formatMoney(getLineAmount(item), currency)}
              </Text>
            </View>
          ))}

          <View style={{ marginTop: 12 }}>
            <DocumentGrandTotalRow label="Sub Total" value={formatMoney(totals.subtotal, currency)} />
            <DocumentGrandTotalRow label="Tax Total" value={formatMoney(totals.taxTotal, currency)} />
            <DocumentGrandTotalRow label="Grand Total" value={formatMoney(totals.grandTotal, currency)} />
          </View>

          <DocumentFooter phone={invoice.company.phone} email={invoice.company.email} website={invoice.company.website} />
        </DocumentPaperShell>
      </View>
    </View>
  );
}

const createStyles = (theme: ThemePalette, isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    webSafeArea: { backgroundColor: theme.wash },
    header: {
      alignItems: "center",
      borderBottomColor: theme.line,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    backButton: {
      alignItems: "center",
      borderColor: theme.line,
      borderRadius: 10,
      borderWidth: 1,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    headerTitle: { color: theme.ink, fontSize: 16, fontWeight: "900" },
    headerSpacer: { width: 38 },
    loadingWrap: { alignItems: "center", flex: 1, gap: 10, justifyContent: "center" },
    loadingText: { color: theme.muted, fontSize: 13, fontWeight: "600" },
    content: { gap: 14, padding: 16, paddingBottom: 36 },
    selectorCard: {
      backgroundColor: isDark ? theme.card : "#FFFFFF",
      borderColor: theme.line,
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
    },
    selectorTitle: { color: theme.ink, fontSize: 15, fontWeight: "900" },
    dateRangeRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    actionsRow: { flexDirection: "row", gap: 8, marginTop: 14 },
    actionButton: {
      alignItems: "center",
      borderRadius: 12,
      flex: 1,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 14,
    },
    secondaryButton: { borderColor: theme.line, borderWidth: 1 },
    secondaryActionText: { color: theme.ink, fontSize: 12, fontWeight: "800" },
    primaryButton: { backgroundColor: DocumentColors.accent },
    primaryActionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
    previewStack: { gap: 20 },
  });
