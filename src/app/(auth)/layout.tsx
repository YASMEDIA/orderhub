import { BrandLogo } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo className="h-12" />
          <p className="mt-3 text-sm text-muted-foreground">Delivery Order Management Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
