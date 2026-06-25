"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStoreSettings } from "@/app/actions/store";
import { useToast } from "@/components/ui/toast";
import { compressImage } from "@/lib/image-compress";

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

// Storefront configuration only — logo, link, visibility and contact links.
// Products (with images, variants and inventory) are managed from the Products
// page, the single source of truth for the catalog.
export function StoreManager({ projects }: { projects: ProjectRow[] }) {
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
        // key resets local state when switching projects
        <StoreSettingsCard key={`s-${project.id}`} project={project} />
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

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      // Logos are small + may have transparency — keep dimensions modest.
      const dataUrl = await compressImage(file, { maxDim: 512, maxBytes: 150_000 });
      setLogo(dataUrl);
    } catch {
      toast({ title: "Couldn't read that image", description: "Please try another file.", variant: "destructive" });
    }
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
        <CardDescription>Logo, link and visibility of the public ordering page. Products are managed from the Products page.</CardDescription>
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
            <p className="text-xs text-muted-foreground">PNG/JPG/WebP — any size, optimized automatically.</p>
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
