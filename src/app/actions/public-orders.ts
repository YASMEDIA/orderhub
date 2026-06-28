"use server";

import { after } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { publicOrderSchema } from "@/lib/validations";
import { nextOrderNumber } from "@/lib/order-number";
import { priceForQuantity, totalQuantityByProduct } from "@/lib/pricing";
import { deliveryFeeFor } from "@/lib/delivery";
import { logActivity } from "@/lib/activity";
import { rateLimit } from "@/lib/rate-limit";
import { sendOrderInvoiceEmail } from "@/lib/email";

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
    include: {
      tiers: true,
      addons: { where: { isActive: true } },
      variants: { where: { isActive: true } },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Tier pricing is driven by the TOTAL quantity across all selected variants of
  // a product (5 black + 5 white → the 10+ tier for every unit).
  const totalQtyByProduct = totalQuantityByProduct(
    data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
  );

  const lineItems: {
    productId: string;
    productName: string;
    variantId: string | null;
    variantName: string | null;
    variantColor: string | null;
    quantity: number;
    unitPrice: number;
    addonTotal: number;
    addons?: { id: string; name: string; price: number; text?: string }[];
    lineTotal: number;
  }[] = [];
  for (const item of data.items) {
    const product = byId.get(item.productId);
    if (!product) return { ok: false, message: "One of the products is no longer available." };

    let variant = null as (typeof product.variants)[number] | null;
    if (product.variants.length > 0) {
      if (!item.variantId) return { ok: false, message: `Please choose a colour for ${product.name}.` };
      variant = product.variants.find((v) => v.id === item.variantId) ?? null;
      if (!variant) return { ok: false, message: `That option for ${product.name} is no longer available.` };
      if (variant.stock < item.quantity) {
        return { ok: false, message: `${product.name} — ${variant.name} only has ${variant.stock} left.` };
      }
    }

    const totalQty = totalQtyByProduct.get(product.id) ?? item.quantity;
    const addonSelections = item.addons.length
      ? item.addons
      : (item.addonIds ?? []).map((id) => ({ id, text: undefined as string | undefined }));
    const uniqueSelections = [...new Map(addonSelections.map((a) => [a.id, a])).values()];
    const selectedAddons = uniqueSelections.map((selection) => ({
      selection,
      addon: product.addons.find((a) => a.id === selection.id),
    }));
    if (selectedAddons.some(({ addon }) => !addon)) {
      return { ok: false, message: `One of the add-ons for ${product.name} is no longer available.` };
    }
    if (selectedAddons.some(({ addon, selection }) => addon?.hasTextInput && !selection.text?.trim())) {
      return { ok: false, message: `Please add the required text for ${product.name}.` };
    }
    const addonSnapshots = selectedAddons.flatMap(({ addon, selection }) =>
      addon
        ? [{
            id: addon.id,
            name: addon.name,
            price: addon.price,
            ...(addon.hasTextInput ? { text: selection.text?.trim() } : {}),
          }]
        : [],
    );
    const addonTotal = round3(addonSnapshots.reduce((sum, a) => sum + a.price, 0));
    const unitPrice = round3(priceForQuantity(product.basePrice, product.tiers, totalQty) + addonTotal);
    lineItems.push({
      productId: product.id,
      productName: product.name,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      variantColor: variant?.colorHex ?? null,
      quantity: item.quantity,
      unitPrice,
      addonTotal,
      addons: addonSnapshots.length ? addonSnapshots : undefined,
      lineTotal: round3(unitPrice * item.quantity),
    });
  }

  const subtotal = round3(lineItems.reduce((s, it) => s + it.lineTotal, 0));
  const deliveryFee = deliveryFeeFor(data.governorate, data.area, subtotal);
  const grandTotal = round3(subtotal + deliveryFee);
  const year = new Date().getFullYear();

  try {
    const order = await prisma.$transaction(async (tx) => {
      const { orderNumber } = await nextOrderNumber(tx, year);

      // Decrement stock for each selected variant, guarding against oversell with
      // a conditional update. If two orders race for the last unit, only one of
      // them matches `stock >= quantity` and the other rolls the whole tx back.
      for (const line of lineItems) {
        if (!line.variantId) continue;
        const dec = await tx.productVariant.updateMany({
          where: { id: line.variantId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (dec.count !== 1) {
          throw new Error(`OUT_OF_STOCK:${line.productName} — ${line.variantName ?? ""}`);
        }
      }

      const created = await tx.order.create({
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

      // Record an inventory movement per sold variant (stock-out audit trail).
      const movements = lineItems
        .filter((l) => l.variantId)
        .map((l) => ({ variantId: l.variantId as string, delta: -l.quantity, reason: "ORDER", orderId: created.id }));
      if (movements.length) await tx.inventoryMovement.createMany({ data: movements });

      return created;
    });

    await logActivity({ action: "Online Order", detail: order.orderNumber, projectId: project.id });
    // Send the new-order email AFTER the response via after() — it keeps the
    // function alive (waitUntil) so the email reliably completes without making
    // the customer wait. sendOrderInvoiceEmail never throws.
    after(() => sendOrderInvoiceEmail(order.id));
    return { ok: true, publicId: order.publicId, orderNumber: order.orderNumber };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("OUT_OF_STOCK:")) {
      const label = err.message.slice("OUT_OF_STOCK:".length).trim();
      return { ok: false, message: `Sorry, ${label} just sold out. Please adjust your cart and try again.` };
    }
    console.error("placePublicOrder failed", err);
    return { ok: false, message: "Could not place the order. Please try again." };
  }
}
