import QRCode from "qrcode";

// Resolve the public site origin that invoice/QR/email links point to.
// Order matters: an explicit NEXT_PUBLIC_APP_URL wins, EXCEPT when it's a
// localhost value on a deployed (Vercel) site — that stale local default is
// what made invoice QR codes open http://localhost:3000. In that case (and
// whenever NEXT_PUBLIC_APP_URL is unset on Vercel) fall back to the project's
// production domain, which Vercel always exposes. Plain localhost remains the
// last resort for local development.
function resolveBaseUrl(): string {
  const onVercel = Boolean(process.env.VERCEL);
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (explicit && !(onVercel && /\blocalhost\b|127\.0\.0\.1/.test(explicit))) {
    return explicit;
  }

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${prod.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export function invoiceUrl(publicId: string): string {
  return `${resolveBaseUrl()}/invoice/${publicId}`;
}

// PNG data URL — high error correction + margin keeps it scannable at sticker size.
export async function qrDataUrl(publicId: string, size = 220): Promise<string> {
  return QRCode.toDataURL(invoiceUrl(publicId), {
    errorCorrectionLevel: "H",
    margin: 2,
    width: size,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

// Raw PNG buffer for file downloads.
export async function qrPngBuffer(publicId: string, size = 512): Promise<Buffer> {
  return QRCode.toBuffer(invoiceUrl(publicId), {
    errorCorrectionLevel: "H",
    margin: 2,
    width: size,
    type: "png",
  });
}
