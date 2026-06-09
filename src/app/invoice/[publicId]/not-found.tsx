import Link from "next/link";

export default function InvoiceNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-muted/40 px-4 text-center">
      <h1 className="text-2xl font-bold">Invoice not found</h1>
      <p className="text-sm text-muted-foreground">This invoice link is invalid or has been removed.</p>
      <Link href="/" className="mt-2 text-sm text-primary underline">Go home</Link>
    </div>
  );
}
