"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireRole, assertProjectAccess, AuthError } from "@/lib/rbac";
import { orderSchema, statusSchema } from "@/lib/validations";
import { nextOrderNumber } from "@/lib/order-number";
import { logActivity } from "@/lib/activity";
import { labelFor } from "@/lib/constants";
import { ORDER_STATUSES } from "@/lib/constants";
import { computeOrderTotals } from "@/lib/order-totals";

export type OrderActionResult =
  | { ok: true; message: string; orderId?: string; publicId?: string }
  | { ok: false; message: string };

export async function createOrder(input: unknown): Promise<OrderActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN", "EMPLOYEE");
    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };

    const data = parsed.data;
    await assertProjectAccess(user, data.projectId);

    const totals = computeOrderTotals(data.items, data.deliveryFee);
    const { subtotal, grandTotal } = totals;
    const lineItems = totals.lineItems.map((line, i) => ({
      productName: data.items[i].productName,
      ...line,
    }));
    const year = new Date(data.orderDate).getFullYear();

    const order = await prisma.$transaction(async (tx) => {
      const { orderNumber } = await nextOrderNumber(tx, year);
      return tx.order.create({
        data: {
          publicId: nanoid(12),
          orderNumber,
          year,
          customerName: data.customerName,
          source: data.source,
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
          deliveryFee: data.deliveryFee,
          subtotal,
          grandTotal,
          projectId: data.projectId,
          createdById: user.id,
          items: { create: lineItems },
        },
      });
    });

    await logActivity({
      userId: user.id,
      action: "Create Order",
      detail: order.orderNumber,
      projectId: order.projectId,
    });
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard");
    return { ok: true, message: "Order created", orderId: order.id, publicId: order.publicId };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Failed to create order" };
  }
}

export async function updateOrder(id: string, input: unknown): Promise<OrderActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: "Order not found" };
    await assertProjectAccess(user, existing.projectId);

    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };
    const data = parsed.data;
    await assertProjectAccess(user, data.projectId);

    const totals = computeOrderTotals(data.items, data.deliveryFee);
    const { subtotal, grandTotal } = totals;
    const lineItems = totals.lineItems.map((line, i) => ({
      productName: data.items[i].productName,
      ...line,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.update({
        where: { id },
        data: {
          customerName: data.customerName,
          source: data.source,
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
          deliveryFee: data.deliveryFee,
          subtotal,
          grandTotal,
          projectId: data.projectId,
          items: { create: lineItems },
        },
      });
    });

    await logActivity({ userId: user.id, action: "Edit Order", detail: existing.orderNumber, projectId: data.projectId });
    revalidatePath("/dashboard/orders");
    return { ok: true, message: "Order updated", orderId: id, publicId: existing.publicId };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Failed to update order" };
  }
}

export async function updateOrderStatus(formData: FormData): Promise<OrderActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
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
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: "Order not found" };
    await assertProjectAccess(user, existing.projectId);

    await prisma.order.delete({ where: { id } });
    await logActivity({ userId: user.id, action: "Delete Order", detail: existing.orderNumber, projectId: existing.projectId });
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard");
    return { ok: true, message: "Order deleted" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Failed to delete order" };
  }
}
