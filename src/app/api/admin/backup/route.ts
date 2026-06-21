import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/rbac";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/constants";

// Super-Admin-only full data backup. Dumps every table to a single JSON file
// the owner can download and keep. Restore with: npm run db:restore -- <file>.
export async function GET() {
  try {
    await requireRole("SUPER_ADMIN");
  } catch (err) {
    if (err instanceof AuthError) return new NextResponse("Forbidden", { status: 403 });
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [
    users,
    projects,
    projectAssignments,
    products,
    productTiers,
    orders,
    orderItems,
    activityLogs,
    settings,
    orderCounters,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.project.findMany(),
    prisma.projectAssignment.findMany(),
    prisma.product.findMany(),
    prisma.productTier.findMany(),
    prisma.order.findMany(),
    prisma.orderItem.findMany(),
    prisma.activityLog.findMany(),
    prisma.setting.findMany(),
    prisma.orderCounter.findMany(),
  ]);

  const backup = {
    meta: {
      app: "OrderHub",
      version: 2,
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        projects: projects.length,
        projectAssignments: projectAssignments.length,
        products: products.length,
        productTiers: productTiers.length,
        orders: orders.length,
        orderItems: orderItems.length,
        activityLogs: activityLogs.length,
        settings: settings.length,
        orderCounters: orderCounters.length,
      },
    },
    // Restore order matters (respects foreign keys): users + projects ->
    // projectAssignments -> products -> productTiers -> orders -> orderItems.
    users,
    projects,
    projectAssignments,
    products,
    productTiers,
    orders,
    orderItems,
    activityLogs,
    settings,
    orderCounters,
  };

  const stamp = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd_HHmm");
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="orderhub-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
