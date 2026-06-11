import { describe, it, expect } from "vitest";
import { buildMapsLink, isExactLocation } from "@/lib/location";

const base = {
  governorate: "HAWALLI",
  area: "Salmiya",
  block: "10",
  street: "Amman St",
  buildingNumber: "25",
};

describe("buildMapsLink", () => {
  it("uses a pasted map URL directly (exact pin)", () => {
    const url = "https://maps.app.goo.gl/abc123";
    expect(buildMapsLink({ ...base, locationUrl: url })).toBe(url);
    expect(isExactLocation({ ...base, locationUrl: url })).toBe(true);
  });

  it("turns lat,lng coordinates into a pinned Google Maps link", () => {
    const link = buildMapsLink({ ...base, locationUrl: "29.3399, 48.0934" });
    expect(link).toBe("https://www.google.com/maps/search/?api=1&query=29.3399,48.0934");
    expect(isExactLocation({ ...base, locationUrl: "29.3399, 48.0934" })).toBe(true);
  });

  it("searches an arbitrary value (e.g. PACI number) within Kuwait", () => {
    const link = buildMapsLink({ ...base, locationUrl: "12345678" });
    expect(decodeURIComponent(link)).toContain("12345678 Kuwait");
    // a bare PACI number is not an exact pin
    expect(isExactLocation({ ...base, locationUrl: "12345678" })).toBe(false);
  });

  it("falls back to an address search when no location is provided", () => {
    const link = buildMapsLink({ ...base, locationUrl: "" });
    const decoded = decodeURIComponent(link);
    expect(link.startsWith("https://www.google.com/maps/search/?api=1&query=")).toBe(true);
    expect(decoded).toContain("Hawalli");
    expect(decoded).toContain("Salmiya");
    expect(decoded).toContain("Block 10");
    expect(decoded).toContain("Building 25");
    expect(decoded).toContain("Kuwait");
    expect(isExactLocation({ ...base, locationUrl: "" })).toBe(false);
    expect(isExactLocation(base)).toBe(false);
  });
});
