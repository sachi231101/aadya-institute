import { test, describe } from "node:test";
import assert from "node:assert";
import {
  groupPunchesByFacultyDay,
  istWallTimeToDate,
  summarizeDayPunches,
  type FacultyPunchRow,
  type FacultyPunchType,
} from "../modules/faculty/faculty-attendance-punch.util";

const DATE_KEY = "2026-09-26";
const DATE = new Date(Date.UTC(2026, 8, 26));

let seq = 0;
const punch = (
  type: FacultyPunchType,
  timeHmm: string,
  overrides: Partial<FacultyPunchRow> = {}
): FacultyPunchRow => ({
  id: `p${++seq}`,
  facultyId: "f1",
  date: DATE,
  type,
  timeHmm,
  punchedAt: istWallTimeToDate(DATE_KEY, timeHmm),
  source: "MANUAL",
  latitude: 12.9,
  longitude: 77.6,
  ...overrides,
});

describe("faculty-attendance-punch.util", () => {
  test("istWallTimeToDate converts IST wall time to UTC", () => {
    assert.strictEqual(
      istWallTimeToDate(DATE_KEY, "09:30").toISOString(),
      "2026-09-26T04:00:00.000Z"
    );
  });

  test("no punches and no row → empty summary", () => {
    const s = summarizeDayPunches([], null);
    assert.deepStrictEqual(s, {
      punches: [],
      openSession: false,
      firstIn: null,
      lastOut: null,
      sessionCount: 0,
      totalMinutes: 0,
    });
  });

  test("single open session", () => {
    const s = summarizeDayPunches([punch("CHECK_IN", "09:00")]);
    assert.strictEqual(s.openSession, true);
    assert.strictEqual(s.firstIn, "09:00");
    assert.strictEqual(s.lastOut, null);
    assert.strictEqual(s.sessionCount, 1);
    assert.strictEqual(s.totalMinutes, 0);
  });

  test("two sessions, second open: duration counts completed only", () => {
    const s = summarizeDayPunches([
      punch("CHECK_IN", "09:00"),
      punch("CHECK_OUT", "12:30", { source: "AUTO_GEOFENCE" }),
      punch("CHECK_IN", "13:15"),
    ]);
    assert.strictEqual(s.openSession, true);
    assert.strictEqual(s.firstIn, "09:00");
    assert.strictEqual(s.lastOut, "12:30");
    assert.strictEqual(s.sessionCount, 2);
    assert.strictEqual(s.totalMinutes, 210);
    assert.strictEqual(s.punches[1].source, "AUTO_GEOFENCE");
  });

  test("two completed sessions, unsorted input", () => {
    const s = summarizeDayPunches([
      punch("CHECK_OUT", "17:00"),
      punch("CHECK_IN", "09:00"),
      punch("CHECK_IN", "13:00"),
      punch("CHECK_OUT", "12:00"),
    ]);
    assert.strictEqual(s.openSession, false);
    assert.strictEqual(s.firstIn, "09:00");
    assert.strictEqual(s.lastOut, "17:00");
    assert.strictEqual(s.sessionCount, 2);
    assert.strictEqual(s.totalMinutes, 180 + 240);
    assert.deepStrictEqual(
      s.punches.map((p) => p.timeHmm),
      ["09:00", "12:00", "13:00", "17:00"]
    );
  });

  test("falls back to day row times when there are no punches", () => {
    const closed = summarizeDayPunches([], { status: "PRESENT", inTime: "09:00", outTime: "17:30" });
    assert.strictEqual(closed.openSession, false);
    assert.strictEqual(closed.sessionCount, 1);
    assert.strictEqual(closed.totalMinutes, 510);

    const open = summarizeDayPunches([], { status: "PRESENT", inTime: "09:00", outTime: null });
    assert.strictEqual(open.openSession, true);

    const leave = summarizeDayPunches([], { status: "LEAVE", inTime: null, outTime: null });
    assert.strictEqual(leave.sessionCount, 0);
    assert.strictEqual(leave.openSession, false);
  });

  test("groupPunchesByFacultyDay keys by faculty and IST date", () => {
    const map = groupPunchesByFacultyDay([
      punch("CHECK_IN", "09:00"),
      punch("CHECK_IN", "09:05", { facultyId: "f2" }),
      punch("CHECK_OUT", "10:00"),
    ]);
    assert.strictEqual(map.get(`f1|${DATE_KEY}`)?.length, 2);
    assert.strictEqual(map.get(`f2|${DATE_KEY}`)?.length, 1);
  });

  test("manual CHECK_OUT may omit GPS coords (null lat/lng)", () => {
    const s = summarizeDayPunches([
      punch("CHECK_IN", "09:00"),
      punch("CHECK_OUT", "17:00", { latitude: null, longitude: null, source: "MANUAL" }),
    ]);
    assert.strictEqual(s.openSession, false);
    assert.strictEqual(s.firstIn, "09:00");
    assert.strictEqual(s.lastOut, "17:00");
    assert.strictEqual(s.sessionCount, 1);
    assert.strictEqual(s.totalMinutes, 480);
    assert.strictEqual(s.punches[1].latitude, null);
    assert.strictEqual(s.punches[1].longitude, null);
    assert.strictEqual(s.punches[1].source, "MANUAL");
  });
});
