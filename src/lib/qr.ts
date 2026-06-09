import QRCode from "qrcode";

export function invoiceUrl(publicId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invoice/${publicId}`;
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
