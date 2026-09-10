import { test, describe } from "node:test";
import assert from "node:assert";
import { mapMsg91StatusToNotification } from "../modules/whatsapp/integrations/msg91.status";
import { extractIntegratedNumbers } from "../modules/whatsapp/integrations/msg91.client";
import { NotificationStatus, NON_RETRIABLE_ERROR_CODES } from "../modules/whatsapp/whatsapp.constants";
import { INTEGRATION_CATALOG } from "../modules/integrations/integration.types";

describe("MSG91 provider status mapping", () => {
  test("maps MSG91 delivery statuses to internal notification states", () => {
    assert.strictEqual(mapMsg91StatusToNotification("Submitted"), NotificationStatus.QUEUED);
    assert.strictEqual(mapMsg91StatusToNotification("Sent"), NotificationStatus.SENT);
    assert.strictEqual(mapMsg91StatusToNotification("Delivered"), NotificationStatus.DELIVERED);
    assert.strictEqual(mapMsg91StatusToNotification("Read"), NotificationStatus.READ);
    assert.strictEqual(mapMsg91StatusToNotification("Failed"), NotificationStatus.FAILED);
    assert.strictEqual(mapMsg91StatusToNotification("Rejected"), NotificationStatus.FAILED);
    assert.strictEqual(mapMsg91StatusToNotification("unknown-xyz"), null);
  });
});

describe("MSG91 integration catalog", () => {
  test("WhatsApp catalog lists MSG91 only", () => {
    assert.strictEqual(INTEGRATION_CATALOG.WHATSAPP.defaultProvider, "MSG91");
    assert.deepStrictEqual(INTEGRATION_CATALOG.WHATSAPP.providers, ["MSG91"]);
    assert.ok(!INTEGRATION_CATALOG.WHATSAPP.providers.includes("AISENSY"));
  });
});

describe("MSG91 permanent error codes", () => {
  test("authentication and configuration failures are non-retriable", () => {
    assert.ok(NON_RETRIABLE_ERROR_CODES.has("MSG91_CONFIGURATION_MISSING"));
    assert.ok(NON_RETRIABLE_ERROR_CODES.has("MSG91_AUTHENTICATION_FAILED"));
    assert.ok(NON_RETRIABLE_ERROR_CODES.has("MSG91_TEMPLATE_NOT_FOUND"));
    assert.ok(NON_RETRIABLE_ERROR_CODES.has("MSG91_INVALID_RECIPIENT"));
  });
});

describe("MSG91 integrated number extraction", () => {
  test("extracts primary integrated_number from nested payload", () => {
    const result = extractIntegratedNumbers({
      data: [{ integrated_number: "918431310747", status: "active" }],
    });
    assert.deepStrictEqual(result.numbers, ["918431310747"]);
    assert.strictEqual(result.primary, "918431310747");
  });

  test("extracts multiple numbers and ignores short digit strings", () => {
    const result = extractIntegratedNumbers({
      numbers: ["919876543210", "91", "+91 98765 43211"],
      meta: { code: 200 },
    });
    assert.ok(result.numbers.includes("919876543210"));
    assert.ok(result.numbers.includes("919876543211"));
    assert.ok(!result.numbers.includes("91"));
  });

  test("returns empty when no phone-like values exist", () => {
    const result = extractIntegratedNumbers({ status: "success", message: "ok" });
    assert.deepStrictEqual(result.numbers, []);
    assert.strictEqual(result.primary, undefined);
  });
});
