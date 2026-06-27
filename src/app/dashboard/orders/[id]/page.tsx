import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { FileDown, QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessProject } from "@/lib/rbac";
import { qrDataUrl, invoiceUrl } from "@/lib/qr";
import { buildMapsLink, isExactLocation } from "@/lib/location";
import { getSettings } from "@/app/actions/settings";
import { formatMoney, formatAmount, formatDate } from "@/lib/format";
import { labelFor, GOVERNORATES, HOUSING_TYPES, ORDER_SOURCES, PAYMENT_METHODS } from "@/lib/constants";
import { parseAddonSnapshot } from "@/lib/addons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { OrderRowActions } from "@/components/orders/order-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, project: true, createdBy: true },
  });
  if (!order) notFound();
  if (!canAccessProject(user, order.projectId)) redirect("/dashboard/orders");

  const settings = await getSettings();
  const qr = await qrDataUrl(order.publicId, 220);

  const Detail = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm font-medium">{value}</dd></div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">{order.project.name} · created by {order.createdBy?.fullName ?? "Online Store"}</p>
        </div>
        <div className="flex items-center gap-2">
          {user.role !== "DRIVER" ? (
            <>
              <Button asChild variant="outline"><a href={`/api/orders/${order.id}/pdf`}><FileDown className="h-4 w-4" /> Download Receipt PDF</a></Button>
              <Button asChild variant="outline"><a href={`/api/orders/${order.id}/qr`}><QrCode className="h-4 w-4" /> Download QR Code</a></Button>
            </>
          ) : null}
          <OrderRowActions orderId={order.id} status={order.status} role={user.role} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Customer & Delivery</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Detail label="Customer" value={order.customerName} />
              <Detail label="Phone" value={order.customerPhone || "—"} />
              <Detail label="Source" value={labelFor(ORDER_SOURCES, order.source)} />
              <Detail label="Payment" value={labelFor(PAYMENT_METHODS, order.paymentMethod)} />
              <Detail label="Order Date" value={formatDate(order.orderDate)} />
              <Detail label="Delivery Date" value={formatDate(order.deliveryDate)} />
              <Detail label="Governorate" value={labelFor(GOVERNORATES, order.governorate)} />
              <Detail label="Area" value={order.area} />
              <Detail label="Block" value={order.block} />
              <Detail label="Street" value={order.street} />
              <Detail label="Housing" value={labelFor(HOUSING_TYPES, order.housingType)} />
              <Detail label="Building" value={order.buildingNumber} />
              <Detail label="Floor" value={order.floor || "—"} />
              <Detail label="Apartment" value={order.apartmentNumber || "—"} />
              <Detail
                label={`Location${isExactLocation(order) ? " (exact pin)" : " (approx.)"}`}
                value={
                  <a href={buildMapsLink(order)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Open in Maps
                  </a>
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Public Invoice QR</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Image src={qr} alt="Invoice QR" width={settings.qrSize} height={settings.qrSize} className="rounded border" unoptimized />
            <p className="text-center font-semibold">{order.orderNumber}</p>
            <Link href={`/invoice/${order.publicId}`} target="_blank" className="break-all text-center text-xs text-primary hover:underline">
              {invoiceUrl(order.publicId)}
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((it) => {
                const addons = parseAddonSnapshot(it.addons);
                return (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div>
                        {it.productName}
                        {it.variantName ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            {it.variantColor ? (
                              <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-border" style={{ backgroundColor: it.variantColor }} />
                            ) : null}
                            {it.variantName}
                          </span>
                        ) : null}
                      </div>
                      {addons.map((a) => (
                        <p key={a.id} className="text-xs text-muted-foreground">+ {a.name}{a.text ? `: ${a.text}` : ""} ({formatAmount(a.price)} each)</p>
                      ))}
                    </TableCell>
                    <TableCell className="text-center">{it.quantity}</TableCell>
                    <TableCell className="text-right">{formatAmount(it.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatAmount(it.lineTotal)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="ml-auto max-w-xs space-y-1 p-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>Delivery Fee</span><span>{order.deliveryFee > 0 ? formatMoney(order.deliveryFee) : "Free"}</span></div>
            <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Grand Total</span><span>{formatMoney(order.grandTotal)}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
