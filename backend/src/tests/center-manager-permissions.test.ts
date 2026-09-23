import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import type { NextFunction, Response } from "express";
import { prisma } from "../config/database";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
  requireAnyPermission,
  requirePermission,
} from "../middlewares/permission.middleware";
import { AdmissionsService } from "../modules/admissions/admissions.service";
import { FeeService } from "../modules/fees/fee.service";
import { getStudentById } from "../modules/students/student.service";
import { TargetService } from "../modules/targets/target.service";
import * as WhatsappService from "../modules/whatsapp/whatsapp.service";
import type { AuthUser } from "../modules/auth/auth.types";
import {
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
    name: "admissions.applications",
    itemKey: "admissions.applications",
    read: {
      method: "GET",
      path: "/admissions/applications",
      middleware: requirePermission("admission.read"),
    },
    writes: [
      {
        method: "POST",
        path: "/admissions/applications",
        middleware: requirePermission("admission.create"),
      },
      {
        method: "PATCH",
        path: "/admissions/applications/:id",
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
  {
    name: "whatsapp",
    itemKey: "communication.whatsapp",
    read: {
      method: "GET",
      path: "/whatsapp/history",
      middleware: requireAnyPermission("whatsapp.history.read"),
    },
    writes: [
      {
        method: "POST",
        path: "/whatsapp/test",
        middleware: requireAnyPermission(
          "whatsapp.test.send",
          "notification.manage"
        ),
      },
      {
        method: "PATCH",
        path: "/whatsapp/automation-config",
        middleware: requireAnyPermission(
          "whatsapp.automation.manage",
          "notification.manage"
        ),
      },
    ],
  },
];

const fixtureCode = "TEST-CM-PERMISSIONS";
let instituteId: string;
let branchAId: string;
let branchBId: string;
let managerUserId: string;
let managerA: AuthUser;
let branchBStudentId: string;
let branchBAdmissionId: string;
let branchBReceiptId: string;
let branchBIncentiveId: string;
let branchBNotificationId: string;

const setManagerItemAccess = async (
  itemKey: string,
  access: ItemAccessState | undefined
): Promise<void> => {
  await prisma.userPermission.deleteMany({ where: { userId: managerUserId } });
  if (!access) return;

  const permissionNames = resolveItemAccessToPermissions(
    { [itemKey]: access },
    "CENTER_MANAGER"
  );

  for (const name of permissionNames) {
    const permission = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await prisma.userPermission.create({
      data: {
        userId: managerUserId,
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
      userId: managerUserId,
      instituteId,
      branchId: branchAId,
      roles: ["CENTER_MANAGER"],
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
    data: { name: "CM Permission Test Institute", code: fixtureCode },
  });
  instituteId = institute.id;

  const [branchA, branchB] = await Promise.all([
    prisma.branch.create({
      data: { instituteId, name: "CM Permission Branch A", code: "CM-PERM-A" },
    }),
    prisma.branch.create({
      data: { instituteId, name: "CM Permission Branch B", code: "CM-PERM-B" },
    }),
  ]);
  branchAId = branchA.id;
  branchBId = branchB.id;

  const [manager, branchBUser] = await Promise.all([
    prisma.user.create({
      data: {
        instituteId,
        branchId: branchAId,
        name: "CM Permission Manager",
        email: "manager@cm-permissions.test",
        passwordHash: "not-used-by-test",
      },
    }),
    prisma.user.create({
      data: {
        instituteId,
        branchId: branchBId,
        name: "CM Permission Branch B User",
        email: "branch-b@cm-permissions.test",
        passwordHash: "not-used-by-test",
      },
    }),
  ]);
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

  const course = await prisma.course.create({
    data: {
      instituteId,
      name: "CM Permission Course",
      code: "CM-PERM-COURSE",
      courseBranches: {
        create: [{ branchId: branchAId }, { branchId: branchBId }],
      },
    },
  });
  const student = await prisma.student.create({
    data: {
      instituteId,
      branchId: branchBId,
      studentCode: "CM-PERM-STUDENT-B",
    },
  });
  branchBStudentId = student.id;

  const admission = await prisma.admission.create({
    data: {
      instituteId,
      branchId: branchBId,
      courseId: course.id,
      studentId: student.id,
      admissionNo: "CM-PERM-ADM-B",
      studentName: "Branch B Student",
    },
  });
  branchBAdmissionId = admission.id;

  const receipt = await prisma.payment.create({
    data: {
      instituteId,
      branchId: branchBId,
      studentId: student.id,
      admissionId: admission.id,
      receiptNo: "CM-PERM-RECEIPT-B",
      studentName: "Branch B Student",
      admissionNo: admission.admissionNo ?? "CM-PERM-ADM-B",
      courseName: course.name,
      amount: 1000,
    },
  });
  branchBReceiptId = receipt.id;

  const target = await prisma.target.create({
    data: {
      instituteId,
      branchId: branchBId,
      userId: branchBUser.id,
      title: "Branch B Admissions Target",
      targetType: "INDIVIDUAL",
      metric: "ADMISSIONS",
      targetValue: 1,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-30"),
      createdById: manager.id,
    },
  });
  const incentive = await prisma.incentive.create({
    data: {
      instituteId,
      branchId: branchBId,
      targetId: target.id,
      userId: branchBUser.id,
      periodStart: new Date("2026-09-01"),
      periodEnd: new Date("2026-09-30"),
      targetValue: 1,
      achievedValue: 1,
      achievementPercentage: 100,
      calculatedAmount: 1000,
      status: "PENDING_APPROVAL",
    },
  });
  branchBIncentiveId = incentive.id;

  const notification = await prisma.notification.create({
    data: {
      instituteId,
      branchId: branchBId,
      title: "Branch B notification",
      message: "This must remain hidden from Branch A.",
      channel: "WHATSAPP",
    },
  });
  branchBNotificationId = notification.id;
});

after(async () => {
  await prisma.institute.deleteMany({ where: { code: fixtureCode } });
  await prisma.$disconnect();
});

describe("Center Manager API permission middleware", () => {
  for (const moduleCase of moduleCases) {
    test(`${moduleCase.name}: denied, read-only, and read+write grants follow the catalog`, async () => {
      await setManagerItemAccess(moduleCase.itemKey, undefined);
      await assertForbidden(moduleCase.read);
      for (const endpoint of moduleCase.writes) {
        await assertForbidden(endpoint);
      }

      await setManagerItemAccess(moduleCase.itemKey, {
        show: true,
        editable: false,
      });
      await assertAllowed(moduleCase.read);
      for (const endpoint of moduleCase.writes) {
        await assertForbidden(endpoint);
      }

      await setManagerItemAccess(moduleCase.itemKey, {
        show: true,
        editable: true,
      });
      await assertAllowed(moduleCase.read);
      for (const endpoint of moduleCase.writes) {
        await assertAllowed(endpoint);
      }
    });
  }

  test("baseline notification permission does not unlock WhatsApp hub APIs", async () => {
    await setManagerItemAccess("communication.notifications", {
      show: true,
      editable: false,
    });
    const whatsapp = moduleCases.find((entry) => entry.name === "whatsapp");
    assert.ok(whatsapp);
    await assertForbidden(whatsapp.read);
    for (const endpoint of whatsapp.writes) {
      await assertForbidden(endpoint);
    }
  });
});

describe("Center Manager cross-branch API service boundaries", () => {
  test("Branch B student is hidden from Branch A manager with 404", async () => {
    await assert.rejects(
      () => getStudentById(branchBStudentId, managerA),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        error.statusCode === 404
    );
  });

  test("Branch B admission is hidden from Branch A manager with 404", async () => {
    await assert.rejects(
      () => AdmissionsService.getAdmissionById(branchBAdmissionId, managerA),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        error.statusCode === 404
    );
  });

  test("Branch B fee receipt is hidden from Branch A manager with 404", async () => {
    await assert.rejects(
      () => FeeService.getReceipt(managerA, branchBReceiptId),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        error.statusCode === 404
    );
  });

  test("Branch B incentive is hidden from Branch A manager with 404", async () => {
    await assert.rejects(
      () => TargetService.getIncentiveById(managerA, branchBIncentiveId),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        error.statusCode === 404
    );
  });

  test("Branch B WhatsApp notification is hidden from Branch A manager", async () => {
    const notification = await WhatsappService.getNotificationById(
      managerA,
      branchBNotificationId
    );
    assert.strictEqual(notification, null);
  });
});
