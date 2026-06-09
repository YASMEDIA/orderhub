"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/actions/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("token", token);
    const res = await resetPassword(fd);
    setLoading(false);
    setResult(res);
  }

  if (!token) {
    return <p className="text-sm text-destructive">Missing reset token. Please use the link from your email.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      {result ? (
        <p className={`text-sm ${result.ok ? "text-emerald-600" : "text-destructive"}`}>{result.message}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading || result?.ok}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
      </Button>
      <div className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:underline">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Loader2 className="h-4 w-4 animate-spin" />}>
          <ResetForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
