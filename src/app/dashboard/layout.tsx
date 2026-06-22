import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Topbar } from "@/components/dashboard/topbar";
import { BrandLogo } from "@/components/brand";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { name, email, role } = session.user;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <div className="flex h-16 items-center border-b px-6">
          <BrandLogo className="h-8" />
        </div>
        <SidebarNav role={role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name ?? "User"} email={email ?? ""} role={role} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
