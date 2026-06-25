import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getAccessibleProjects } from "@/app/actions/projects";
import { StoreManager } from "@/components/store/store-manager";

export default async function StorePage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") redirect("/dashboard");

  const projects = await getAccessibleProjects();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Store</h1>
        <p className="text-sm text-muted-foreground">
          Manage your public ordering page — logo, link, visibility and contact links. Products are managed from the Products page.
        </p>
      </div>
      <StoreManager
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          logoUrl: p.logoUrl,
          storeEnabled: p.storeEnabled,
          instagram: p.instagram,
          tiktok: p.tiktok,
          whatsapp: p.whatsapp,
          phone: p.phone,
        }))}
      />
    </div>
  );
}
