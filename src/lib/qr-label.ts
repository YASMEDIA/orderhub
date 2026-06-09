import QRCode from "qrcode";
import { PNG } from "pngjs";
import { invoiceUrl } from "./qr";

// Minimal 5x7 bitmap font — covers exactly the characters that appear in an
// order number (ORD-YYYY-NNNNNN). Self-contained so text renders identically
// on any host without depending on system fonts.
const GLYPH_W = 5;
const GLYPH_H = 7;
const FONT: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

function paint(png: PNG, x: number, y: number) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  png.data[i] = 0;
  png.data[i + 1] = 0;
  png.data[i + 2] = 0;
  png.data[i + 3] = 255;
}

// Renders a QR for the order's public invoice URL with the order number
// printed centered beneath it, as a single PNG buffer (for sticker export).
export async function qrWithLabelPng(publicId: string, orderNumber: string): Promise<Buffer> {
  const qr = QRCode.create(invoiceUrl(publicId), { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  const scale = 14; // px per QR module
  const margin = 4; // quiet zone in modules
  const qrPixels = (size + margin * 2) * scale;
  const width = qrPixels;

  const text = orderNumber.toUpperCase();
  const gap = 1; // module-gap between glyphs (in text-scale units)
  const textScale = Math.max(2, Math.floor((width * 0.82) / (text.length * (GLYPH_W + gap))));
  const textWidth = text.length * (GLYPH_W + gap) * textScale - gap * textScale;
  const textHeight = GLYPH_H * textScale;
  const pad = Math.round(scale * 1.4);
  const band = textHeight + pad * 2;
  const height = qrPixels + band;

  const png = new PNG({ width, height });
  // White background.
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255;
    png.data[i + 1] = 255;
    png.data[i + 2] = 255;
    png.data[i + 3] = 255;
  }

  // QR modules.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!qr.modules.get(r, c)) continue;
      const x0 = (margin + c) * scale;
      const y0 = (margin + r) * scale;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) paint(png, x0 + dx, y0 + dy);
      }
    }
  }

  // Order number, centered in the bottom band.
  let cx = Math.floor((width - textWidth) / 2);
  const startY = qrPixels + pad;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (glyph) {
      for (let gy = 0; gy < GLYPH_H; gy++) {
        for (let gx = 0; gx < GLYPH_W; gx++) {
          if (glyph[gy][gx] !== "1") continue;
          for (let dy = 0; dy < textScale; dy++) {
            for (let dx = 0; dx < textScale; dx++) {
              paint(png, cx + gx * textScale + dx, startY + gy * textScale + dy);
            }
          }
        }
      }
    }
    cx += (GLYPH_W + gap) * textScale;
  }

  return PNG.sync.write(png);
}
