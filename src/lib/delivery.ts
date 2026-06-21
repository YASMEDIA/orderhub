// Flat delivery-fee rules (KD), derived from governorate + area.
//   - All Kuwait areas: 2 KD
//   - Jahra governorate (all areas): 3 KD
//   - Ahmadi governorate, far-south areas only: 3 KD
//   - Everything else: 2 KD

export const DEFAULT_DELIVERY_FEE = 2;
export const HIGHER_DELIVERY_FEE = 3;
// Orders at or above this items subtotal (KD) get free delivery.
export const FREE_DELIVERY_THRESHOLD = 17;

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

export function deliveryFeeFor(governorate: string, area: string, subtotal?: number): number {
  // Free delivery once the order reaches the threshold.
  if (subtotal !== undefined && subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  if (governorate === "JAHRA") return HIGHER_DELIVERY_FEE;
  if (governorate === "AHMADI" && AHMADI_HIGHER_AREAS.has(area)) return HIGHER_DELIVERY_FEE;
  return DEFAULT_DELIVERY_FEE;
}
