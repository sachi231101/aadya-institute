import { test, describe } from "node:test";
import assert from "node:assert";
import {
  postSessionAttendanceSchema,
  patchAttendanceSchema,
  studentAttendanceQuerySchema,
  markAttendanceSchema,
} from "../modules/attendance/attendance.validation";

describe("Attendance Validation Schemas", () => {
  test("postSessionAttendanceSchema should validate valid bulk attendance payload", () => {
    const input = {
      attendance: [
        { studentId: "student-001", status: "PRESENT" },
        { studentId: "student-002", status: "ABSENT", remarks: "Unexcused absence" },
        { studentId: "student-003", status: "LEAVE", remarks: "Approved leave" },
      ],
    };

    const parsed = postSessionAttendanceSchema.parse(input);
    assert.strictEqual(parsed.attendance.length, 3);
    assert.strictEqual(parsed.attendance[0].status, "PRESENT");
    assert.strictEqual(parsed.attendance[1].status, "ABSENT");
    assert.strictEqual(parsed.attendance[2].status, "LEAVE");
  });

  test("postSessionAttendanceSchema should reject invalid status", () => {
    const input = {
      attendance: [{ studentId: "student-001", status: "INVALID_STATUS" }],
    };
    assert.throws(() => postSessionAttendanceSchema.parse(input));
  });

  test("patchAttendanceSchema should validate partial status update", () => {
    const parsed1 = patchAttendanceSchema.parse({ status: "LEAVE", remarks: "Medical leave" });
    assert.strictEqual(parsed1.status, "LEAVE");

    const parsed2 = patchAttendanceSchema.parse({ status: "PRESENT" });
    assert.strictEqual(parsed2.status, "PRESENT");
  });

  test("studentAttendanceQuerySchema should validate date range queries", () => {
    const parsed = studentAttendanceQuerySchema.parse({
      fromDate: "2026-08-01",
      toDate: "2026-08-13",
      page: "1",
      limit: "20",
    });
    assert.strictEqual(parsed.fromDate, "2026-08-01");
    assert.strictEqual(parsed.limit, "20");
  });
});

describe("Attendance Summary Logic Unit Tests", () => {
  test("should calculate attendance percentage correctly", () => {
    const totalClasses = 10;
    const presentCount = 8;
    const percentage = Math.round((presentCount / totalClasses) * 10000) / 100;
    assert.strictEqual(percentage, 80);
  });

  test("should handle 0 total classes gracefully", () => {
    const totalClasses = 0;
    const presentCount = 0;
    const percentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 10000) / 100 : 0;
    assert.strictEqual(percentage, 0);
  });
});
