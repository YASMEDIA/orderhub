"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createUser, updateUser, deleteUser, toggleUserActive, adminResetPassword } from "@/app/actions/users";
import { useToast } from "@/components/ui/toast";
import { ROLES, labelFor } from "@/lib/constants";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  assignments: { projectId: string }[];
};
type ProjectOption = { id: string; name: string };

export function UsersManager({ users, projects }: { users: UserRow[]; projects: ProjectOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null); setSelected([]); setRole("EMPLOYEE"); setOpen(true);
  }
  function openEdit(u: UserRow) {
    setEditing(u); setSelected(u.assignments.map((a) => a.projectId)); setRole(u.role); setOpen(true);
  }
  function toggleProject(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      ...(editing ? { id: editing.id } : {}),
      fullName: String(fd.get("fullName")),
      email: String(fd.get("email")),
      password: String(fd.get("password") || ""),
      role,
      projectIds: role === "SUPER_ADMIN" ? [] : selected,
    };
    startTransition(async () => {
      const res = editing
        ? await updateUser(payload)
        : await createUser({ ...payload, password: payload.password });
      toast({ title: res.ok ? "Saved" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok) { setOpen(false); router.refresh(); }
    });
  }

  function act(fn: () => Promise<{ ok: boolean; message: string; token?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.token) {
        const link = `${window.location.origin}/reset-password?token=${res.token}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        toast({ title: "Reset link copied", description: link });
      } else {
        toast({ title: res.ok ? "Done" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      }
      if (res.ok) router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New User</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Badge variant="outline">{labelFor(ROLES, u.role)}</Badge></TableCell>
                  <TableCell>{u.role === "SUPER_ADMIN" ? "All" : u.assignments.length}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "success" : "secondary"}>{u.isActive ? "Active" : "Disabled"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => act(() => adminResetPassword(u.id))} title="Reset password"><KeyRound className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => act(() => toggleUserActive(u.id))} title={u.isActive ? "Disable" : "Enable"}>
                      {u.isActive ? <Ban className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirm("Delete this user?") && act(() => deleteUser(u.id))} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit User" : "New User"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label><Input name="fullName" defaultValue={editing?.fullName} required /></div>
            <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={editing?.email} required /></div>
            <div className="space-y-2">
              <Label>{editing ? "New Password (leave blank to keep)" : "Password"}</Label>
              <Input name="password" type="password" minLength={editing ? 0 : 8} required={!editing} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {role !== "SUPER_ADMIN" && (
              <div className="space-y-2">
                <Label>Assigned Projects</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                  {projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects available.</p> : projects.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleProject(p.id)} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
