// Helpers for firing Meta (Facebook) Pixel standard events from the storefront.
// The pixel script is injected by <MetaPixel> only when a store has a Pixel ID,
// so when no pixel is configured `window.fbq` is undefined and these are no-ops.

// Facebook expects an ISO-4217 currency code. The app displays "KD" but the
// pixel needs "KWD".
export const PIXEL_CURRENCY = "KWD";

type FbqParams = Record<string, unknown>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackPixel(event: string, params?: FbqParams): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("track", event, params);
  } catch {
    // Never let analytics break the store.
  }
}
