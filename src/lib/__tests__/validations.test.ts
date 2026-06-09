import { describe, it, expect } from "vitest";
import { orderSchema } from "@/lib/validations";

const validPayload = {
  projectId: "proj_1",
  customerName: "Layla",
  source: "INSTAGRAM",
  orderDate: "2026-06-09",
  deliveryDate: "2026-06-10",
  governorate: "HAWALLI",
  area: "Salmiya",
  block: "12",
  street: "Street 1",
  housingType: "APARTMENT",
  buildingNumber: "5",
  deliveryFee: 1.5,
  items: [{ productName: "Husseini Turbah", quantity: 4, unitPrice: 2 }],
};

describe("orderSchema", () => {
  it("accepts a valid payload", () => {
    const result = orderSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects an empty items array", () => {
    const result = orderSchema.safeParse({ ...validPayload, items: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe("Add at least one item");
    }
  });

  it("rejects an invalid source enum value", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      source: "FACEBOOK",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid governorate enum value", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      governorate: "MARS",
    });
    expect(result.success).toBe(false);
  });

  it("coerces numeric strings for quantity, unitPrice and deliveryFee", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      deliveryFee: "2.5",
      items: [
        { productName: "Husseini Turbah", quantity: "4", unitPrice: "2" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliveryFee).toBe(2.5);
      expect(result.data.items[0].quantity).toBe(4);
      expect(result.data.items[0].unitPrice).toBe(2);
    }
  });

  it("defaults deliveryFee to 0 when omitted", () => {
    const { deliveryFee: _omit, ...withoutFee } = validPayload;
    const result = orderSchema.safeParse(withoutFee);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliveryFee).toBe(0);
    }
  });
});
