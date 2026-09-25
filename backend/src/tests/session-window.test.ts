import { test, describe } from "node:test";
import assert from "node:assert";
import { AppError } from "../middlewares/error.middleware";
import {
  assertCanMarkSessionAttendance,
  assertCanStartLiveSession,
  canExposeMeetingJoinUrl,
  getSessionHostPhase,
  getSessionInstant,
  istTodayKey,
  parseSessionTimeToMinutes,
  toSessionDateKey,
} from "../utils/session-window.util";

describe("session-window.util", () => {
  test("istTodayKey returns YYYY-MM-DD in Asia/Kolkata", () => {
    // 2026-09-24 23:30 UTC = 2026-09-25 05:00 IST
    const key = istTodayKey(new Date("2026-09-24T23:30:00.000Z"));
    assert.strictEqual(key, "2026-09-25");
  });

  test("toSessionDateKey reads UTC-noon Date as calendar day", () => {
    const d = new Date(Date.UTC(2026, 8, 24, 12, 0, 0));
    assert.strictEqual(toSessionDateKey(d), "2026-09-24");
    assert.strictEqual(toSessionDateKey("2026-09-24T00:00:00.000Z"), "2026-09-24");
  });

  test("parseSessionTimeToMinutes supports AM/PM and 24h", () => {
    assert.strictEqual(parseSessionTimeToMinutes("9:00 AM"), 9 * 60);
    assert.strictEqual(parseSessionTimeToMinutes("09:00 AM"), 9 * 60);
    assert.strictEqual(parseSessionTimeToMinutes("10:00 AM"), 10 * 60);
    assert.strictEqual(parseSessionTimeToMinutes("12:00 PM"), 12 * 60);
    assert.strictEqual(parseSessionTimeToMinutes("12:00 AM"), 0);
    assert.strictEqual(parseSessionTimeToMinutes("09:00"), 9 * 60);
    assert.strictEqual(parseSessionTimeToMinutes("09:00:00"), 9 * 60);
    assert.strictEqual(parseSessionTimeToMinutes("bad"), null);
  });

  test("getSessionInstant builds Kolkata wall clock (+05:30)", () => {
    const start = getSessionInstant("2026-09-24", "9:00 AM");
    assert.ok(start);
    assert.strictEqual(start!.toISOString(), "2026-09-24T03:30:00.000Z");
    const end = getSessionInstant("2026-09-24", "10:00 AM");
    assert.ok(end);
    assert.strictEqual(end!.toISOString(), "2026-09-24T04:30:00.000Z");
  });

  test("getSessionHostPhase is half-open [start, end)", () => {
    const base = {
      dateKey: "2026-09-24",
      startTime: "09:00 AM",
      endTime: "10:00 AM",
    };

    assert.strictEqual(
      getSessionHostPhase({ ...base, now: new Date("2026-09-24T03:29:59.000Z") }),
      "before"
    );
    assert.strictEqual(
      getSessionHostPhase({ ...base, now: new Date("2026-09-24T03:30:00.000Z") }),
      "during"
    );
    assert.strictEqual(
      getSessionHostPhase({ ...base, now: new Date("2026-09-24T04:00:00.000Z") }),
      "during"
    );
    assert.strictEqual(
      getSessionHostPhase({ ...base, now: new Date("2026-09-24T04:29:59.000Z") }),
      "during"
    );
    assert.strictEqual(
      getSessionHostPhase({ ...base, now: new Date("2026-09-24T04:30:00.000Z") }),
      "after"
    );
  });

  test("assertCanStartLiveSession rejects COMPLETED and CANCELLED", () => {
    const base = {
      dateKey: "2026-09-24",
      startTime: "09:00 AM",
      endTime: "10:00 AM",
      now: new Date("2026-09-24T04:00:00.000Z"),
    };

    assert.throws(
      () => assertCanStartLiveSession({ ...base, sessionStatus: "COMPLETED" }),
      (err: unknown) => err instanceof AppError && err.statusCode === 400
    );
    assert.throws(
      () => assertCanStartLiveSession({ ...base, sessionStatus: "CANCELLED" }),
      (err: unknown) => err instanceof AppError && err.statusCode === 400
    );
  });

  test("assertCanStartLiveSession rejects outside window", () => {
    const base = {
      dateKey: "2026-09-24",
      startTime: "09:00 AM",
      endTime: "10:00 AM",
      sessionStatus: "UPCOMING",
    };

    assert.throws(
      () =>
        assertCanStartLiveSession({
          ...base,
          now: new Date("2026-09-24T03:00:00.000Z"),
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        err.errorCode === "CLASS_SESSION_BEFORE_WINDOW"
    );

    assert.throws(
      () =>
        assertCanStartLiveSession({
          ...base,
          now: new Date("2026-09-24T05:00:00.000Z"),
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        err.errorCode === "CLASS_SESSION_AFTER_WINDOW"
    );
  });

  test("assertCanStartLiveSession allows during window including LIVE reconnect", () => {
    const now = new Date("2026-09-24T04:00:00.000Z");
    assert.doesNotThrow(() =>
      assertCanStartLiveSession({
        sessionStatus: "UPCOMING",
        dateKey: "2026-09-24",
        startTime: "09:00 AM",
        endTime: "10:00 AM",
        now,
      })
    );
    assert.doesNotThrow(() =>
      assertCanStartLiveSession({
        sessionStatus: "LIVE",
        dateKey: "2026-09-24",
        startTime: "09:00 AM",
        endTime: "10:00 AM",
        now,
      })
    );
  });

  test("assertCanMarkSessionAttendance rejects outside window (faculty attendance)", () => {
    const base = {
      dateKey: "2026-09-24",
      startTime: "09:00 AM",
      endTime: "10:00 AM",
    };

    assert.throws(
      () =>
        assertCanMarkSessionAttendance({
          ...base,
          now: new Date("2026-09-24T03:00:00.000Z"),
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        err.errorCode === "CLASS_SESSION_BEFORE_WINDOW"
    );

    assert.throws(
      () =>
        assertCanMarkSessionAttendance({
          ...base,
          now: new Date("2026-09-24T04:30:00.000Z"),
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        err.errorCode === "CLASS_SESSION_AFTER_WINDOW" &&
        /attendance/i.test(err.message)
    );
  });

  test("assertCanMarkSessionAttendance allows during window", () => {
    assert.doesNotThrow(() =>
      assertCanMarkSessionAttendance({
        dateKey: "2026-09-24",
        startTime: "09:00 AM",
        endTime: "10:00 AM",
        now: new Date("2026-09-24T04:00:00.000Z"),
      })
    );
  });

  test("canExposeMeetingJoinUrl requires LIVE and phase during (stuck LIVE after end → false)", () => {
    const base = {
      dateKey: "2026-09-25",
      startTime: "10:00 AM",
      endTime: "11:00 AM",
    };

    // 10:00–10:59 IST → during
    assert.strictEqual(
      canExposeMeetingJoinUrl({
        ...base,
        sessionStatus: "LIVE",
        now: new Date("2026-09-25T04:30:00.000Z"), // 10:00 IST
      }),
      true
    );
    assert.strictEqual(
      canExposeMeetingJoinUrl({
        ...base,
        sessionStatus: "LIVE",
        now: new Date("2026-09-25T05:29:59.000Z"), // 10:59:59 IST
      }),
      true
    );

    // Exactly 11:00 IST → after; stuck DB LIVE must not expose Meet URL
    assert.strictEqual(
      canExposeMeetingJoinUrl({
        ...base,
        sessionStatus: "LIVE",
        now: new Date("2026-09-25T05:30:00.000Z"), // 11:00 IST
      }),
      false
    );

    assert.strictEqual(
      canExposeMeetingJoinUrl({
        ...base,
        sessionStatus: "UPCOMING",
        now: new Date("2026-09-25T04:30:00.000Z"),
      }),
      false
    );
  });
});
