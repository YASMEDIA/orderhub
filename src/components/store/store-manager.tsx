"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Copy, ExternalLink, Upload, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { updateStoreSettings } from "@/app/actions/store";
import { createProduct, updateProduct, deleteProduct } from "@/app/actions/products";
import { useToast } from "@/components/ui/toast";
import { formatAmount } from "@/lib/format";
import { CURRENCY } from "@/lib/constants";
import { VariantsEditor, type VariantDraft } from "@/components/store/variants-editor";

type ProjectRow = {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  storeEnabled: boolean;
  instagram: string | null;
  tiktok: string | null;
  whatsapp: string | null;
  phone: string | null;
};
type Tier = { minQuantity: number | string; unitPrice: number | string };
type VariantRow = {
  id: string;
  name: string;
  colorHex: string;
  sku: string | null;
  stock: number;
  isActive: boolean;
  images: string[];
};
type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  basePrice: number;
  isActive: boolean;
  projectId: string;
  tiers: { minQuantity: number; unitPrice: number }[];
  variants: VariantRow[];
};

export function StoreManager({ projects, products }: { projects: ProjectRow[]; products: ProductRow[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const project = projects.find((p) => p.id === projectId);

  return (
    <div className="space-y-6">
      {projects.length > 1 && (
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      {project ? (
        <>
          {/* key resets local state when switching projects */}
          <StoreSettingsCard key={`s-${project.id}`} project={project} />
          <StoreProductsCard key={`p-${project.id}`} projectId={project.id} products={products.filter((x) => x.projectId === project.id)} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No projects available.</p>
      )}
    </div>
  );
}

function StoreSettingsCard({ project }: { project: ProjectRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [slug, setSlug] = useState(project.slug ?? "");
  const [logo, setLogo] = useState(project.logoUrl ?? "");
  const [enabled, setEnabled] = useState(project.storeEnabled);
  const [instagram, setInstagram] = useState(project.instagram ?? "");
  const [tiktok, setTiktok] = useState(project.tiktok ?? "");
  const [whatsapp, setWhatsapp] = useState(project.whatsapp ?? "");
  const [phone, setPhone] = useState(project.phone ?? "");
  const [pending, startTransition] = useTransition();

  // Public store links use the canonical base (e.g. https://mahalatly.com),
  // not the dashboard subdomain the admin happens to be on.
  const publicBase = (
    process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "");
  const storeUrl = slug ? `${publicBase}/store/${slug}` : "";

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      toast({ title: "Image too large", description: "Logo must be under 500KB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  }

  function save() {
    startTransition(async () => {
      const res = await updateStoreSettings(project.id, {
        slug,
        storeEnabled: enabled,
        logoUrl: logo,
        instagram,
        tiktok,
        whatsapp,
        phone,
      });
      toast({ title: res.ok ? "Saved" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Store Settings — {project.name}</CardTitle>
        <CardDescription>Logo, link and visibility of the public ordering page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Logo" className="h-20 w-20 rounded-full border object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-muted text-xl font-bold text-muted-foreground">
              {project.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
              <Upload className="h-4 w-4" /> Upload Logo
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onLogoFile} />
            </label>
            {logo ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setLogo("")}>Remove logo</Button>
            ) : null}
            <p className="text-xs text-muted-foreground">PNG/JPG/WebP, up to 500KB.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Store Link (slug)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="e.g. 313-boutique" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Store is live (public)
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-md border p-4">
          <div>
            <p className="text-sm font-medium">Contact &amp; Social (optional)</p>
            <p className="text-xs text-muted-foreground">
              Shown as icons under your store name. Leave any field empty to hide its icon.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="username (e.g. mahalatly)" />
            </div>
            <div className="space-y-2">
              <Label>TikTok</Label>
              <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="username (e.g. mahalatly)" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="number with code (e.g. 96550001111)" inputMode="tel" />
            </div>
            <div className="space-y-2">
              <Label>Phone (direct call)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="number (e.g. 96550001111)" inputMode="tel" />
            </div>
          </div>
        </div>

        {slug ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 p-3 text-sm">
            <span className="break-all font-medium">{storeUrl || `/store/${slug}`}</span>
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => { navigator.clipboard.writeText(storeUrl || `/store/${slug}`); toast({ title: "Link copied" }); }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            {project.storeEnabled && project.slug ? (
              <Button asChild type="button" variant="outline" size="sm">
                <a href={`/store/${project.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={save} disabled={pending}>Save Store Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StoreProductsCard({ projectId, products }: { projectId: string; products: ProductRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [basePrice, setBasePrice] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null); setName(""); setDescription(""); setImages([]); setBasePrice("0"); setIsActive(true); setTiers([]); setVariants([]); setOpen(true);
  }
  function openEdit(p: ProductRow) {
    setEditing(p); setName(p.name); setDescription(p.description ?? ""); setImages(p.images ?? []); setBasePrice(String(p.basePrice)); setIsActive(p.isActive);
    setTiers(p.tiers.map((t) => ({ minQuantity: t.minQuantity, unitPrice: t.unitPrice })));
    setVariants(p.variants.map((v) => ({ id: v.id, name: v.name, colorHex: v.colorHex, sku: v.sku ?? "", stock: v.stock, isActive: v.isActive, images: v.images })));
    setOpen(true);
  }

  function onImagesFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const room = 4 - images.length;
    files.slice(0, room).forEach((file) => {
      if (file.size > 500_000) {
        toast({ title: "Image too large", description: `${file.name} is over 500KB.`, variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => (prev.length < 4 ? [...prev, String(reader.result)] : prev));
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = {
      name,
      description,
      images,
      projectId,
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
    startTransition(async () => {
      const res = editing ? await updateProduct(editing.id, payload) : await createProduct(payload);
      toast({ title: res.ok ? "Saved" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok) { setOpen(false); router.refresh(); }
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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Store Products</CardTitle>
          <CardDescription>Name, description and quantity pricing — exactly what customers see.</CardDescription>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Product</Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Quantity Tiers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No products yet. Add your first product.</TableCell></TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt="" className="h-10 w-10 shrink-0 rounded border object-cover" />
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}{p.images?.length > 1 ? <span className="ml-1 text-xs text-muted-foreground">+{p.images.length - 1}</span> : null}</p>
                        {p.description ? <p className="max-w-[220px] truncate text-xs text-muted-foreground">{p.description}</p> : null}
                      </div>
                    </div>
                  </TableCell>
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
                        <span className="text-xs text-muted-foreground">
                          {p.variants.reduce((s, v) => s + v.stock, 0)} in stock
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.tiers.length === 0 ? "—" : p.tiers.map((t) => `${t.minQuantity}+ → ${formatAmount(t.unitPrice)}`).join(", ")}
                  </TableCell>
                  <TableCell><Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Active" : "Hidden"}</Badge></TableCell>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description (shown in the store)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} placeholder="Short description customers will see" />
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
              <p className="text-xs text-muted-foreground">PNG/JPG/WebP, up to 500KB each.</p>
            </div>
            <div className="space-y-2">
              <Label>Base Price ({CURRENCY}) — unit price for quantity 1+</Label>
              <Input type="number" step="0.001" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Quantity Tiers (cheaper per unit as quantity grows)</Label>
              <p className="text-xs text-muted-foreground">e.g. From 5 → 1.800 · From 10 → 1.700</p>
              {tiers.map((t, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">From qty</Label>
                    <Input type="number" min={2} value={t.minQuantity}
                      onChange={(e) => setTiers((prev) => prev.map((x, j) => (j === i ? { ...x, minQuantity: e.target.value } : x)))} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Unit price ({CURRENCY})</Label>
                    <Input type="number" step="0.001" min={0} value={t.unitPrice}
                      onChange={(e) => setTiers((prev) => prev.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} />
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

            <div className="rounded-lg border bg-muted/30 p-3">
              <VariantsEditor variants={variants} onChange={setVariants} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Visible in the store
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
