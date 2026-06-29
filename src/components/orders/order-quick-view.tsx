"use client";

import { MapPin, FileText, ExternalLink } from "lucide-react";
import type { OrderStatus, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatMoney, formatAmount } from "@/lib/format";
import { CURRENCY } from "@/lib/constants";

// Flat, serializable order shape used by the quick-look pop-up (shared by the
// phone card list and the desktop table).
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

// The order quick-look pop-up: a compact, read-only summary of one order with
// links to the full order page and invoice. Same content on phone and desktop.
export function OrderQuickView({
  order,
  role,
  onClose,
}: {
  order: QuickOrder | null;
  role: Role;
  onClose: () => void;
}) {
  const isDriver = role === "DRIVER";
  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {order ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-3 pr-6">
                <span>{order.orderNumber}</span>
                <StatusBadge status={order.status} />
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Customer" value={order.customerName} />
                {order.customerPhone ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <a href={`tel:${order.customerPhone}`} className="font-medium text-primary">{order.customerPhone}</a>
                  </div>
                ) : null}
                <Field label="Project" value={order.projectName} />
                <Field label="Total" value={`${formatMoney(order.grandTotal)}`} />
                <Field label="Payment" value={order.paymentMethod} />
                <Field label="Source" value={order.source} />
                <Field label="Delivery Date" value={order.deliveryDate} />
                <Field label="Created" value={`${order.createdAt} · ${order.createdByName}`} />
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</p>
                <div className="divide-y rounded-md border">
                  {order.items.map((it) => (
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
                <p className="font-medium">{order.governorate} — {order.area}</p>
                <p className="text-muted-foreground">{order.addressLine}</p>
                <a
                  href={order.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  <MapPin className="h-3.5 w-3.5" /> Open in Maps
                </a>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{order.deliveryFee > 0 ? formatMoney(order.deliveryFee) : "Free"}</span></div>
                <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>{formatMoney(order.grandTotal)} {CURRENCY}</span></div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <a href={`/dashboard/orders/${order.id}`}><ExternalLink className="h-4 w-4" /> Open full order</a>
                </Button>
                {!isDriver ? (
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <a href={`/invoice/${order.publicId}`} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /> Invoice</a>
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
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
