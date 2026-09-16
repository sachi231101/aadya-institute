import { test, describe } from "node:test";
import assert from "node:assert";
import {
  createLeaveRequestSchema,
  reviewLeaveRequestSchema,
} from "../modules/leave-requests/leave-request.validation";

describe("Leave request validation", () => {
  test("accepts a valid date range and reason", () => {
    const parsed = createLeaveRequestSchema.parse({
      startDate: "2026-09-16",
      endDate: "2026-09-18",
      reason: "Family function",
    });
    assert.strictEqual(parsed.reason, "Family function");
  });

  test("rejects an end date before the start date", () => {
    const result = createLeaveRequestSchema.safeParse({
      startDate: "2026-09-18",
      endDate: "2026-09-16",
      reason: "Medical leave",
    });
    assert.strictEqual(result.success, false);
  });

  test("rejects a reason that is too short", () => {
    const result = createLeaveRequestSchema.safeParse({
      startDate: "2026-09-16",
      endDate: "2026-09-16",
      reason: "ill",
    });
    assert.strictEqual(result.success, false);
  });

  test("review decision must be approve or reject", () => {
    const parsed = reviewLeaveRequestSchema.parse({
      decision: "APPROVED",
      reviewNote: "Approved for two days",
    });
    assert.strictEqual(parsed.decision, "APPROVED");

    const invalid = reviewLeaveRequestSchema.safeParse({ decision: "MAYBE" });
    assert.strictEqual(invalid.success, false);
  });
});
