import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { StoreDirectory, type HomeStore } from "@/components/home/store-directory";

const fallbackStores: HomeStore[] = [
  {
    name: "Boutique 313",
    slug: "313-boutique",
    logoUrl: "/brand/mahalatly-icon.svg",
    href: "https://mahalatly.com/store/313-boutique",
  },
  {
    name: "3D Pick",
    slug: "3d-pick",
    logoUrl: "/brand/mahalatly-icon.svg",
    href: "https://mahalatly.com/store/3d-pick",
  },
];

async function getHomepageStores(): Promise<HomeStore[]> {
  try {
    const projects = await prisma.project.findMany({
      where: {
        status: "ACTIVE",
        storeEnabled: true,
        showOnHome: true,
        slug: { not: null },
      },
      select: {
        name: true,
        slug: true,
        logoUrl: true,
      },
      orderBy: { name: "asc" },
    });

    const stores = projects
      .filter((project): project is { name: string; slug: string; logoUrl: string | null } => Boolean(project.slug))
      .map((project) => ({
        name: project.name,
        slug: project.slug,
        logoUrl: project.logoUrl,
        href: `/store/${project.slug}`,
      }));

    return stores.length ? stores : fallbackStores;
  } catch {
    return fallbackStores;
  }
}

// The public apex (and local dev) show the storefront directory. Dashboard
// subdomains and preview hosts still go straight to the login screen.
export default async function Home() {
  const host = (await headers()).get("host")?.toLowerCase() ?? "";
  const isPublicApex =
    host === "mahalatly.com" ||
    host === "www.mahalatly.com" ||
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:");
  if (!isPublicApex) redirect("/login");
  const stores = await getHomepageStores();
  return <Landing stores={stores} />;
}

// Self-contained, always-light hero (explicit brand colors, independent of the
// app's theme). Navy #0c023c / blue #41a2d5.
function Landing({ stores }: { stores: HomeStore[] }) {
  const year = new Date().getFullYear();
  return (
    <main
      dir="rtl"
      style={{ backgroundColor: "#ffffff", color: "#0c023c" }}
      className="relative min-h-screen overflow-hidden px-5 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-20 h-72"
        style={{ background: "radial-gradient(closest-side, rgba(65,162,213,0.14), transparent 72%)" }}
      />

      <header dir="ltr" className="animate-soft-fade relative z-10 mx-auto flex h-24 w-full max-w-7xl items-center justify-between border-b border-[#eef2f7]">
        <div className="flex items-center gap-3">
          <button className="h-14 w-16 rounded-full border border-[#dfe7f2] bg-white text-sm font-black shadow-[0_10px_24px_rgba(12,2,60,0.08)]">
            EN
          </button>
          <a
            href="https://wa.me/"
            className="inline-flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-[#0c023c] text-sm font-bold text-white shadow-[0_12px_28px_rgba(12,2,60,0.16)] sm:w-auto sm:px-5"
            aria-label="تواصل عبر واتساب"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M12.04 2a9.87 9.87 0 0 0-8.5 14.9L2.3 21.5l4.74-1.22A9.93 9.93 0 1 0 12.04 2Zm0 1.8a8.12 8.12 0 0 1 6.94 12.36 8.18 8.18 0 0 1-10.95 2.5l-.34-.2-2.82.73.74-2.72-.22-.36A8.09 8.09 0 0 1 12.04 3.8Zm-3.32 4.3c-.18 0-.46.07-.7.34-.24.26-.92.9-.92 2.2 0 1.28.94 2.53 1.07 2.7.13.18 1.82 2.9 4.5 3.95 2.22.88 2.68.7 3.16.66.49-.04 1.56-.64 1.78-1.26.22-.62.22-1.15.15-1.26-.06-.12-.24-.18-.5-.31-.26-.13-1.56-.77-1.8-.86-.24-.09-.42-.13-.6.13-.17.26-.68.86-.83 1.03-.15.18-.31.2-.57.07-.26-.13-1.1-.4-2.1-1.3-.78-.69-1.3-1.55-1.45-1.81-.15-.26-.02-.4.11-.53.12-.12.26-.31.4-.46.13-.15.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.59-1.42-.8-1.94-.22-.5-.44-.44-.6-.45h-.52Z" />
            </svg>
            <span className="hidden sm:inline">تواصل عبر واتساب</span>
          </a>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mahalatly-icon.svg" alt="Mahalatly" className="h-14 w-14" />
      </header>

      <section className="animate-soft-enter relative z-10 mx-auto my-6 flex min-h-[560px] w-full max-w-4xl flex-col items-center justify-center rounded-[24px] border border-[#dfe3eb] bg-white/92 px-4 py-10 shadow-[0_20px_52px_rgba(12,2,60,0.07)] sm:my-8 sm:min-h-[620px] sm:rounded-[30px] sm:px-6">
        <div className="animate-soft-enter animate-delay-1 mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mahalatly-logo.svg" alt="Mahalatly" className="h-14 w-auto sm:h-16" />
          <h1 className="text-base font-bold leading-tight sm:text-lg" style={{ color: "#5b6678" }}>
            ابحث عن المتجر..
          </h1>
        </div>

        <StoreDirectory stores={stores} />
      </section>

      <footer className="pb-6 text-xs" style={{ color: "#9b98ac" }}>
        © {year} Mahalatly · محلاتلي
      </footer>
    </main>
  );
}
