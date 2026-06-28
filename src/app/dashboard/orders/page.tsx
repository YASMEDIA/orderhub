import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, projectScopeWhere } from "@/lib/rbac";
import { formatMoney, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { OrderRowActions } from "@/components/orders/order-actions";
import { OrderFilters } from "@/components/orders/order-filters";

const PAGE_SIZE = 20;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.OrderWhereInput = { ...projectScopeWhere(user) };
  if (sp.q) {
    where.OR = [
      { customerName: { contains: sp.q, mode: "insensitive" } },
      { orderNumber: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (sp.project) where.projectId = sp.project;
  if (sp.status) where.status = sp.status as Prisma.OrderWhereInput["status"];
  if (sp.creator) where.createdById = sp.creator;
  // Drivers see active orders, plus delivered ones for 12h after delivery (so a
  // just-completed drop-off doesn't vanish immediately). Cancelled stays hidden.
  if (user.role === "DRIVER") {
    delete where.status;
    const deliveredSince = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const clauses: Prisma.OrderWhereInput[] = [
      {
        OR: [
          { status: { notIn: ["DELIVERED", "CANCELLED"] as never } },
          { status: "DELIVERED", deliveredAt: { gte: deliveredSince } },
        ],
      },
    ];
    // A driver's own status filter narrows further, but can never reveal
    // cancelled or long-delivered orders.
    if (sp.status && sp.status !== "CANCELLED") {
      clauses.push({ status: sp.status as Prisma.OrderWhereInput["status"] });
    }
    where.AND = clauses;
  }
  if (sp.from || sp.to) {
    where.orderDate = {};
    if (sp.from) (where.orderDate as Prisma.DateTimeFilter).gte = new Date(sp.from);
    if (sp.to) (where.orderDate as Prisma.DateTimeFilter).lte = new Date(`${sp.to}T23:59:59`);
  }

  const [orders, total, projects, creators] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { project: true, createdBy: true, items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    user.role === "SUPER_ADMIN"
      ? prisma.project.findMany({ orderBy: { name: "asc" } })
      : prisma.project.findMany({ where: { id: { in: user.projectIds } }, orderBy: { name: "asc" } }),
    user.role === "SUPER_ADMIN" ? prisma.user.findMany({ orderBy: { fullName: "asc" } }) : [],
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {total} order{total === 1 ? "" : "s"} found.
          </p>
        </div>
        {user.role !== "DRIVER" ? (
          <Button asChild><Link href="/dashboard/orders/new"><Plus className="h-4 w-4" /> New Order</Link></Button>
        ) : null}
      </div>

      <OrderFilters
        showProject={user.role === "SUPER_ADMIN"}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        creators={creators.map((c) => ({ id: c.id, name: c.fullName }))}
      />

      <Card>
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
                      <Link href={`/dashboard/orders/${o.id}`} className="hover:underline">{o.orderNumber}</Link>
                    </TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {o.items.length} item{o.items.length === 1 ? "" : "s"} · {o.items.map((i) => i.productName).join(", ")}
                    </TableCell>
                    <TableCell>{o.project.name}</TableCell>
                    <TableCell>{formatMoney(o.grandTotal)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell>{o.createdBy?.fullName ?? "Online Store"}</TableCell>
                    <TableCell>{formatDate(o.createdAt)}</TableCell>
                    <TableCell><OrderRowActions orderId={o.id} status={o.status} role={user.role} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => {
            const next = new URLSearchParams(sp as Record<string, string>);
            next.set("page", String(p));
            return (
              <Button key={p} asChild variant={p === page ? "default" : "outline"} size="sm">
                <Link href={`/dashboard/orders?${next.toString()}`}>{p}</Link>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
