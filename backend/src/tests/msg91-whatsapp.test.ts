import { test, describe } from "node:test";
import assert from "node:assert";
import { mapMsg91StatusToNotification } from "../modules/whatsapp/integrations/msg91.status";
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
