import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Storefront } from "@/components/store/storefront";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) return { title: "Store" };
  return {
    title: `${project.name} — Order Online`,
    // Use the store's own logo as the browser-tab favicon (and the icon shown
    // when a customer saves the store to their home screen). Falls back to the
    // app default when no logo is set.
    icons: project.logoUrl
      ? { icon: project.logoUrl, shortcut: project.logoUrl, apple: project.logoUrl }
      : undefined,
  };
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
      project={{
        name: project.name,
        slug: project.slug!,
        logoUrl: project.logoUrl,
        phone: project.phone,
        instagram: project.instagram,
        tiktok: project.tiktok,
        whatsapp: project.whatsapp,
      }}
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
