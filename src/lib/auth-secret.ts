export const nextAuthSecret =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "orderhub-production-fallback-secret-change-in-vercel-env";
