import { auth } from "./auth";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  projectIds: string[];
};

export class AuthError extends Error {}

// Resolve the current user or throw — use at the top of every server action.
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new AuthError("Not authenticated");
  return session.user as SessionUser;
}

// Require one of the allowed roles.
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("You do not have permission to perform this action");
  }
  return user;
}

export function isSuperAdmin(user: SessionUser) {
  return user.role === "SUPER_ADMIN";
}

// Super Admin sees everything; Admin/Employee are limited to assigned projects.
export function canAccessProject(user: SessionUser, projectId: string): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.projectIds.includes(projectId);
}

export async function assertProjectAccess(user: SessionUser, projectId: string) {
  if (!canAccessProject(user, projectId)) {
    throw new AuthError("You do not have access to this project");
  }
}

// Prisma `where` fragment that scopes order/project queries to the user.
export function projectScopeWhere(user: SessionUser) {
  if (user.role === "SUPER_ADMIN") return {};
  return { projectId: { in: user.projectIds.length ? user.projectIds : ["__none__"] } };
}
