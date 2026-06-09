import type { Prisma } from "@prisma/client";

// Pure formatter: ORD-<year>-<n padded to 6 digits>, e.g. ORD-2026-000001.
export function formatOrderNumber(year: number, n: number): string {
  const padded = String(n).padStart(6, "0");
  return `ORD-${year}-${padded}`;
}

// Atomically increment the yearly counter and format ORD-YYYY-000001.
// Must run inside a prisma.$transaction to stay unique under concurrency.
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  year: number,
): Promise<{ orderNumber: string; year: number }> {
  const counter = await tx.orderCounter.upsert({
    where: { year },
    create: { year, current: 1 },
    update: { current: { increment: 1 } },
  });
  return { orderNumber: formatOrderNumber(year, counter.current), year };
}
