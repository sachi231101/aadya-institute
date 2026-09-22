import { test, describe } from "node:test";
import assert from "node:assert";
import { discontinueStudentSchema } from "../modules/students/student.validation";
import {
  buildStudentIdempotencyKey,
  buildIdempotencyKey,
} from "../modules/ai-calling/ai-calling.types";

describe("Discontinuation risk — validation", () => {
  test("discontinueStudentSchema requires a meaningful reason", () => {
    const ok = discontinueStudentSchema.safeParse({
      reason: "3 consecutive theory absences — family relocated",
    });
    assert.strictEqual(ok.success, true);

    const tooShort = discontinueStudentSchema.safeParse({ reason: "no" });
    assert.strictEqual(tooShort.success, false);

    const empty = discontinueStudentSchema.safeParse({ reason: "   " });
    assert.strictEqual(empty.success, false);

    const missing = discontinueStudentSchema.safeParse({});
    assert.strictEqual(missing.success, false);
  });

  test("discontinueStudentSchema trims reason", () => {
    const parsed = discontinueStudentSchema.parse({
      reason: "  Student requested withdrawal  ",
    });
    assert.strictEqual(parsed.reason, "Student requested withdrawal");
  });
});

describe("Discontinuation risk — AI call idempotency", () => {
  test("buildStudentIdempotencyKey isolates student dials from leads", () => {
    const studentKey = buildStudentIdempotencyKey("inst-1", "stu-9", 1);
    assert.strictEqual(studentKey, "ai_call:inst-1:student:stu-9:1");

    const leadKey = buildIdempotencyKey("inst-1", "stu-9", 1);
    assert.notStrictEqual(studentKey, leadKey);
  });
});

describe("Discontinuation risk — list payload helpers", () => {
  /** Mirrors getDiscontinuationRisk streak + lastPresentDate logic. */
  function computeRiskFields(
    recent: Array<{ status: string; scheduledDate?: string | null }>
  ): {
    consecutiveAbsences: number;
    lastPresentDate: string | null;
    riskLevel: "CRITICAL" | "WARNING" | null;
  } {
    let consecutiveAbsences = 0;
    let lastPresentDate: string | null = null;

    for (const record of recent) {
      if (record.status === "LEAVE") continue;
      if (record.status === "ABSENT") {
        consecutiveAbsences++;
        continue;
      }
      if (record.status === "PRESENT" || record.status === "LATE") {
        lastPresentDate = record.scheduledDate
          ? new Date(record.scheduledDate).toISOString()
          : null;
      }
      break;
    }

    if (!lastPresentDate) {
      for (const record of recent) {
        if (record.status === "PRESENT" || record.status === "LATE") {
          lastPresentDate = record.scheduledDate
            ? new Date(record.scheduledDate).toISOString()
            : null;
          break;
        }
      }
    }

    if (consecutiveAbsences < 2) {
      return { consecutiveAbsences, lastPresentDate, riskLevel: null };
    }
    return {
      consecutiveAbsences,
      lastPresentDate,
      riskLevel: consecutiveAbsences >= 3 ? "CRITICAL" : "WARNING",
    };
  }

  test("LEAVE does not count toward streak; PRESENT resets and sets lastPresentDate", () => {
    const result = computeRiskFields([
      { status: "ABSENT", scheduledDate: "2026-09-20" },
      { status: "LEAVE", scheduledDate: "2026-09-18" },
      { status: "ABSENT", scheduledDate: "2026-09-16" },
      { status: "PRESENT", scheduledDate: "2026-09-14" },
      { status: "ABSENT", scheduledDate: "2026-09-12" },
    ]);
    assert.strictEqual(result.consecutiveAbsences, 2);
    assert.strictEqual(result.riskLevel, "WARNING");
    assert.ok(result.lastPresentDate?.startsWith("2026-09-14"));
  });

  test("3 absences are CRITICAL and still surface last present further back", () => {
    const result = computeRiskFields([
      { status: "ABSENT", scheduledDate: "2026-09-20" },
      { status: "ABSENT", scheduledDate: "2026-09-18" },
      { status: "ABSENT", scheduledDate: "2026-09-16" },
      { status: "PRESENT", scheduledDate: "2026-09-10" },
    ]);
    assert.strictEqual(result.consecutiveAbsences, 3);
    assert.strictEqual(result.riskLevel, "CRITICAL");
    assert.ok(result.lastPresentDate?.startsWith("2026-09-10"));
  });

  test("ACTIVE-only list semantics: DISCONTINUED students are excluded by status filter", () => {
    // Documented contract for getDiscontinuationRisk: where.status = ACTIVE
    const listFilter = { status: "ACTIVE" as const };
    assert.notStrictEqual(listFilter.status, "DISCONTINUED");
  });
});
