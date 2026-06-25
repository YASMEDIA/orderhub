"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Minus, Plus, Loader2, ShoppingBag, ShoppingCart, MapPin, ChevronLeft, Trash2, CheckCircle2, Instagram, Phone } from "lucide-react";
import { placePublicOrder } from "@/app/actions/public-orders";
import { instagramUrl, tiktokUrl, whatsappUrl, telHref } from "@/lib/social";
import { priceForQuantity } from "@/lib/pricing";
import { deliveryFeeFor } from "@/lib/delivery";
import { formatAmount } from "@/lib/format";
import {
  CURRENCY,
  GOVERNORATES,
  AREAS_BY_GOVERNORATE,
  HOUSING_TYPES,
  PAYMENT_METHODS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/toast";
import { PoweredBy } from "@/components/brand";

type Variant = {
  id: string;
  name: string;
  colorHex: string;
  stock: number;
  images: string[];
};
type Product = {
  id: string;
  name: string;
  description?: string | null;
  images?: string[];
  basePrice: number;
  tiers: { minQuantity: number; unitPrice: number }[];
  variants: Variant[];
};
// Incoming props carry variants without images; images arrive via a flat
// variantId -> urls map and are re-attached on the client (see below).
type RawVariant = Omit<Variant, "images">;
type RawProduct = Omit<Product, "variants"> & { variants: RawVariant[] };
type ProjectInfo = {
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  whatsapp?: string | null;
};

// Brand glyphs lucide-react doesn't ship. Monochrome (currentColor) to match
// the lightweight icon row.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function StoreSocialLinks({ project }: { project: ProjectInfo }) {
  const links = [
    { href: instagramUrl(project.instagram), label: "Instagram", icon: <Instagram className="h-4 w-4" /> },
    { href: tiktokUrl(project.tiktok), label: "TikTok", icon: <TikTokIcon className="h-4 w-4" /> },
    { href: whatsappUrl(project.whatsapp), label: "WhatsApp", icon: <WhatsAppIcon className="h-4 w-4" /> },
    { href: telHref(project.phone), label: "Call", icon: <Phone className="h-4 w-4" /> },
  ].filter((l): l is { href: string; label: string; icon: ReactElement } => Boolean(l.href));

  if (links.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target={l.href.startsWith("tel:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          aria-label={l.label}
          title={l.label}
          className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
}

type Step = "products" | "cart" | "checkout";

type FormState = {
  customerName: string;
  customerPhone: string;
  governorate: string;
  area: string;
  block: string;
  street: string;
  housingType: string;
  buildingNumber: string;
  floor: string;
  apartmentNumber: string;
  locationUrl: string;
  paymentMethod: string;
};

// A cart line is keyed by product + variant so each colour is a separate item.
const lineKey = (productId: string, variantId?: string | null) =>
  variantId ? `${productId}::${variantId}` : productId;
const parseKey = (key: string): { productId: string; variantId: string | null } => {
  const [productId, variantId] = key.split("::");
  return { productId, variantId: variantId ?? null };
};
const round3 = (n: number) => Number(n.toFixed(3));
const variantStock = (v: Variant) => Math.max(0, v.stock);
const productStock = (p: Product) => p.variants.reduce((s, v) => s + variantStock(v), 0);

export function Storefront({
  project,
  products: rawProducts,
  variantImages,
}: {
  project: ProjectInfo;
  products: RawProduct[];
  variantImages: Record<string, string[]>;
}) {
  const { toast } = useToast();
  // Re-attach each variant's images from the flat map (kept flat to avoid deep
  // RSC array nesting across the server/client boundary).
  const products = useMemo<Product[]>(
    () =>
      rawProducts.map((p) => ({
        ...p,
        variants: p.variants.map((v) => ({ ...v, images: variantImages[v.id] ?? [] })),
      })),
    [rawProducts, variantImages],
  );
  const [step, setStep] = useState<Step>("products");
  const [qty, setQty] = useState<Record<string, number>>({});
  // Which variant swatch is active per product on the product card.
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of products) {
      const first = p.variants.find((v) => variantStock(v) > 0) ?? p.variants[0];
      if (first) init[p.id] = first.id;
    }
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState<{ orderNumber: string; publicId: string; paymentMethod: string } | null>(null);
  const [form, setForm] = useState<FormState>({
    customerName: "",
    customerPhone: "",
    governorate: "AL_ASIMAH",
    area: "",
    block: "",
    street: "",
    housingType: "HOUSE",
    buildingNumber: "",
    floor: "",
    apartmentNumber: "",
    locationUrl: "",
    paymentMethod: "CASH",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setQuantity = (key: string, q: number) => setQty((p) => ({ ...p, [key]: Math.max(0, q) }));
  const areas = AREAS_BY_GOVERNORATE[form.governorate] ?? [];

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Resolve selected quantities into priced cart lines. Tier pricing uses the
  // TOTAL quantity across all of a product's variants, applied to every unit.
  const cart = useMemo(() => {
    const lines = Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([key, q]) => {
        const { productId, variantId } = parseKey(key);
        const p = productById.get(productId);
        if (!p) return null;
        const variant = variantId ? p.variants.find((v) => v.id === variantId) ?? null : null;
        if (variantId && !variant) return null;
        return { key, p, variant, q };
      })
      .filter((x): x is { key: string; p: Product; variant: Variant | null; q: number } => x !== null);

    const totalByProduct = new Map<string, number>();
    for (const l of lines) totalByProduct.set(l.p.id, (totalByProduct.get(l.p.id) ?? 0) + l.q);

    return lines.map((l) => {
      const unit = priceForQuantity(l.p.basePrice, l.p.tiers, totalByProduct.get(l.p.id) ?? l.q);
      return { ...l, unit, line: round3(unit * l.q) };
    });
  }, [qty, productById]);

  const subtotal = useMemo(() => round3(cart.reduce((s, x) => s + x.line, 0)), [cart]);
  const count = cart.reduce((s, x) => s + x.q, 0);
  const deliveryFee = useMemo(
    () => (cart.length ? deliveryFeeFor(form.governorate, form.area, subtotal) : 0),
    [cart.length, form.governorate, form.area, subtotal],
  );
  const grandTotal = useMemo(() => round3(subtotal + deliveryFee), [subtotal, deliveryFee]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cart.length === 0) {
      setStep("products");
      return;
    }
    if (!form.area) {
      toast({ title: "Select your area", description: "Please choose your delivery area.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const res = await placePublicOrder(project.slug, {
      ...form,
      items: cart.map((x) => ({ productId: x.p.id, variantId: x.variant?.id, quantity: x.q })),
    });
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Could not place order", description: res.message, variant: "destructive" });
      return;
    }
    setPlaced({ orderNumber: res.orderNumber, publicId: res.publicId, paymentMethod: form.paymentMethod });
  }

  function resetOrder() {
    setPlaced(null);
    setQty({});
    setStep("products");
    setForm((p) => ({ ...p, area: "", block: "", street: "", buildingNumber: "", floor: "", apartmentNumber: "", locationUrl: "" }));
  }

  const selectCls = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

  const stepTitle: Record<Step, string> = {
    products: "Products",
    cart: "Your Cart",
    checkout: "Checkout",
  };

  // Order placed — instant confirmation (no redirect, so it never hangs).
  if (placed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-background px-6 py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <h1 className="text-2xl font-bold tracking-tight">Order received</h1>
        <div>
          <p className="text-xs text-muted-foreground">Order number</p>
          <p className="text-lg font-semibold">{placed.orderNumber}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {placed.paymentMethod === "ONLINE"
            ? "Thank you! We will contact you shortly on your phone number to send you the payment link."
            : "Thank you! We will contact you shortly on your phone number to confirm your order."}
        </p>
        <a
          href={`/invoice/${placed.publicId}`}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          View Invoice
        </a>
        <button type="button" onClick={resetOrder} className="text-sm text-primary hover:underline">
          Place another order
        </button>
        <PoweredBy className="mt-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-28">
      {/* Header */}
      {step === "products" ? (
        <header className="flex flex-col items-center gap-3 border-b px-6 py-8 text-center">
          {project.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.logoUrl} alt={project.name} className="h-20 w-20 rounded-full border object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-muted text-2xl font-bold text-muted-foreground">
              {project.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <StoreSocialLinks project={project} />
        </header>
      ) : (
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-3 py-3 backdrop-blur">
          <Button
            type="button" variant="ghost" size="icon"
            onClick={() => setStep(step === "checkout" ? "cart" : "products")}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="font-semibold leading-tight">{stepTitle[step]}</p>
            <p className="text-xs text-muted-foreground">{project.name}</p>
          </div>
        </header>
      )}

      {/* STEP 1 — PRODUCTS */}
      {step === "products" && (
        <div className="space-y-3 px-4 py-6">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products available right now.</p>
          ) : (
            products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                selectedVariantId={selected[p.id]}
                onSelectVariant={(vid) => setSelected((s) => ({ ...s, [p.id]: vid }))}
                qty={qty}
                setQuantity={setQuantity}
              />
            ))
          )}

          <div className="pt-4 text-center">
            <PoweredBy />
          </div>

          {/* Sticky: view cart */}
          <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background/95 p-4 backdrop-blur">
            <Button type="button" className="h-12 w-full text-base" disabled={count === 0} onClick={() => setStep("cart")}>
              <ShoppingCart className="h-5 w-5" />
              View Cart{count > 0 ? ` (${count}) · ${formatAmount(subtotal)} ${CURRENCY}` : ""}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2 — CART */}
      {step === "cart" && (
        <div className="space-y-3 px-4 py-6">
          {cart.length === 0 ? (
            <div className="space-y-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              <Button type="button" variant="outline" onClick={() => setStep("products")}>Browse products</Button>
            </div>
          ) : (
            <>
              {cart.map(({ key, p, variant, q, unit, line }) => {
                const img = variant?.images?.[0] ?? p.images?.[0];
                const cap = variant ? variantStock(variant) : Infinity;
                return (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={p.name} className="h-12 w-12 shrink-0 rounded border object-cover" />
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}</p>
                        {variant ? (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2.5 w-2.5 rounded-full ring-1 ring-border" style={{ backgroundColor: variant.colorHex }} />
                            {variant.name}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">{formatAmount(unit)} {CURRENCY} each</p>
                        <p className="mt-0.5 text-sm font-semibold">{formatAmount(line)} {CURRENCY}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {q === 1 ? (
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(key, 0)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(key, q - 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                      <span className="w-6 text-center font-semibold">{q}</span>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled={q >= cap} onClick={() => setQuantity(key, q + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <button type="button" onClick={() => setStep("products")} className="text-sm text-primary hover:underline">
                + Add more products
              </button>

              <div className="mt-2 space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>Subtotal</span>
                  <span>{formatAmount(subtotal)} {CURRENCY}</span>
                </div>
                <p className="text-xs text-muted-foreground">Delivery fee is added at checkout based on your area.</p>
              </div>

              <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background/95 p-4 backdrop-blur">
                <Button type="button" className="h-12 w-full text-base" onClick={() => setStep("checkout")}>
                  Checkout · {formatAmount(subtotal)} {CURRENCY}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 3 — CHECKOUT */}
      {step === "checkout" && (
        <form onSubmit={submit} className="space-y-6 px-4 py-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your details</h2>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input className="h-11" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input className="h-11" type="tel" value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="+965 ..." required />
              <p className="text-xs text-muted-foreground">We&apos;ll contact you on this number to confirm your order.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Delivery address</h2>
            <div className="space-y-2">
              <Label>Governorate</Label>
              <select className={selectCls} value={form.governorate} onChange={(e) => { set("governorate", e.target.value); set("area", ""); }}>
                {GOVERNORATES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Area</Label>
              <SearchableSelect value={form.area} options={areas} placeholder="Search area…" onChange={(v) => set("area", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Block</Label><Input className="h-11" value={form.block} onChange={(e) => set("block", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Street</Label><Input className="h-11" value={form.street} onChange={(e) => set("street", e.target.value)} required /></div>
              <div className="space-y-2">
                <Label>Housing</Label>
                <select className={selectCls} value={form.housingType} onChange={(e) => set("housingType", e.target.value)}>
                  {HOUSING_TYPES.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Building No.</Label><Input className="h-11" value={form.buildingNumber} onChange={(e) => set("buildingNumber", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Floor (opt.)</Label><Input className="h-11" value={form.floor} onChange={(e) => set("floor", e.target.value)} /></div>
              <div className="space-y-2"><Label>Apartment (opt.)</Label><Input className="h-11" value={form.apartmentNumber} onChange={(e) => set("apartmentNumber", e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Location pin (optional)</Label>
              <Input className="h-11" value={form.locationUrl} onChange={(e) => set("locationUrl", e.target.value)} placeholder="Paste your Google Maps location link" />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment</h2>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((m) => (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => set("paymentMethod", m.value)}
                  className={`rounded-lg border p-3 text-sm font-medium ${form.paymentMethod === m.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </section>

          {/* Order summary */}
          <section className="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
            {cart.map(({ key, p, variant, q, line }) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">
                  {q} × {p.name}{variant ? ` — ${variant.name}` : ""}
                </span>
                <span>{formatAmount(line)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatAmount(subtotal)} {CURRENCY}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery{form.area ? "" : " (select area)"}</span>
              <span>{deliveryFee > 0 ? `${formatAmount(deliveryFee)} ${CURRENCY}` : "Free"}</span>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <span>Total</span>
              <span>{formatAmount(grandTotal)} {CURRENCY}</span>
            </div>
          </section>

          <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background/95 p-4 backdrop-blur">
            <Button type="submit" className="h-12 w-full text-base" disabled={loading || cart.length === 0}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShoppingBag className="h-5 w-5" /> Place Order · {formatAmount(grandTotal)} {CURRENCY}</>}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// One storefront product. For products with variants, selecting a colour swaps
// the images, shows that colour's stock, and adds it to the cart as its own line.
function ProductCard({
  product: p,
  selectedVariantId,
  onSelectVariant,
  qty,
  setQuantity,
}: {
  product: Product;
  selectedVariantId?: string;
  onSelectVariant: (variantId: string) => void;
  qty: Record<string, number>;
  setQuantity: (key: string, q: number) => void;
}) {
  const hasVariants = p.variants.length > 0;
  const variant = hasVariants
    ? p.variants.find((v) => v.id === selectedVariantId) ?? p.variants[0]
    : null;

  const images = (variant?.images?.length ? variant.images : p.images) ?? [];
  const key = lineKey(p.id, variant?.id);
  const q = qty[key] || 0;
  const stock = hasVariants ? (variant ? variantStock(variant) : 0) : Infinity;
  const totalStock = hasVariants ? productStock(p) : null;
  const soldOut = hasVariants && stock <= 0;

  return (
    <div className="overflow-hidden rounded-lg border">
      {images.length > 0 ? (
        <div className="flex snap-x gap-2 overflow-x-auto p-2">
          {images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${variant?.id ?? "base"}-${i}`} src={img} alt={p.name} className="h-32 w-32 shrink-0 snap-start rounded-md border object-cover" />
          ))}
        </div>
      ) : null}

      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{p.name}</p>
            {p.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p> : null}
            <p className="mt-0.5 text-sm font-semibold">{formatAmount(p.basePrice)} {CURRENCY}</p>
          </div>
          {totalStock !== null ? (
            <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              {totalStock} available
            </span>
          ) : null}
        </div>

        {hasVariants ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {p.variants.map((v) => {
                const isSel = v.id === variant?.id;
                const vOut = variantStock(v) <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSelectVariant(v.id)}
                    title={`${v.name}${vOut ? " · sold out" : ` · ${variantStock(v)} left`}`}
                    className={`relative h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition ${isSel ? "ring-primary" : "ring-border"}`}
                    style={{ backgroundColor: v.colorHex }}
                    aria-label={v.name}
                  >
                    {vOut ? <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">✕</span> : null}
                  </button>
                );
              })}
            </div>
            {variant ? (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{variant.name}</span>
                {" · "}
                {soldOut ? <span className="text-destructive">Out of stock</span> : `${stock} in stock`}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-end">
          {q > 0 ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(key, q - 1)}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-6 text-center font-semibold">{q}</span>
              <Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled={q >= stock} onClick={() => setQuantity(key, q + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" className="shrink-0" disabled={soldOut} onClick={() => setQuantity(key, 1)}>
              <Plus className="h-4 w-4" /> {soldOut ? "Sold out" : "Add"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
