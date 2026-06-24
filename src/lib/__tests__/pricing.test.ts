import { describe, it, expect } from "vitest";
import { priceForQuantity, totalQuantityByProduct, unitPriceByProduct } from "@/lib/pricing";

// The user's example: 2.000 KD base; 5+ -> 1.800; 10+ -> 1.700.
const tiers = [
  { minQuantity: 5, unitPrice: 1.8 },
  { minQuantity: 10, unitPrice: 1.7 },
];

describe("priceForQuantity", () => {
  it("uses base price below the first tier", () => {
    expect(priceForQuantity(2, tiers, 1)).toBe(2);
    expect(priceForQuantity(2, tiers, 4)).toBe(2);
  });

  it("applies the tier at and above its breakpoint", () => {
    expect(priceForQuantity(2, tiers, 5)).toBe(1.8);
    expect(priceForQuantity(2, tiers, 9)).toBe(1.8);
    expect(priceForQuantity(2, tiers, 10)).toBe(1.7);
    expect(priceForQuantity(2, tiers, 100)).toBe(1.7);
  });

  it("returns base price when there are no tiers", () => {
    expect(priceForQuantity(2, [], 50)).toBe(2);
  });

  it("picks the highest applicable tier regardless of tier order", () => {
    const unordered = [
      { minQuantity: 10, unitPrice: 1.7 },
      { minQuantity: 5, unitPrice: 1.8 },
    ];
    expect(priceForQuantity(2, unordered, 12)).toBe(1.7);
    expect(priceForQuantity(2, unordered, 6)).toBe(1.8);
  });
});

// Variant pricing: the tier comes from the SUM of all selected variant
// quantities, then that one unit price applies to every unit.
const coffee = { id: "p1", basePrice: 2.5, tiers: [
  { minQuantity: 5, unitPrice: 2.25 },
  { minQuantity: 10, unitPrice: 2.0 },
] };

describe("totalQuantityByProduct", () => {
  it("sums quantities across a product's variants", () => {
    const totals = totalQuantityByProduct([
      { productId: "p1", quantity: 5 }, // black
      { productId: "p1", quantity: 5 }, // white
      { productId: "p2", quantity: 3 },
    ]);
    expect(totals.get("p1")).toBe(10);
    expect(totals.get("p2")).toBe(3);
  });
});

describe("unitPriceByProduct", () => {
  it("applies the 10+ tier when 5 black + 5 white sum to 10", () => {
    const prices = unitPriceByProduct([coffee], [
      { productId: "p1", quantity: 5 },
      { productId: "p1", quantity: 5 },
    ]);
    // Total 10 -> every unit priced at the 10+ tier (2.000), NOT the 5-9 tier.
    expect(prices.get("p1")).toBe(2.0);
  });

  it("keeps the base price when the combined total is below the first tier", () => {
    const prices = unitPriceByProduct([coffee], [
      { productId: "p1", quantity: 2 },
      { productId: "p1", quantity: 2 },
    ]);
    expect(prices.get("p1")).toBe(2.5); // total 4 < 5 -> base price
  });

  it("uses the 5-9 tier at a combined total of 5", () => {
    const prices = unitPriceByProduct([coffee], [
      { productId: "p1", quantity: 3 },
      { productId: "p1", quantity: 2 },
    ]);
    expect(prices.get("p1")).toBe(2.25);
  });
});
