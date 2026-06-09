import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatAmount, formatDate } from "@/lib/format";
import { labelFor, GOVERNORATES, HOUSING_TYPES, ORDER_STATUSES, PAYMENT_METHODS } from "@/lib/constants";

export const metadata: Metadata = { title: "Invoice — OrderHub" };

export default async function PublicInvoicePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const order = await prisma.order.findUnique({
    where: { publicId },
    include: { items: true, project: true },
  });
  if (!order) notFound();

  const addressLine = [
    `Block ${order.block}`,
    `Street ${order.street}`,
    labelFor(HOUSING_TYPES, order.housingType),
    `Building ${order.buildingNumber}`,
    order.floor ? `Floor ${order.floor}` : null,
    order.apartmentNumber ? `Apt ${order.apartmentNumber}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8">
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="border-b bg-primary px-6 py-5 text-primary-foreground">
          <h1 className="text-xl font-bold">{order.project.name}</h1>
          {order.project.phone ? <p className="text-sm opacity-90">{order.project.phone}</p> : null}
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Order Number</p>
              <p className="font-semibold">{order.orderNumber}</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {labelFor(ORDER_STATUSES, order.status)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Customer</p><p className="font-medium">{order.customerName}</p></div>
            {order.customerPhone ? (
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <a href={`tel:${order.customerPhone}`} className="font-medium text-primary hover:underline">{order.customerPhone}</a>
              </div>
            ) : null}
            <div><p className="text-xs text-muted-foreground">Delivery Date</p><p className="font-medium">{formatDate(order.deliveryDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Payment Method</p><p className="font-medium">{labelFor(PAYMENT_METHODS, order.paymentMethod)}</p></div>
          </div>

          <div className="rounded-lg border p-3 text-sm">
            <p className="text-xs text-muted-foreground">Delivery Address</p>
            <p className="font-medium">{labelFor(GOVERNORATES, order.governorate)} — {order.area}</p>
            <p className="text-muted-foreground">{addressLine}</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Products</p>
            <div className="divide-y rounded-lg border">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{it.productName}</p>
                    <p className="text-xs text-muted-foreground">{it.quantity} × {formatAmount(it.unitPrice)}</p>
                  </div>
                  <p className="font-medium">{formatAmount(it.lineTotal)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span>{order.deliveryFee > 0 ? formatMoney(order.deliveryFee) : "Free"}</span></div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>{formatMoney(order.grandTotal)}</span></div>
          </div>
        </div>

        {order.project.instagram || order.project.tiktok ? (
          <div className="border-t px-6 py-4 text-center">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Follow us</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              {order.project.instagram ? (
                <a href={order.project.instagram} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                  Instagram
                </a>
              ) : null}
              {order.project.tiktok ? (
                <a href={order.project.tiktok} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                  TikTok
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
          Powered by OrderHub
        </div>
      </div>
    </div>
  );
}
