import { withAuth } from "next-auth/middleware";
import { nextAuthSecret } from "@/lib/auth-secret";

// Protect the dashboard and redirect unauthenticated users to /login.
// /invoice/* and the auth pages remain public (not in the matcher).
export default withAuth({
  pages: { signIn: "/login" },
  secret: nextAuthSecret,
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
