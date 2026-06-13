"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Loader2, ShoppingBag, MapPin } from "lucide-react";
import { placePublicOrder } from "@/app/actions/public-orders";
import { priceForQuantity } from "@/lib/pricing";
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
import { useToast } from "@/components/ui/toast";

type Product = {
  id: string;
  name: string;
  basePrice: number;
  tiers: { minQuantity: number; unitPrice: number }[];
};
type ProjectInfo = {
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone?: string | null;
};

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
  const router = useRouter();
  const { toast } = useToast();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
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

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cart.length === 0) {
      toast({ title: "Your cart is empty", description: "Add a product to continue.", variant: "destructive" });
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
    router.push(`/invoice/${res.publicId}`);
  }

  const selectCls = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-28">
      {/* Header */}
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

      <form onSubmit={submit} className="space-y-6 px-4 py-6">
        {/* Products */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Products</h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products available right now.</p>
          ) : (
            products.map((p) => {
              const q = qty[p.id] || 0;
              const unit = priceForQuantity(p.basePrice, p.tiers, Math.max(1, q));
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAmount(q > 0 ? unit : p.basePrice)} {CURRENCY}
                      {p.tiers.length > 0 ? (
                        <span className="ml-1 text-xs">· {p.tiers.map((t) => `${t.minQuantity}+ ${formatAmount(t.unitPrice)}`).join(" · ")}</span>
                      ) : null}
                    </p>
                  </div>
                  {q > 0 ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(p.id, q - 1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-6 text-center font-semibold">{q}</span>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(p.id, q + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="secondary" onClick={() => setQuantity(p.id, 1)}>
                      Add
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* Customer */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your details</h2>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input className="h-11" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input className="h-11" type="tel" value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="+965 ..." required />
          </div>
        </section>

        {/* Address */}
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
            <select className={selectCls} value={form.area} onChange={(e) => set("area", e.target.value)} required>
              <option value="">Select area…</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
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

        {/* Payment */}
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
          <p className="text-xs text-muted-foreground">We&apos;ll contact you on your phone number to confirm.</p>
        </section>

        {/* Cart summary + submit (sticky) */}
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background/95 p-4 backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{count} item{count === 1 ? "" : "s"}</span>
            <span className="text-lg font-bold">{formatAmount(subtotal)} {CURRENCY}</span>
          </div>
          <Button type="submit" className="h-12 w-full text-base" disabled={loading || cart.length === 0}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShoppingBag className="h-5 w-5" /> Place Order</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
