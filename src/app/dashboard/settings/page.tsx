import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/app/actions/settings";
import { SettingsForm } from "@/components/settings/settings-form";

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
    </div>
  );
}
