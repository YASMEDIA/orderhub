import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, projectScopeWhere } from "@/lib/rbac";
import { getAccessibleProjects } from "@/app/actions/projects";
import { ProductsManager } from "@/components/products/products-manager";

export default async function ProductsPage() {
  const user = await requireUser();
  if (user.role === "EMPLOYEE") redirect("/dashboard");

  const [products, projects] = await Promise.all([
    prisma.product.findMany({
      where: projectScopeWhere(user),
      include: { project: { select: { name: true } }, tiers: { orderBy: { minQuantity: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    getAccessibleProjects(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">
          Manage products per project with quantity-based pricing. They appear when creating orders for that project.
        </p>
      </div>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects available. Create a project first.</p>
      ) : (
        <ProductsManager
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            basePrice: p.basePrice,
            isActive: p.isActive,
            projectId: p.projectId,
            project: { name: p.project.name },
            tiers: p.tiers.map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })),
          }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}
    </div>
  );
}
