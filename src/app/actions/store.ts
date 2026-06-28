"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, assertProjectAccess, AuthError } from "@/lib/rbac";
import { storeSettingsSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";

export type StoreActionResult = { ok: boolean; message: string };

// Accept an https URL, an uploaded image as a base64 data URL, or empty.
// The client caps uploads at 500KB of raw bytes; base64 inflates that by ~1.37x,
// so a ~684K-char data URL is the real ceiling — 700_000 leaves a little slack.
function isValidLogo(value: string): boolean {
  if (value === "") return true;
  if (/^https:\/\//i.test(value)) return value.length <= 2000;
  return (
    /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(value) &&
    value.length <= 700_000
  );
}

export async function updateStoreSettings(projectId: string, input: unknown): Promise<StoreActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    await assertProjectAccess(user, projectId);

    const parsed = storeSettingsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };
    const data = parsed.data;

    if (!isValidLogo(data.logoUrl)) {
      return { ok: false, message: "Logo must be an image under 500KB (or an https URL)." };
    }
    if (data.storeEnabled && !data.slug) {
      return { ok: false, message: "Set a store link (slug) before enabling the storefront." };
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        slug: data.slug ?? null,
        storeEnabled: data.storeEnabled,
        showOnHome: data.showOnHome,
        showStock: data.showStock,
        logoUrl: data.logoUrl || null,
        instagram: data.instagram ?? null,
        tiktok: data.tiktok ?? null,
        whatsapp: data.whatsapp ?? null,
        phone: data.phone ?? null,
        facebookPixelId: data.facebookPixelId ?? null,
      },
    });
    await logActivity({ userId: user.id, action: "Update Store Settings", projectId });
    revalidatePath("/dashboard/store");
    revalidatePath("/dashboard/projects");
    revalidatePath("/");
    return { ok: true, message: "Store settings saved" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
      return { ok: false, message: "That store link (slug) is already taken." };
    }
    console.error(err);
    return { ok: false, message: "Failed to save store settings" };
  }
}

export async function reorderStoreProducts(projectId: string, productIds: string[]): Promise<StoreActionResult> {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    await assertProjectAccess(user, projectId);

    const uniqueIds = [...new Set(productIds.filter(Boolean))];
    if (uniqueIds.length !== productIds.length) return { ok: false, message: "Invalid product order" };

    const products = await prisma.product.findMany({
      where: { projectId },
      select: { id: true },
    });
    const projectProductIds = new Set(products.map((p) => p.id));
    if (uniqueIds.length !== products.length || uniqueIds.some((id) => !projectProductIds.has(id))) {
      return { ok: false, message: "Product list changed. Refresh and try again." };
    }

    await prisma.$transaction(
      uniqueIds.map((id, position) =>
        prisma.product.update({
          where: { id },
          data: { position },
        }),
      ),
    );

    await logActivity({ userId: user.id, action: "Reorder Store Products", projectId });
    revalidatePath("/dashboard/store");
    revalidatePath("/dashboard/products");
    revalidatePath("/store/[slug]", "page");
    return { ok: true, message: "Product order saved" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Failed to reorder products" };
  }
}
