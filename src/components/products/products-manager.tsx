"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createProduct, updateProduct, deleteProduct } from "@/app/actions/products";
import { useToast } from "@/components/ui/toast";
import { formatAmount } from "@/lib/format";
import { CURRENCY } from "@/lib/constants";
import { compressImage } from "@/lib/image-compress";
import { VariantsEditor, type VariantDraft } from "@/components/store/variants-editor";

type Tier = { minQuantity: number | string; unitPrice: number | string };
type VariantRow = {
  id: string;
  name: string;
  colorHex: string;
  sku: string | null;
  stock: number;
  isActive: boolean;
};
type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  images: string[];
  basePrice: number;
  isActive: boolean;
  projectId: string;
  project: { name: string };
  tiers: { minQuantity: number; unitPrice: number }[];
  variants: VariantRow[];
};
type ProjectOption = { id: string; name: string };

export function ProductsManager({
  products,
  variantImages,
  projects,
}: {
  products: ProductRow[];
  // variantId -> image urls (kept flat to avoid deep RSC array nesting)
  variantImages: Record<string, string[]>;
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [images, setImages] = useState<string[]>([]);
  const [basePrice, setBasePrice] = useState<string>("0");
  const [isActive, setIsActive] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [pending, startTransition] = useTransition();
  const [projectFilter, setProjectFilter] = useState("");

  const shown = useMemo(
    () => (projectFilter ? products.filter((p) => p.projectId === projectFilter) : products),
    [products, projectFilter],
  );

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setProjectId(projects[0]?.id ?? "");
    setImages([]);
    setBasePrice("0");
    setIsActive(true);
    setTiers([]);
    setVariants([]);
    setOpen(true);
  }
  function openEdit(p: ProductRow) {
    setEditing(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setProjectId(p.projectId);
    setImages(p.images ?? []);
    setBasePrice(String(p.basePrice));
    setIsActive(p.isActive);
    setTiers(p.tiers.map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })));
    setVariants(p.variants.map((v) => ({ id: v.id, name: v.name, colorHex: v.colorHex, sku: v.sku ?? "", stock: v.stock, isActive: v.isActive, images: variantImages[v.id] ?? [] })));
    setOpen(true);
  }

  async function onImagesFile(e: React.ChangeEvent<HTMLInputElement>) {
    const room = 4 - images.length;
    const picked = Array.from(e.target.files ?? []).slice(0, room);
    e.target.value = "";
    // Any size is fine — each image is downscaled + compressed in the browser.
    const compressed = await Promise.all(picked.map((f) => compressImage(f).catch(() => null)));
    const valid = compressed.filter((x): x is string => !!x);
    if (valid.length) setImages((prev) => [...prev, ...valid].slice(0, 4));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = {
      name,
      description,
      projectId,
      images,
      basePrice,
      isActive,
      tiers: tiers
        .filter((t) => String(t.minQuantity) !== "" && String(t.unitPrice) !== "")
        .map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })),
      variants: variants
        .filter((v) => v.name.trim() !== "")
        .map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          name: v.name,
          colorHex: v.colorHex,
          sku: v.sku,
          stock: v.stock === "" ? 0 : v.stock,
          isActive: v.isActive,
          images: v.images,
        })),
    };
    // Single string argument only: a multi-arg Server Action with a >1MB string
    // trips React's decode size guard. Fold the id into the payload for updates.
    startTransition(async () => {
      const res = editing
        ? await updateProduct(JSON.stringify({ id: editing.id, ...payload }))
        : await createProduct(JSON.stringify(payload));
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
                <TableHead>Variants</TableHead>
                <TableHead>Quantity Tiers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No products yet.</TableCell></TableRow>
              ) : (
                shown.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="h-10 w-10 shrink-0 rounded border object-cover" />
                        ) : null}
                        <span>{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.project.name}</TableCell>
                    <TableCell>{formatAmount(p.basePrice)} {CURRENCY}</TableCell>
                    <TableCell>
                      {p.variants.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1">
                            {p.variants.slice(0, 5).map((v) => (
                              <span
                                key={v.id}
                                title={`${v.name} · ${v.stock} in stock`}
                                className="h-4 w-4 rounded-full border border-background ring-1 ring-border"
                                style={{ backgroundColor: v.colorHex }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{p.variants.reduce((s, v) => s + v.stock, 0)} in stock</span>
                        </div>
                      )}
                    </TableCell>
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
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Tiger" />
            </div>
            <div className="space-y-2">
              <Label>Description (shown in the store, optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} placeholder="Short description customers will see" />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Product Images (up to 4)</Label>
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="h-16 w-full rounded border object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-destructive shadow"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 4 ? (
                  <label className="flex h-16 cursor-pointer flex-col items-center justify-center rounded border border-dashed text-muted-foreground hover:bg-accent">
                    <ImagePlus className="h-5 w-5" />
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={onImagesFile} />
                  </label>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">PNG/JPG/WebP — any size, optimized automatically.</p>
            </div>

            <div className="space-y-2">
              <Label>Base Price ({CURRENCY}) — unit price for quantity 1+</Label>
              <Input type="number" step="0.001" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Quantity Tiers (cheaper per unit as quantity grows)</Label>
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

            <div className="rounded-lg border bg-muted/30 p-3">
              <VariantsEditor variants={variants} onChange={setVariants} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (visible in the store & available when creating orders)
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
