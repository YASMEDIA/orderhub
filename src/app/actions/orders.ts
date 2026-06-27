"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireRole, assertProjectAccess, AuthError } from "@/lib/rbac";
import { orderSchema, statusSchema } from "@/lib/validations";
import { nextOrderNumber } from "@/lib/order-number";
import { logActivity } from "@/lib/activity";
import { labelFor } from "@/lib/constants";
import { ORDER_STATUSES } from "@/lib/constants";
import { computeOrderTotals } from "@/lib/order-totals";
import { sendOrderInvoiceEmail } from "@/lib/email";

export type OrderActionResult =
  | { ok: true; message: string; orderId?: string; publicId?: string }
  | { ok: false; message: string };

type VariantMeta = { variantId: string | null; variantName: string | null; variantColor: string | null };

// Validate each line's selected colour belongs to an active variant of its
// product (within the project) and return the per-line snapshot. When a catalog
// product has active variants, a colour is required (so stock can be deducted).
async function resolveLineVariants(
  items: { productId?: string; variantId?: string; productName: string }[],
  projectId: string,
): Promise<{ ok: true; meta: VariantMeta[] } | { ok: false; message: string }> {
  const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean) as string[])];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, projectId },
        include: { variants: { where: { isActive: true }, select: { id: true, name: true, colorHex: true } } },
      })
    : [];
  const byId = new Map(products.map((p) => [p.id, p]));

  const meta: VariantMeta[] = [];
  for (const it of items) {
    const prod = it.productId ? byId.get(it.productId) : undefined;
    if (prod && prod.variants.length > 0) {
      if (!it.variantId) return { ok: false, message: `Please choose a colour for ${prod.name}.` };
      const v = prod.variants.find((x) => x.id === it.variantId);
      if (!v) return { ok: false, message: `That colour for ${prod.name} is no longer available.` };
      meta.push({ variantId: v.id, variantName: v.name, variantColor: v.colorHex });
    } else {
      meta.push({ variantId: null, variantName: null, variantColor: null });
    }
  }
  return { ok: true, meta };
}

// Decrement each selected variant's stock with an oversell guard, then record a
// stock-out movement. Throws OUT_OF_STOCK to roll the whole transaction back.
async function deductVariantStock(
  tx: Prisma.TransactionClient,
  lines: { variantId: string | null; quantity: number; productName: string; variantName: string | null }[],
  orderId: string,
) {
  for (const li of lines) {
    if (!li.variantId) continue;
    const dec = await tx.productVariant.updateMany({
      where: { id: li.variantId, stock: { gte: li.quantity } },
      data: { stock: { decrement: li.quantity } },
    });
    if (dec.count !== 1) throw new Error(`OUT_OF_STOCK:${li.productName}${li.variantName ? " — " + li.variantName : ""}`);
  }
  const movements = lines
    .filter((l) => l.variantId)
    .map((l) => ({ variantId: l.variantId as string, delta: -l.quantity, reason: "ORDER", orderId }));
  if (movements.length) await tx.inventoryMovement.createMany({ data: movements });
}

// Give stock back (order edited or deleted) and record the movement.
async function restoreVariantStock(
  tx: Prisma.TransactionClient,
  items: { variantId: string | null; quantity: number }[],
  orderId: string,
  reason: string,
) {
  const withVariant = items.filter((i) => i.variantId);
  for (const i of withVariant) {
    await tx.productVariant.updateMany({ where: { id: i.variantId as string }, data: { stock: { increment: i.quantity } } });
  }
  if (withVariant.length) {
    await tx.inventoryMovement.createMany({
      data: withVariant.map((i) => ({ variantId: i.variantId as string, delta: i.quantity, reason, orderId })),
    });
  }
}

function isOutOfStock(err: unknown): err is Error {
  return err instanceof Error && err.message.startsWith("OUT_OF_STOCK:");
}
function outOfStockMessage(err: Error): string {
  return `${err.message.slice("OUT_OF_STOCK:".length).trim()} just went out of stock. Adjust the colour or quantity and try again.`;
}

export async function createOrder(input: unknown): Promise<OrderActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN", "EMPLOYEE");
    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };

    const data = parsed.data;
    await assertProjectAccess(user, data.projectId);

    const resolved = await resolveLineVariants(data.items, data.projectId);
    if (!resolved.ok) return { ok: false, message: resolved.message };

    const totals = computeOrderTotals(data.items, data.deliveryFee);
    const { subtotal, grandTotal } = totals;
    const lineItems = totals.lineItems.map((line, i) => ({
      productName: data.items[i].productName,
      productId: data.items[i].productId || null,
      variantId: resolved.meta[i].variantId,
      variantName: resolved.meta[i].variantName,
      variantColor: resolved.meta[i].variantColor,
      ...line,
    }));
    const year = new Date(data.orderDate).getFullYear();

    const order = await prisma.$transaction(async (tx) => {
      const { orderNumber } = await nextOrderNumber(tx, year);
      const created = await tx.order.create({
        data: {
          publicId: nanoid(12),
          orderNumber,
          year,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          source: data.source,
          paymentMethod: data.paymentMethod,
          orderDate: new Date(data.orderDate),
          deliveryDate: new Date(data.deliveryDate),
          governorate: data.governorate,
          area: data.area,
          block: data.block,
          street: data.street,
          housingType: data.housingType,
          buildingNumber: data.buildingNumber,
          floor: data.floor,
          apartmentNumber: data.apartmentNumber,
          locationUrl: data.locationUrl ?? "",
          deliveryFee: data.deliveryFee,
          subtotal,
          grandTotal,
          projectId: data.projectId,
          createdById: user.id,
          items: { create: lineItems },
        },
      });
      await deductVariantStock(tx, lineItems, created.id);
      return created;
    });

    await logActivity({
      userId: user.id,
      action: "Create Order",
      detail: order.orderNumber,
      projectId: order.projectId,
    });
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard");
    // Awaited so it actually runs on serverless (Vercel kills background work
    // after the response). Resend is fast and sendOrderInvoiceEmail never
    // throws, so this won't hang or break order creation.
    await sendOrderInvoiceEmail(order.id);
    return { ok: true, message: "Order created", orderId: order.id, publicId: order.publicId };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    if (isOutOfStock(err)) return { ok: false, message: outOfStockMessage(err) };
    console.error(err);
    return { ok: false, message: "Failed to create order" };
  }
}

export async function updateOrder(id: string, input: unknown): Promise<OrderActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: { select: { variantId: true, quantity: true } } },
    });
    if (!existing) return { ok: false, message: "Order not found" };
    await assertProjectAccess(user, existing.projectId);

    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };
    const data = parsed.data;
    await assertProjectAccess(user, data.projectId);

    const resolved = await resolveLineVariants(data.items, data.projectId);
    if (!resolved.ok) return { ok: false, message: resolved.message };

    const totals = computeOrderTotals(data.items, data.deliveryFee);
    const { subtotal, grandTotal } = totals;
    const lineItems = totals.lineItems.map((line, i) => ({
      productName: data.items[i].productName,
      productId: data.items[i].productId || null,
      variantId: resolved.meta[i].variantId,
      variantName: resolved.meta[i].variantName,
      variantColor: resolved.meta[i].variantColor,
      ...line,
    }));

    await prisma.$transaction(async (tx) => {
      // Put the previous lines' stock back, then deduct the new selection so the
      // net change is correct even when colours/quantities were edited.
      await restoreVariantStock(tx, existing.items, id, "ORDER_EDIT");
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.update({
        where: { id },
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          source: data.source,
          paymentMethod: data.paymentMethod,
          orderDate: new Date(data.orderDate),
          deliveryDate: new Date(data.deliveryDate),
          governorate: data.governorate,
          area: data.area,
          block: data.block,
          street: data.street,
          housingType: data.housingType,
          buildingNumber: data.buildingNumber,
          floor: data.floor,
          apartmentNumber: data.apartmentNumber,
          locationUrl: data.locationUrl ?? "",
          deliveryFee: data.deliveryFee,
          subtotal,
          grandTotal,
          projectId: data.projectId,
          items: { create: lineItems },
        },
      });
      await deductVariantStock(tx, lineItems, id);
    });

    await logActivity({ userId: user.id, action: "Edit Order", detail: existing.orderNumber, projectId: data.projectId });
    revalidatePath("/dashboard/orders");
    return { ok: true, message: "Order updated", orderId: id, publicId: existing.publicId };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    if (isOutOfStock(err)) return { ok: false, message: outOfStockMessage(err) };
    console.error(err);
    return { ok: false, message: "Failed to update order" };
  }
}

export async function updateOrderStatus(formData: FormData): Promise<OrderActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN", "DRIVER");
    const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
    if (!parsed.success) return { ok: false, message: "Invalid status" };

    const existing = await prisma.order.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return { ok: false, message: "Order not found" };
    await assertProjectAccess(user, existing.projectId);

    await prisma.order.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
    await logActivity({
      userId: user.id,
      action: "Status Change",
      detail: `${existing.orderNumber} → ${labelFor(ORDER_STATUSES, parsed.data.status)}`,
      projectId: existing.projectId,
    });
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard");
    return { ok: true, message: "Status updated", orderId: existing.id };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Failed to update status" };
  }
}

export async function deleteOrder(id: string): Promise<OrderActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: { select: { variantId: true, quantity: true } } },
    });
    if (!existing) return { ok: false, message: "Order not found" };
    await assertProjectAccess(user, existing.projectId);

    await prisma.$transaction(async (tx) => {
      // Return the order's variant stock before removing it.
      await restoreVariantStock(tx, existing.items, id, "ORDER_DELETED");
      await tx.order.delete({ where: { id } });
    });
    await logActivity({ userId: user.id, action: "Delete Order", detail: existing.orderNumber, projectId: existing.projectId });
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard");
    return { ok: true, message: "Order deleted" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Failed to delete order" };
  }
}
