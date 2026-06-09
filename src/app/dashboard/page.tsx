import Link from "next/link";
import { ShoppingCart, Clock, PackageCheck, Truck, Wallet } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { getDashboardData } from "@/lib/stats";
import { formatMoney, formatDate } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { OrdersPerDayChart, OrdersByProjectChart, OrdersBySourceChart } from "@/components/dashboard/charts";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your delivery operations.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Orders" value={String(data.stats.total)} icon={ShoppingCart} />
        <StatCard label="Orders Today" value={String(data.stats.today)} icon={Clock} />
        <StatCard label="Pending Orders" value={String(data.stats.pending)} icon={PackageCheck} />
        <StatCard label="Delivered Orders" value={String(data.stats.delivered)} icon={Truck} />
        <StatCard label="Revenue" value={formatMoney(data.stats.revenue)} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <OrdersPerDayChart data={data.ordersPerDay} />
        </div>
        <OrdersByProjectChart data={data.ordersByProject} />
        <OrdersBySourceChart data={data.ordersBySource} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No orders yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.recent.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/orders/${o.id}`} className="hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell>{o.project.name}</TableCell>
                    <TableCell>{formatMoney(o.grandTotal)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell>{formatDate(o.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
