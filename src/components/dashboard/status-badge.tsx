import type { OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { labelFor, ORDER_STATUSES } from "@/lib/constants";

const VARIANT: Record<OrderStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  PENDING: "warning",
  PREPARING: "info",
  READY: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANT[status]}>{labelFor(ORDER_STATUSES, status)}</Badge>;
}
