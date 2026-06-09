import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessProject } from "@/lib/rbac";
import { renderReceiptPdf } from "@/lib/receipt-pdf";
import { qrDataUrl } from "@/lib/qr";
import { getSettings } from "@/app/actions/settings";
import { labelFor, PAYMENT_METHODS } from "@/lib/constants";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, project: true },
  });
  if (!order) return new NextResponse("Not found", { status: 404 });
  if (!canAccessProject(user, order.projectId)) return new NextResponse("Forbidden", { status: 403 });

  const settings = await getSettings();
  const qr = await qrDataUrl(order.publicId, settings.qrSize);

  const pdf = await renderReceiptPdf({
    projectName: order.project.name,
    projectPhone: order.project.phone,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    orderDate: order.orderDate,
    deliveryDate: order.deliveryDate,
    paymentMethod: labelFor(PAYMENT_METHODS, order.paymentMethod),
    items: order.items,
    deliveryFee: order.deliveryFee,
    subtotal: order.subtotal,
    grandTotal: order.grandTotal,
    qrDataUrl: qr,
    generatedAt: new Date(),
    header: settings.receiptHeader,
    footer: settings.receiptFooter,
    instagram: order.project.instagram,
    tiktok: order.project.tiktok,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.orderNumber}.pdf"`,
    },
  });
}
