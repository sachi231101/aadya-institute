import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import {
  createUserService,
  getUserService,
  listUsersService,
  updateUserBranchAccessService,
} from "../modules/users/user.service";
import { AppError } from "../middlewares/error.middleware";

const fixtureCode = "TEST-CM-BRANCH-COUNSELLORS";

let instituteId: string;
let branchAId: string;
let branchBId: string;
let admin: AuthUser;
let managerA: AuthUser;
let counsellorAId: string;
let counsellorBId: string;
let counsellorAccessOnlyId: string;

before(async () => {
  await prisma.institute.deleteMany({ where: { code: fixtureCode } });

  const institute = await prisma.institute.create({
    data: { name: "CM Branch Counsellors Institute", code: fixtureCode },
  });
  instituteId = institute.id;

  const [branchA, branchB] = await Promise.all([
    prisma.branch.create({
      data: {
        instituteId,
        name: "Branch A",
        code: "CM-BR-A",
      },
    }),
    prisma.branch.create({
      data: {
        instituteId,
        name: "Branch B",
        code: "CM-BR-B",
      },
    }),
  ]);
  branchAId = branchA.id;
  branchBId = branchB.id;

  await Promise.all([
    prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    }),
    prisma.role.upsert({
      where: { name: "CENTER_MANAGER" },
      update: {},
      create: { name: "CENTER_MANAGER" },
    }),
    prisma.role.upsert({
      where: { name: "COUNSELLOR" },
      update: {},
      create: { name: "COUNSELLOR" },
    }),
  ]);

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "ADMIN" },
  });

  const adminUser = await prisma.user.create({
    data: {
      instituteId,
      name: "Admin Fixture",
      email: "admin@cm-branch-counsellors.test",
      passwordHash: "not-used-by-test",
      userRoles: { create: { roleId: adminRole.id } },
    },
  });

  admin = {
    id: adminUser.id,
    userId: adminUser.id,
    name: adminUser.name,
    email: adminUser.email,
    instituteId,
    branchId: null,
    roles: ["ADMIN"],
    permissions: [],
  };

  // Admin creates Branch A CM + Branch A counsellor + Branch B counsellor via service
  const cm = await createUserService(admin, {
    name: "Manager Branch A",
    email: "manager-a@cm-branch-counsellors.test",
    roles: ["CENTER_MANAGER"],
    branchId: branchAId,
    permissions: [],
  });

  const counsellorA = await createUserService(admin, {
    name: "Counsellor Branch A",
    email: "counsellor-a@cm-branch-counsellors.test",
    roles: ["COUNSELLOR"],
    branchId: branchAId,
    permissions: [],
  });
  counsellorAId = counsellorA.id;

  const counsellorB = await createUserService(admin, {
    name: "Counsellor Branch B",
    email: "counsellor-b@cm-branch-counsellors.test",
    roles: ["COUNSELLOR"],
    branchId: branchBId,
    permissions: [],
  });
  counsellorBId = counsellorB.id;

  // Edge: counsellor visible only via UserBranchAccess (primary branch null)
  const counsellorRole = await prisma.role.findUniqueOrThrow({
    where: { name: "COUNSELLOR" },
  });
  const accessOnly = await prisma.user.create({
    data: {
      instituteId,
      branchId: null,
      name: "Counsellor Access Only A",
      email: "counsellor-access-only@cm-branch-counsellors.test",
      passwordHash: "not-used-by-test",
      userRoles: { create: { roleId: counsellorRole.id } },
      branchAccesses: { create: { branchId: branchAId } },
    },
  });
  counsellorAccessOnlyId = accessOnly.id;

  // CM AuthUser with access row (mirrors JWT after login)
  managerA = {
    id: cm.id,
    userId: cm.id,
    name: cm.name,
    email: cm.email,
    instituteId,
    branchId: branchAId,
    allowedBranchIds: [branchAId],
    roles: ["CENTER_MANAGER"],
    permissions: [],
  };
});

after(async () => {
  await prisma.institute.deleteMany({ where: { code: fixtureCode } });
  await prisma.$disconnect();
});

describe("createUserService UserBranchAccess sync", () => {
  test("creating CM/Counsellor also writes UserBranchAccess for assigned branch", async () => {
    const cmAccess = await prisma.userBranchAccess.findMany({
      where: { userId: managerA.id },
    });
    assert.strictEqual(cmAccess.length, 1);
    assert.strictEqual(cmAccess[0].branchId, branchAId);

    const counsellorAccess = await prisma.userBranchAccess.findMany({
      where: { userId: counsellorAId },
    });
    assert.strictEqual(counsellorAccess.length, 1);
    assert.strictEqual(counsellorAccess[0].branchId, branchAId);
  });
});

describe("replaceUserBranchAccess syncs User.branchId", () => {
  test("keeps primary when still allowed; otherwise moves to first allowed", async () => {
    const counsellorRole = await prisma.role.findUniqueOrThrow({
      where: { name: "COUNSELLOR" },
    });
    const temp = await prisma.user.create({
      data: {
        instituteId,
        branchId: branchAId,
        name: "Temp Sync Counsellor",
        email: `temp-sync-${Date.now()}@cm-branch-counsellors.test`,
        passwordHash: "not-used-by-test",
        userRoles: { create: { roleId: counsellorRole.id } },
        branchAccesses: { create: { branchId: branchAId } },
      },
    });

    // Move access to Branch B only → primary should become B
    const moved = await updateUserBranchAccessService(admin, temp.id, {
      branchIds: [branchBId],
    });
    assert.strictEqual(moved.branchId, branchBId);
    assert.deepStrictEqual(
      (moved.branchAccesses ?? []).map((b) => b.branchId).sort(),
      [branchBId]
    );

    // Restore A+B with primary already B → keep B
    const multi = await updateUserBranchAccessService(admin, temp.id, {
      branchIds: [branchAId, branchBId],
    });
    assert.strictEqual(multi.branchId, branchBId);

    await prisma.user.delete({ where: { id: temp.id } });
  });
});

describe("CENTER_MANAGER lists same-branch counsellors", () => {
  test("Branch A CM list role=COUNSELLOR includes Branch A counsellor from createUser", async () => {
    const { users } = await listUsersService(managerA, {
      role: "COUNSELLOR",
      page: 1,
      limit: 50,
    });
    const ids = users.map((u) => u.id);
    assert.ok(ids.includes(counsellorAId), "should include Branch A counsellor");
    assert.ok(
      !ids.includes(counsellorBId),
      "must not include Branch B counsellor"
    );
  });

  test("CM with UserBranchAccess=[A] still sees counsellor with only User.branchId=A", async () => {
    // Strip access rows from counsellor A, leave primary branchId only
    await prisma.userBranchAccess.deleteMany({ where: { userId: counsellorAId } });

    const { users } = await listUsersService(managerA, {
      role: "COUNSELLOR",
      page: 1,
      limit: 50,
    });
    const ids = users.map((u) => u.id);
    assert.ok(
      ids.includes(counsellorAId),
      "primary branchId alone should still match CM scope"
    );

    // Restore access for other tests
    await prisma.userBranchAccess.create({
      data: { userId: counsellorAId, branchId: branchAId },
    });
  });

  test("counsellor with only UserBranchAccess to A is visible to CM scoped to A", async () => {
    const { users } = await listUsersService(managerA, {
      role: "COUNSELLOR",
      page: 1,
      limit: 50,
    });
    const ids = users.map((u) => u.id);
    assert.ok(
      ids.includes(counsellorAccessOnlyId),
      "access-only counsellor on A should be listed"
    );
  });

  test("CM cannot see Branch B counsellor via list or get", async () => {
    const { users } = await listUsersService(managerA, {
      role: "COUNSELLOR",
      page: 1,
      limit: 50,
      branchId: branchBId, // spoof — scope must ignore
    });
    assert.ok(!users.some((u) => u.id === counsellorBId));

    await assert.rejects(
      () => getUserService(managerA, counsellorBId),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.message === "User not found"
    );
  });

  test("CM can getUser for same-branch counsellor (primary or access)", async () => {
    const byPrimary = await getUserService(managerA, counsellorAId);
    assert.strictEqual(byPrimary.id, counsellorAId);

    const byAccess = await getUserService(managerA, counsellorAccessOnlyId);
    assert.strictEqual(byAccess.id, counsellorAccessOnlyId);
  });
});
