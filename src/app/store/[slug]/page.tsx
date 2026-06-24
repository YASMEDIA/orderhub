import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Storefront } from "@/components/store/storefront";

// Slugs are stored lowercase; normalize the incoming param so links that arrive
// with different casing or surrounding whitespace still resolve to the store.
function normalizeSlug(slug: string): string {
  return decodeURIComponent(slug).trim().toLowerCase();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug: normalizeSlug(slug) } });
  return { title: project ? `${project.name} — Order Online` : "Store" };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug: normalizeSlug(slug) },
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
