import { describe, it, expect } from "vitest";
import { formatOrderNumber } from "@/lib/order-number";

describe("formatOrderNumber", () => {
  it("pads a single-digit counter to 6 digits", () => {
    expect(formatOrderNumber(2026, 1)).toBe("ORD-2026-000001");
  });

  it("does not truncate a 6-digit counter", () => {
    expect(formatOrderNumber(2026, 123456)).toBe("ORD-2026-123456");
  });

  it("uses the provided year in the prefix", () => {
    expect(formatOrderNumber(2025, 42)).toBe("ORD-2025-000042");
  });

  it("leaves a counter wider than 6 digits unpadded but intact", () => {
    expect(formatOrderNumber(2026, 1234567)).toBe("ORD-2026-1234567");
  });
});
