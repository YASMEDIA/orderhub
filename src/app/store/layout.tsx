// The public storefront always renders in light mode, regardless of the
// visitor's system / dark-mode preference. `force-light` (globals.css) re-
// declares the theme variables for this subtree — pure CSS, so there's no
// theme flash on load. Mirrors the public invoice page.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <div className="force-light min-h-screen bg-background text-foreground">{children}</div>;
}
