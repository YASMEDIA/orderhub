import type { Prisma } from "@prisma/client";
import { subDays, subMonths, startOfWeek } from "date-fns";
import { prisma } from "./prisma";
import { projectScopeWhere, type SessionUser } from "./rbac";
import { startOfTodayKuwait } from "./stats";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "custom";

export function resolveRange(period: ReportPeriod, from?: string, to?: string) {
  const today = startOfTodayKuwait();
  let start: Date;
  let end = new Date();
  switch (period) {
    case "daily":
      start = today;
      break;
    case "weekly":
      start = startOfWeek(today, { weekStartsOn: 6 }); // Kuwait week starts Saturday
      break;
    case "monthly":
      start = subMonths(today, 1);
      break;
    case "custom":
      start = from ? new Date(from) : subDays(today, 30);
      end = to ? new Date(`${to}T23:59:59`) : new Date();
      break;
  }
  return { start, end };
}

export async function getReport(user: SessionUser, period: ReportPeriod, from?: string, to?: string) {
  const { start, end } = resolveRange(period, from, to);
  const where: Prisma.OrderWhereInput = {
    ...projectScopeWhere(user),
    orderDate: { gte: start, lte: end },
  };

  const [count, delivered, cancelled, revenueAgg, byProject, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...where, status: "DELIVERED" } }),
    prisma.order.count({ where: { ...where, status: "CANCELLED" } }),
    prisma.order.aggregate({ where: { ...where, status: { not: "CANCELLED" } }, _sum: { grandTotal: true } }),
    prisma.order.groupBy({ by: ["projectId"], where, _count: { _all: true }, _sum: { grandTotal: true } }),
    prisma.order.findMany({ where, include: { project: true, createdBy: true }, orderBy: { orderDate: "desc" } }),
  ]);

  const projectIds = byProject.map((b) => b.projectId);
  const projects = await prisma.project.findMany({ where: { id: { in: projectIds } } });
  const nameOf = new Map(projects.map((p) => [p.id, p.name]));

  return {
    range: { start, end },
    summary: {
      count,
      delivered,
      cancelled,
      revenue: revenueAgg._sum.grandTotal ?? 0,
    },
    byProject: byProject.map((b) => ({
      project: nameOf.get(b.projectId) ?? "Unknown",
      orders: b._count._all,
      revenue: b._sum.grandTotal ?? 0,
    })),
    orders,
  };
}
