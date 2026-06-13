/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@react-pdf/renderer", "bcryptjs", "pngjs"],
  experimental: {
    // Product images / logo are uploaded as base64 data URLs through server
    // actions; the default 1MB limit is too small for up to 4 images.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
