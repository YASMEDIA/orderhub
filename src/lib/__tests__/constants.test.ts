import { describe, it, expect } from "vitest";
import {
  labelFor,
  ORDER_STATUSES,
  ORDER_SOURCES,
  GOVERNORATES,
  AREAS_BY_GOVERNORATE,
} from "@/lib/constants";

describe("labelFor", () => {
  it("resolves the label for a known value", () => {
    expect(labelFor(ORDER_STATUSES, "OUT_FOR_DELIVERY")).toBe(
      "Out For Delivery",
    );
    expect(labelFor(ORDER_SOURCES, "TIKTOK")).toBe("TikTok");
  });

  it("falls back to the raw value for an unknown value", () => {
    expect(labelFor(ORDER_STATUSES, "NOPE")).toBe("NOPE");
    expect(labelFor(ORDER_SOURCES, "")).toBe("");
  });
});

describe("AREAS_BY_GOVERNORATE", () => {
  it("has a non-empty area array for every governorate value", () => {
    for (const gov of GOVERNORATES) {
      const areas = AREAS_BY_GOVERNORATE[gov.value];
      expect(Array.isArray(areas)).toBe(true);
      expect(areas.length).toBeGreaterThan(0);
    }
  });
});
