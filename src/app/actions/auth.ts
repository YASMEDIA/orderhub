"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { rateLimit } from "@/lib/rate-limit";

export type ActionResult = { ok: boolean; message: string; token?: string };

// Generates a reset token. In production, email this link instead of returning it.
export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, message: "Invalid email address" };

  const rl = rateLimit(`forgot:${parsed.data.email}`, 3, 60_000);
  if (!rl.ok) return { ok: false, message: "Too many requests. Try again later." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always respond success to avoid email enumeration.
  if (!user || !user.isActive) {
    return { ok: true, message: "If that email exists, a reset link has been generated." };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
  });
  await logActivity({ userId: user.id, action: "Password Reset Requested" });

  // Returned only for demo/dev. Replace with an email send in production.
  return {
    ok: true,
    message: "Reset link generated.",
    token,
  };
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({ where: { resetToken: parsed.data.token } });
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return { ok: false, message: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });
  await logActivity({ userId: user.id, action: "Password Reset Completed" });

  return { ok: true, message: "Password updated. You can now sign in." };
}
