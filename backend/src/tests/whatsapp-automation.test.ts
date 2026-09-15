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
import {
  buildBlockingIssues,
  countReadyAutomations,
  isOverallReady,
  maskPhoneTail,
} from "../modules/whatsapp/whatsapp-readiness.util";
import {
  extractTemplateBodyFromRaw,
  previewTemplateBody,
} from "../modules/whatsapp/template-body.util";

describe("WhatsApp System Automation V1 catalog", () => {
  test("exposes 30 V1 system automations", () => {
    assert.strictEqual(SYSTEM_AUTOMATION_EVENTS.length, 30);
    assert.strictEqual(SYSTEM_AUTOMATION_CATALOG.length, 30);
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

  test("Batch Assigned sample variables include batch date fields", () => {
    const meta = SYSTEM_AUTOMATION_CATALOG.find(
      (a) => a.event === NotificationEvent.STUDENT_BATCH_ASSIGNED
    );
    assert.ok(meta);
    assert.ok(meta!.sampleVariables.batch_date);
    assert.ok(meta!.sampleVariables.batch_start_date);
    assert.ok(meta!.sampleVariables.time_slot);
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

describe("WhatsApp readiness aggregation", () => {
  test("countReadyAutomations requires enabled + ACTIVE template + complete map", () => {
    const rules = [
      {
        event: NotificationEvent.STUDENT_WELCOME,
        enabled: true,
        template: {
          id: "t1",
          status: "ACTIVE",
          variables: ["var_1", "var_2"],
        },
        configuration: {
          variableMap: { var_1: "student_name", var_2: "course_name" },
        },
      },
      {
        event: NotificationEvent.CLASS_REMINDER,
        enabled: true,
        template: {
          id: "t2",
          status: "ACTIVE",
          variables: ["var_1"],
        },
        configuration: { variableMap: {} },
      },
      {
        event: NotificationEvent.FEE_DUE_REMINDER,
        enabled: false,
        template: {
          id: "t3",
          status: "ACTIVE",
          variables: [],
        },
        configuration: {},
      },
      {
        event: "CUSTOM_LEGACY",
        enabled: true,
        template: { id: "t4", status: "ACTIVE", variables: [] },
        configuration: {},
      },
    ];

    const counts = countReadyAutomations(rules, SYSTEM_AUTOMATION_EVENTS);
    assert.strictEqual(counts.enabledCount, 2);
    assert.strictEqual(counts.readyCount, 1);
  });

  test("countReadyAutomations treats empty template variables as mapped", () => {
    const counts = countReadyAutomations(
      [
        {
          event: NotificationEvent.PAYMENT_CONFIRMATION,
          enabled: true,
          template: { id: "t1", status: "ACTIVE", variables: [] },
          configuration: {},
        },
      ],
      SYSTEM_AUTOMATION_EVENTS
    );
    assert.strictEqual(counts.enabledCount, 1);
    assert.strictEqual(counts.readyCount, 1);
  });

  test("buildBlockingIssues and isOverallReady cover all gates", () => {
    const incomplete = {
      providerConfigured: false,
      redisOk: false,
      workerOnline: false,
      globalEnabled: false,
      activeTemplateCount: 0,
      readyAutomationCount: 0,
    };
    const issues = buildBlockingIssues(incomplete);
    assert.ok(issues.length >= 5);
    assert.strictEqual(isOverallReady(incomplete), false);

    const ready = {
      providerConfigured: true,
      redisOk: true,
      workerOnline: true,
      globalEnabled: true,
      activeTemplateCount: 2,
      readyAutomationCount: 1,
    };
    assert.deepStrictEqual(buildBlockingIssues(ready), []);
    assert.strictEqual(isOverallReady(ready), true);
  });

  test("maskPhoneTail keeps last 4 digits", () => {
    assert.strictEqual(maskPhoneTail("919876543210"), "***3210");
    assert.strictEqual(maskPhoneTail(null), null);
  });
});

describe("WhatsApp template body extraction", () => {
  test("extracts BODY component text from MSG91-style raw", () => {
    const body = extractTemplateBodyFromRaw({
      components: [
        { type: "HEADER", text: "Hello" },
        { type: "BODY", text: "Hi {{1}}, your class starts at {{2}}." },
      ],
    });
    assert.strictEqual(body, "Hi {{1}}, your class starts at {{2}}.");
  });

  test("previewTemplateBody fills placeholders", () => {
    const preview = previewTemplateBody("Hello {{1}}, fee {{2}}", ["Rahul", "15000"]);
    assert.strictEqual(preview, "Hello Rahul, fee 15000");
  });
});
