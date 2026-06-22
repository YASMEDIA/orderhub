import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();

// Restores a backup produced by the dashboard "Download full backup (JSON)"
// (or GET /api/admin/backup) into the database in DATABASE_URL.
// Usage: npm run db:restore -- path/to/mahalatly-backup.json
// Inserts in foreign-key order; createMany skips duplicates so it's safe to
// run against a fresh database.
async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run db:restore -- <backup.json>");
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(file, "utf8")); // backup JSON (untyped)

  const insert = async (rows: unknown[] | undefined, fn: (r: unknown[]) => Promise<unknown>, label: string) => {
    if (rows && rows.length) {
      await fn(rows);
      console.log(`  ${label}: ${rows.length}`);
    }
  };

  await insert(data.users, (r) => prisma.user.createMany({ data: r as never, skipDuplicates: true }), "users");
  await insert(data.projects, (r) => prisma.project.createMany({ data: r as never, skipDuplicates: true }), "projects");
  await insert(data.projectAssignments, (r) => prisma.projectAssignment.createMany({ data: r as never, skipDuplicates: true }), "projectAssignments");
  await insert(data.products, (r) => prisma.product.createMany({ data: r as never, skipDuplicates: true }), "products");
  await insert(data.productTiers, (r) => prisma.productTier.createMany({ data: r as never, skipDuplicates: true }), "productTiers");
  await insert(data.orders, (r) => prisma.order.createMany({ data: r as never, skipDuplicates: true }), "orders");
  await insert(data.orderItems, (r) => prisma.orderItem.createMany({ data: r as never, skipDuplicates: true }), "orderItems");
  await insert(data.activityLogs, (r) => prisma.activityLog.createMany({ data: r as never, skipDuplicates: true }), "activityLogs");

  for (const s of data.settings ?? []) {
    await prisma.setting.upsert({ where: { id: s.id }, create: s, update: s });
  }
  for (const c of data.orderCounters ?? []) {
    await prisma.orderCounter.upsert({ where: { year: c.year }, create: c, update: c });
  }

  console.log("✅ Restore complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
