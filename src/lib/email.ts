import nodemailer, { type Transporter } from "nodemailer";
import { renderOrderReceiptPdf, type OrderWithDetails } from "@/lib/order-receipt";
import { invoiceUrl } from "@/lib/qr";
import { formatMoney, formatDate } from "@/lib/format";
import { labelFor, PAYMENT_METHODS, GOVERNORATES } from "@/lib/constants";

// Default destination for invoice notifications. Override per-deploy with
// INVOICE_NOTIFY_EMAIL.
const DEFAULT_NOTIFY_EMAIL = "Malyaseri9@gmail.com";

let cachedTransporter: Transporter | null = null;

// Builds an SMTP transport from env. Returns null when SMTP isn't configured so
// callers can degrade gracefully instead of crashing order creation.
function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  if (!cachedTransporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // implicit TLS on 465, STARTTLS otherwise
      auth: { user, pass },
    });
  }
  return cachedTransporter;
}

function notifyEmail(): string {
  return process.env.INVOICE_NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_EMAIL;
}

function buildHtml(order: OrderWithDetails): string {
  const rows = order.items
    .map(
      (it) =>
        `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${escapeHtml(it.productName)}</td>` +
        `<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>` +
        `<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${formatMoney(it.unitPrice)}</td>` +
        `<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${formatMoney(it.lineTotal)}</td></tr>`,
    )
    .join("");

  const governorate = labelFor(GOVERNORATES, order.governorate);

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#111">
    <h2 style="margin:0 0 4px">${escapeHtml(order.project.name)}</h2>
    <p style="margin:0 0 16px;color:#555">New order received</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:2px 0;color:#555">Order #</td><td style="padding:2px 0;text-align:right"><strong>${escapeHtml(order.orderNumber)}</strong></td></tr>
      <tr><td style="padding:2px 0;color:#555">Customer</td><td style="padding:2px 0;text-align:right">${escapeHtml(order.customerName)}</td></tr>
      ${order.customerPhone ? `<tr><td style="padding:2px 0;color:#555">Phone</td><td style="padding:2px 0;text-align:right">${escapeHtml(order.customerPhone)}</td></tr>` : ""}
      <tr><td style="padding:2px 0;color:#555">Source</td><td style="padding:2px 0;text-align:right">${escapeHtml(order.source)}</td></tr>
      <tr><td style="padding:2px 0;color:#555">Payment</td><td style="padding:2px 0;text-align:right">${escapeHtml(labelFor(PAYMENT_METHODS, order.paymentMethod))}</td></tr>
      <tr><td style="padding:2px 0;color:#555">Order Date</td><td style="padding:2px 0;text-align:right">${formatDate(order.orderDate)}</td></tr>
      <tr><td style="padding:2px 0;color:#555">Delivery Date</td><td style="padding:2px 0;text-align:right">${formatDate(order.deliveryDate)}</td></tr>
      <tr><td style="padding:2px 0;color:#555">Area</td><td style="padding:2px 0;text-align:right">${escapeHtml(governorate)} — ${escapeHtml(order.area)}</td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px">
      <thead>
        <tr>
          <th style="padding:4px 8px;text-align:left;border-bottom:2px solid #333">Item</th>
          <th style="padding:4px 8px;text-align:center;border-bottom:2px solid #333">Qty</th>
          <th style="padding:4px 8px;text-align:right;border-bottom:2px solid #333">Price</th>
          <th style="padding:4px 8px;text-align:right;border-bottom:2px solid #333">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:2px 0">Subtotal</td><td style="padding:2px 0;text-align:right">${formatMoney(order.subtotal)}</td></tr>
      <tr><td style="padding:2px 0">Delivery Fee</td><td style="padding:2px 0;text-align:right">${order.deliveryFee > 0 ? formatMoney(order.deliveryFee) : "Free"}</td></tr>
      <tr><td style="padding:6px 0;font-size:16px"><strong>Grand Total</strong></td><td style="padding:6px 0;text-align:right;font-size:16px"><strong>${formatMoney(order.grandTotal)}</strong></td></tr>
    </table>

    <p style="margin:0 0 16px">
      <a href="${invoiceUrl(order.publicId)}" style="color:#2563eb">View invoice online</a>
    </p>
    <p style="color:#777;font-size:12px;margin:0">The full receipt is attached as a PDF.</p>
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Sends the invoice PDF for a freshly-created order to the configured notify
// address. Never throws — failures are logged so they can't break the order
// flow that triggered them.
export async function sendOrderInvoiceEmail(orderId: string): Promise<void> {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn(`[email] SMTP not configured; skipping invoice email for order ${orderId}`);
      return;
    }

    const result = await renderOrderReceiptPdf(orderId);
    if (!result) {
      console.warn(`[email] order ${orderId} not found; skipping invoice email`);
      return;
    }
    const { pdf, order } = result;

    const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER!;
    await transporter.sendMail({
      from,
      to: notifyEmail(),
      subject: `New order ${order.orderNumber} — ${order.project.name}`,
      html: buildHtml(order),
      attachments: [{ filename: `${order.orderNumber}.pdf`, content: pdf }],
    });
  } catch (err) {
    console.error(`[email] failed to send invoice email for order ${orderId}`, err);
  }
}
