import { prisma } from "@/lib/prisma";
import { renderReceiptPdf } from "@/lib/receipt-pdf";
import { qrDataUrl } from "@/lib/qr";
import { getSettings } from "@/app/actions/settings";
import { labelFor, PAYMENT_METHODS } from "@/lib/constants";

export type OrderWithDetails = NonNullable<
  Awaited<ReturnType<typeof loadOrderWithDetails>>
>;

function loadOrderWithDetails(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, project: true },
  });
}

// Builds the thermal-receipt PDF for an order, reusing the same data shape the
// download route uses. Returns null when the order no longer exists.
export async function renderOrderReceiptPdf(
  orderId: string,
): Promise<{ pdf: Buffer; order: OrderWithDetails } | null> {
  const order = await loadOrderWithDetails(orderId);
  if (!order) return null;

  const settings = await getSettings();
  const qr = await qrDataUrl(order.publicId, settings.qrSize);

  const pdf = await renderReceiptPdf({
    projectName: order.project.name,
    projectPhone: order.project.phone,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
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
    whatsapp: order.project.whatsapp,
  });

  return { pdf, order };
}
