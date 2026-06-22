"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/rbac";
import { projectSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";

export type ProjectActionResult = { ok: boolean; message: string };

// Note: storefront fields (slug, logoUrl, storeEnabled) and contact/social
// fields (phone, instagram, tiktok, whatsapp) are intentionally NOT managed
// here — the Store page (updateStoreSettings) owns them, so editing a project
// never clobbers store config or contact details.
function parse(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website") ?? "",
    status: formData.get("status"),
  });
}

export async function createProject(formData: FormData): Promise<ProjectActionResult> {
  const user = await requireRole("SUPER_ADMIN");
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };

  const project = await prisma.project.create({ data: parsed.data });
  await logActivity({ userId: user.id, action: "Create Project", detail: project.name, projectId: project.id });
  revalidatePath("/dashboard/projects");
  return { ok: true, message: "Project created" };
}

export async function updateProject(id: string, formData: FormData): Promise<ProjectActionResult> {
  const user = await requireRole("SUPER_ADMIN");
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid input" };

  await prisma.project.update({ where: { id }, data: parsed.data });
  await logActivity({ userId: user.id, action: "Edit Project", detail: parsed.data.name, projectId: id });
  revalidatePath("/dashboard/projects");
  return { ok: true, message: "Project updated" };
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
