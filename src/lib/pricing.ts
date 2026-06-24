export type PriceTier = { minQuantity: number; unitPrice: number };

// Quantity-based pricing: returns the unit price for a given quantity.
// The applicable tier is the one with the highest minQuantity not exceeding
// the quantity; below the first tier, the product's base price applies.
//
// Example: basePrice 2, tiers [(5, 1.8), (10, 1.7)]
//   qty 1..4  -> 2.0
//   qty 5..9  -> 1.8
//   qty 10+   -> 1.7
export function priceForQuantity(basePrice: number, tiers: PriceTier[], quantity: number): number {
  const applicable = tiers
    .filter((t) => t.minQuantity <= quantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];
  return applicable ? applicable.unitPrice : basePrice;
}

// Variant tier pricing: the quantity tier is resolved from the TOTAL quantity
// across ALL selected variants of a product — never per variant — and that one
// unit price is then applied to every unit.
//
// Example: tiers 1-4 → 2.500, 5-9 → 2.250, 10+ → 2.000
//   Black qty 5 + White qty 5 = total 10 → every unit is priced at 2.000.
//
// `lines` are the selected (productId, quantity) pairs (one per variant). The
// returned map gives the unit price to apply to each line of that product.
export function unitPriceByProduct(
  products: { id: string; basePrice: number; tiers: PriceTier[] }[],
  lines: { productId: string; quantity: number }[],
): Map<string, number> {
  const totals = totalQuantityByProduct(lines);
  const out = new Map<string, number>();
  for (const p of products) {
    out.set(p.id, priceForQuantity(p.basePrice, p.tiers, totals.get(p.id) ?? 0));
  }
  return out;
}

// Sum the selected quantity per product across all of its variant lines.
export function totalQuantityByProduct(
  lines: { productId: string; quantity: number }[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const l of lines) {
    totals.set(l.productId, (totals.get(l.productId) ?? 0) + l.quantity);
  }
  return totals;
}
