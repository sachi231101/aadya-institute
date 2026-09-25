import { test, describe } from "node:test";
import assert from "node:assert";
import { AppError } from "../middlewares/error.middleware";
import {
  assertCanMarkAttendanceForSessionDay,
  istTodayKey,
  toSessionDateKey,
} from "../utils/session-window.util";

describe("attendance today-only gate", () => {
  // 2026-09-25 11:30 IST
  const now = new Date("2026-09-25T06:00:00.000Z");
  const todaySessionDate = new Date(Date.UTC(2026, 8, 25, 12, 0, 0));
  const yesterdaySessionDate = new Date(Date.UTC(2026, 8, 24, 12, 0, 0));

  test("aligns today key with IST calendar day", () => {
    assert.strictEqual(istTodayKey(now), "2026-09-25");
    assert.strictEqual(toSessionDateKey(todaySessionDate), "2026-09-25");
    assert.strictEqual(toSessionDateKey(yesterdaySessionDate), "2026-09-24");
  });

  test("non-admin may mark attendance for today's session", () => {
    for (const roles of [["FACULTY"], ["CENTER_MANAGER"], ["COUNSELLOR"]]) {
      assert.doesNotThrow(() =>
        assertCanMarkAttendanceForSessionDay({
          scheduledDate: todaySessionDate,
          roles,
          now,
        })
      );
    }
  });

  test("non-admin is blocked with 403 for a past session", () => {
    assert.throws(
      () =>
        assertCanMarkAttendanceForSessionDay({
          scheduledDate: yesterdaySessionDate,
          roles: ["FACULTY"],
          now,
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 403 &&
        err.message === "Attendance can only be marked for today's classes"
    );
  });

  test("ADMIN and SUPER_ADMIN may correct past sessions", () => {
    for (const roles of [["ADMIN"], ["SUPER_ADMIN"]]) {
      assert.doesNotThrow(() =>
        assertCanMarkAttendanceForSessionDay({
          scheduledDate: yesterdaySessionDate,
          roles,
          now,
        })
      );
    }
  });
});
