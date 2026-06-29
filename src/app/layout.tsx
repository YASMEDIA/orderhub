import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mahalatly — Delivery Order Management",
  description: "Manage delivery orders and generate thermal receipts for multiple businesses.",
  // Favicon + Apple touch icon come from src/app/icon.png and src/app/apple-icon.png
  // (Next.js file conventions). The manifest powers "Add to Home Screen" / install.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mahalatly",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c023c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
