import { test, describe } from "node:test";
import assert from "node:assert";
import {
  computeAssignmentCompletionRate,
  computeAvgAttendanceRate,
  computeConsecutiveTheoryAbsences,
  resolveStudentRiskFlag,
} from "../modules/reports/student-report.util";

describe("Student report — consecutive theory absences", () => {
  test("LEAVE is skipped and does not break or count the streak", () => {
    assert.strictEqual(
      computeConsecutiveTheoryAbsences([
        { status: "LEAVE" },
        { status: "ABSENT" },
        { status: "ABSENT" },
        { status: "PRESENT" },
      ]),
      2
    );
  });

  test("PRESENT breaks the streak", () => {
    assert.strictEqual(
      computeConsecutiveTheoryAbsences([
        { status: "ABSENT" },
        { status: "PRESENT" },
        { status: "ABSENT" },
        { status: "ABSENT" },
        { status: "ABSENT" },
      ]),
      1
    );
  });

  test("counts three consecutive absences as Triggered threshold", () => {
    assert.strictEqual(
      computeConsecutiveTheoryAbsences([
        { status: "ABSENT" },
        { status: "ABSENT" },
        { status: "ABSENT" },
      ]),
      3
    );
  });
});

describe("Student report — risk flags", () => {
  test("Triggered when consecutive absences >= 3", () => {
    assert.strictEqual(resolveStudentRiskFlag(3, 90, 10), "Triggered");
    assert.strictEqual(resolveStudentRiskFlag(4, 100, 5), "Triggered");
  });

  test("At Risk when consecutive === 2", () => {
    assert.strictEqual(resolveStudentRiskFlag(2, 90, 10), "At Risk");
  });

  test("At Risk when attendance < 75% with conducted classes", () => {
    assert.strictEqual(resolveStudentRiskFlag(0, 74, 8), "At Risk");
    assert.strictEqual(resolveStudentRiskFlag(1, 50, 4), "At Risk");
  });

  test("Normal when attendance healthy and consecutive < 2", () => {
    assert.strictEqual(resolveStudentRiskFlag(0, 80, 10), "Normal");
    assert.strictEqual(resolveStudentRiskFlag(1, 100, 3), "Normal");
  });

  test("low attendance without conducted classes stays Normal", () => {
    assert.strictEqual(resolveStudentRiskFlag(0, 0, 0), "Normal");
  });
});

describe("Student report — KPI rates", () => {
  test("avg attendance is null when no conducted classes", () => {
    assert.strictEqual(
      computeAvgAttendanceRate([
        { attendancePercentage: 0, conductedCount: 0 },
        { attendancePercentage: 0, conductedCount: 0 },
      ]),
      null
    );
  });

  test("avg attendance averages only students with conducted classes", () => {
    assert.strictEqual(
      computeAvgAttendanceRate([
        { attendancePercentage: 80, conductedCount: 5 },
        { attendancePercentage: 100, conductedCount: 2 },
        { attendancePercentage: 0, conductedCount: 0 },
      ]),
      90
    );
  });

  test("assignment completion is null when no assignments", () => {
    assert.strictEqual(computeAssignmentCompletionRate(0, 0), null);
  });

  test("assignment completion rounds percent", () => {
    assert.strictEqual(computeAssignmentCompletionRate(1, 3), 33);
    assert.strictEqual(computeAssignmentCompletionRate(2, 4), 50);
  });
});
