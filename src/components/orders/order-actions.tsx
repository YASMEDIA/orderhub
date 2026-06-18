"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Pencil, RefreshCw, FileDown, QrCode, Trash2 } from "lucide-react";
import type { OrderStatus, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ORDER_STATUSES } from "@/lib/constants";
import { updateOrderStatus, deleteOrder } from "@/app/actions/orders";
import { useToast } from "@/components/ui/toast";

export function OrderRowActions({
  orderId,
  status,
  role,
}: {
  orderId: string;
  status: OrderStatus;
  role: Role;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const canManage = role === "SUPER_ADMIN" || role === "ADMIN";
  const canChangeStatus = canManage || role === "DRIVER";
  const isDriver = role === "DRIVER"; // drivers: view + change status only

  function changeStatus(next: OrderStatus) {
    const fd = new FormData();
    fd.set("id", orderId);
    fd.set("status", next);
    startTransition(async () => {
      const res = await updateOrderStatus(fd);
      toast({ title: res.ok ? "Status updated" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok) { setStatusOpen(false); router.refresh(); }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const res = await deleteOrder(orderId);
      toast({ title: res.ok ? "Order deleted" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok) { setDeleteOpen(false); router.push("/dashboard/orders"); router.refresh(); }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${orderId}`)}>
            <Eye className="h-4 w-4" /> View
          </DropdownMenuItem>
          {canManage && (
            <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${orderId}/edit`)}>
              <Pencil className="h-4 w-4" /> Edit
            </DropdownMenuItem>
          )}
          {canChangeStatus && (
            <DropdownMenuItem onClick={() => setStatusOpen(true)}>
              <RefreshCw className="h-4 w-4" /> Change Status
            </DropdownMenuItem>
          )}
          {!isDriver && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={`/api/orders/${orderId}/pdf`}><FileDown className="h-4 w-4" /> Download PDF</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/orders/${orderId}/qr`}><QrCode className="h-4 w-4" /> Download QR</a>
              </DropdownMenuItem>
            </>
          )}
          {canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Status</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {ORDER_STATUSES.map((s) => (
              <Button
                key={s.value}
                variant={s.value === status ? "default" : "outline"}
                disabled={pending}
                onClick={() => changeStatus(s.value as OrderStatus)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete this order?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={pending} onClick={onDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
