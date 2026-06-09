import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessProject } from "@/lib/rbac";
import { qrWithLabelPng } from "@/lib/qr-label";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return new NextResponse("Not found", { status: 404 });
  if (!canAccessProject(user, order.projectId)) return new NextResponse("Forbidden", { status: 403 });

  const png = await qrWithLabelPng(order.publicId, order.orderNumber);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${order.orderNumber}-qr.png"`,
    },
  });
}
