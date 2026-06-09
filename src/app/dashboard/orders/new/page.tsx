import { getAccessibleProjects } from "@/app/actions/projects";
import { OrderForm } from "@/components/orders/order-form";

export default async function NewOrderPage() {
  const projects = await getAccessibleProjects();

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
        <OrderForm projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
      )}
    </div>
  );
}
