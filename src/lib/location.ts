import { labelFor, GOVERNORATES } from "./constants";

export type OrderLocationFields = {
  locationUrl?: string | null;
  governorate: string;
  area: string;
  block: string;
  street: string;
  buildingNumber: string;
};

// "lat,lng" with decimals — Kuwait is roughly lat 28–30, lng 46–49.
const COORD_RE = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

function gmapsQuery(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// True when we have an exact point (a pasted map URL or coordinates) rather
// than just the typed address (which can only be searched approximately).
export function isExactLocation(order: OrderLocationFields): boolean {
  const raw = (order.locationUrl ?? "").trim();
  return raw.length > 0 && (/^https?:\/\//i.test(raw) || COORD_RE.test(raw));
}

// Best "open in maps" URL for an order. Opens directly in the maps app on
// mobile. Prefers the customer's shared pin; falls back to an address search.
export function buildMapsLink(order: OrderLocationFields): string {
  const raw = (order.locationUrl ?? "").trim();

  if (raw) {
    // A full map URL the customer shared (Google pin, maps.app.goo.gl, etc.).
    if (/^https?:\/\//i.test(raw)) return raw;
    // Exact coordinates → drop a pin there.
    const coords = raw.match(COORD_RE);
    if (coords) return `https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[2]}`;
    // Anything else (e.g. a PACI number) → search it within Kuwait.
    return gmapsQuery(`${raw} Kuwait`);
  }

  // Fallback: search the typed address.
  const parts = [
    labelFor(GOVERNORATES, order.governorate),
    order.area,
    order.block ? `Block ${order.block}` : "",
    order.street ? `Street ${order.street}` : "",
    order.buildingNumber ? `Building ${order.buildingNumber}` : "",
    "Kuwait",
  ].filter(Boolean);
  return gmapsQuery(parts.join(", "));
}
