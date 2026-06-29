"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { OrderRowActions } from "@/components/orders/order-actions";
import { OrderQuickView, type QuickOrder } from "@/components/orders/order-quick-view";
import { formatMoney } from "@/lib/format";

export type { QuickOrder };

// Simplified, touch-friendly orders view for phones: a compact card per order
// (Order #, Customer, Project, Total, Status, Created) with a "View" pop-up for
// the rest. The full table (with the same pop-up) is shown on larger screens.
export function OrdersMobileList({ orders, role }: { orders: QuickOrder[]; role: Role }) {
  const [open, setOpen] = useState<QuickOrder | null>(null);

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
                <p className="truncate text-sm font-medium">{o.customerName}</p>
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

      <OrderQuickView order={open} role={role} onClose={() => setOpen(null)} />
    </div>
  );
}
