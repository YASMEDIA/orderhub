import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { StoreManager } from "@/components/store/store-manager";

export default async function StorePage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") redirect("/dashboard");

  const projects = await prisma.project.findMany({
    where: user.role === "SUPER_ADMIN" ? {} : { id: { in: user.projectIds } },
    include: {
      products: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          images: true,
          isActive: true,
          position: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

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
          showOnHome: p.showOnHome,
          showStock: p.showStock,
          instagram: p.instagram,
          tiktok: p.tiktok,
          whatsapp: p.whatsapp,
          phone: p.phone,
          facebookPixelId: p.facebookPixelId,
          products: p.products.map((product) => ({
            id: product.id,
            name: product.name,
            image: product.images[0] ?? null,
            isActive: product.isActive,
            position: product.position,
          })),
        }))}
      />
    </div>
  );
}
