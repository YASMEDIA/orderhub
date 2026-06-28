"use client";

import { useState } from "react";
import { Eye, MapPin, FileText, ExternalLink } from "lucide-react";
import type { OrderStatus, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { OrderRowActions } from "@/components/orders/order-actions";
import { formatMoney, formatAmount } from "@/lib/format";
import { CURRENCY } from "@/lib/constants";

export type QuickOrder = {
  id: string;
  publicId: string;
  orderNumber: string;
  projectName: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  source: string;
  paymentMethod: string;
  createdAt: string;
  orderDate: string;
  deliveryDate: string;
  grandTotal: number;
  subtotal: number;
  deliveryFee: number;
  createdByName: string;
  governorate: string;
  area: string;
  addressLine: string;
  mapsUrl: string;
  items: {
    id: string;
    productName: string;
    variantName: string | null;
    variantColor: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
};

// Simplified, touch-friendly orders view for phones: a compact card per order
// (Order #, Project, Total, Status, Created) with a "View" pop-up for the rest.
// The full table is shown on larger screens.
export function OrdersMobileList({ orders, role }: { orders: QuickOrder[]; role: Role }) {
  const [open, setOpen] = useState<QuickOrder | null>(null);
  const isDriver = role === "DRIVER";

  return (
    <div className="space-y-3 md:hidden">
      {orders.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No orders match your filters.</Card>
      ) : (
        orders.map((o) => (
          <Card key={o.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{o.orderNumber}</p>
                <p className="truncate text-xs text-muted-foreground">{o.projectName}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <p className="text-base font-bold">{formatMoney(o.grandTotal)}</p>
                <p className="text-xs text-muted-foreground">{o.createdAt}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setOpen(o)}>
                  <Eye className="h-4 w-4" /> View
                </Button>
                <OrderRowActions orderId={o.id} status={o.status} role={role} />
              </div>
            </div>
          </Card>
        ))
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3 pr-6">
                  <span>{open.orderNumber}</span>
                  <StatusBadge status={open.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Customer" value={open.customerName} />
                  {open.customerPhone ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <a href={`tel:${open.customerPhone}`} className="font-medium text-primary">{open.customerPhone}</a>
                    </div>
                  ) : null}
                  <Field label="Project" value={open.projectName} />
                  <Field label="Total" value={`${formatMoney(open.grandTotal)}`} />
                  <Field label="Payment" value={open.paymentMethod} />
                  <Field label="Source" value={open.source} />
                  <Field label="Delivery Date" value={open.deliveryDate} />
                  <Field label="Created" value={`${open.createdAt} · ${open.createdByName}`} />
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</p>
                  <div className="divide-y rounded-md border">
                    {open.items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {it.productName}
                            {it.variantName ? (
                              <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                {it.variantColor ? (
                                  <span className="inline-block h-2 w-2 rounded-full ring-1 ring-border" style={{ backgroundColor: it.variantColor }} />
                                ) : null}
                                {it.variantName}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">{it.quantity} × {formatAmount(it.unitPrice)}</p>
                        </div>
                        <p className="font-medium">{formatAmount(it.lineTotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Delivery Address</p>
                  <p className="font-medium">{open.governorate} — {open.area}</p>
                  <p className="text-muted-foreground">{open.addressLine}</p>
                  <a
                    href={open.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Open in Maps
                  </a>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatMoney(open.subtotal)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{open.deliveryFee > 0 ? formatMoney(open.deliveryFee) : "Free"}</span></div>
                  <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>{formatMoney(open.grandTotal)} {CURRENCY}</span></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <a href={`/dashboard/orders/${open.id}`}><ExternalLink className="h-4 w-4" /> Open full order</a>
                  </Button>
                  {!isDriver ? (
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <a href={`/invoice/${open.publicId}`} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /> Invoice</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
