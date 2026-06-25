// Client-side image downscale + recompress. Lets an admin upload a photo of any
// size; it's resized to web-friendly dimensions and re-encoded (WebP when the
// browser supports it, else JPEG) under a byte ceiling before being stored as a
// data URL. Runs entirely in the browser via <canvas> — the large original is
// never uploaded. Vectors/GIFs are passed through untouched (no rasterizing).

export type CompressOptions = {
  maxDim?: number; // longest edge in px after resize
  maxBytes?: number; // target ceiling for the encoded result
  quality?: number; // initial encoder quality (0..1)
  background?: string; // fill behind transparency when encoding as JPEG
};

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

let webpOk: boolean | null = null;
function supportsWebp(): boolean {
  if (webpOk !== null) return webpOk;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    webpOk = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpOk = false;
  }
  return webpOk;
}

// Approximate decoded byte size of a base64 data URL.
function approxBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<string> {
  const { maxDim = 1400, maxBytes = 320_000, quality = 0.82, background = "#ffffff" } = opts;

  // Vector/animated images don't survive canvas re-encoding — keep as-is.
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return readAsDataURL(file);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return readAsDataURL(file); // can't decode here — fall back to the original
  }

  const type = supportsWebp() ? "image/webp" : "image/jpeg";
  const flatten = type === "image/jpeg"; // JPEG has no alpha — fill transparency

  const render = (scale: number, q: number): string => {
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    if (flatten) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL(type, q);
  };

  let scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  let q = quality;
  let out = render(scale, q);
  if (!out) {
    bitmap.close?.();
    return readAsDataURL(file);
  }

  // Drop quality first, then dimensions, until under the byte ceiling.
  while (approxBytes(out) > maxBytes && q > 0.45) {
    q -= 0.1;
    out = render(scale, q);
  }
  while (approxBytes(out) > maxBytes && scale > 0.3) {
    scale *= 0.82;
    out = render(scale, q);
  }

  bitmap.close?.();
  return out;
}
