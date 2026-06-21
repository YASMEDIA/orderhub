import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/rbac";

// Super-Admin-only RESTORE. Replaces ALL data with the uploaded backup JSON
// (produced by /api/admin/backup). Destructive by design — used to migrate
// between database providers. Requires ?confirm=replace.
export async function POST(req: Request) {
  try {
    await requireRole("SUPER_ADMIN");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (new URL(req.url).searchParams.get("confirm") !== "replace") {
    return NextResponse.json({ ok: false, message: "Missing confirmation." }, { status: 400 });
  }

  // CSRF defense for this destructive endpoint: reject cross-origin requests.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ ok: false, message: "Cross-origin request rejected." }, { status: 403 });
  }

  let data: Record<string, unknown> & { meta?: { app?: string; counts?: unknown } };
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON file." }, { status: 400 });
  }

  if (data?.meta?.app !== "OrderHub" || !Array.isArray(data.users)) {
    return NextResponse.json({ ok: false, message: "This file is not an OrderHub backup." }, { status: 400 });
  }

  const rows = (k: string): never => (Array.isArray(data[k]) ? data[k] : []) as never;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Wipe everything (children first to respect foreign keys).
        await tx.orderItem.deleteMany();
        await tx.order.deleteMany();
        await tx.productTier.deleteMany();
        await tx.product.deleteMany();
        await tx.projectAssignment.deleteMany();
        await tx.activityLog.deleteMany();
        await tx.user.deleteMany();
        await tx.project.deleteMany();
        await tx.orderCounter.deleteMany();
        await tx.setting.deleteMany();

        // Insert from the backup (parents first). createMany preserves ids;
        // empty arrays are harmless no-ops.
        await tx.user.createMany({ data: rows("users"), skipDuplicates: true });
        await tx.project.createMany({ data: rows("projects"), skipDuplicates: true });
        await tx.projectAssignment.createMany({ data: rows("projectAssignments"), skipDuplicates: true });
        await tx.product.createMany({ data: rows("products"), skipDuplicates: true });
        await tx.productTier.createMany({ data: rows("productTiers"), skipDuplicates: true });
        await tx.order.createMany({ data: rows("orders"), skipDuplicates: true });
        await tx.orderItem.createMany({ data: rows("orderItems"), skipDuplicates: true });
        await tx.activityLog.createMany({ data: rows("activityLogs"), skipDuplicates: true });
        await tx.setting.createMany({ data: rows("settings"), skipDuplicates: true });
        await tx.orderCounter.createMany({ data: rows("orderCounters"), skipDuplicates: true });
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
  } catch (err) {
    console.error("restore failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, message: "Restore failed. Nothing was changed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, counts: data.meta?.counts ?? null });
}
