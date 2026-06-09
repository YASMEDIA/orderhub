import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatDate, formatAmount } from "./format";
import { labelFor, ORDER_STATUSES, CURRENCY } from "./constants";

type ReportData = Awaited<ReturnType<typeof import("./reports").getReport>>;

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  muted: { color: "#666", marginBottom: 12 },
  summaryRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  box: { flex: 1, border: "1 solid #ddd", borderRadius: 4, padding: 8 },
  boxLabel: { color: "#666", fontSize: 8 },
  boxValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  th: { flexDirection: "row", borderBottom: "1 solid #000", paddingBottom: 3, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", borderBottom: "0.5 solid #eee", paddingVertical: 3 },
  c1: { width: "20%" }, c2: { width: "22%" }, c3: { width: "20%" }, c4: { width: "18%" }, c5: { width: "20%", textAlign: "right" },
});

export async function renderReportPdf(report: ReportData): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>OrderHub Report</Text>
        <Text style={styles.muted}>
          {formatDate(report.range.start)} — {formatDate(report.range.end)}
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.box}><Text style={styles.boxLabel}>Orders</Text><Text style={styles.boxValue}>{report.summary.count}</Text></View>
          <View style={styles.box}><Text style={styles.boxLabel}>Delivered</Text><Text style={styles.boxValue}>{report.summary.delivered}</Text></View>
          <View style={styles.box}><Text style={styles.boxLabel}>Cancelled</Text><Text style={styles.boxValue}>{report.summary.cancelled}</Text></View>
          <View style={styles.box}><Text style={styles.boxLabel}>Revenue</Text><Text style={styles.boxValue}>{formatAmount(report.summary.revenue)} {CURRENCY}</Text></View>
        </View>
        <View style={styles.th}>
          <Text style={styles.c1}>Order #</Text>
          <Text style={styles.c2}>Customer</Text>
          <Text style={styles.c3}>Project</Text>
          <Text style={styles.c4}>Status</Text>
          <Text style={styles.c5}>Total</Text>
        </View>
        {report.orders.map((o) => (
          <View key={o.id} style={styles.tr}>
            <Text style={styles.c1}>{o.orderNumber}</Text>
            <Text style={styles.c2}>{o.customerName}</Text>
            <Text style={styles.c3}>{o.project.name}</Text>
            <Text style={styles.c4}>{labelFor(ORDER_STATUSES, o.status)}</Text>
            <Text style={styles.c5}>{formatAmount(o.grandTotal)} {CURRENCY}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
