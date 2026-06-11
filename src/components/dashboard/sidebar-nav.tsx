"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  ShoppingCart,
  FolderKanban,
  Package,
  Users,
  BarChart3,
  Settings,
  ScrollText,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ElementType; roles: Role[] };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/orders/new", label: "New Order", icon: PlusCircle, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/products", label: "Products", icon: Package, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/dashboard/users", label: "Users", icon: Users, roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/dashboard/activity", label: "Activity Logs", icon: ScrollText, roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["SUPER_ADMIN"] },
];

export function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => i.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
