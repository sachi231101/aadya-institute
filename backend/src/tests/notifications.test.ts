import { test, describe } from "node:test";
import assert from "node:assert";
import {
  NotificationEvent,
  NotificationStatus,
  buildIdempotencyKey,
  NON_RETRIABLE_ERROR_CODES,
} from "../modules/whatsapp/whatsapp.constants";
import { normalizePhone, isValidIndianPhone } from "../utils/phone";
import {
  createTemplateSchema,
  updateTemplateSchema,
  upsertRuleSchema,
} from "../modules/whatsapp/whatsapp.validation";

describe("Notification Constants & Idempotency Key Unit Tests", () => {
  test("should generate correct idempotency keys for all event types", () => {
    const key1 = buildIdempotencyKey.CLASS_REMINDER("student-1", "session-1", "2026-08-13");
    assert.strictEqual(key1, "CLASS_REMINDER:student-1:session-1:2026-08-13");

    const key2 = buildIdempotencyKey.STUDENT_ABSENT("student-1", "session-1");
    assert.strictEqual(key2, "STUDENT_ABSENT:student-1:session-1");

    const key3 = buildIdempotencyKey.FEEDBACK_REQUESTED("student-1", "session-1");
    assert.strictEqual(key3, "FEEDBACK_REQUESTED:student-1:session-1");

    const key4 = buildIdempotencyKey.ADMISSION_CREATED("student-1", "admission-1");
    assert.strictEqual(key4, "ADMISSION_CREATED:student-1:admission-1");

    const key5 = buildIdempotencyKey.BATCH_ASSIGNED("student-1", "batch-1");
    assert.strictEqual(key5, "BATCH_ASSIGNED:student-1:batch-1");
  });

  test("should identify non-retriable error codes correctly", () => {
    assert.strictEqual(NON_RETRIABLE_ERROR_CODES.has("INVALID_PHONE"), true);
    assert.strictEqual(NON_RETRIABLE_ERROR_CODES.has("TEMPLATE_NOT_FOUND"), true);
    assert.strictEqual(NON_RETRIABLE_ERROR_CODES.has("UNAUTHORIZED"), true);
    assert.strictEqual(NON_RETRIABLE_ERROR_CODES.has("TIMEOUT"), false);
    assert.strictEqual(NON_RETRIABLE_ERROR_CODES.has("NETWORK_ERROR"), false);
  });
});

describe("Phone Utility & Formatting Unit Tests", () => {
  test("should normalize 10-digit Indian phone number to E.164 (+91)", () => {
    assert.strictEqual(normalizePhone("9876543210"), "+919876543210");
    assert.strictEqual(normalizePhone("09876543210"), "+919876543210");
    assert.strictEqual(normalizePhone("919876543210"), "+919876543210");
  });

  test("should validate valid Indian mobile numbers", () => {
    assert.strictEqual(isValidIndianPhone("9876543210"), true);
    assert.strictEqual(isValidIndianPhone("8765432109"), true);
    assert.strictEqual(isValidIndianPhone("7654321098"), true);
    assert.strictEqual(isValidIndianPhone("6543210987"), true);

    // Invalid numbers
    assert.strictEqual(isValidIndianPhone("1234567890"), false);
    assert.strictEqual(isValidIndianPhone("98765"), false);
  });
});

describe("Notification Validation Schema Unit Tests", () => {
  test("should validate valid template creation input", () => {
    const input = {
      name: "class_reminder_template",
      event: NotificationEvent.CLASS_REMINDER,
      providerTemplateName: "aadya_class_reminder",
      language: "en",
      variables: ["student_name", "batch_name", "start_time"],
    };

    const parsed = createTemplateSchema.parse(input);
    assert.strictEqual(parsed.name, input.name);
    assert.strictEqual(parsed.event, input.event);
    assert.deepStrictEqual(parsed.variables, input.variables);
  });

  test("should reject template creation with invalid event", () => {
    const input = {
      name: "invalid_template",
      event: "INVALID_EVENT_TYPE",
      providerTemplateName: "some_template",
    };

    assert.throws(() => createTemplateSchema.parse(input));
  });

  test("should validate notification rule upsert schema", () => {
    const input = {
      event: NotificationEvent.STUDENT_ABSENT,
      channel: "WHATSAPP",
      enabled: true,
      configuration: { offsetMinutes: -120 },
    };

    const parsed = upsertRuleSchema.parse(input);
    assert.strictEqual(parsed.enabled, true);
    assert.strictEqual(parsed.channel, "WHATSAPP");
  });
});
