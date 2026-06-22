// Build outbound links for a storefront's contact / social handles.
//
// Inputs are lenient on purpose — the admin may type a bare username, a full
// profile URL, or a phone number in any format. Each helper normalises the
// input and returns a ready-to-use href, or `null` when there's nothing usable
// so callers can simply hide the icon.

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

// Reduce a username/URL to the bare handle: drop the scheme, www, the known
// host prefix, a leading "@", and any trailing path/query/hash.
function toHandle(value: string, hostPrefix: RegExp): string {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(hostPrefix, "")
    .replace(/^@/, "")
    .replace(/^\/+/, "")
    .replace(/[/?#].*$/, "")
    .trim();
}

export function instagramUrl(input?: string | null): string | null {
  const value = clean(input);
  if (!value) return null;
  const handle = toHandle(value, /^instagram\.com\//i);
  return handle ? `https://instagram.com/${handle}` : null;
}

export function tiktokUrl(input?: string | null): string | null {
  const value = clean(input);
  if (!value) return null;
  const handle = toHandle(value, /^tiktok\.com\//i);
  return handle ? `https://www.tiktok.com/@${handle}` : null;
}

export function whatsappUrl(input?: string | null): string | null {
  const value = clean(input);
  if (!value) return null;
  // Strip any wa.me / api.whatsapp.com wrapper, then keep digits only.
  const digits = value
    .replace(/^https?:\/\/(wa\.me|api\.whatsapp\.com\/send\?phone=)/i, "")
    .replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function telHref(input?: string | null): string | null {
  const value = clean(input);
  if (!value) return null;
  // Keep a single leading "+" (country code) plus digits for direct dialling.
  const number = value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return /\d/.test(number) ? `tel:${number}` : null;
}
