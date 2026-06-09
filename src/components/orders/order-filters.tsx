"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ORDER_STATUSES } from "@/lib/constants";

type Option = { id: string; name: string };

export function OrderFilters({
  projects,
  creators,
  showProject,
}: {
  projects: Option[];
  creators: Option[];
  showProject: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/dashboard/orders?${next.toString()}`);
  }

  const select = "h-10 rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search customer or order #"
        defaultValue={params.get("q") ?? ""}
        className="h-10 w-56"
        onKeyDown={(e) => { if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value); }}
      />
      {showProject && (
        <select className={select} defaultValue={params.get("project") ?? ""} onChange={(e) => setParam("project", e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <select className={select} defaultValue={params.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
        <option value="">All statuses</option>
        {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      {creators.length > 0 && (
        <select className={select} defaultValue={params.get("creator") ?? ""} onChange={(e) => setParam("creator", e.target.value)}>
          <option value="">All creators</option>
          {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <Input type="date" className="h-10 w-40" defaultValue={params.get("from") ?? ""} onChange={(e) => setParam("from", e.target.value)} />
      <Input type="date" className="h-10 w-40" defaultValue={params.get("to") ?? ""} onChange={(e) => setParam("to", e.target.value)} />
      <Button variant="ghost" onClick={() => router.push("/dashboard/orders")}>Clear</Button>
    </div>
  );
}
