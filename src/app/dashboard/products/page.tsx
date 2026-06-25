import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, projectScopeWhere } from "@/lib/rbac";
import { getAccessibleProjects } from "@/app/actions/projects";
import { ProductsManager } from "@/components/products/products-manager";

export default async function ProductsPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") redirect("/dashboard");

  const [products, projects] = await Promise.all([
    prisma.product.findMany({
      where: projectScopeWhere(user),
      include: {
        project: { select: { name: true } },
        tiers: { orderBy: { minQuantity: "asc" } },
        variants: {
          orderBy: { position: "asc" },
          include: { images: { orderBy: { position: "asc" } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getAccessibleProjects(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">
          Manage products per project — images, colour variants, stock, and quantity-based pricing. These power both the online store and order creation.
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
            images: p.images,
            basePrice: p.basePrice,
            isActive: p.isActive,
            projectId: p.projectId,
            project: { name: p.project.name },
            tiers: p.tiers.map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })),
            variants: p.variants.map((v) => ({
              id: v.id,
              name: v.name,
              colorHex: v.colorHex,
              sku: v.sku,
              stock: v.stock,
              isActive: v.isActive,
              images: v.images.map((img) => img.url),
            })),
          }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}
    </div>
  );
}
