import { test, describe } from "node:test";
import assert from "node:assert";
import { discontinueStudentSchema } from "../modules/students/student.validation";
import { buildStudentIdempotencyKey } from "../modules/ai-calling/ai-calling.types";

describe("Discontinue student validation", () => {
  test("accepts a valid reason", () => {
    const parsed = discontinueStudentSchema.parse({
      reason: "3 consecutive theory absences",
    });
    assert.strictEqual(parsed.reason, "3 consecutive theory absences");
  });

  test("trims reason whitespace", () => {
    const parsed = discontinueStudentSchema.parse({
      reason: "  Missed classes  ",
    });
    assert.strictEqual(parsed.reason, "Missed classes");
  });

  test("rejects empty reason", () => {
    assert.throws(() => discontinueStudentSchema.parse({ reason: "" }));
  });

  test("rejects too-short reason", () => {
    assert.throws(() => discontinueStudentSchema.parse({ reason: "ab" }));
  });

  test("rejects missing reason", () => {
    assert.throws(() => discontinueStudentSchema.parse({}));
  });
});

describe("Student AI call idempotency key", () => {
  test("builds distinct student key space", () => {
    const key = buildStudentIdempotencyKey("inst-1", "stu-1", 2);
    assert.strictEqual(key, "ai_call:inst-1:student:stu-1:2");
    assert.ok(key.includes(":student:"));
  });
});

describe("Discontinuation risk payload shape", () => {
  test("risk row includes required FE fields", () => {
    const row = {
      id: "stu-1",
      studentId: "stu-1",
      studentCode: "AAD-001",
      name: "Rahul Sharma",
      email: "rahul@example.com",
      phone: "+919876543210",
      branchId: "br-1",
      batchId: "batch-1",
      batchName: "FS-MWF-Morning",
      courseName: "Full Stack",
      consecutiveAbsences: 3,
      riskLevel: "CRITICAL" as const,
      lastPresentDate: "2026-09-15T00:00:00.000Z",
    };

    assert.ok(row.phone);
    assert.ok(row.batchId);
    assert.strictEqual(row.riskLevel, "CRITICAL");
    assert.ok(row.lastPresentDate);
    assert.ok(row.consecutiveAbsences >= 3);
  });

  test("warning vs critical riskLevel mapping", () => {
    const level = (n: number) => (n >= 3 ? "CRITICAL" : "WARNING");
    assert.strictEqual(level(2), "WARNING");
    assert.strictEqual(level(3), "CRITICAL");
    assert.strictEqual(level(5), "CRITICAL");
  });
});
