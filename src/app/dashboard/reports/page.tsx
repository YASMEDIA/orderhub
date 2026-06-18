import { redirect } from "next/navigation";
import { ShoppingCart, Truck, XCircle, Wallet } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { getReport, type ReportPeriod } from "@/lib/reports";
import { formatMoney, formatDate } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { ReportControls } from "@/components/reports/report-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const period = (sp.period ?? "monthly") as ReportPeriod;
  const report = await getReport(user, period, sp.from, sp.to);

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
                  <TableRow key={r.project}>
                    <TableCell className="font-medium">{r.project}</TableCell>
                    <TableCell>{r.orders}</TableCell>
                    <TableCell>{formatMoney(r.revenue)}</TableCell>
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
