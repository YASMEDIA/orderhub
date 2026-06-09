// Pure order-total math, shared by server actions and tests.
// Rounding mirrors the original computeTotals: Number(x.toFixed(3)) at every step,
// matching how KD (3-decimal fils) money is stored.

export type OrderTotalsInput = { quantity: number; unitPrice: number };

export type OrderLineTotal = {
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderTotals = {
  lineItems: OrderLineTotal[];
  subtotal: number;
  grandTotal: number;
};

export function computeOrderTotals(
  items: OrderTotalsInput[],
  deliveryFee: number,
): OrderTotals {
  const lineItems: OrderLineTotal[] = items.map((it) => ({
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineTotal: Number((it.quantity * it.unitPrice).toFixed(3)),
  }));
  const subtotal = Number(
    lineItems.reduce((s, it) => s + it.lineTotal, 0).toFixed(3),
  );
  const grandTotal = Number((subtotal + deliveryFee).toFixed(3));
  return { lineItems, subtotal, grandTotal };
}
