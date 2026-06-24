import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Stable IDs / emails of the original demo data. The cleanup below targets ONLY
// these, so anything real you create later (cuid IDs, your own emails) is never
// touched. Safe + idempotent to run on every startup.
const DEMO_PROJECT_IDS = [
  "seed-project",
  "seed-project-bayan-bakery",
  "seed-project-q8-florist",
  "seed-project-desert-roast",
];
const DEMO_USER_EMAILS = ["employee@mahalatly.com", "manager@mahalatly.com"];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@mahalatly.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

  // Global platform settings.
  await prisma.setting.upsert({ where: { id: "global" }, create: { id: "global" }, update: {} });

  // Bootstrap the Super Admin. Created only if missing so a password you change
  // in the UI is preserved across restarts; if it exists we just keep it active.
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { fullName: "Super Admin", email, passwordHash, role: "SUPER_ADMIN" },
    });
  } else if (existingAdmin.role !== "SUPER_ADMIN" || !existingAdmin.isActive) {
    await prisma.user.update({ where: { email }, data: { role: "SUPER_ADMIN", isActive: true } });
  }

  // One-time cleanup of the original demo data. Orders must go before projects
  // (Order→Project is RESTRICT); OrderItems + ProjectAssignments cascade.
  const removedOrders = await prisma.order.deleteMany({
    where: { projectId: { in: DEMO_PROJECT_IDS } },
  });
  const removedProjects = await prisma.project.deleteMany({
    where: { id: { in: DEMO_PROJECT_IDS } },
  });
  const removedUsers = await prisma.user.deleteMany({
    where: { email: { in: DEMO_USER_EMAILS } },
  });

  // Resync the 2026 order counter to the highest remaining sequence (0 if empty)
  // so your first real order starts cleanly and never collides.
  const remaining = await prisma.order.findMany({
    where: { year: 2026 },
    select: { orderNumber: true },
  });
  let maxSeq = 0;
  for (const o of remaining) {
    const n = parseInt(o.orderNumber.split("-").pop() ?? "0", 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }
  await prisma.orderCounter.upsert({
    where: { year: 2026 },
    create: { year: 2026, current: maxSeq },
    update: { current: maxSeq },
  });

  console.log("✅ Production bootstrap complete.");
  console.log(`   Super Admin: ${email}`);
  console.log(
    `   Demo data removed → orders: ${removedOrders.count}, projects: ${removedProjects.count}, demo users: ${removedUsers.count}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
