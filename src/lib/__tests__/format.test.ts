import { describe, it, expect } from "vitest";
import {
  formatMoney,
  formatAmount,
  formatDate,
  formatDateTime,
} from "@/lib/format";

describe("formatMoney", () => {
  it("renders 3 decimals with a KD suffix", () => {
    expect(formatMoney(8)).toBe("8.000 KD");
    expect(formatMoney(2.5)).toBe("2.500 KD");
    expect(formatMoney(0)).toBe("0.000 KD");
  });

  it("rounds to 3 decimals", () => {
    expect(formatMoney(1.2345)).toBe("1.234 KD");
  });
});

describe("formatAmount", () => {
  it("renders 3 decimals with no currency suffix", () => {
    expect(formatAmount(8)).toBe("8.000");
    expect(formatAmount(0.5)).toBe("0.500");
  });
});

describe("formatDate / formatDateTime in Asia/Kuwait (UTC+3)", () => {
  // A fixed UTC instant just before midnight UTC. In Asia/Kuwait (+03:00)
  // this falls on the NEXT calendar day, proving the timezone shift.
  // 2026-06-08T22:30:00Z -> 2026-06-09 01:30 in Kuwait.
  const instant = new Date("2026-06-08T22:30:00.000Z");

  it("formatDate produces DD/MM/YYYY shifted into the Kuwait day", () => {
    expect(formatDate(instant)).toBe("09/06/2026");
  });

  it("formatDateTime produces DD/MM/YYYY HH:mm in Kuwait local time", () => {
    expect(formatDateTime(instant)).toBe("09/06/2026 01:30");
  });

  it("accepts an ISO string as input", () => {
    expect(formatDate("2026-06-08T22:30:00.000Z")).toBe("09/06/2026");
  });

  it("keeps the same Kuwait day for a midday UTC instant", () => {
    // 2026-06-09T09:00Z -> 2026-06-09 12:00 Kuwait (no day rollover).
    expect(formatDate("2026-06-09T09:00:00.000Z")).toBe("09/06/2026");
    expect(formatDateTime("2026-06-09T09:00:00.000Z")).toBe(
      "09/06/2026 12:00",
    );
  });
});
