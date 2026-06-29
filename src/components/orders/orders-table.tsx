"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { OrderRowActions } from "@/components/orders/order-actions";
import { OrderQuickView, type QuickOrder } from "@/components/orders/order-quick-view";
import { formatMoney } from "@/lib/format";

// Tablet/desktop orders table. Clicking the order number (or the View button)
// opens the same quick-look pop-up used on phones, instead of navigating away.
export function OrdersTable({ orders, role }: { orders: QuickOrder[]; role: Role }) {
  const [open, setOpen] = useState<QuickOrder | null>(null);

  return (
    <>
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No orders match your filters.</TableCell></TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <button type="button" onClick={() => setOpen(o)} className="text-primary hover:underline">
                        {o.orderNumber}
                      </button>
                    </TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {o.items.length} item{o.items.length === 1 ? "" : "s"} · {o.items.map((i) => i.productName).join(", ")}
                    </TableCell>
                    <TableCell>{o.projectName}</TableCell>
                    <TableCell>{formatMoney(o.grandTotal)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell>{o.createdByName}</TableCell>
                    <TableCell>{o.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setOpen(o)}>
                          <Eye className="h-4 w-4" /> View
                        </Button>
                        <OrderRowActions orderId={o.id} status={o.status} role={role} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OrderQuickView order={open} role={role} onClose={() => setOpen(null)} />
    </>
  );
}
