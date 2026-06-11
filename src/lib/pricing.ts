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
