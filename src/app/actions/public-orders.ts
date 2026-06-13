"use server";

import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { publicOrderSchema } from "@/lib/validations";
import { nextOrderNumber } from "@/lib/order-number";
import { priceForQuantity } from "@/lib/pricing";
import { deliveryFeeFor } from "@/lib/delivery";
import { logActivity } from "@/lib/activity";
import { rateLimit } from "@/lib/rate-limit";

export type PublicOrderResult =
  | { ok: true; publicId: string; orderNumber: string }
  | { ok: false; message: string };

function round3(n: number): number {
  return Number(n.toFixed(3));
}

// Places an order from the public storefront. No authentication. Prices are
// computed on the server from the project's product catalog — client-supplied
// prices are never trusted.
export async function placePublicOrder(slug: string, input: unknown): Promise<PublicOrderResult> {
  const parsed = publicOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Please check your details" };
  const data = parsed.data;

  // Throttle by storefront + phone to limit abuse.
  const rl = rateLimit(`store:${slug}:${data.customerPhone}`, 6, 60_000);
  if (!rl.ok) return { ok: false, message: "Too many attempts. Please wait a minute and try again." };

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project || !project.storeEnabled || project.status !== "ACTIVE") {
    return { ok: false, message: "This store is not available." };
  }

  // Load the ordered products and verify they belong to this active store.
  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, projectId: project.id, isActive: true },
    include: { tiers: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lineItems: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[] = [];
  for (const item of data.items) {
    const product = byId.get(item.productId);
    if (!product) return { ok: false, message: "One of the products is no longer available." };
    const unitPrice = round3(priceForQuantity(product.basePrice, product.tiers, item.quantity));
    lineItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      lineTotal: round3(unitPrice * item.quantity),
    });
  }

  const subtotal = round3(lineItems.reduce((s, it) => s + it.lineTotal, 0));
  const deliveryFee = deliveryFeeFor(data.governorate, data.area);
  const grandTotal = round3(subtotal + deliveryFee);
  const year = new Date().getFullYear();

  try {
    const order = await prisma.$transaction(async (tx) => {
      const { orderNumber } = await nextOrderNumber(tx, year);
      return tx.order.create({
        data: {
          publicId: nanoid(12),
          orderNumber,
          year,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          source: "WEBSITE",
          paymentMethod: data.paymentMethod,
          orderDate: new Date(),
          deliveryDate: new Date(),
          governorate: data.governorate,
          area: data.area,
          block: data.block,
          street: data.street,
          housingType: data.housingType,
          buildingNumber: data.buildingNumber,
          floor: data.floor,
          apartmentNumber: data.apartmentNumber,
          locationUrl: data.locationUrl ?? "",
          deliveryFee,
          subtotal,
          grandTotal,
          status: "PENDING",
          projectId: project.id,
          createdById: null, // online order — no internal creator
          items: { create: lineItems },
        },
      });
    });

    await logActivity({ action: "Online Order", detail: order.orderNumber, projectId: project.id });
    return { ok: true, publicId: order.publicId, orderNumber: order.orderNumber };
  } catch (err) {
    console.error("placePublicOrder failed", err);
    return { ok: false, message: "Could not place the order. Please try again." };
  }
}
