import { describe, it, expect } from "vitest";
import { deliveryFeeFor } from "@/lib/delivery";

describe("deliveryFeeFor", () => {
  it("charges 2 KD for general Kuwait areas", () => {
    expect(deliveryFeeFor("AL_ASIMAH", "Sharq")).toBe(2);
    expect(deliveryFeeFor("HAWALLI", "Salmiya")).toBe(2);
    expect(deliveryFeeFor("FARWANIYA", "Khaitan")).toBe(2);
    expect(deliveryFeeFor("MUBARAK_AL_KABEER", "Adan")).toBe(2);
  });

  it("charges 3 KD for every area in Jahra", () => {
    expect(deliveryFeeFor("JAHRA", "Naeem")).toBe(3);
    expect(deliveryFeeFor("JAHRA", "Jahra")).toBe(3);
    expect(deliveryFeeFor("JAHRA", "")).toBe(3);
  });

  it("charges 3 KD only for the listed Ahmadi areas", () => {
    for (const a of ["Ali Sabah Al-Salem", "Khairan", "Sabah Al-Ahmad", "Sabah Al-Ahmad Sea City", "Wafra Residential", "Zoor"]) {
      expect(deliveryFeeFor("AHMADI", a)).toBe(3);
    }
  });

  it("charges 2 KD for other Ahmadi areas", () => {
    expect(deliveryFeeFor("AHMADI", "Fahaheel")).toBe(2);
    expect(deliveryFeeFor("AHMADI", "Mangaf")).toBe(2);
    expect(deliveryFeeFor("AHMADI", "")).toBe(2);
  });

  it("is free when the subtotal reaches 17 KD, in any governorate", () => {
    expect(deliveryFeeFor("AL_ASIMAH", "Sharq", 17)).toBe(0);
    expect(deliveryFeeFor("AL_ASIMAH", "Sharq", 25.5)).toBe(0);
    expect(deliveryFeeFor("JAHRA", "Naeem", 17)).toBe(0);
    expect(deliveryFeeFor("AHMADI", "Khairan", 100)).toBe(0);
  });

  it("still charges the flat fee below 17 KD", () => {
    expect(deliveryFeeFor("AL_ASIMAH", "Sharq", 16.999)).toBe(2);
    expect(deliveryFeeFor("JAHRA", "Naeem", 10)).toBe(3);
    expect(deliveryFeeFor("AHMADI", "Khairan", 5)).toBe(3);
  });
});
