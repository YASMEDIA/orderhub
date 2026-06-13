import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireRole, AuthError } from "@/lib/rbac";
import { getReport, type ReportPeriod } from "@/lib/reports";
import { renderReportPdf } from "@/lib/report-pdf";
import { formatDate } from "@/lib/format";
import { labelFor, ORDER_STATUSES } from "@/lib/constants";

export async function GET(req: Request) {
  let user;
  try {
    user = await requireRole("SUPER_ADMIN", "ADMIN");
  } catch (err) {
    if (err instanceof AuthError) return new NextResponse("Forbidden", { status: 403 });
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "excel";
  const period = (searchParams.get("period") ?? "monthly") as ReportPeriod;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const report = await getReport(user, period, from, to);

  if (format === "excel") {
    const rows = report.orders.map((o) => ({
      "Order #": o.orderNumber,
      Customer: o.customerName,
      Project: o.project.name,
      Status: labelFor(ORDER_STATUSES, o.status),
      "Order Date": formatDate(o.orderDate),
      "Delivery Date": formatDate(o.deliveryDate),
      Subtotal: o.subtotal,
      "Delivery Fee": o.deliveryFee,
      "Grand Total": o.grandTotal,
      "Created By": o.createdBy?.fullName ?? "Online Store",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="orderhub-report.xlsx"`,
      },
    });
  }

  const pdf = await renderReportPdf(report);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orderhub-report.pdf"`,
    },
  });
}
