import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { encode as defaultJwtEncode, decode as defaultJwtDecode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { nextAuthSecret } from "./auth-secret";
import type { Role } from "@prisma/client";

// "Remember me" → the session (and the JWT inside the cookie) lives for 30 days
// and slides as the user keeps working. Without it, the session expires after 8h.
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const EIGHT_HOURS = 60 * 60 * 8;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: Role;
      projectIds: string[];
    };
  }
  interface User {
    id: string;
    role: Role;
    projectIds: string[];
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    projectIds: string[];
    rememberMe?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  // Cookie may live up to 30 days; the JWT's own expiry (set in jwt.encode below)
  // is what actually enforces 30d (remember me) vs 8h. updateAge slides it.
  session: { strategy: "jwt", maxAge: THIRTY_DAYS, updateAge: 60 * 60 * 24 },
  jwt: {
    maxAge: THIRTY_DAYS,
    encode: (params) =>
      defaultJwtEncode({
        ...params,
        maxAge: (params.token as { rememberMe?: boolean } | null)?.rememberMe ? THIRTY_DAYS : EIGHT_HOURS,
      }),
    decode: defaultJwtDecode,
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { assignments: true },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
          projectIds: user.assignments.map((a) => a.projectId),
          rememberMe: credentials.rememberMe === "true",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.projectIds = user.projectIds;
        token.rememberMe = user.rememberMe ?? false;
      } else if (trigger === "update" || token.id) {
        // Refresh role + project assignments on each request so changes apply live.
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { assignments: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.projectIds = fresh.assignments.map((a) => a.projectId);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.projectIds = token.projectIds;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
