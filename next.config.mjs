/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@react-pdf/renderer", "bcryptjs", "pngjs"],
};

export default nextConfig;
