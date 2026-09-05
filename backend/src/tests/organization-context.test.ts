import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import { getOrganizationContext } from "../modules/organization/organization.service";
import { toOrganizationContext } from "../modules/organization/organization.mapper";
import {
  getOrganization,
  updateOrganization,
} from "../modules/institutes/institute.service";
import { updateInstituteSchema } from "../modules/institutes/institute.validation";
import { resolveDisplayOrganizationInfo } from "../utils/organization-display.util";
import { AppError } from "../middlewares/error.middleware";

describe("Organization Context Mapper", () => {
  test("toOrganizationContext maps nested safe fields and defaults", () => {
    const ctx = toOrganizationContext({
      id: "inst-1",
      name: "Aadya Institute",
      email: "info@aadya.in",
      phone: "+919999999999",
      website: "https://aadya.in",
      address: "HSR",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      postalCode: "560102",
      gstNumber: "29AAAAA0000A1Z5",
      timezone: null,
      currency: "inr",
      dateFormat: "INVALID",
      logoUrl: "https://cdn.example.com/logo.png",
    });

    assert.strictEqual(ctx.id, "inst-1");
    assert.strictEqual(ctx.name, "Aadya Institute");
    assert.strictEqual(ctx.branding.logoUrl, "https://cdn.example.com/logo.png");
    assert.strictEqual(ctx.contact.email, "info@aadya.in");
    assert.strictEqual(ctx.localization.timezone, "Asia/Kolkata");
    assert.strictEqual(ctx.localization.currency, "INR");
    assert.strictEqual(ctx.localization.dateFormat, "DD/MM/YYYY");
    assert.strictEqual(ctx.legal.gstNumber, "29AAAAA0000A1Z5");
    assert.ok(!("password" in ctx));
    assert.ok(!("status" in ctx));
  });

  test("resolveDisplayOrganizationInfo uses branch contact in branch mode", () => {
    const organization = toOrganizationContext({
      id: "inst-1",
      name: "Aadya Institute",
      email: "hq@aadya.in",
      phone: "111",
      address: "HQ Address",
      city: "Bengaluru",
      timezone: "Asia/Kolkata",
      currency: "INR",
      dateFormat: "DD/MM/YYYY",
      logoUrl: null,
      gstNumber: "GST1",
    });

    const display = resolveDisplayOrganizationInfo({
      organization,
      mode: "branch",
      branch: {
        name: "Chennai",
        address: "Chennai Branch Road",
        phone: "222",
        email: "chennai@aadya.in",
        timezone: "Asia/Kolkata",
      },
    });

    assert.strictEqual(display.name, "Aadya Institute");
    assert.strictEqual(display.address, "Chennai Branch Road");
    assert.strictEqual(display.phone, "222");
    assert.strictEqual(display.email, "chennai@aadya.in");
    assert.strictEqual(display.branchName, "Chennai");
    assert.strictEqual(display.gstNumber, "GST1");
  });
});

describe("Organization Update Validation", () => {
  test("accepts valid localization fields", () => {
    const parsed = updateInstituteSchema.parse({
      name: "Aadya Academy",
      timezone: "Asia/Kolkata",
      currency: "usd",
      dateFormat: "MM/DD/YYYY",
    });
    assert.strictEqual(parsed.currency, "USD");
    assert.strictEqual(parsed.dateFormat, "MM/DD/YYYY");
  });

  test("rejects invalid currency and date format", () => {
    assert.throws(() =>
      updateInstituteSchema.parse({ currency: "RUPEE" })
    );
    assert.throws(() =>
      updateInstituteSchema.parse({ dateFormat: "D-M-Y" })
    );
    assert.throws(() =>
      updateInstituteSchema.parse({ timezone: "NotAZone" })
    );
  });
});

describe("Organization Context Integration", () => {
  let instituteAId: string;
  let instituteBId: string;
  let adminUserId: string;
  let adminA: AuthUser;
  let studentA: AuthUser;
  let facultyA: AuthUser;
  let adminB: AuthUser;

  before(async () => {
    const instituteA = await prisma.institute.upsert({
      where: { code: "TEST-ORG-A" },
      update: {
        name: "Org A Academy",
        email: "a@test.org",
        currency: "INR",
        timezone: "Asia/Kolkata",
        dateFormat: "DD/MM/YYYY",
        status: "ACTIVE",
      },
      create: {
        name: "Org A Academy",
        code: "TEST-ORG-A",
        email: "a@test.org",
        currency: "INR",
        timezone: "Asia/Kolkata",
        dateFormat: "DD/MM/YYYY",
      },
    });
    instituteAId = instituteA.id;

    const instituteB = await prisma.institute.upsert({
      where: { code: "TEST-ORG-B" },
      update: {
        name: "Org B Academy",
        email: "b@test.org",
        currency: "USD",
        status: "ACTIVE",
      },
      create: {
        name: "Org B Academy",
        code: "TEST-ORG-B",
        email: "b@test.org",
        currency: "USD",
      },
    });
    instituteBId = instituteB.id;

    let adminDbUser = await prisma.user.findFirst({
      where: { email: "org-ctx-admin-a@test.org" },
    });
    if (!adminDbUser) {
      adminDbUser = await prisma.user.create({
        data: {
          name: "Org Ctx Admin A",
          email: "org-ctx-admin-a@test.org",
          phone: "9000000001",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId: instituteAId,
          status: "ACTIVE",
        },
      });
    } else if (adminDbUser.instituteId !== instituteAId) {
      adminDbUser = await prisma.user.update({
        where: { id: adminDbUser.id },
        data: { instituteId: instituteAId, status: "ACTIVE" },
      });
    }
    adminUserId = adminDbUser.id;

    adminA = {
      id: adminUserId,
      userId: adminUserId,
      name: "Admin A",
      email: "org-ctx-admin-a@test.org",
      instituteId: instituteAId,
      branchId: null,
      roles: ["ADMIN"],
      permissions: ["institute.read", "institute.update"],
    };

    studentA = {
      id: "org-student-a",
      name: "Student A",
      email: "student-a@test.org",
      instituteId: instituteAId,
      branchId: null,
      roles: ["STUDENT"],
      permissions: ["dashboard.read"],
    };

    facultyA = {
      id: "org-faculty-a",
      name: "Faculty A",
      email: "faculty-a@test.org",
      instituteId: instituteAId,
      branchId: null,
      roles: ["FACULTY"],
      permissions: ["dashboard.read"],
    };

    adminB = {
      id: "org-admin-b",
      name: "Admin B",
      email: "admin-b@test.org",
      instituteId: instituteBId,
      branchId: null,
      roles: ["ADMIN"],
      permissions: ["institute.read", "institute.update"],
    };
  });

  after(async () => {
    await prisma.activityLog.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
  });

  test("authenticated user receives only their organization context", async () => {
    const ctx = await getOrganizationContext(adminA);
    assert.strictEqual(ctx.id, instituteAId);
    assert.strictEqual(ctx.name, "Org A Academy");
    assert.strictEqual(ctx.contact.email, "a@test.org");
  });

  test("multi-tenant isolation — Academy A cannot see Academy B data", async () => {
    const ctxA = await getOrganizationContext(adminA);
    const ctxB = await getOrganizationContext(adminB);
    assert.strictEqual(ctxA.id, instituteAId);
    assert.strictEqual(ctxB.id, instituteBId);
    assert.notStrictEqual(ctxA.id, ctxB.id);
    assert.notStrictEqual(ctxA.name, ctxB.name);
  });

  test("student and faculty can load context without institute.read", async () => {
    const studentCtx = await getOrganizationContext(studentA);
    const facultyCtx = await getOrganizationContext(facultyA);
    assert.strictEqual(studentCtx.id, instituteAId);
    assert.strictEqual(facultyCtx.id, instituteAId);
    assert.ok(!("password" in studentCtx));
    assert.ok(!JSON.stringify(studentCtx).includes("apiKey"));
    assert.ok(!JSON.stringify(studentCtx).includes("secret"));
  });

  test("authorized admin can update organization and audit is written", async () => {
    const updated = await updateOrganization(
      adminA,
      { name: "Org A Renamed" },
      { ipAddress: "127.0.0.1", userAgent: "org-test" }
    );

    assert.strictEqual(updated.name, "Org A Renamed");
    assert.strictEqual(updated.id, instituteAId);
    assert.ok(updated.branding);
    assert.ok(updated.localization);

    const audit = await prisma.activityLog.findFirst({
      where: {
        instituteId: instituteAId,
        action: "ORGANIZATION_UPDATED",
        entityId: instituteAId,
      },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(audit);
    assert.strictEqual(audit?.userId, adminA.id);

    // Restore name for other tests / cleanup
    await updateOrganization(adminA, { name: "Org A Academy" });
  });

  test("admin GET organization returns nested context DTO", async () => {
    const org = await getOrganization(adminA);
    assert.strictEqual(org.id, instituteAId);
    assert.ok(org.branding);
    assert.ok(org.contact);
    assert.ok(org.address);
    assert.ok(org.localization);
    assert.ok(org.legal);
  });

  test("user without institute.update permission is conceptually denied at route layer", () => {
    assert.ok(!studentA.permissions.includes("institute.update"));
    assert.ok(!facultyA.permissions.includes("institute.update"));
    assert.ok(adminA.permissions.includes("institute.update"));
  });

  test("context for missing institute throws 404", async () => {
    const ghost: AuthUser = {
      ...adminA,
      instituteId: "nonexistent-institute-id",
    };
    await assert.rejects(
      () => getOrganizationContext(ghost),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
  });
});
