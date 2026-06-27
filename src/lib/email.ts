import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { renderOrderReceiptPdf, type OrderWithDetails } from "@/lib/order-receipt";
import { invoiceUrl } from "@/lib/qr";
import { formatMoney, formatDate } from "@/lib/format";
import { labelFor, PAYMENT_METHODS, GOVERNORATES } from "@/lib/constants";
import { parseAddonSnapshot } from "@/lib/addons";

// Default destination for invoice notifications. Override per-deploy with
// INVOICE_NOTIFY_EMAIL.
const DEFAULT_NOTIFY_EMAIL = "Malyaseri9@gmail.com";

let cachedTransporter: Transporter | null = null;
let cachedResend: Resend | null = null;

// Resend (HTTP API) is the preferred provider — faster and more reliable than
// SMTP. Returns null when RESEND_API_KEY isn't set so we fall back to SMTP.
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cachedResend) cachedResend = new Resend(key);
  return cachedResend;
}

// Sender for Resend. Must be a verified domain in your Resend account, or the
// shared "onboarding@resend.dev" (test sender — only delivers to your own
// Resend account email).
function resendFrom(): string {
  return process.env.RESEND_FROM?.trim() || "onboarding@resend.dev";
}

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

// Recipients for the new-order notification: every active user, pulled live
// from the database so adding or removing a user updates the list with no
// redeploy. De-duplicated and lowercased. Falls back to INVOICE_NOTIFY_EMAIL
// when there are no active users (or the lookup fails) so a notification is
// never silently dropped.
async function notifyRecipients(): Promise<string[]> {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { email: true },
    });
    const emails = [...new Set(users.map((u) => u.email.trim().toLowerCase()).filter(Boolean))];
    return emails.length ? emails : [notifyEmail()];
  } catch (err) {
    console.error("[email] failed to load notify recipients; using fallback", err);
    return [notifyEmail()];
  }
}

function buildHtml(order: OrderWithDetails): string {
  const rows = order.items
    .map(
      (it) => {
        const addons = parseAddonSnapshot(it.addons);
        const addonHtml = addons.length
          ? `<div style="margin-top:2px;color:#666;font-size:12px">${addons.map((a) => `+ ${escapeHtml(a.name)}${a.text ? `: ${escapeHtml(a.text)}` : ""} (${formatMoney(a.price)} each)`).join("<br>")}</div>`
          : "";
        return `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${escapeHtml(it.productName)}${addonHtml}</td>` +
        `<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>` +
        `<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${formatMoney(it.unitPrice)}</td>` +
        `<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${formatMoney(it.lineTotal)}</td></tr>`;
      },
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
    const resend = getResend();
    const transporter = resend ? null : getTransporter();
    if (!resend && !transporter) {
      console.warn(`[email] no provider configured (set RESEND_API_KEY or SMTP_*); skipping invoice email for order ${orderId}`);
      return;
    }

    const result = await renderOrderReceiptPdf(orderId);
    if (!result) {
      console.warn(`[email] order ${orderId} not found; skipping invoice email`);
      return;
    }
    const { pdf, order } = result;

    const to = await notifyRecipients();
    const subject = `New order ${order.orderNumber} — ${order.project.name}`;
    const html = buildHtml(order);
    const filename = `${order.orderNumber}.pdf`;

    if (resend) {
      const { error } = await resend.emails.send({
        from: resendFrom(),
        to,
        subject,
        html,
        attachments: [{ filename, content: pdf }],
      });
      // Resend returns an error object instead of throwing.
      if (error) {
        console.error(`[email] Resend error for order ${orderId}:`, error);
        return;
      }
    } else {
      const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER!;
      await transporter!.sendMail({
        from,
        to,
        subject,
        html,
        attachments: [{ filename, content: pdf }],
      });
    }
    console.log(`[email] new-order notification for ${order.orderNumber} sent to ${to.length} recipient(s) via ${resend ? "resend" : "smtp"}`);
  } catch (err) {
    console.error(`[email] failed to send invoice email for order ${orderId}`, err);
  }
}

// Emails a password-reset link to a single user (the person who requested it),
// from the configured sender. Returns whether it was actually sent. Never throws.
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  try {
    const resend = getResend();
    const transporter = resend ? null : getTransporter();
    if (!resend && !transporter) {
      console.warn("[email] no provider configured (set RESEND_API_KEY or SMTP_*); skipping password reset email");
      return false;
    }

    const subject = "Reset your Mahalatly password";
    const safeUrl = escapeHtml(resetUrl);
    const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#111">
      <h2 style="margin:0 0 8px">Reset your password</h2>
      <p style="color:#555;margin:0 0 16px">We received a request to reset your Mahalatly password. This link is valid for 1 hour.</p>
      <p style="margin:0 0 20px">
        <a href="${safeUrl}" style="display:inline-block;background:#0c023c;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">Reset password</a>
      </p>
      <p style="color:#777;font-size:12px;margin:0 0 4px">Or paste this link into your browser:</p>
      <p style="font-size:12px;word-break:break-all;margin:0 0 16px"><a href="${safeUrl}" style="color:#2563eb">${safeUrl}</a></p>
      <p style="color:#777;font-size:12px;margin:0">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    </div>`;

    if (resend) {
      const { error } = await resend.emails.send({ from: resendFrom(), to, subject, html });
      if (error) {
        console.error("[email] Resend password reset error:", error);
        return false;
      }
      return true;
    }
    const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER!;
    await transporter!.sendMail({ from, to, subject, html });
    return true;
  } catch (err) {
    console.error("[email] failed to send password reset email", err);
    return false;
  }
}
