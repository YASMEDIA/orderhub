import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-muted/40 px-4 text-center">
      <h1 className="text-2xl font-bold">Store not available</h1>
      <p className="text-sm text-muted-foreground">This store link is invalid or the store is currently closed.</p>
      <Link href="/" className="mt-2 text-sm text-primary underline">Go home</Link>
    </div>
  );
}
