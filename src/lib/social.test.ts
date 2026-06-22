import { describe, it, expect } from "vitest";
import { instagramUrl, tiktokUrl, whatsappUrl, telHref } from "./social";

describe("instagramUrl", () => {
  it("returns null for empty / whitespace", () => {
    expect(instagramUrl("")).toBeNull();
    expect(instagramUrl("   ")).toBeNull();
    expect(instagramUrl(null)).toBeNull();
    expect(instagramUrl(undefined)).toBeNull();
  });
  it("builds from a bare username", () => {
    expect(instagramUrl("mahalatly")).toBe("https://instagram.com/mahalatly");
  });
  it("strips a leading @", () => {
    expect(instagramUrl("@mahalatly")).toBe("https://instagram.com/mahalatly");
  });
  it("normalises a full URL (with www, scheme, query)", () => {
    expect(instagramUrl("https://www.instagram.com/mahalatly/?hl=en")).toBe(
      "https://instagram.com/mahalatly",
    );
  });
});

describe("tiktokUrl", () => {
  it("returns null for empty", () => {
    expect(tiktokUrl("")).toBeNull();
    expect(tiktokUrl(null)).toBeNull();
  });
  it("builds @handle from a username", () => {
    expect(tiktokUrl("mahalatly")).toBe("https://www.tiktok.com/@mahalatly");
    expect(tiktokUrl("@mahalatly")).toBe("https://www.tiktok.com/@mahalatly");
  });
  it("normalises a full URL", () => {
    expect(tiktokUrl("https://www.tiktok.com/@mahalatly")).toBe(
      "https://www.tiktok.com/@mahalatly",
    );
  });
});

describe("whatsappUrl", () => {
  it("returns null for empty / non-numeric", () => {
    expect(whatsappUrl("")).toBeNull();
    expect(whatsappUrl("abc")).toBeNull();
    expect(whatsappUrl(null)).toBeNull();
  });
  it("keeps digits only from a formatted number", () => {
    expect(whatsappUrl("+965 5000 1111")).toBe("https://wa.me/96550001111");
    expect(whatsappUrl("965-5000-1111")).toBe("https://wa.me/96550001111");
  });
  it("unwraps an existing wa.me link", () => {
    expect(whatsappUrl("https://wa.me/96550001111")).toBe("https://wa.me/96550001111");
  });
});

describe("telHref", () => {
  it("returns null for empty / non-numeric", () => {
    expect(telHref("")).toBeNull();
    expect(telHref("+")).toBeNull();
    expect(telHref(null)).toBeNull();
  });
  it("keeps a leading + and digits", () => {
    expect(telHref("+965 5000 1111")).toBe("tel:+96550001111");
    expect(telHref("5000 1111")).toBe("tel:50001111");
  });
  it("drops stray symbols and inner plus signs", () => {
    expect(telHref("(965) 5000-1111")).toBe("tel:96550001111");
    expect(telHref("+965+5000")).toBe("tel:+9655000");
  });
});
