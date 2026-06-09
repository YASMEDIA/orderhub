import { describe, it, expect } from "vitest";
import { computeOrderTotals } from "@/lib/order-totals";

describe("computeOrderTotals", () => {
  it("computes line totals per item", () => {
    const { lineItems } = computeOrderTotals(
      [
        { quantity: 2, unitPrice: 1.5 },
        { quantity: 3, unitPrice: 4 },
      ],
      0,
    );
    expect(lineItems).toEqual([
      { quantity: 2, unitPrice: 1.5, lineTotal: 3 },
      { quantity: 3, unitPrice: 4, lineTotal: 12 },
    ]);
  });

  it("sums line totals into a subtotal", () => {
    const { subtotal } = computeOrderTotals(
      [
        { quantity: 2, unitPrice: 1.5 },
        { quantity: 3, unitPrice: 4 },
      ],
      0,
    );
    expect(subtotal).toBe(15);
  });

  it("equals subtotal when delivery fee is 0", () => {
    const { subtotal, grandTotal } = computeOrderTotals(
      [{ quantity: 4, unitPrice: 2 }],
      0,
    );
    expect(subtotal).toBe(8);
    expect(grandTotal).toBe(8);
  });

  it("adds a positive delivery fee to the grand total", () => {
    const { subtotal, grandTotal } = computeOrderTotals(
      [{ quantity: 4, unitPrice: 2 }],
      1.5,
    );
    expect(subtotal).toBe(8);
    expect(grandTotal).toBe(9.5);
  });

  it("rounds away binary float error to 3 decimals (KD fils) at each step", () => {
    // Each line total is rounded BEFORE summing: 0.1*3 = 0.30000000000000004
    //   -> toFixed(3) -> 0.3; 0.2*1 -> 0.2. So subtotal = 0.3 + 0.2 = 0.5 exactly,
    //   then grandTotal = 0.5 + 0.1 = 0.6000000000000001 -> toFixed(3) -> 0.6.
    const { lineItems, subtotal, grandTotal } = computeOrderTotals(
      [
        { quantity: 3, unitPrice: 0.1 },
        { quantity: 1, unitPrice: 0.2 },
      ],
      0.1,
    );
    expect(lineItems[0].lineTotal).toBe(0.3);
    expect(lineItems[1].lineTotal).toBe(0.2);
    expect(subtotal).toBe(0.5);
    expect(grandTotal).toBe(0.6);
  });

  it("handles an empty item list", () => {
    const { lineItems, subtotal, grandTotal } = computeOrderTotals([], 5);
    expect(lineItems).toEqual([]);
    expect(subtotal).toBe(0);
    expect(grandTotal).toBe(5);
  });

  it("matches the README example: Husseini Turbah qty 4 @ 2 = 8", () => {
    const { lineItems, subtotal, grandTotal } = computeOrderTotals(
      [{ quantity: 4, unitPrice: 2 }],
      0,
    );
    expect(lineItems[0].lineTotal).toBe(8);
    expect(subtotal).toBe(8);
    expect(grandTotal).toBe(8);
  });
});
