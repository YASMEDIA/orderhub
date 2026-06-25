"use client";

import { Plus, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImage } from "@/lib/image-compress";

// A draft variant being edited in the product dialog. `id` is present only for
// variants that already exist in the database.
export type VariantDraft = {
  id?: string;
  name: string;
  colorHex: string;
  sku: string;
  stock: number | string;
  isActive: boolean;
  images: string[];
};

export function emptyVariant(): VariantDraft {
  return { name: "", colorHex: "#000000", sku: "", stock: 0, isActive: true, images: [] };
}

const MAX_IMAGES = 6;

export function VariantsEditor({
  variants,
  onChange,
}: {
  variants: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
}) {
  const update = (i: number, patch: Partial<VariantDraft>) =>
    onChange(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const remove = (i: number) => onChange(variants.filter((_, j) => j !== i));
  const add = () => onChange([...variants, emptyVariant()]);

  async function addImages(i: number, files: FileList | null) {
    const room = MAX_IMAGES - variants[i].images.length;
    const list = Array.from(files ?? []).slice(0, room);
    // Any size is fine — each image is downscaled + compressed in the browser.
    const compressed = await Promise.all(list.map((f) => compressImage(f).catch(() => null)));
    const dataUrls = compressed.filter((x): x is string => !!x);
    if (dataUrls.length) {
      onChange(
        variants.map((v, j) => (j === i ? { ...v, images: [...v.images, ...dataUrls].slice(0, MAX_IMAGES) } : v)),
      );
    }
  }

  const totalStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Variants (colours)</Label>
          <p className="text-xs text-muted-foreground">
            Each variant has its own stock and images. Total stock: <strong>{totalStock}</strong>
          </p>
        </div>
      </div>

      {variants.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          No variants. Add colours like Black, White, Red — each with its own stock and images.
        </p>
      ) : (
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div key={v.id ?? `new-${i}`} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <input
                  type="color"
                  value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.colorHex) ? v.colorHex : "#000000"}
                  onChange={(e) => update(i, { colorHex: e.target.value })}
                  className="h-10 w-10 shrink-0 cursor-pointer rounded border bg-background"
                  aria-label="Variant colour"
                />
                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={v.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Black" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hex</Label>
                    <Input value={v.colorHex} onChange={(e) => update(i, { colorHex: e.target.value })} placeholder="#000000" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Stock</Label>
                    <Input type="number" min={0} value={v.stock} onChange={(e) => update(i, { stock: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SKU (opt.)</Label>
                    <Input value={v.sku} onChange={(e) => update(i, { sku: e.target.value })} placeholder="TGR-BLK" />
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove variant">
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Images ({v.images.length}/{MAX_IMAGES})</Label>
                <div className="grid grid-cols-6 gap-2">
                  {v.images.map((img, k) => (
                    <div key={k} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="h-14 w-full rounded border object-cover" />
                      <button
                        type="button"
                        onClick={() => update(i, { images: v.images.filter((_, j) => j !== k) })}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-destructive shadow"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {v.images.length < MAX_IMAGES ? (
                    <label className="flex h-14 cursor-pointer flex-col items-center justify-center rounded border border-dashed text-muted-foreground hover:bg-accent">
                      <ImagePlus className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(e) => { addImages(i, e.target.files); e.target.value = ""; }}
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={v.isActive} onChange={(e) => update(i, { isActive: e.target.checked })} />
                Available in the store
              </label>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" /> Add Variant
      </Button>
    </div>
  );
}
