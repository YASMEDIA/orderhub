import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getAccessibleProjects } from "@/app/actions/projects";
import { getAccessibleProducts } from "@/app/actions/products";
import { OrderForm } from "@/components/orders/order-form";

export default async function NewOrderPage() {
  const user = await requireUser();
  if (user.role === "DRIVER") redirect("/dashboard/orders"); // drivers can't create orders
  const [projects, products] = await Promise.all([getAccessibleProjects(), getAccessibleProducts()]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Order</h1>
        <p className="text-sm text-muted-foreground">Create a delivery order and generate its receipt.</p>
      </div>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You have no active projects assigned. Ask a Super Admin to assign you to a project.
        </p>
      ) : (
        <OrderForm
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            projectId: p.projectId,
            basePrice: p.basePrice,
            tiers: p.tiers.map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })),
            variants: p.variants.map((v) => ({ id: v.id, name: v.name, colorHex: v.colorHex, stock: v.stock })),
          }))}
        />
      )}
    </div>
  );
}
