"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createProduct, updateProduct, deleteProduct } from "@/app/actions/products";
import { useToast } from "@/components/ui/toast";
import { formatAmount } from "@/lib/format";
import { CURRENCY } from "@/lib/constants";

type Tier = { minQuantity: number | string; unitPrice: number | string };
type ProductRow = {
  id: string;
  name: string;
  basePrice: number;
  isActive: boolean;
  projectId: string;
  project: { name: string };
  tiers: { minQuantity: number; unitPrice: number }[];
};
type ProjectOption = { id: string; name: string };

export function ProductsManager({
  products,
  projects,
}: {
  products: ProductRow[];
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [basePrice, setBasePrice] = useState<string>("0");
  const [isActive, setIsActive] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [pending, startTransition] = useTransition();
  const [projectFilter, setProjectFilter] = useState("");

  const shown = useMemo(
    () => (projectFilter ? products.filter((p) => p.projectId === projectFilter) : products),
    [products, projectFilter],
  );

  function openCreate() {
    setEditing(null);
    setName("");
    setProjectId(projects[0]?.id ?? "");
    setBasePrice("0");
    setIsActive(true);
    setTiers([]);
    setOpen(true);
  }
  function openEdit(p: ProductRow) {
    setEditing(p);
    setName(p.name);
    setProjectId(p.projectId);
    setBasePrice(String(p.basePrice));
    setIsActive(p.isActive);
    setTiers(p.tiers.map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })));
    setOpen(true);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = {
      name,
      projectId,
      basePrice,
      isActive,
      tiers: tiers
        .filter((t) => String(t.minQuantity) !== "" && String(t.unitPrice) !== "")
        .map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })),
    };
    startTransition(async () => {
      const res = editing ? await updateProduct(editing.id, payload) : await createProduct(payload);
      toast({ title: res.ok ? "Saved" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function onDelete(p: ProductRow) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteProduct(p.id);
      toast({ title: res.ok ? "Deleted" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok) router.refresh();
    });
  }

  const tierSummary = (p: ProductRow) =>
    p.tiers.length === 0
      ? "—"
      : p.tiers.map((t) => `${t.minQuantity}+ → ${formatAmount(t.unitPrice)}`).join(", ");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Button onClick={openCreate} disabled={projects.length === 0}>
          <Plus className="h-4 w-4" /> New Product
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Quantity Tiers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No products yet.</TableCell></TableRow>
              ) : (
                shown.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.project.name}</TableCell>
                    <TableCell>{formatAmount(p.basePrice)} {CURRENCY}</TableCell>
                    <TableCell className="text-muted-foreground">{tierSummary(p)}</TableCell>
                    <TableCell><Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Husseini Turbah" />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Base Price ({CURRENCY}) — unit price for quantity 1+</Label>
              <Input type="number" step="0.001" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Quantity Tiers (cheaper per unit as quantity grows)</Label>
              </div>
              <p className="text-xs text-muted-foreground">From a quantity, the unit price drops. e.g. 5 → 1.800, 10 → 1.700.</p>
              <div className="space-y-2">
                {tiers.map((t, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">From qty</Label>
                      <Input
                        type="number" min={2} value={t.minQuantity}
                        onChange={(e) => setTiers((prev) => prev.map((x, j) => (j === i ? { ...x, minQuantity: e.target.value } : x)))}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Unit price ({CURRENCY})</Label>
                      <Input
                        type="number" step="0.001" min={0} value={t.unitPrice}
                        onChange={(e) => setTiers((prev) => prev.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setTiers((prev) => prev.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setTiers((prev) => [...prev, { minQuantity: "", unitPrice: "" }])}>
                  <Plus className="h-4 w-4" /> Add Tier
                </Button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (available when creating orders)
            </label>

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
