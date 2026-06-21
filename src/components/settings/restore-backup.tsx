"use client";

import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Uploads a backup JSON and replaces ALL data (used for DB migration).
export function RestoreBackup() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!file) return;
    if (!confirm("This REPLACES all current data with the uploaded backup. This cannot be undone. Continue?")) {
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/admin/restore?confirm=replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const json = await res.json().catch(() => ({ ok: false, message: "Server error" }));
      if (!res.ok || !json.ok) {
        toast({ title: "Restore failed", description: json.message ?? "Error", variant: "destructive" });
        setBusy(false);
        return;
      }
      toast({ title: "Restore complete", description: "Signing you out — please log in again." });
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch {
      toast({ title: "Restore failed", description: "Could not read or upload the file.", variant: "destructive" });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="application/json,.json"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
      />
      <Button variant="destructive" disabled={!file || busy} onClick={run}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Replace all data with this backup
      </Button>
    </div>
  );
}
