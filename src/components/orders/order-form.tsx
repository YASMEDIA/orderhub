"use client";

import { useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { orderSchema, type OrderInput } from "@/lib/validations";
import {
  AREAS_BY_GOVERNORATE,
  GOVERNORATES,
  HOUSING_TYPES,
  ORDER_SOURCES,
  PAYMENT_METHODS,
} from "@/lib/constants";
import { formatAmount } from "@/lib/format";
import { CURRENCY } from "@/lib/constants";
import { priceForQuantity } from "@/lib/pricing";
import { deliveryFeeFor, DEFAULT_DELIVERY_FEE } from "@/lib/delivery";
import { createOrder, updateOrder } from "@/app/actions/orders";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";

type ProjectOption = { id: string; name: string };
type ProductOption = {
  id: string;
  name: string;
  projectId: string;
  basePrice: number;
  tiers: { minQuantity: number; unitPrice: number }[];
};

export function OrderForm({
  projects,
  products = [],
  defaultValues,
  orderId,
}: {
  projects: ProjectOption[];
  products?: ProductOption[];
  defaultValues?: Partial<OrderInput>;
  orderId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      projectId: projects[0]?.id ?? "",
      source: "INSTAGRAM",
      paymentMethod: "CASH",
      governorate: "AL_ASIMAH",
      housingType: "HOUSE",
      orderDate: new Date().toISOString().slice(0, 10),
      deliveryDate: new Date().toISOString().slice(0, 10),
      deliveryFee: DEFAULT_DELIVERY_FEE,
      items: [{ productId: "", productName: "", quantity: 1, unitPrice: 0 }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const governorate = watch("governorate");
  const area = watch("area");
  const projectId = watch("projectId");
  const items = watch("items");
  const deliveryFee = Number(watch("deliveryFee")) || 0;

  const areas = useMemo(() => AREAS_BY_GOVERNORATE[governorate] ?? [], [governorate]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const projectProducts = useMemo(
    () => products.filter((p) => p.projectId === projectId),
    [products, projectId],
  );

  // Pick a catalog product for a line: fills name + tiered unit price for the qty.
  function applyProduct(index: number, productId: string) {
    setValue(`items.${index}.productId`, productId);
    if (!productId) return; // "Custom item"
    const prod = productMap.get(productId);
    if (!prod) return;
    const qty = Number(items?.[index]?.quantity) || 1;
    setValue(`items.${index}.productName`, prod.name);
    setValue(`items.${index}.unitPrice`, priceForQuantity(prod.basePrice, prod.tiers, qty));
  }

  // When the quantity changes on a catalog line, recompute the tiered price.
  function recomputePrice(index: number, qtyValue: string) {
    const pid = items?.[index]?.productId;
    if (!pid) return;
    const prod = productMap.get(pid);
    if (prod) setValue(`items.${index}.unitPrice`, priceForQuantity(prod.basePrice, prod.tiers, Number(qtyValue) || 0));
  }

  const subtotal = useMemo(
    () => (items ?? []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items],
  );
  const grandTotal = subtotal + deliveryFee;

  // Keep the delivery fee in sync with governorate/area and the rule
  // (incl. free delivery once the subtotal reaches the threshold). Staff can
  // still type a manual fee; it persists until governorate/area/items change.
  useEffect(() => {
    setValue("deliveryFee", deliveryFeeFor(governorate, area ?? "", subtotal));
  }, [governorate, area, subtotal, setValue]);

  async function onSubmit(values: OrderInput) {
    const res = orderId ? await updateOrder(orderId, values) : await createOrder(values);
    if (!res.ok) {
      toast({ title: "Error", description: res.message, variant: "destructive" });
      return;
    }
    toast({ title: orderId ? "Order updated" : "Order created" });
    router.push(`/dashboard/orders/${res.orderId}`);
    router.refresh();
  }

  const err = (msg?: string) => (msg ? <p className="text-xs text-destructive">{msg}</p> : null);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Project</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...register("projectId")}
              onChange={(e) => {
                setValue("projectId", e.target.value);
                // Clear catalog selections that belong to the previous project.
                (items ?? []).forEach((_, i) => setValue(`items.${i}.productId`, ""));
              }}
            >
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {err(errors.projectId?.message)}
          </div>
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input {...register("customerName")} placeholder="e.g. Ahmad Ali" />
            {err(errors.customerName?.message)}
          </div>
          <div className="space-y-2">
            <Label>Customer Phone</Label>
            <Input type="tel" {...register("customerPhone")} placeholder="e.g. +965 5000 0000" />
            {err(errors.customerPhone?.message)}
          </div>
          <div className="space-y-2">
            <Label>Order Source</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("source")}>
              {ORDER_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("paymentMethod")}>
              {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input type="date" {...register("orderDate")} />
              {err(errors.orderDate?.message)}
            </div>
            <div className="space-y-2">
              <Label>Delivery Date</Label>
              <Input type="date" {...register("deliveryDate")} />
              {err(errors.deliveryDate?.message)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Customer Address</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Governorate</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...register("governorate")}
              onChange={(e) => {
                const g = e.target.value as OrderInput["governorate"];
                setValue("governorate", g);
                setValue("area", ""); // reset dependent area (delivery fee auto-recomputes)
              }}
            >
              {GOVERNORATES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Area</Label>
            <SearchableSelect
              value={area ?? ""}
              options={areas}
              placeholder="Search area…"
              onChange={(v) => setValue("area", v, { shouldValidate: true })}
            />
            {/* Registered so the value is always part of the form payload + validation. */}
            <input type="hidden" {...register("area")} />
            {err(errors.area?.message)}
          </div>
          <div className="space-y-2">
            <Label>Block</Label>
            <Input {...register("block")} />
            {err(errors.block?.message)}
          </div>
          <div className="space-y-2">
            <Label>Street</Label>
            <Input {...register("street")} />
            {err(errors.street?.message)}
          </div>
          <div className="space-y-2">
            <Label>Housing Type</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("housingType")}>
              {HOUSING_TYPES.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Building Number</Label>
            <Input {...register("buildingNumber")} />
            {err(errors.buildingNumber?.message)}
          </div>
          <div className="space-y-2">
            <Label>Floor (optional)</Label>
            <Input {...register("floor")} />
          </div>
          <div className="space-y-2">
            <Label>Apartment Number (optional)</Label>
            <Input {...register("apartmentNumber")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Customer Location (optional)</Label>
            <Input {...register("locationUrl")} placeholder="Paste Google Maps link or coordinates e.g. 29.3399, 48.0934" />
            <p className="text-xs text-muted-foreground">
              Paste the pin the customer shares for an exact &quot;Open Location&quot; button on the invoice. Leave empty to use the typed address (approximate).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, i) => {
            const qty = Number(items?.[i]?.quantity) || 0;
            const price = Number(items?.[i]?.unitPrice) || 0;
            const selectedProductId = items?.[i]?.productId ?? "";
            const qtyReg = register(`items.${i}.quantity`);
            return (
              <div key={field.id} className="space-y-2 rounded-md border p-3">
                {projectProducts.length > 0 ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Catalog Product</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedProductId}
                      onChange={(e) => applyProduct(i, e.target.value)}
                    >
                      <option value="">— Custom item —</option>
                      {projectProducts.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-12 space-y-1 sm:col-span-5">
                    <Label className="text-xs">Product Name</Label>
                    <Input {...register(`items.${i}.productName`)} placeholder="e.g. Husseini Turbah" />
                    {err(errors.items?.[i]?.productName?.message)}
                  </div>
                  <div className="col-span-4 space-y-1 sm:col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      {...qtyReg}
                      onChange={(e) => {
                        qtyReg.onChange(e);
                        recomputePrice(i, e.target.value);
                      }}
                    />
                  </div>
                  <div className="col-span-4 space-y-1 sm:col-span-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input type="number" step="0.001" min={0} {...register(`items.${i}.unitPrice`)} />
                  </div>
                  <div className="col-span-3 space-y-1 sm:col-span-2">
                    <Label className="text-xs">Total</Label>
                    <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                      {formatAmount(qty * price)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => fields.length > 1 && remove(i)} disabled={fields.length === 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {err(errors.items?.message)}
          <Button type="button" variant="outline" onClick={() => append({ productId: "", productName: "", quantity: 1, unitPrice: 0 })}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Delivery Fee ({CURRENCY}) — auto by area, free over 17, editable</Label>
              <Input type="number" step="0.001" min={0} {...register("deliveryFee")} />
            </div>
          </div>
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatAmount(subtotal)} {CURRENCY}</span></div>
            <div className="flex justify-between"><span>Delivery Fee</span><span>{deliveryFee > 0 ? `${formatAmount(deliveryFee)} ${CURRENCY}` : "Free"}</span></div>
            <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Grand Total</span><span>{formatAmount(grandTotal)} {CURRENCY}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : orderId ? "Save Changes" : "Create Order"}
        </Button>
      </div>
    </form>
  );
}
