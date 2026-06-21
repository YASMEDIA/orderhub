import { redirect } from "next/navigation";
import { headers } from "next/headers";

// The public apex (mahalatly.com) is intentionally blank for now — a landing
// page will be added later. Every other host (the dashboard subdomain, Vercel
// previews, local dev) goes straight to the login screen.
export default async function Home() {
  const host = (await headers()).get("host")?.toLowerCase() ?? "";
  const isPublicApex = host === "mahalatly.com" || host === "www.mahalatly.com";
  if (!isPublicApex) redirect("/login");
  return null;
}
