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
    where: { slug: normalizeSlug(slug) },
    include: {
      products: {
        where: { isActive: true },
        include: {
          tiers: { orderBy: { minQuantity: "asc" } },
          variants: {
            where: { isActive: true },
            orderBy: { position: "asc" },
            include: { images: { orderBy: { position: "asc" } } },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!project || !project.storeEnabled || project.status !== "ACTIVE") notFound();

  // Flat variantId -> image urls map: nesting images inside products[].variants[]
  // exceeds React's RSC array-nesting limit for large base64 strings.
  const variantImages: Record<string, string[]> = {};
  for (const p of project.products) {
    for (const v of p.variants) variantImages[v.id] = v.images.map((img) => img.url);
  }

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
      variantImages={variantImages}
      products={project.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        images: p.images,
        basePrice: p.basePrice,
        tiers: p.tiers.map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })),
        variants: p.variants.map((v) => ({
          id: v.id,
          name: v.name,
          colorHex: v.colorHex,
          stock: v.stock,
        })),
      }))}
    />
  );
}
