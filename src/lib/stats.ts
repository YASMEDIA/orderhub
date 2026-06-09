import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format, subDays } from "date-fns";
import { prisma } from "./prisma";
import { projectScopeWhere, type SessionUser } from "./rbac";
import { TIMEZONE, labelFor, ORDER_SOURCES } from "./constants";

// Start of "today" in Asia/Kuwait, returned as a UTC Date for querying.
export function startOfTodayKuwait(): Date {
  const nowKw = toZonedTime(new Date(), TIMEZONE);
  const y = nowKw.getFullYear();
  const m = String(nowKw.getMonth() + 1).padStart(2, "0");
  const d = String(nowKw.getDate()).padStart(2, "0");
  return fromZonedTime(`${y}-${m}-${d}T00:00:00`, TIMEZONE);
}

export async function getDashboardData(user: SessionUser) {
  const scope = projectScopeWhere(user);
  const todayStart = startOfTodayKuwait();

  const [total, today, pending, delivered, revenueAgg, recent, projects, sources] = await Promise.all([
    prisma.order.count({ where: scope }),
    prisma.order.count({ where: { ...scope, createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { ...scope, status: "PENDING" } }),
    prisma.order.count({ where: { ...scope, status: "DELIVERED" } }),
    prisma.order.aggregate({ where: { ...scope, status: { not: "CANCELLED" } }, _sum: { grandTotal: true } }),
    prisma.order.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { project: true, createdBy: true },
    }),
    prisma.order.groupBy({ by: ["projectId"], where: scope, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["source"], where: scope, _count: { _all: true } }),
  ]);

  // Orders per day (last 14 days)
  const since = subDays(todayStart, 13);
  const rows = await prisma.order.findMany({
    where: { ...scope, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const dayMap = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const day = format(toZonedTime(subDays(new Date(), 13 - i), TIMEZONE), "dd/MM");
    dayMap.set(day, 0);
  }
  for (const r of rows) {
    const day = format(toZonedTime(r.createdAt, TIMEZONE), "dd/MM");
    if (dayMap.has(day)) dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const ordersPerDay = Array.from(dayMap, ([date, orders]) => ({ date, orders }));

  // Orders by project (resolve names)
  const projectIds = projects.map((p) => p.projectId);
  const projectRecords = await prisma.project.findMany({ where: { id: { in: projectIds } } });
  const projectName = new Map(projectRecords.map((p) => [p.id, p.name]));
  const ordersByProject = projects.map((p) => ({
    name: projectName.get(p.projectId) ?? "Unknown",
    orders: p._count._all,
  }));

  const ordersBySource = sources.map((s) => ({
    name: labelFor(ORDER_SOURCES, s.source),
    value: s._count._all,
  }));

  return {
    stats: {
      total,
      today,
      pending,
      delivered,
      revenue: revenueAgg._sum.grandTotal ?? 0,
    },
    ordersPerDay,
    ordersByProject,
    ordersBySource,
    recent,
  };
}
