// Flat delivery-fee rules (KD), derived from governorate + area.
//   - All Kuwait areas: 2 KD
//   - Jahra governorate (all areas): 3 KD
//   - Ahmadi governorate, far-south areas only: 3 KD
//   - Everything else: 2 KD

export const DEFAULT_DELIVERY_FEE = 2;
export const HIGHER_DELIVERY_FEE = 3;

// Area spellings match AREAS_BY_GOVERNORATE in constants.ts.
const AHMADI_HIGHER_AREAS = new Set<string>([
  "Ali Sabah Al-Salem",
  "Khairan",
  "Sabah Al-Ahmad",
  "Sabah Al-Ahmad Sea City",
  "Wafra",
  "Wafra Residential",
  "Zoor",
]);

export function deliveryFeeFor(governorate: string, area: string): number {
  if (governorate === "JAHRA") return HIGHER_DELIVERY_FEE;
  if (governorate === "AHMADI" && AHMADI_HIGHER_AREAS.has(area)) return HIGHER_DELIVERY_FEE;
  return DEFAULT_DELIVERY_FEE;
}
