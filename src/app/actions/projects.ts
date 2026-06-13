"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/rbac";
import { projectSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";

export type ProjectActionResult = { ok: boolean; message: string };

function parse(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    website: formData.get("website") ?? "",
    instagram: formData.get("instagram") ?? "",
    tiktok: formData.get("tiktok") ?? "",
    status: formData.get("status"),
    slug: formData.get("slug") ?? "",
    logoUrl: formData.get("logoUrl") ?? "",
    storeEnabled: formData.get("storeEnabled") === "on" || formData.get("storeEnabled") === "true",
  });
}

function isUniqueSlugError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}

export async function createProject(formData: FormData): Promise<ProjectActionResult> {
  const user = await requireRole("SUPER_ADMIN");
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };

  try {
    const project = await prisma.project.create({ data: parsed.data });
    await logActivity({ userId: user.id, action: "Create Project", detail: project.name, projectId: project.id });
    revalidatePath("/dashboard/projects");
    return { ok: true, message: "Project created" };
  } catch (err) {
    if (isUniqueSlugError(err)) return { ok: false, message: "That storefront link (slug) is already taken." };
    throw err;
  }
}

export async function updateProject(id: string, formData: FormData): Promise<ProjectActionResult> {
  const user = await requireRole("SUPER_ADMIN");
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };

  try {
    await prisma.project.update({ where: { id }, data: parsed.data });
    await logActivity({ userId: user.id, action: "Edit Project", detail: parsed.data.name, projectId: id });
    revalidatePath("/dashboard/projects");
    return { ok: true, message: "Project updated" };
  } catch (err) {
    if (isUniqueSlugError(err)) return { ok: false, message: "That storefront link (slug) is already taken." };
    throw err;
  }
}

export async function deleteProject(id: string): Promise<ProjectActionResult> {
  const user = await requireRole("SUPER_ADMIN");
  const orderCount = await prisma.order.count({ where: { projectId: id } });
  if (orderCount > 0) {
    return { ok: false, message: "Cannot delete a project that has orders. Set it to Inactive instead." };
  }
  const project = await prisma.project.delete({ where: { id } });
  await logActivity({ userId: user.id, action: "Delete Project", detail: project.name });
  revalidatePath("/dashboard/projects");
  return { ok: true, message: "Project deleted" };
}

// Projects the current user may create orders in.
export async function getAccessibleProjects() {
  const user = await requireUser();
  if (user.role === "SUPER_ADMIN") {
    return prisma.project.findMany({ orderBy: { name: "asc" } });
  }
  return prisma.project.findMany({
    where: { id: { in: user.projectIds }, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}
