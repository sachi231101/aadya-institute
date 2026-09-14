import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import type { NextFunction, Response } from "express";
import { prisma } from "../config/database";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import type { AuthUser } from "../modules/auth/auth.types";
import {
  createUserService,
  updateUserPermissionsService,
} from "../modules/users/user.service";
import {
  filterAssignablePermissions,
  getFullAccessPermissions,
  resolveItemAccessToPermissions,
  type ItemAccessState,
} from "../utils/permission-catalog";

type PermissionMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

interface EndpointPermission {
  method: "GET" | "POST" | "PATCH";
  path: string;
  middleware: PermissionMiddleware;
}

interface ModulePermissionCase {
  name: string;
  itemKey: string;
  read: EndpointPermission;
  writes: EndpointPermission[];
}

const moduleCases: ModulePermissionCase[] = [
  {
    name: "students",
    itemKey: "students.all",
    read: {
      method: "GET",
      path: "/students",
      middleware: requirePermission("student.read"),
    },
    writes: [
      {
        method: "POST",
        path: "/students",
        middleware: requirePermission("student.create"),
      },
      {
        method: "PATCH",
        path: "/students/:id",
        middleware: requirePermission("student.update"),
      },
    ],
  },
  {
    name: "admissions.enquiries",
    itemKey: "admissions.enquiries",
    read: {
      method: "GET",
      path: "/admissions/enquiries",
      middleware: requirePermission("admission.read"),
    },
    writes: [
      {
        method: "POST",
        path: "/admissions/enquiries",
        middleware: requirePermission("admission.create"),
      },
      {
        method: "PATCH",
        path: "/admissions/enquiries/:id",
        middleware: requirePermission("admission.update"),
      },
    ],
  },
  {
    name: "fees",
    itemKey: "fees.invoices",
    read: {
      method: "GET",
      path: "/fees/invoices",
      middleware: requirePermission("fee.read"),
    },
    writes: [
      {
        method: "POST",
        path: "/fees/other-invoices",
        middleware: requirePermission("fee.create"),
      },
      {
        method: "POST",
        path: "/fees/invoices/:id/cancel",
        middleware: requirePermission("fee.update"),
      },
    ],
  },
  {
    name: "targets",
    itemKey: "targets.all",
    read: {
      method: "GET",
      path: "/targets",
      middleware: requirePermission("target.read"),
    },
    writes: [
      {
        method: "POST",
        path: "/targets",
        middleware: requirePermission("target.manage"),
      },
    ],
  },
  {
    name: "incentives",
    itemKey: "targets.incentives",
    read: {
      method: "GET",
      path: "/targets/incentives",
      middleware: requirePermission("incentive.read"),
    },
    writes: [
      {
        method: "POST",
        path: "/targets/incentives/:id/approve",
        middleware: requirePermission("incentive.approve"),
      },
    ],
  },
];

const fixtureCode = "TEST-COUNSELLOR-PERMISSIONS";
let instituteId: string;
let branchAId: string;
let counsellorUserId: string;
let managerUserId: string;
let counsellorRoleId: string;
let managerA: AuthUser;

const setCounsellorItemAccess = async (
  itemKey: string,
  access: ItemAccessState | undefined
): Promise<void> => {
  await prisma.userPermission.deleteMany({ where: { userId: counsellorUserId } });
  if (!access) return;

  const permissionNames = resolveItemAccessToPermissions(
    { [itemKey]: access },
    "COUNSELLOR"
  );

  for (const name of permissionNames) {
    const permission = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await prisma.userPermission.create({
      data: {
        userId: counsellorUserId,
        permissionId: permission.id,
      },
    });
  }
};

const invoke = async (
  middleware: PermissionMiddleware
): Promise<{ nextCalled: boolean; statusCode: number }> => {
  let nextCalled = false;
  let statusCode = 200;
  const req = {
    user: {
      userId: counsellorUserId,
      instituteId,
      branchId: branchAId,
      roles: ["COUNSELLOR"],
    },
  } as AuthenticatedRequest;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  await middleware(req, res, next);
  return { nextCalled, statusCode };
};

const assertAllowed = async (endpoint: EndpointPermission): Promise<void> => {
  const result = await invoke(endpoint.middleware);
  assert.strictEqual(
    result.nextCalled,
    true,
    `${endpoint.method} ${endpoint.path} should pass permission middleware`
  );
  assert.strictEqual(result.statusCode, 200);
};

const assertForbidden = async (endpoint: EndpointPermission): Promise<void> => {
  const result = await invoke(endpoint.middleware);
  assert.strictEqual(
    result.nextCalled,
    false,
    `${endpoint.method} ${endpoint.path} should not reach its controller`
  );
  assert.strictEqual(
    result.statusCode,
    403,
    `${endpoint.method} ${endpoint.path} should return 403`
  );
};

before(async () => {
  await prisma.institute.deleteMany({ where: { code: fixtureCode } });

  const institute = await prisma.institute.create({
    data: { name: "Counsellor Permission Test Institute", code: fixtureCode },
  });
  instituteId = institute.id;

  const branchA = await prisma.branch.create({
    data: {
      instituteId,
      name: "Counsellor Permission Branch A",
      code: "COUNS-PERM-A",
    },
  });
  branchAId = branchA.id;

  const counsellorRole = await prisma.role.upsert({
    where: { name: "COUNSELLOR" },
    update: {},
    create: { name: "COUNSELLOR" },
  });
  counsellorRoleId = counsellorRole.id;

  const cmRole = await prisma.role.upsert({
    where: { name: "CENTER_MANAGER" },
    update: {},
    create: { name: "CENTER_MANAGER" },
  });

  const [counsellor, manager] = await Promise.all([
    prisma.user.create({
      data: {
        instituteId,
        branchId: branchAId,
        name: "Counsellor Permission User",
        email: "counsellor@counsellor-permissions.test",
        passwordHash: "not-used-by-test",
        userRoles: { create: { roleId: counsellorRoleId } },
      },
    }),
    prisma.user.create({
      data: {
        instituteId,
        branchId: branchAId,
        name: "CM Grantor",
        email: "manager@counsellor-permissions.test",
        passwordHash: "not-used-by-test",
        userRoles: { create: { roleId: cmRole.id } },
      },
    }),
  ]);
  counsellorUserId = counsellor.id;
  managerUserId = manager.id;
  managerA = {
    id: manager.id,
    userId: manager.id,
    name: manager.name,
    email: manager.email,
    instituteId,
    branchId: branchAId,
    roles: ["CENTER_MANAGER"],
    permissions: [],
  };
});

after(async () => {
  await prisma.institute.deleteMany({ where: { code: fixtureCode } });
  await prisma.$disconnect();
});

describe("Counsellor API permission middleware", () => {
  for (const moduleCase of moduleCases) {
    test(`${moduleCase.name}: denied, read-only, and read+write grants follow the catalog`, async () => {
      await setCounsellorItemAccess(moduleCase.itemKey, undefined);
      await assertForbidden(moduleCase.read);
      for (const endpoint of moduleCase.writes) {
        await assertForbidden(endpoint);
      }

      await setCounsellorItemAccess(moduleCase.itemKey, {
        show: true,
        editable: false,
      });
      await assertAllowed(moduleCase.read);
      for (const endpoint of moduleCase.writes) {
        await assertForbidden(endpoint);
      }

      await setCounsellorItemAccess(moduleCase.itemKey, {
        show: true,
        editable: true,
      });
      await assertAllowed(moduleCase.read);
      for (const endpoint of moduleCase.writes) {
        await assertAllowed(endpoint);
      }
    });
  }

  test("targets and incentives are not always-on for counsellors", async () => {
    await setCounsellorItemAccess("students.all", {
      show: true,
      editable: false,
    });
    await assertForbidden({
      method: "GET",
      path: "/targets",
      middleware: requirePermission("target.read"),
    });
    await assertForbidden({
      method: "GET",
      path: "/targets/incentives",
      middleware: requirePermission("incentive.read"),
    });
  });
});

describe("CM grantor permission cap for Counsellor", () => {
  test("filterAssignablePermissions drops fee.update when grantor lacks it", () => {
    const grantor = resolveItemAccessToPermissions(
      {
        "counsellor.all": { show: true, editable: true },
        "leads.all": { show: true, editable: true },
      },
      "CENTER_MANAGER"
    );
    const requested = getFullAccessPermissions("COUNSELLOR");
    const { allowed, omitted } = filterAssignablePermissions(requested, {
      roleScope: "COUNSELLOR",
      isAdmin: false,
      grantorPermissions: grantor,
    });

    assert.ok(!allowed.includes("fee.update"));
    assert.ok(!allowed.includes("fee.create"));
    assert.ok(omitted.includes("fee.update") || omitted.includes("fee.create"));
    assert.ok(allowed.includes("lead.read"));
  });

  test("Admin is not capped by grantor permissions", () => {
    const requested = ["fee.update", "fee.create", "fee.read"];
    const { allowed, omitted } = filterAssignablePermissions(requested, {
      roleScope: "COUNSELLOR",
      isAdmin: true,
      grantorPermissions: [],
    });
    assert.ok(allowed.includes("fee.update"));
    assert.ok(allowed.includes("fee.create"));
    assert.deepStrictEqual(omitted, []);
  });

  test("CM cannot create CENTER_MANAGER via API", async () => {
    await assert.rejects(
      () =>
        createUserService(managerA, {
          name: "Escalation Attempt",
          email: `cm-escalate-${Date.now()}@counsellor-permissions.test`,
          roles: ["CENTER_MANAGER"],
          branchId: branchAId,
          permissions: [],
        }),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        error.statusCode === 403
    );
  });

  test("CM create Counsellor drops permissions beyond grantor access", async () => {
    // Grant CM only counsellor management + leads (no fees)
    await prisma.userPermission.deleteMany({ where: { userId: managerUserId } });
    const grantorPerms = resolveItemAccessToPermissions(
      {
        "counsellor.all": { show: true, editable: true },
        "leads.all": { show: true, editable: true },
      },
      "CENTER_MANAGER"
    );
    for (const name of grantorPerms) {
      const permission = await prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await prisma.userPermission.create({
        data: { userId: managerUserId, permissionId: permission.id },
      });
    }

    const fullCounsellor = getFullAccessPermissions("COUNSELLOR");
    const created = await createUserService(managerA, {
      name: "Capped Counsellor",
      email: `capped-${Date.now()}@counsellor-permissions.test`,
      roles: ["COUNSELLOR"],
      branchId: branchAId,
      permissions: fullCounsellor,
    });

    const perms = new Set(
      (created as { permissions?: string[] }).permissions ?? []
    );
    assert.ok(perms.has("lead.read"));
    assert.ok(!perms.has("fee.update"));
    assert.ok(!perms.has("fee.create"));
    assert.ok(
      Array.isArray((created as { omittedPermissions?: string[] }).omittedPermissions) &&
        ((created as { omittedPermissions?: string[] }).omittedPermissions?.length ?? 0) > 0
    );
  });

  test("CM update Counsellor permissions is capped", async () => {
    const counsellor = await prisma.user.findFirst({
      where: {
        instituteId,
        email: { contains: "capped-" },
        userRoles: { some: { role: { name: "COUNSELLOR" } } },
      },
    });
    assert.ok(counsellor);

    const updated = await updateUserPermissionsService(managerA, counsellor!.id, {
      permissions: getFullAccessPermissions("COUNSELLOR"),
    });

    const perms = new Set(
      (updated as { permissions?: string[] }).permissions ?? []
    );
    assert.ok(perms.has("lead.read"));
    assert.ok(!perms.has("exam.create"));
    assert.ok(!perms.has("fee.update"));
  });
});
