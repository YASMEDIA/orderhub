import type { MetadataRoute } from "next";

// Web app manifest: lets Mahalatly be installed ("Add to Home Screen" on iPhone,
// "Install app" on laptop) with the brand logo as its icon and a standalone,
// app-like window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mahalatly — Delivery Order Management",
    short_name: "Mahalatly",
    description: "Manage delivery orders and generate thermal receipts for multiple businesses.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0c023c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
