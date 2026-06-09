import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatAmount, formatDate, formatDateTime } from "./format";
import { CURRENCY } from "./constants";

export type ReceiptData = {
  projectName: string;
  projectPhone?: string | null;
  orderNumber: string;
  customerName: string;
  orderDate: Date | string;
  deliveryDate: Date | string;
  items: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  deliveryFee: number;
  subtotal: number;
  grandTotal: number;
  qrDataUrl: string;
  generatedAt: Date | string;
  header?: string | null;
  footer?: string | null;
};

// 80mm thermal roll. @react-pdf uses points (1mm ≈ 2.83465pt). Height auto-grows.
const WIDTH = 226; // ~80mm
const styles = StyleSheet.create({
  page: { width: WIDTH, paddingHorizontal: 10, paddingVertical: 12, fontSize: 8, fontFamily: "Helvetica", color: "#000" },
  center: { textAlign: "center" },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center" },
  muted: { fontSize: 7, textAlign: "center" },
  hr: { borderBottomWidth: 1, borderBottomColor: "#000", borderStyle: "dashed", marginVertical: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  itemHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 2, marginBottom: 3, fontFamily: "Helvetica-Bold" },
  cName: { width: "46%" },
  cQty: { width: "14%", textAlign: "center" },
  cPrice: { width: "20%", textAlign: "right" },
  cTotal: { width: "20%", textAlign: "right" },
  itemRow: { flexDirection: "row", marginBottom: 3 },
  qrWrap: { alignItems: "center", marginTop: 8 },
  qr: { width: 110, height: 110 },
});

function ReceiptDoc(d: ReceiptData) {
  return (
    <Document>
      <Page size={{ width: WIDTH }} style={styles.page}>
        <Text style={styles.title}>{d.projectName}</Text>
        {d.projectPhone ? <Text style={styles.muted}>Tel: {d.projectPhone}</Text> : null}
        {d.header ? <Text style={styles.muted}>{d.header}</Text> : null}

        <View style={styles.hr} />

        <View style={styles.row}>
          <Text style={styles.bold}>Order #</Text>
          <Text>{d.orderNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.bold}>Customer</Text>
          <Text>{d.customerName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.bold}>Order Date</Text>
          <Text>{formatDate(d.orderDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.bold}>Delivery Date</Text>
          <Text>{formatDate(d.deliveryDate)}</Text>
        </View>

        <View style={styles.hr} />

        <View style={styles.itemHead}>
          <Text style={styles.cName}>Item</Text>
          <Text style={styles.cQty}>Qty</Text>
          <Text style={styles.cPrice}>Price</Text>
          <Text style={styles.cTotal}>Total</Text>
        </View>
        {d.items.map((it, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.cName}>{it.productName}</Text>
            <Text style={styles.cQty}>{it.quantity}</Text>
            <Text style={styles.cPrice}>{formatAmount(it.unitPrice)}</Text>
            <Text style={styles.cTotal}>{formatAmount(it.lineTotal)}</Text>
          </View>
        ))}

        <View style={styles.hr} />

        <View style={styles.row}>
          <Text>Subtotal</Text>
          <Text>{formatAmount(d.subtotal)} {CURRENCY}</Text>
        </View>
        <View style={styles.row}>
          <Text>Delivery Fee</Text>
          <Text>{d.deliveryFee > 0 ? `${formatAmount(d.deliveryFee)} ${CURRENCY}` : "Free"}</Text>
        </View>
        <View style={[styles.row, { marginTop: 3 }]}>
          <Text style={[styles.bold, { fontSize: 10 }]}>GRAND TOTAL</Text>
          <Text style={[styles.bold, { fontSize: 10 }]}>{formatAmount(d.grandTotal)} {CURRENCY}</Text>
        </View>

        <View style={styles.qrWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={styles.qr} src={d.qrDataUrl} />
          <Text style={styles.muted}>Scan to view invoice</Text>
        </View>

        <View style={styles.hr} />
        {d.footer ? <Text style={styles.muted}>{d.footer}</Text> : null}
        <Text style={styles.muted}>Generated: {formatDateTime(d.generatedAt)}</Text>
        <Text style={styles.muted}>Thank you!</Text>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return renderToBuffer(<ReceiptDoc {...data} />);
}
