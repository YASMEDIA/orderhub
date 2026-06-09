"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

export function ReportControls() {
  const router = useRouter();
  const params = useSearchParams();
  const period = params.get("period") ?? "monthly";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/dashboard/reports?${next.toString()}`);
  }

  const exportHref = (format: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("format", format);
    return `/api/reports/export?${next.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={period}
        onChange={(e) => setParam("period", e.target.value)}
      >
        {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      {period === "custom" && (
        <>
          <Input type="date" className="h-10 w-40" defaultValue={params.get("from") ?? ""} onChange={(e) => setParam("from", e.target.value)} />
          <Input type="date" className="h-10 w-40" defaultValue={params.get("to") ?? ""} onChange={(e) => setParam("to", e.target.value)} />
        </>
      )}
      <div className="ml-auto flex gap-2">
        <Button asChild variant="outline"><a href={exportHref("pdf")}><FileDown className="h-4 w-4" /> Export PDF</a></Button>
        <Button asChild variant="outline"><a href={exportHref("excel")}><FileSpreadsheet className="h-4 w-4" /> Export Excel</a></Button>
      </div>
    </div>
  );
}
