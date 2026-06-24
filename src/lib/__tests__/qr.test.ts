import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { invoiceUrl } from "@/lib/qr";

// invoiceUrl() builds the public link encoded into invoice QR codes + emails.
// The bug it must never regress: on a deployed (Vercel) site the link pointed at
// http://localhost:3000 whenever NEXT_PUBLIC_APP_URL was unset or left at its
// local default, so scanning the QR opened localhost instead of the real site.

const ENV_KEYS = ["NEXT_PUBLIC_APP_URL", "VERCEL", "VERCEL_PROJECT_PRODUCTION_URL"] as const;

describe("invoiceUrl", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    for (const k of ENV_KEYS) delete process.env[k];
  });
  afterEach(() => {
    // Cast away the ambient ProcessEnv typing (some keys, e.g. VERCEL, are typed
    // as string literals) so restoring an arbitrary string value type-checks.
    const env = process.env as Record<string, string | undefined>;
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete env[k];
      else env[k] = saved[k];
    }
  });

  it("uses NEXT_PUBLIC_APP_URL when set, trimming a trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://mahalatly.com/";
    expect(invoiceUrl("abc123")).toBe("https://mahalatly.com/invoice/abc123");
  });

  it("falls back to the Vercel production domain when NEXT_PUBLIC_APP_URL is unset (never localhost)", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "mahalatly.com";
    expect(invoiceUrl("abc123")).toBe("https://mahalatly.com/invoice/abc123");
  });

  it("ignores a stale localhost NEXT_PUBLIC_APP_URL while on Vercel (the reported bug)", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.VERCEL = "1";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "mahalatly.com";
    expect(invoiceUrl("abc123")).toBe("https://mahalatly.com/invoice/abc123");
  });

  it("falls back to localhost only for local development (no Vercel env)", () => {
    expect(invoiceUrl("abc123")).toBe("http://localhost:3000/invoice/abc123");
  });
});
