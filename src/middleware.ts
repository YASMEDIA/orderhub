import { withAuth } from "next-auth/middleware";

// Protect the dashboard and redirect unauthenticated users to /login.
// /invoice/* and the auth pages remain public (not in the matcher).
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
