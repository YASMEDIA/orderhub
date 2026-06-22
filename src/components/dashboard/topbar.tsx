"use client";

import { signOut } from "next-auth/react";
import { Menu, LogOut } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "./sidebar-nav";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { labelFor, ROLES } from "@/lib/constants";
import { BrandLogo } from "@/components/brand";

export function Topbar({ name, email, role }: { name: string; email: string; role: Role }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        {/* Mobile nav */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="left-0 top-0 h-full max-w-[260px] translate-x-0 translate-y-0 rounded-none p-0">
            <DialogTitle className="px-4 pt-4">
              <BrandLogo className="h-7" />
            </DialogTitle>
            <SidebarNav role={role} />
          </DialogContent>
        </Dialog>
        <BrandLogo className="h-7 lg:hidden" />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <span className="hidden text-sm font-medium sm:inline">{name}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {name.slice(0, 2).toUpperCase()}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{name}</span>
                <span className="text-xs font-normal text-muted-foreground">{email}</span>
                <span className="mt-1 text-xs font-normal text-muted-foreground">{labelFor(ROLES, role)}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
