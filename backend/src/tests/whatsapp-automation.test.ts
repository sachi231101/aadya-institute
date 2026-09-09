import { test, describe } from "node:test";
import assert from "node:assert";
import {
  NotificationEvent,
  SkipReason,
  SYSTEM_AUTOMATION_EVENTS,
  SYSTEM_AUTOMATION_CATALOG,
  normalizeAutomationEvent,
  NotificationStatus,
} from "../modules/whatsapp/whatsapp.constants";
import {
  patchAutomationConfigSchema,
  patchAutomationSchema,
  automationTestSchema,
  createTemplateSchema,
} from "../modules/whatsapp/whatsapp.validation";

describe("WhatsApp System Automation V1 catalog", () => {
  test("exposes exactly 12 V1 system automations", () => {
    assert.strictEqual(SYSTEM_AUTOMATION_EVENTS.length, 12);
    assert.strictEqual(SYSTEM_AUTOMATION_CATALOG.length, 12);
  });

  test("catalog events are all in SYSTEM_AUTOMATION_EVENTS", () => {
    for (const item of SYSTEM_AUTOMATION_CATALOG) {
      assert.ok(
        (SYSTEM_AUTOMATION_EVENTS as readonly string[]).includes(item.event),
        `missing ${item.event}`
      );
    }
  });

  test("normalizes legacy admission/batch events", () => {
    assert.strictEqual(
      normalizeAutomationEvent("ADMISSION_CREATED"),
      NotificationEvent.STUDENT_WELCOME
    );
    assert.strictEqual(
      normalizeAutomationEvent("BATCH_ASSIGNED"),
      NotificationEvent.STUDENT_BATCH_ASSIGNED
    );
    assert.strictEqual(
      normalizeAutomationEvent("CLASS_REMINDER"),
      NotificationEvent.CLASS_REMINDER
    );
  });

  test("defines skip reasons required by V1", () => {
    assert.ok(SkipReason.GLOBAL_AUTOMATION_DISABLED);
    assert.ok(SkipReason.AUTOMATION_DISABLED);
    assert.ok(SkipReason.TEMPLATE_MISSING);
    assert.ok(SkipReason.PROVIDER_NOT_CONNECTED);
    assert.ok(SkipReason.MSG91_NOT_CONFIGURED);
    assert.ok(SkipReason.MSG91_AUTH_FAILED);
    assert.ok(SkipReason.BULK_IMPORT_SUPPRESSED);
    assert.ok(SkipReason.DUPLICATE_NOTIFICATION);
  });

  test("includes SKIPPED status", () => {
    assert.strictEqual(NotificationStatus.SKIPPED, "SKIPPED");
  });
});

describe("WhatsApp automation validation", () => {
  test("patchAutomationConfigSchema requires boolean enabled", () => {
    assert.strictEqual(patchAutomationConfigSchema.parse({ enabled: true }).enabled, true);
    assert.throws(() => patchAutomationConfigSchema.parse({ enabled: "yes" }));
  });

  test("patchAutomationSchema accepts partial updates", () => {
    const parsed = patchAutomationSchema.parse({
      enabled: false,
      templateId: null,
    });
    assert.strictEqual(parsed.enabled, false);
    assert.strictEqual(parsed.templateId, null);
  });

  test("automationTestSchema requires phone", () => {
    assert.throws(() => automationTestSchema.parse({ phone: "123" }));
    const ok = automationTestSchema.parse({ phone: "9876543210", name: "Test" });
    assert.strictEqual(ok.phone, "9876543210");
  });

  test("createTemplateSchema accepts STUDENT_CREDENTIALS", () => {
    const parsed = createTemplateSchema.parse({
      name: "creds",
      event: NotificationEvent.STUDENT_CREDENTIALS,
      providerTemplateName: "aadya_credentials",
      variables: ["student_name", "student_code", "password", "portal_url"],
    });
    assert.strictEqual(parsed.event, NotificationEvent.STUDENT_CREDENTIALS);
  });
});

describe("Bulk import safety convention", () => {
  test("bulk import metadata marker is documented as BULK_IMPORT_SUPPRESSED", () => {
    // Engine skips when metadata.source === "IMPORT" or metadata.bulkImport === true
    assert.strictEqual(SkipReason.BULK_IMPORT_SUPPRESSED, "BULK_IMPORT_SUPPRESSED");
  });
});
