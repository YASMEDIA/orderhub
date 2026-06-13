import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, projectScopeWhere } from "@/lib/rbac";
import { getAccessibleProjects } from "@/app/actions/projects";
import { StoreManager } from "@/components/store/store-manager";

export default async function StorePage() {
  const user = await requireUser();
  if (user.role === "EMPLOYEE") redirect("/dashboard");

  const [projects, products] = await Promise.all([
    getAccessibleProjects(),
    prisma.product.findMany({
      where: projectScopeWhere(user),
      include: { tiers: { orderBy: { minQuantity: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Store</h1>
        <p className="text-sm text-muted-foreground">
          Manage your public ordering page — logo, link, and the products customers can order.
        </p>
      </div>
      <StoreManager
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          logoUrl: p.logoUrl,
          storeEnabled: p.storeEnabled,
        }))}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          images: p.images,
          basePrice: p.basePrice,
          isActive: p.isActive,
          projectId: p.projectId,
          tiers: p.tiers.map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })),
        }))}
      />
    </div>
  );
}
