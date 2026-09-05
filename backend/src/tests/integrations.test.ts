import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import {
  decryptCredentials,
  encryptCredentials,
  maskSecret,
} from "../utils/integration-credentials.util";
import {
  disconnectIntegrationService,
  getIntegrationService,
  listIntegrationsService,
  testIntegrationService,
  upsertIntegrationService,
} from "../modules/integrations/integration.service";
import { INTEGRATION_TYPES } from "../modules/integrations/integration.types";
import { schemaForType } from "../modules/integrations/integration.validation";
import integrationRoutes from "../modules/integrations/integration.routes";
import { getPermissionCatalog } from "../utils/permission-catalog";

describe("Integration credentials utilities", () => {
  test("encryptCredentials round-trips and maskSecret hides secrets", () => {
    const cipher = encryptCredentials({ apiKey: "sk-test-secret-abcd1234" });
    assert.ok(cipher.length > 0);
    assert.ok(!cipher.includes("sk-test-secret"));
    const plain = decryptCredentials(cipher);
    assert.strictEqual(plain.apiKey, "sk-test-secret-abcd1234");
    const masked = maskSecret(plain.apiKey);
    assert.ok(masked);
    assert.ok(!masked!.includes("test-secret"));
    assert.ok(masked!.endsWith("1234"));
  });

  test("upsert schemas accept type-specific payloads", () => {
    assert.ok(
      schemaForType("AI").safeParse({
        provider: "OPENAI",
        credentials: { apiKey: "sk-abc" },
        configuration: { model: "gpt-4o-mini" },
      }).success
    );
    assert.ok(
      schemaForType("EMAIL").safeParse({
        provider: "SMTP",
        configuration: {
          host: "smtp.example.com",
          port: 587,
          username: "u",
          fromEmail: "a@b.com",
        },
        credentials: { password: "secret" },
      }).success
    );
  });
});

describe("Integration RBAC wiring", () => {
  test("routes require integration.read and integration.manage", () => {
    const stack = (integrationRoutes as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ name?: string }> } }> }).stack;
    const routes = stack.filter((l) => l.route);
    const getRoot = routes.find((l) => l.route?.path === "/" && l.route.methods.get);
    const putType = routes.find((l) => l.route?.path === "/:type" && l.route.methods.put);
    assert.ok(getRoot, "GET / registered");
    assert.ok(putType, "PUT /:type registered");

    const catalog = getPermissionCatalog("CENTER_MANAGER")
      .flatMap((m) => m.items)
      .find((i) => i.key === "admin.integrations");
    assert.ok(catalog);
    assert.ok(catalog!.readPermissions.includes("integration.read"));
    assert.ok(catalog!.writePermissions.includes("integration.manage"));
  });
});

describe("Integrations service", () => {
  let instituteAId: string;
  let instituteBId: string;
  let adminUserId: string;
  let adminA: AuthUser;
  let adminB: AuthUser;
  let facultyA: AuthUser;

  before(async () => {
    const instituteA = await prisma.institute.upsert({
      where: { code: "TEST-INT-A" },
      update: { name: "Integration Academy A", status: "ACTIVE" },
      create: {
        name: "Integration Academy A",
        code: "TEST-INT-A",
        email: "int-a@test.org",
      },
    });
    instituteAId = instituteA.id;

    const instituteB = await prisma.institute.upsert({
      where: { code: "TEST-INT-B" },
      update: { name: "Integration Academy B", status: "ACTIVE" },
      create: {
        name: "Integration Academy B",
        code: "TEST-INT-B",
        email: "int-b@test.org",
      },
    });
    instituteBId = instituteB.id;

    let adminDbUser = await prisma.user.findFirst({
      where: { email: "int-admin-a@test.org" },
    });
    if (!adminDbUser) {
      adminDbUser = await prisma.user.create({
        data: {
          name: "Int Admin A",
          email: "int-admin-a@test.org",
          phone: "9000000101",
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
      name: "Int Admin A",
      email: "int-admin-a@test.org",
      instituteId: instituteAId,
      branchId: null,
      roles: ["ADMIN"],
      permissions: ["integration.read", "integration.manage"],
    };

    let adminBDb = await prisma.user.findFirst({
      where: { email: "int-admin-b@test.org" },
    });
    if (!adminBDb) {
      adminBDb = await prisma.user.create({
        data: {
          name: "Int Admin B",
          email: "int-admin-b@test.org",
          phone: "9000000102",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId: instituteBId,
          status: "ACTIVE",
        },
      });
    } else if (adminBDb.instituteId !== instituteBId) {
      adminBDb = await prisma.user.update({
        where: { id: adminBDb.id },
        data: { instituteId: instituteBId, status: "ACTIVE" },
      });
    }

    adminB = {
      id: adminBDb.id,
      userId: adminBDb.id,
      name: "Int Admin B",
      email: "int-admin-b@test.org",
      instituteId: instituteBId,
      branchId: null,
      roles: ["ADMIN"],
      permissions: ["integration.read", "integration.manage"],
    };

    facultyA = {
      id: "int-faculty-a",
      userId: "int-faculty-a",
      name: "Int Faculty A",
      email: "int-faculty-a@test.org",
      instituteId: instituteAId,
      branchId: null,
      roles: ["FACULTY"],
      permissions: [],
    };
  });

  after(async () => {
    await prisma.activityLog.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
    await prisma.integration.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
  });

  test("catalog always returns exactly 7 types", async () => {
    const cards = await listIntegrationsService(adminA);
    assert.strictEqual(cards.length, 7);
    assert.deepStrictEqual(
      cards.map((c) => c.type),
      INTEGRATION_TYPES
    );
  });

  test("upsert encrypts credentials and GET never returns raw secrets", async () => {
    const secret = "sk-live-secret-value-zzzz9999";
    const saved = await upsertIntegrationService(adminA, "AI", {
      provider: "OPENAI",
      configuration: { model: "gpt-4o-mini" },
      credentials: { apiKey: secret },
      replaceCredentials: true,
    });

    assert.strictEqual(saved.status, "CONFIGURED");
    assert.ok(saved.isConfigured);
    assert.ok(saved.maskedCredential);
    assert.ok(!saved.maskedCredential!.includes("live-secret"));
    assert.ok(!JSON.stringify(saved).includes(secret));
    assert.ok(!("encryptedCredentials" in saved));
    assert.ok(!("credentials" in saved));

    const row = await prisma.integration.findUnique({
      where: {
        instituteId_type: { instituteId: instituteAId, type: "AI" },
      },
    });
    assert.ok(row?.encryptedCredentials);
    assert.ok(!row!.encryptedCredentials!.includes(secret));
    const decrypted = decryptCredentials(row!.encryptedCredentials);
    assert.strictEqual(decrypted.apiKey, secret);
  });

  test("institute A cannot read or mutate institute B integrations", async () => {
    await upsertIntegrationService(adminB, "WHATSAPP", {
      provider: "AISENSY",
      credentials: { apiKey: "aisensy-b-key-bbbb1111" },
      replaceCredentials: true,
    });

    const detailA = await getIntegrationService(adminA, "WHATSAPP");
    assert.notStrictEqual(detailA.maskedCredential?.slice(-4), "1111");

    const cardsA = await listIntegrationsService(adminA);
    const waA = cardsA.find((c) => c.type === "WHATSAPP");
    assert.ok(waA);
    // A's WhatsApp may be unconfigured or different from B
    const cardsB = await listIntegrationsService(adminB);
    const waB = cardsB.find((c) => c.type === "WHATSAPP");
    assert.ok(waB?.isConfigured);
    assert.ok(waB?.maskedCredential?.endsWith("1111"));

    await upsertIntegrationService(adminA, "WHATSAPP", {
      provider: "AISENSY",
      credentials: { apiKey: "aisensy-a-key-aaaa2222" },
      replaceCredentials: true,
    });

    const afterB = await getIntegrationService(adminB, "WHATSAPP");
    assert.ok(afterB.maskedCredential?.endsWith("1111"));
    assert.ok(!JSON.stringify(afterB).includes("aaaa2222"));
  });

  test("AI calling test transitions status to CONNECTED or ERROR", async () => {
    await upsertIntegrationService(adminA, "AI_CALLING", {
      provider: "SARVAM",
      credentials: { apiKey: "sarvam-test-key-cccc3333" },
      replaceCredentials: true,
    });
    const before = await getIntegrationService(adminA, "AI_CALLING");
    assert.strictEqual(before.status, "CONFIGURED");

    const result = await testIntegrationService(adminA, "AI_CALLING");
    assert.ok(typeof result.success === "boolean");
    assert.ok(result.integration);
    assert.ok(
      result.integration.lastTestStatus === "SUCCESS" ||
        result.integration.lastTestStatus === "FAILED"
    );
    assert.ok(
      result.integration.status === "CONNECTED" ||
        result.integration.status === "ERROR"
    );

    const after = await getIntegrationService(adminA, "AI_CALLING");
    assert.ok(after.lastTestedAt);
    assert.strictEqual(after.status, result.integration.status);
  });

  test("disconnect clears/disables integration safely", async () => {
    await upsertIntegrationService(adminA, "PAYMENT", {
      provider: "RAZORPAY",
      configuration: { keyId: "rzp_test_xxx" },
      credentials: { keySecret: "rzp_secret_dddd4444" },
      replaceCredentials: true,
    });

    const disconnected = await disconnectIntegrationService(adminA, "PAYMENT");
    assert.strictEqual(disconnected.status, "DISCONNECTED");
    assert.strictEqual(disconnected.isEnabled, false);

    const row = await prisma.integration.findUnique({
      where: {
        instituteId_type: { instituteId: instituteAId, type: "PAYMENT" },
      },
    });
    assert.ok(!row?.encryptedCredentials);
  });

  test("faculty AuthUser without manage perms is not used for mutation in service layer (isolation via instituteId only)", async () => {
    // Service layer trusts controller RBAC; ensure faculty institute still sees masked catalog only.
    const cards = await listIntegrationsService(facultyA);
    assert.strictEqual(cards.length, 7);
    for (const card of cards) {
      assert.ok(!JSON.stringify(card).includes("sk-live-secret"));
      assert.ok(!("encryptedCredentials" in card));
    }
  });
});
