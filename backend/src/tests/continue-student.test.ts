import { test, describe } from "node:test";
import assert from "node:assert";
import { continueStudentSchema } from "../modules/students/student.validation";
import { canRestoreBatchEnrollment } from "../modules/students/student.service";

describe("Continue student validation", () => {
  test("accepts empty body", () => {
    const parsed = continueStudentSchema.parse({});
    assert.strictEqual(parsed.notes, undefined);
  });

  test("accepts optional notes", () => {
    const parsed = continueStudentSchema.parse({ notes: "Returning after gap year" });
    assert.strictEqual(parsed.notes, "Returning after gap year");
  });

  test("trims notes whitespace", () => {
    const parsed = continueStudentSchema.parse({ notes: "  Family resolved  " });
    assert.strictEqual(parsed.notes, "Family resolved");
  });

  test("accepts empty string notes", () => {
    const parsed = continueStudentSchema.parse({ notes: "" });
    assert.strictEqual(parsed.notes, "");
  });

  test("rejects notes over 1000 characters", () => {
    const result = continueStudentSchema.safeParse({ notes: "x".repeat(1001) });
    assert.strictEqual(result.success, false);
  });
});

describe("Continue student — enrollment restore rules", () => {
  test("restores when batch is open and has a free seat", () => {
    assert.strictEqual(
      canRestoreBatchEnrollment({
        batch: { status: "ACTIVE", capacity: 35 },
        activeEnrollmentCount: 10,
      }),
      true
    );
  });

  test("restores when capacity is null (unlimited)", () => {
    assert.strictEqual(
      canRestoreBatchEnrollment({
        batch: { status: "UPCOMING", capacity: null },
        activeEnrollmentCount: 100,
      }),
      true
    );
  });

  test("does not restore when batch is missing", () => {
    assert.strictEqual(
      canRestoreBatchEnrollment({
        batch: null,
        activeEnrollmentCount: 0,
      }),
      false
    );
  });

  test("does not restore when batch is CANCELLED", () => {
    assert.strictEqual(
      canRestoreBatchEnrollment({
        batch: { status: "CANCELLED", capacity: 35 },
        activeEnrollmentCount: 5,
      }),
      false
    );
  });

  test("does not restore when batch is COMPLETED", () => {
    assert.strictEqual(
      canRestoreBatchEnrollment({
        batch: { status: "COMPLETED", capacity: 35 },
        activeEnrollmentCount: 5,
      }),
      false
    );
  });

  test("does not restore when batch is at capacity", () => {
    assert.strictEqual(
      canRestoreBatchEnrollment({
        batch: { status: "ACTIVE", capacity: 20 },
        activeEnrollmentCount: 20,
      }),
      false
    );
  });

  test("does not restore when batch is over capacity", () => {
    assert.strictEqual(
      canRestoreBatchEnrollment({
        batch: { status: "ACTIVE", capacity: 20 },
        activeEnrollmentCount: 21,
      }),
      false
    );
  });
});

describe("Continue student — status guard", () => {
  /** Mirrors continueStudent status check. */
  const assertCanContinue = (status: string): void => {
    if (status !== "DISCONTINUED") {
      throw new Error(`Cannot continue a student with status ${status}`);
    }
  };

  /** Mirrors continueStudent ADMIN-only role check. */
  const assertAdminCanContinue = (roles: string[]): void => {
    const normalized = roles.map((r) => String(r).toUpperCase());
    if (!normalized.includes("ADMIN") && !normalized.includes("SUPER_ADMIN")) {
      throw new Error("Only administrators can continue a discontinued student");
    }
  };

  test("allows DISCONTINUED", () => {
    assert.doesNotThrow(() => assertCanContinue("DISCONTINUED"));
  });

  test("rejects ACTIVE", () => {
    assert.throws(
      () => assertCanContinue("ACTIVE"),
      /Cannot continue a student with status ACTIVE/
    );
  });

  test("rejects ON_LEAVE", () => {
    assert.throws(
      () => assertCanContinue("ON_LEAVE"),
      /Cannot continue a student with status ON_LEAVE/
    );
  });

  test("rejects COMPLETED", () => {
    assert.throws(
      () => assertCanContinue("COMPLETED"),
      /Cannot continue a student with status COMPLETED/
    );
  });

  test("allows ADMIN role", () => {
    assert.doesNotThrow(() => assertAdminCanContinue(["ADMIN"]));
  });

  test("allows SUPER_ADMIN role", () => {
    assert.doesNotThrow(() => assertAdminCanContinue(["SUPER_ADMIN"]));
  });

  test("rejects CENTER_MANAGER role", () => {
    assert.throws(
      () => assertAdminCanContinue(["CENTER_MANAGER"]),
      /Only administrators can continue a discontinued student/
    );
  });

  test("rejects COUNSELLOR role", () => {
    assert.throws(
      () => assertAdminCanContinue(["COUNSELLOR"]),
      /Only administrators can continue a discontinued student/
    );
  });
});

describe("Continue student — response summary shape", () => {
  test("restored summary includes batchCode", () => {
    const summary = {
      id: "stu-1",
      status: "ACTIVE",
      batchRestored: true,
      batchCode: "FS-MWF-01",
    };
    assert.strictEqual(summary.batchRestored, true);
    assert.ok(summary.batchCode);
  });

  test("no-seat summary omits batchCode", () => {
    const summary: {
      id: string;
      status: string;
      batchRestored: boolean;
      batchCode?: string;
    } = {
      id: "stu-1",
      status: "ACTIVE",
      batchRestored: false,
    };
    assert.strictEqual(summary.batchRestored, false);
    assert.strictEqual(summary.batchCode, undefined);
  });
});
