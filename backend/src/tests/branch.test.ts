import { test, describe } from "node:test";
import assert from "node:assert";
import { getBranchScopeFilter, hasBranchAccess } from "../utils/branch-isolation.util";
import { createBranchSchema, updateBranchSchema, branchListQuerySchema } from "../modules/branches/branch.validation";
import { requireBranchAccess } from "../middlewares/branch.middleware";
import type { AuthUser } from "../modules/auth/auth.types";

const adminUser: AuthUser = {
  id: "admin-1",
  name: "Admin User",
  email: "admin@aadya.in",
  phone: "9999999999",
  instituteId: "inst-1",
  branchId: "branch-main",
  roles: ["ADMIN"],
  permissions: ["branch.read", "branch.create", "branch.update", "branch.delete"],
};

const managerA: AuthUser = {
  id: "manager-a",
  name: "Manager A",
  email: "manager.a@aadya.in",
  phone: "9876543210",
  instituteId: "inst-1",
  branchId: "branch-a",
  roles: ["CENTER_MANAGER"],
  permissions: ["branch.read", "branch.update"],
};

describe("Branch Isolation Helper Unit Tests", () => {
  test("getBranchScopeFilter for ADMIN allows querying any branch or institute-wide", () => {
    const allBranches = getBranchScopeFilter(adminUser);
    assert.strictEqual(allBranches.instituteId, "inst-1");
    assert.strictEqual(allBranches.branchId, undefined);

    const specificBranch = getBranchScopeFilter(adminUser, "branch-b");
    assert.strictEqual(specificBranch.instituteId, "inst-1");
    assert.strictEqual(specificBranch.branchId, "branch-b");
  });

  test("getBranchScopeFilter for CENTER_MANAGER strictly locks to user.branchId", () => {
    const filter = getBranchScopeFilter(managerA);
    assert.strictEqual(filter.instituteId, "inst-1");
    assert.strictEqual(filter.branchId, "branch-a");

    const spoofFilter = getBranchScopeFilter(managerA, "branch-b");
    assert.strictEqual(spoofFilter.instituteId, "inst-1");
    assert.strictEqual(spoofFilter.branchId, "branch-a");
  });

  test("hasBranchAccess allows ADMIN for any branch", () => {
    assert.strictEqual(hasBranchAccess(adminUser, "branch-a"), true);
    assert.strictEqual(hasBranchAccess(adminUser, "branch-b"), true);
  });

  test("getBranchScopeFilter for COUNSELLOR strictly locks to user.branchId", () => {
    const counsellor: AuthUser = {
      id: "counsellor-1",
      name: "Counsellor",
      email: "c@aadya.in",
      phone: "9876543211",
      instituteId: "inst-1",
      branchId: "branch-a",
      roles: ["COUNSELLOR"],
      permissions: ["lead.read"],
    };
    const filter = getBranchScopeFilter(counsellor);
    assert.strictEqual(filter.branchId, "branch-a");
    const spoofFilter = getBranchScopeFilter(counsellor, "branch-b");
    assert.strictEqual(spoofFilter.branchId, "branch-a");
  });

  test("hasBranchAccess allows COUNSELLOR only for their assigned branch", () => {
    const counsellor: AuthUser = {
      id: "counsellor-1",
      name: "Counsellor",
      email: "c@aadya.in",
      phone: "9876543211",
      instituteId: "inst-1",
      branchId: "branch-a",
      roles: ["COUNSELLOR"],
      permissions: ["lead.read"],
    };
    assert.strictEqual(hasBranchAccess(counsellor, "branch-a"), true);
    assert.strictEqual(hasBranchAccess(counsellor, "branch-b"), false);
  });

  test("hasBranchAccess uses allowedBranchIds when present", () => {
    const multi: AuthUser = {
      id: "manager-multi",
      name: "Multi Manager",
      email: "multi@aadya.in",
      instituteId: "inst-1",
      branchId: "branch-a",
      allowedBranchIds: ["branch-a", "branch-c"],
      roles: ["CENTER_MANAGER"],
      permissions: ["branch.read"],
    };
    assert.strictEqual(hasBranchAccess(multi, "branch-a"), true);
    assert.strictEqual(hasBranchAccess(multi, "branch-c"), true);
    assert.strictEqual(hasBranchAccess(multi, "branch-b"), false);
  });

  test("getBranchScopeFilter with multiple allowedBranchIds omits single branchId", () => {
    const multi: AuthUser = {
      id: "manager-multi",
      name: "Multi Manager",
      email: "multi@aadya.in",
      instituteId: "inst-1",
      branchId: "branch-a",
      allowedBranchIds: ["branch-a", "branch-c"],
      roles: ["CENTER_MANAGER"],
      permissions: ["branch.read"],
    };
    const filter = getBranchScopeFilter(multi);
    assert.strictEqual(filter.branchId, undefined);
    assert.deepStrictEqual(filter.branchIds, ["branch-a", "branch-c"]);
  });

  test("getBranchScopeFilter with single allowedBranchId sets branchId", () => {
    const single: AuthUser = {
      id: "manager-one",
      name: "One Manager",
      email: "one@aadya.in",
      instituteId: "inst-1",
      branchId: null,
      allowedBranchIds: ["branch-x"],
      roles: ["CENTER_MANAGER"],
      permissions: ["branch.read"],
    };
    const filter = getBranchScopeFilter(single);
    assert.strictEqual(filter.branchId, "branch-x");
    assert.strictEqual(filter.branchIds, undefined);
  });
});

describe("Branch Zod Validation Schemas", () => {
  test("createBranchSchema transforms branch code to uppercase", () => {
    const result = createBranchSchema.safeParse({
      name: "Koramangala Branch",
      code: "kora",
      address: "Bengaluru",
      phone: "9876543210",
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.code, "KORA");
    }
  });

  test("createBranchSchema rejects invalid phone number", () => {
    const result = createBranchSchema.safeParse({
      name: "Indiranagar Branch",
      code: "IND",
      phone: "123",
    });
    assert.strictEqual(result.success, false);
  });

  test("updateBranchSchema transforms status to uppercase", () => {
    const result = updateBranchSchema.safeParse({
      status: "active",
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.status, "ACTIVE");
    }
  });
});

describe("Branch Authorization Middleware Unit Tests", () => {
  test("requireBranchAccess allows matching branch for CENTER_MANAGER", () => {
    const middleware = requireBranchAccess("id");
    let nextCalled = false;
    const req: any = {
      user: managerA,
      params: { id: "branch-a" },
    };
    const res: any = {
      status(code: number) { return this; },
      json(body: any) { return this; },
    };
    const next = () => { nextCalled = true; };

    middleware(req, res, next);
    assert.strictEqual(nextCalled, true);
  });

  test("requireBranchAccess blocks cross-branch access for CENTER_MANAGER with 404", () => {
    const middleware = requireBranchAccess("id");
    let nextCalled = false;
    let statusCode = 0;
    let errorResponse: any = null;

    const req: any = {
      user: managerA,
      params: { id: "branch-b" },
    };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(body: any) { errorResponse = body; return this; },
    };
    const next = () => { nextCalled = true; };

    middleware(req, res, next);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 404);
    assert.strictEqual(errorResponse.success, false);
  });
});
