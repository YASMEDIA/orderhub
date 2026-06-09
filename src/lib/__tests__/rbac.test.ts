import { describe, it, expect, vi } from "vitest";

// rbac.ts imports "./auth" at module load, which transitively instantiates
// PrismaClient and pulls in next-auth. We only test the PURE functions here,
// so stub the auth module to keep the import side-effect-free and deterministic.
// We never call auth() in these tests.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => {
    throw new Error("auth() must not be called in unit tests");
  }),
}));

import {
  projectScopeWhere,
  canAccessProject,
  isSuperAdmin,
  type SessionUser,
} from "@/lib/rbac";

const superAdmin: SessionUser = {
  id: "u_super",
  role: "SUPER_ADMIN",
  projectIds: [],
};

const admin: SessionUser = {
  id: "u_admin",
  role: "ADMIN",
  projectIds: ["proj_a", "proj_b"],
};

const employee: SessionUser = {
  id: "u_emp",
  role: "EMPLOYEE",
  projectIds: ["proj_c"],
};

const employeeNoProjects: SessionUser = {
  id: "u_emp0",
  role: "EMPLOYEE",
  projectIds: [],
};

describe("isSuperAdmin", () => {
  it("is true only for SUPER_ADMIN", () => {
    expect(isSuperAdmin(superAdmin)).toBe(true);
    expect(isSuperAdmin(admin)).toBe(false);
    expect(isSuperAdmin(employee)).toBe(false);
  });
});

describe("projectScopeWhere", () => {
  it("returns {} for SUPER_ADMIN (no scoping)", () => {
    expect(projectScopeWhere(superAdmin)).toEqual({});
  });

  it("scopes ADMIN to their assigned projectIds", () => {
    expect(projectScopeWhere(admin)).toEqual({
      projectId: { in: ["proj_a", "proj_b"] },
    });
  });

  it("scopes EMPLOYEE to their assigned projectIds", () => {
    expect(projectScopeWhere(employee)).toEqual({
      projectId: { in: ["proj_c"] },
    });
  });

  it("uses a sentinel that matches nothing when the user has no projects", () => {
    expect(projectScopeWhere(employeeNoProjects)).toEqual({
      projectId: { in: ["__none__"] },
    });
  });
});

describe("canAccessProject", () => {
  it("always allows SUPER_ADMIN", () => {
    expect(canAccessProject(superAdmin, "any_project")).toBe(true);
  });

  it("allows non-super users only for assigned projects", () => {
    expect(canAccessProject(admin, "proj_a")).toBe(true);
    expect(canAccessProject(admin, "proj_z")).toBe(false);
    expect(canAccessProject(employee, "proj_c")).toBe(true);
    expect(canAccessProject(employee, "proj_a")).toBe(false);
  });

  it("denies a non-super user with no assigned projects", () => {
    expect(canAccessProject(employeeNoProjects, "proj_c")).toBe(false);
  });
});
