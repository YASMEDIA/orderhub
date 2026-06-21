import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/app/actions/settings";
import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Platform-wide configuration for receipts and QR codes.</p>
      </div>
      <SettingsForm settings={settings} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Backup</CardTitle>
          <CardDescription>
            Download a complete copy of all data — projects, products, orders, users and settings.
            Store it somewhere safe; it contains customer details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/api/admin/backup"><Download className="h-4 w-4" /> Download full backup (JSON)</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
