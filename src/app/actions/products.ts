"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, assertProjectAccess, projectScopeWhere, AuthError } from "@/lib/rbac";
import { productSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";

export type ProductActionResult = { ok: boolean; message: string };

// Sort tiers ascending by quantity before persisting for stable display.
function sortTiers(tiers: { minQuantity: number; unitPrice: number }[]) {
  return [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
}

export async function createProduct(input: unknown): Promise<ProductActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };
    const data = parsed.data;
    await assertProjectAccess(user, data.projectId);

    const product = await prisma.product.create({
      data: {
        name: data.name,
        projectId: data.projectId,
        basePrice: data.basePrice,
        isActive: data.isActive,
        tiers: { create: sortTiers(data.tiers) },
      },
    });
    await logActivity({ userId: user.id, action: "Create Product", detail: product.name, projectId: data.projectId });
    revalidatePath("/dashboard/products");
    return { ok: true, message: "Product created" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Failed to create product" };
  }
}

export async function updateProduct(id: string, input: unknown): Promise<ProductActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: "Product not found" };
    await assertProjectAccess(user, existing.projectId);

    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };
    const data = parsed.data;
    await assertProjectAccess(user, data.projectId);

    await prisma.$transaction(async (tx) => {
      await tx.productTier.deleteMany({ where: { productId: id } });
      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          projectId: data.projectId,
          basePrice: data.basePrice,
          isActive: data.isActive,
          tiers: { create: sortTiers(data.tiers) },
        },
      });
    });
    await logActivity({ userId: user.id, action: "Edit Product", detail: data.name, projectId: data.projectId });
    revalidatePath("/dashboard/products");
    return { ok: true, message: "Product updated" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Failed to update product" };
  }
}

export async function deleteProduct(id: string): Promise<ProductActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: "Product not found" };
    await assertProjectAccess(user, existing.projectId);

    // Keep historical orders intact: OrderItem.productId is set null on delete.
    await prisma.product.delete({ where: { id } });
    await logActivity({ userId: user.id, action: "Delete Product", detail: existing.name, projectId: existing.projectId });
    revalidatePath("/dashboard/products");
    return { ok: true, message: "Product deleted" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Failed to delete product" };
  }
}

// Active products (with tiers) for the projects the user can access.
// Used by the order form to drive quantity-based pricing.
export async function getAccessibleProducts() {
  const user = await requireUser();
  return prisma.product.findMany({
    where: { ...projectScopeWhere(user), isActive: true },
    include: { tiers: { orderBy: { minQuantity: "asc" } } },
    orderBy: { name: "asc" },
  });
}
