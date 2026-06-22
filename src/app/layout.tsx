import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mahalatly — Delivery Order Management",
  description: "Manage delivery orders and generate thermal receipts for multiple businesses.",
  icons: {
    icon: "/brand/mahalatly-icon.svg",
    shortcut: "/brand/mahalatly-icon.svg",
    apple: "/brand/mahalatly-icon.svg",
  },
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
