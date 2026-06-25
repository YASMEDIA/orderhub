"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { rateLimit } from "@/lib/rate-limit";
import { appUrl } from "@/lib/qr";
import { sendPasswordResetEmail } from "@/lib/email";

export type ActionResult = { ok: boolean; message: string; token?: string };

// Identical response whether or not the email exists, so the form can't be used
// to discover which emails have accounts.
const GENERIC_RESET_MESSAGE = "If that email has an account, a reset link has been sent to it.";

// Emails a one-time reset link to the account owner. The token is NEVER returned
// to the browser in production — only the user's inbox receives it.
export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, message: "Invalid email address" };

  const rl = rateLimit(`forgot:${parsed.data.email}`, 3, 60_000);
  if (!rl.ok) return { ok: false, message: "Too many requests. Try again later." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (!user || !user.isActive) {
    return { ok: true, message: GENERIC_RESET_MESSAGE };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
  });
  await logActivity({ userId: user.id, action: "Password Reset Requested" });

  const resetUrl = appUrl(`/reset-password?token=${token}`);
  const sent = await sendPasswordResetEmail(user.email, resetUrl);

  // Local development only: when no email provider is configured, surface the
  // link so resets are testable. In production the link is never returned.
  if (process.env.NODE_ENV !== "production" && !sent) {
    return { ok: true, message: "Dev: no email provider — use this link.", token };
  }
  return { ok: true, message: GENERIC_RESET_MESSAGE };
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
