"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/rbac";
import { userCreateSchema, userUpdateSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";

export type UserActionResult = { ok: boolean; message: string; token?: string };

async function syncAssignments(userId: string, projectIds: string[]) {
  await prisma.projectAssignment.deleteMany({ where: { userId } });
  if (projectIds.length) {
    await prisma.projectAssignment.createMany({
      data: projectIds.map((projectId) => ({ userId, projectId })),
      skipDuplicates: true,
    });
  }
}

export async function createUser(input: unknown): Promise<UserActionResult> {
  try {
    const actor = await requireRole("SUPER_ADMIN");
    const parsed = userCreateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };
    const data = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return { ok: false, message: "A user with this email already exists" };

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { fullName: data.fullName, email: data.email, passwordHash, role: data.role },
    });
    await syncAssignments(user.id, data.projectIds);
    await logActivity({ userId: actor.id, action: "Create User", detail: user.email });
    revalidatePath("/dashboard/users");
    return { ok: true, message: "User created" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Failed to create user" };
  }
}

export async function updateUser(input: unknown): Promise<UserActionResult> {
  try {
    const actor = await requireRole("SUPER_ADMIN");
    const parsed = userUpdateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };
    const data = parsed.data;

    const updateData: Record<string, unknown> = {
      fullName: data.fullName,
      email: data.email,
      role: data.role,
    };
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.user.update({ where: { id: data.id }, data: updateData });
    await syncAssignments(data.id, data.projectIds);
    await logActivity({ userId: actor.id, action: "Edit User", detail: data.email });
    revalidatePath("/dashboard/users");
    return { ok: true, message: "User updated" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Failed to update user" };
  }
}

export async function toggleUserActive(id: string): Promise<UserActionResult> {
  try {
    const actor = await requireRole("SUPER_ADMIN");
    if (actor.id === id) return { ok: false, message: "You cannot disable your own account" };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { ok: false, message: "User not found" };
    await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
    await logActivity({ userId: actor.id, action: user.isActive ? "Disable User" : "Enable User", detail: user.email });
    revalidatePath("/dashboard/users");
    return { ok: true, message: user.isActive ? "User disabled" : "User enabled" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Failed to update user" };
  }
}

export async function deleteUser(id: string): Promise<UserActionResult> {
  try {
    const actor = await requireRole("SUPER_ADMIN");
    if (actor.id === id) return { ok: false, message: "You cannot delete your own account" };
    const orders = await prisma.order.count({ where: { createdById: id } });
    if (orders > 0) return { ok: false, message: "This user has orders. Disable the account instead." };
    const user = await prisma.user.delete({ where: { id } });
    await logActivity({ userId: actor.id, action: "Delete User", detail: user.email });
    revalidatePath("/dashboard/users");
    return { ok: true, message: "User deleted" };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Failed to delete user" };
  }
}

export async function adminResetPassword(id: string): Promise<UserActionResult> {
  try {
    const actor = await requireRole("SUPER_ADMIN");
    const token = randomBytes(32).toString("hex");
    const user = await prisma.user.update({
      where: { id },
      data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await logActivity({ userId: actor.id, action: "Reset User Password", detail: user.email });
    return { ok: true, message: "Reset link generated", token };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    return { ok: false, message: "Failed to reset password" };
  }
}
