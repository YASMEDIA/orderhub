"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/rbac";
import { settingsSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";

export type SettingsActionResult = { ok: boolean; message: string };

export async function getSettings() {
  return prisma.setting.upsert({ where: { id: "global" }, create: { id: "global" }, update: {} });
}

export async function updateSettings(formData: FormData): Promise<SettingsActionResult> {
  try {
    const actor = await requireRole("SUPER_ADMIN");
    const parsed = settingsSchema.safeParse({
      currency: formData.get("currency"),
      timezone: formData.get("timezone"),
      receiptHeader: formData.get("receiptHeader") ?? "",
      receiptFooter: formData.get("receiptFooter") ?? "",
      qrSize: formData.get("qrSize"),
    });
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };

    await prisma.setting.upsert({
      where: { id: "global" },
      create: { id: "global", ...parsed.data },
      update: parsed.data,
    });
    await logActivity({ userId: actor.id, action: "Update Settings" });
    revalidatePath("/dashboard/settings");
    return { ok: true, message: "Settings saved" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Failed to save settings" };
  }
}
