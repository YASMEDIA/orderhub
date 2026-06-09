import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessProject } from "@/lib/rbac";
import { getAccessibleProjects } from "@/app/actions/projects";
import { OrderForm } from "@/components/orders/order-form";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (user.role === "EMPLOYEE") redirect(`/dashboard/orders/${id}`);

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  if (!canAccessProject(user, order.projectId)) redirect("/dashboard/orders");

  const projects = await getAccessibleProjects();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit {order.orderNumber}</h1>
        <p className="text-sm text-muted-foreground">Update order details. Totals recalculate automatically.</p>
      </div>
      <OrderForm
        orderId={order.id}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        defaultValues={{
          projectId: order.projectId,
          customerName: order.customerName,
          source: order.source,
          paymentMethod: order.paymentMethod,
          orderDate: order.orderDate.toISOString().slice(0, 10),
          deliveryDate: order.deliveryDate.toISOString().slice(0, 10),
          governorate: order.governorate,
          area: order.area,
          block: order.block,
          street: order.street,
          housingType: order.housingType,
          buildingNumber: order.buildingNumber,
          floor: order.floor ?? "",
          apartmentNumber: order.apartmentNumber ?? "",
          deliveryFee: order.deliveryFee,
          items: order.items.map((it) => ({ productName: it.productName, quantity: it.quantity, unitPrice: it.unitPrice })),
        }}
      />
    </div>
  );
}
