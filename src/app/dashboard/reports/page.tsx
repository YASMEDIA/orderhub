import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ShoppingCart, Truck, XCircle, Wallet } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { getReport, type ReportPeriod } from "@/lib/reports";
import { formatMoney, formatDate } from "@/lib/format";
import { parseAddonSnapshot } from "@/lib/addons";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ReportControls } from "@/components/reports/report-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PROJECT_ORDERS_PAGE_SIZE = 30;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const period = (sp.period ?? "monthly") as ReportPeriod;
  const projectPage = Math.max(1, Number(sp.projectPage) || 1);
  const report = await getReport(user, period, sp.from, sp.to, sp.project, projectPage, PROJECT_ORDERS_PAGE_SIZE);

  const projectHref = (projectId: string) => {
    const next = new URLSearchParams();
    if (sp.period) next.set("period", sp.period);
    if (sp.from) next.set("from", sp.from);
    if (sp.to) next.set("to", sp.to);
    next.set("project", projectId);
    return `/dashboard/reports?${next.toString()}`;
  };
  const projectPageHref = (page: number) => {
    const next = new URLSearchParams();
    if (sp.period) next.set("period", sp.period);
    if (sp.from) next.set("from", sp.from);
    if (sp.to) next.set("to", sp.to);
    if (sp.project) next.set("project", sp.project);
    next.set("projectPage", String(page));
    return `/dashboard/reports?${next.toString()}`;
  };
  const clearProjectHref = () => {
    const next = new URLSearchParams();
    if (sp.period) next.set("period", sp.period);
    if (sp.from) next.set("from", sp.from);
    if (sp.to) next.set("to", sp.to);
    const qs = next.toString();
    return qs ? `/dashboard/reports?${qs}` : "/dashboard/reports";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(report.range.start)} — {formatDate(report.range.end)}
        </p>
      </div>

      <ReportControls />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders Count" value={String(report.summary.count)} icon={ShoppingCart} />
        <StatCard label="Delivered" value={String(report.summary.delivered)} icon={Truck} />
        <StatCard label="Cancelled" value={String(report.summary.cancelled)} icon={XCircle} />
        <StatCard label="Revenue" value={formatMoney(report.summary.revenue)} icon={Wallet} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">By Project</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Project</TableHead><TableHead>Orders</TableHead><TableHead>Revenue</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {report.byProject.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No data for this period.</TableCell></TableRow>
              ) : (
                report.byProject.map((r) => (
                  <TableRow key={r.projectId}>
                    <TableCell className="font-medium">
                      <Link
                        href={projectHref(r.projectId)}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {r.project}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                    <TableCell>{r.orders}</TableCell>
                    <TableCell>{formatMoney(r.revenue)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {report.selectedProject ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">{report.selectedProject.name} Orders</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {report.selectedProjectPagination.total} order{report.selectedProjectPagination.total === 1 ? "" : "s"} · 30 per page
                </p>
              </div>
              <Link href={clearProjectHref()} className="text-sm text-primary hover:underline">
                Clear project
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Purchase Details</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.selectedProjectOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No orders for this project in this period.</TableCell></TableRow>
                ) : (
                  report.selectedProjectOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">{order.orderNumber}</Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.customerPhone || "No phone"}</div>
                      </TableCell>
                      <TableCell className="min-w-[260px]">
                        <div className="space-y-1">
                          {order.items.map((item) => {
                            const addons = parseAddonSnapshot(item.addons);
                            return (
                              <div key={item.id} className="text-sm">
                                <span className="font-medium">{item.quantity} × {item.productName}</span>
                                {item.variantName ? <span className="text-muted-foreground"> — {item.variantName}</span> : null}
                                {addons.length ? (
                                  <div className="text-xs text-muted-foreground">
                                    {addons.map((addon) => (
                                      <div key={addon.id}>
                                        + {addon.name}{addon.text ? `: ${addon.text}` : ""} ({formatMoney(addon.price)} each)
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{formatMoney(order.grandTotal)}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell>{order.createdBy?.fullName ?? "Online Store"}</TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {report.selectedProjectPagination.pages > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-2 border-t p-4">
                {Array.from({ length: report.selectedProjectPagination.pages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    asChild
                    variant={page === report.selectedProjectPagination.page ? "default" : "outline"}
                    size="sm"
                  >
                    <Link href={projectPageHref(page)}>{page}</Link>
                  </Button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
