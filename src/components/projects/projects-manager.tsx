"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Project } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createProject, updateProject, deleteProject } from "@/app/actions/projects";
import { useToast } from "@/components/ui/toast";

export function ProjectsManager({ projects }: { projects: (Project & { _count: { orders: number } })[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(p: Project) { setEditing(p); setOpen(true); }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = editing ? await updateProject(editing.id, fd) : await createProject(fd);
      toast({ title: res.ok ? "Saved" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok) { setOpen(false); router.refresh(); }
    });
  }

  function onDelete(id: string) {
    if (!confirm("Delete this project?")) return;
    startTransition(async () => {
      const res = await deleteProject(id);
      toast({ title: res.ok ? "Deleted" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Project</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No projects yet.</TableCell></TableRow>
              ) : (
                projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.storeEnabled && p.slug ? (
                        <a href={`/store/${p.slug}`} target="_blank" rel="noopener noreferrer" className="block text-xs font-normal text-primary hover:underline">
                          /store/{p.slug}
                        </a>
                      ) : null}
                    </TableCell>
                    <TableCell>{p.phone || "—"}</TableCell>
                    <TableCell>{p._count.orders}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "ACTIVE" ? "success" : "secondary"}>
                        {p.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Project Name</Label><Input name="name" defaultValue={editing?.name} required /></div>
            <div className="space-y-2"><Label>Phone Number (optional)</Label><Input name="phone" defaultValue={editing?.phone ?? ""} /></div>
            <div className="space-y-2"><Label>Website (optional)</Label><Input name="website" type="url" defaultValue={editing?.website ?? ""} placeholder="https://" /></div>
            <div className="space-y-2"><Label>Instagram URL (optional)</Label><Input name="instagram" type="url" defaultValue={editing?.instagram ?? ""} placeholder="https://instagram.com/..." /></div>
            <div className="space-y-2"><Label>TikTok URL (optional)</Label><Input name="tiktok" type="url" defaultValue={editing?.tiktok ?? ""} placeholder="https://tiktok.com/@..." /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select name="status" defaultValue={editing?.status ?? "ACTIVE"} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">Storefront (logo, link, products) is managed in the <span className="font-medium">Store</span> page.</p>

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
