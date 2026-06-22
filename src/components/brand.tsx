/* eslint-disable @next/next/no-img-element */
// Mahalatly brand assets. The wordmark + storefront mark live in /public/brand.
// Brand colors: deep navy #0c023c and blue #41a2d5.

export const BRAND_NAME = "Mahalatly";

/**
 * Full horizontal wordmark (EN + AR + storefront mark). Theme-aware: the navy
 * artwork shows on light surfaces, the white artwork on dark ones.
 */
export function BrandLogo({ className = "h-8" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src="/brand/mahalatly-logo.svg"
        alt={BRAND_NAME}
        className="h-full w-auto dark:hidden"
      />
      <img
        src="/brand/mahalatly-logo-white.svg"
        alt={BRAND_NAME}
        className="hidden h-full w-auto dark:block"
      />
    </span>
  );
}

/**
 * "Powered by Mahalatly" credit with the storefront mark — shown on customer-
 * facing surfaces (storefront, invoice). These render on light backgrounds, so
 * the colored mark is used directly.
 */
export function PoweredBy({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://mahalatly.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground ${className}`}
    >
      <span>Powered by</span>
      <img src="/brand/mahalatly-icon.svg" alt="" aria-hidden="true" className="h-4 w-4" />
      <span className="font-semibold" style={{ color: "#0c023c" }}>
        {BRAND_NAME}
      </span>
    </a>
  );
}
