"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Setting } from "@prisma/client";
import { updateSettings } from "@/app/actions/settings";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function SettingsForm({ settings }: { settings: Setting }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateSettings(fd);
      toast({ title: res.ok ? "Saved" : "Error", description: res.ok ? undefined : res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Currency</Label><Input name="currency" defaultValue={settings.currency} /></div>
          <div className="space-y-2"><Label>Timezone</Label><Input name="timezone" defaultValue={settings.timezone} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Receipt Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Receipt Header (optional)</Label><Textarea name="receiptHeader" defaultValue={settings.receiptHeader ?? ""} placeholder="e.g. Thank you for ordering!" /></div>
          <div className="space-y-2"><Label>Receipt Footer (optional)</Label><Textarea name="receiptFooter" defaultValue={settings.receiptFooter ?? ""} placeholder="e.g. Follow us @yourbrand" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">QR Settings</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>QR Size (px, 80–600)</Label><Input name="qrSize" type="number" min={80} max={600} defaultValue={settings.qrSize} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button type="submit" disabled={pending}>Save Settings</Button></div>
    </form>
  );
}
