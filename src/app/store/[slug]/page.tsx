import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Storefront } from "@/components/store/storefront";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });
  return { title: project ? `${project.name} — Order Online` : "Store" };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isActive: true },
        include: { tiers: { orderBy: { minQuantity: "asc" } } },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!project || !project.storeEnabled || project.status !== "ACTIVE") notFound();

  return (
    <Storefront
      project={{ name: project.name, slug: project.slug!, logoUrl: project.logoUrl, phone: project.phone }}
      products={project.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        images: p.images,
        basePrice: p.basePrice,
        tiers: p.tiers.map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })),
      }))}
    />
  );
}
