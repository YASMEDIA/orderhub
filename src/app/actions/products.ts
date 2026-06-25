"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireUser, requireRole, assertProjectAccess, projectScopeWhere, AuthError } from "@/lib/rbac";
import { productSchema, type ProductVariantInput } from "@/lib/validations";
import { logActivity } from "@/lib/activity";

export type ProductActionResult = { ok: boolean; message: string };

// Sort tiers ascending by quantity before persisting for stable display.
function sortTiers(tiers: { minQuantity: number; unitPrice: number }[]) {
  return [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
}

// Keep only valid images: an https URL, or a base64 image data URL within size.
function isValidImage(v: string): boolean {
  return /^https:\/\//i.test(v)
    ? v.length <= 2000
    : /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v) && v.length <= 700_000;
}

// Returns undefined when input is undefined (so updates can skip the field).
function sanitizeImages(images: string[] | undefined): string[] | undefined {
  if (images === undefined) return undefined;
  return images.filter(isValidImage).slice(0, 4);
}

// Reconcile a product's variants against the submitted set: update existing
// (by id), create new (no id), delete the rest. Each variant's images are
// replaced wholesale, and a stock change records an ADJUSTMENT movement so the
// inventory audit trail stays complete.
async function syncVariants(
  tx: Prisma.TransactionClient,
  productId: string,
  variants: ProductVariantInput[],
) {
  const existing = await tx.productVariant.findMany({ where: { productId }, select: { id: true, stock: true } });
  const existingById = new Map(existing.map((v) => [v.id, v]));
  const keptIds = new Set(variants.map((v) => v.id).filter(Boolean) as string[]);

  // Delete variants the admin removed.
  const toDelete = existing.filter((v) => !keptIds.has(v.id)).map((v) => v.id);
  if (toDelete.length) await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } });

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const images = v.images.filter(isValidImage).slice(0, 6);
    const imageRows = images.map((url, position) => ({ url, position }));

    if (v.id && existingById.has(v.id)) {
      const prev = existingById.get(v.id)!;
      await tx.productVariant.update({
        where: { id: v.id },
        data: {
          name: v.name,
          colorHex: v.colorHex,
          sku: v.sku ?? null,
          stock: v.stock,
          isActive: v.isActive,
          position: i,
          images: { deleteMany: {}, create: imageRows },
        },
      });
      if (prev.stock !== v.stock) {
        await tx.inventoryMovement.create({
          data: { variantId: v.id, delta: v.stock - prev.stock, reason: "ADJUSTMENT" },
        });
      }
    } else {
      await tx.productVariant.create({
        data: {
          productId,
          name: v.name,
          colorHex: v.colorHex,
          sku: v.sku ?? null,
          stock: v.stock,
          isActive: v.isActive,
          position: i,
          images: { create: imageRows },
          ...(v.stock > 0
            ? { movements: { create: { delta: v.stock, reason: "RESTOCK" } } }
            : {}),
        },
      });
    }
  }
}

// Server Action arguments can't contain deeply-nested arrays — variant images
// inside variants[] hit React's "Maximum array nesting exceeded" guard. The
// client therefore sends the payload as a JSON string; accept either for safety.
function parseInput(input: unknown): unknown {
  if (typeof input !== "string") return input;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

export async function createProduct(input: unknown): Promise<ProductActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const parsed = productSchema.safeParse(parseInput(input));
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };
    const data = parsed.data;
    await assertProjectAccess(user, data.projectId);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          images: sanitizeImages(data.images) ?? [],
          projectId: data.projectId,
          basePrice: data.basePrice,
          isActive: data.isActive,
          tiers: { create: sortTiers(data.tiers) },
        },
      });
      if (data.variants !== undefined) await syncVariants(tx, created.id, data.variants);
      return created;
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

    const parsed = productSchema.safeParse(parseInput(input));
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };
    const data = parsed.data;
    await assertProjectAccess(user, data.projectId);

    const images = sanitizeImages(data.images);
    await prisma.$transaction(async (tx) => {
      await tx.productTier.deleteMany({ where: { productId: id } });
      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description ?? null,
          projectId: data.projectId,
          basePrice: data.basePrice,
          isActive: data.isActive,
          tiers: { create: sortTiers(data.tiers) },
          ...(images !== undefined ? { images } : {}), // skip when not provided
        },
      });
      if (data.variants !== undefined) await syncVariants(tx, id, data.variants);
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
