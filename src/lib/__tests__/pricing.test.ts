import { describe, it, expect } from "vitest";
import { priceForQuantity } from "@/lib/pricing";

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
