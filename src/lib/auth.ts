import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { nextAuthSecret } from "./auth-secret";
import type { Role } from "@prisma/client";

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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    projectIds: string[];
  }
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h secure sessions
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
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
