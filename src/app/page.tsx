import { redirect } from "next/navigation";
import { headers } from "next/headers";

// The public apex (mahalatly.com) shows a simple branded landing page. Every
// other host (the dashboard subdomain, Vercel previews, local dev) goes
// straight to the login screen.
export default async function Home() {
  const host = (await headers()).get("host")?.toLowerCase() ?? "";
  const isPublicApex = host === "mahalatly.com" || host === "www.mahalatly.com";
  if (!isPublicApex) redirect("/login");
  return <Landing />;
}

// Self-contained, always-light hero (explicit brand colors, independent of the
// app's theme). Navy #0c023c / blue #41a2d5.
function Landing() {
  const year = new Date().getFullYear();
  return (
    <main
      dir="rtl"
      style={{ backgroundColor: "#ffffff", color: "#0c023c" }}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      {/* Soft brand glow behind the mark */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-[460px] w-[460px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(65,162,213,0.20), transparent)" }}
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mahalatly-logo.svg" alt="Mahalatly" className="h-16 w-auto sm:h-20" />

        <h1 className="text-2xl font-bold leading-snug sm:text-3xl" style={{ color: "#0c023c" }}>
          متجرك الإلكتروني وإدارة طلباتك في مكان واحد
        </h1>

        <p dir="ltr" className="max-w-md text-sm leading-relaxed sm:text-base" style={{ color: "#5b5870" }}>
          Build your store, take orders, and manage delivery — all in one place.
        </p>

        <a
          href="https://dashboard.mahalatly.com/login"
          className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: "#0c023c" }}
        >
          لوحة التحكم · Dashboard
        </a>
      </div>

      <footer className="absolute bottom-6 text-xs" style={{ color: "#9b98ac" }}>
        © {year} Mahalatly · محلاتلي
      </footer>
    </main>
  );
}
