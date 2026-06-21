"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Loader2, ShoppingBag, ShoppingCart, MapPin, ChevronLeft, Trash2, CheckCircle2 } from "lucide-react";
import { placePublicOrder } from "@/app/actions/public-orders";
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

type Product = {
  id: string;
  name: string;
  description?: string | null;
  images?: string[];
  basePrice: number;
  tiers: { minQuantity: number; unitPrice: number }[];
};
type ProjectInfo = {
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone?: string | null;
};

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

export function Storefront({ project, products }: { project: ProjectInfo; products: Product[] }) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("products");
  const [qty, setQty] = useState<Record<string, number>>({});
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
  const setQuantity = (id: string, q: number) => setQty((p) => ({ ...p, [id]: Math.max(0, q) }));
  const areas = AREAS_BY_GOVERNORATE[form.governorate] ?? [];

  const cart = useMemo(
    () =>
      products
        .map((p) => ({ p, q: qty[p.id] || 0 }))
        .filter((x) => x.q > 0)
        .map((x) => {
          const unit = priceForQuantity(x.p.basePrice, x.p.tiers, x.q);
          return { ...x, unit, line: Number((unit * x.q).toFixed(3)) };
        }),
    [products, qty],
  );
  const subtotal = useMemo(() => Number(cart.reduce((s, x) => s + x.line, 0).toFixed(3)), [cart]);
  const count = cart.reduce((s, x) => s + x.q, 0);
  const deliveryFee = useMemo(
    () => (cart.length ? deliveryFeeFor(form.governorate, form.area, subtotal) : 0),
    [cart.length, form.governorate, form.area, subtotal],
  );
  const grandTotal = useMemo(() => Number((subtotal + deliveryFee).toFixed(3)), [subtotal, deliveryFee]);

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
      items: cart.map((x) => ({ productId: x.p.id, quantity: x.q })),
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
          {project.phone ? <p className="text-sm text-muted-foreground">{project.phone}</p> : null}
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
            products.map((p) => {
              const q = qty[p.id] || 0;
              return (
                <div key={p.id} className="overflow-hidden rounded-lg border">
                  {p.images && p.images.length > 0 ? (
                    <div className="flex snap-x gap-2 overflow-x-auto p-2">
                      {p.images.map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={img} alt={p.name} className="h-32 w-32 shrink-0 snap-start rounded-md border object-cover" />
                      ))}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{p.name}</p>
                      {p.description ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                      ) : null}
                      <p className="mt-0.5 text-sm font-semibold">
                        {formatAmount(p.basePrice)} {CURRENCY}
                      </p>
                    </div>
                    {q > 0 ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(p.id, q - 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center font-semibold">{q}</span>
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(p.id, q + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="secondary" className="shrink-0" onClick={() => setQuantity(p.id, 1)}>
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}

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
              {cart.map(({ p, q, unit, line }) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="h-12 w-12 shrink-0 rounded border object-cover" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{formatAmount(unit)} {CURRENCY} each</p>
                      <p className="mt-0.5 text-sm font-semibold">{formatAmount(line)} {CURRENCY}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {q === 1 ? (
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(p.id, 0)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(p.id, q - 1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                    <span className="w-6 text-center font-semibold">{q}</span>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(p.id, q + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
            {cart.map(({ p, q, line }) => (
              <div key={p.id} className="flex justify-between">
                <span className="text-muted-foreground">{q} × {p.name}</span>
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
