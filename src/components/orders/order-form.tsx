"use client";

import { useMemo } from "react";
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
import { createOrder, updateOrder } from "@/app/actions/orders";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ProjectOption = { id: string; name: string };

export function OrderForm({
  projects,
  defaultValues,
  orderId,
}: {
  projects: ProjectOption[];
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
      deliveryFee: 0,
      items: [{ productName: "", quantity: 1, unitPrice: 0 }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const governorate = watch("governorate");
  const items = watch("items");
  const deliveryFee = Number(watch("deliveryFee")) || 0;

  const areas = useMemo(() => AREAS_BY_GOVERNORATE[governorate] ?? [], [governorate]);

  const subtotal = useMemo(
    () => (items ?? []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items],
  );
  const grandTotal = subtotal + deliveryFee;

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
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("projectId")}>
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
                setValue("governorate", e.target.value as OrderInput["governorate"]);
                setValue("area", ""); // reset dependent area
              }}
            >
              {GOVERNORATES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Area</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("area")}>
              <option value="">Select area…</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, i) => {
            const qty = Number(items?.[i]?.quantity) || 0;
            const price = Number(items?.[i]?.unitPrice) || 0;
            return (
              <div key={field.id} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-12 space-y-2 sm:col-span-5">
                  <Label>Product Name</Label>
                  <Input {...register(`items.${i}.productName`)} placeholder="e.g. Husseini Turbah" />
                  {err(errors.items?.[i]?.productName?.message)}
                </div>
                <div className="col-span-4 space-y-2 sm:col-span-2">
                  <Label>Qty</Label>
                  <Input type="number" min={1} {...register(`items.${i}.quantity`)} />
                </div>
                <div className="col-span-4 space-y-2 sm:col-span-2">
                  <Label>Unit Price</Label>
                  <Input type="number" step="0.001" min={0} {...register(`items.${i}.unitPrice`)} />
                </div>
                <div className="col-span-3 space-y-2 sm:col-span-2">
                  <Label>Total</Label>
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
            );
          })}
          {err(errors.items?.message)}
          <Button type="button" variant="outline" onClick={() => append({ productName: "", quantity: 1, unitPrice: 0 })}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Totals</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Delivery Fee ({CURRENCY}) — 0 means Free</Label>
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
