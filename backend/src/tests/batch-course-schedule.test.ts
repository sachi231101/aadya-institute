import { test, describe } from "node:test";
import assert from "node:assert";
import { normalizeBatchCourses } from "../modules/batches/batch.repository";
import { buildDefaultSchedules, getDaysForPattern } from "../modules/batches/batch-schedule.util";

describe("Per-course batch schedule normalization", () => {
  test("normalizeBatchCourses carries per-course schedule fields", () => {
    const rows = normalizeBatchCourses({
      courses: [
        {
          courseId: "c1",
          facultyId: "f1",
          startDate: "2026-04-01",
          expectedEndDate: "2026-06-30",
          schedulePattern: "MWF",
          timeSlot: "10:00 AM - 12:00 PM",
          classroomMasterId: "room-1",
        },
        {
          courseId: "c2",
          facultyId: "f2",
          startDate: "2026-05-01",
          expectedEndDate: "2026-07-31",
          schedulePattern: "TTS",
          timeSlot: "2:00 PM - 4:00 PM",
          classroomMasterId: "room-2",
        },
      ],
    });

    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].schedulePattern, "MWF");
    assert.strictEqual(rows[0].classroomMasterId, "room-1");
    assert.strictEqual(rows[1].schedulePattern, "TTS");
    assert.strictEqual(rows[1].startDate, "2026-05-01");
    assert.strictEqual(rows[1].facultyId, "f2");
  });

  test("normalizeBatchCourses falls back to batch-level schedule for legacy payloads", () => {
    const rows = normalizeBatchCourses({
      courseId: "c1",
      facultyId: "f1",
      startDate: "2026-04-01",
      schedulePattern: "WEEKEND",
      timeSlot: "9:00 AM - 11:00 AM",
      classroomMasterId: "lab-1",
    });

    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].courseId, "c1");
    assert.strictEqual(rows[0].schedulePattern, "WEEKEND");
    assert.strictEqual(rows[0].classroomMasterId, "lab-1");
  });

  test("normalizeBatchCourses applies batch fallback onto courses missing schedule fields", () => {
    const rows = normalizeBatchCourses({
      startDate: "2026-04-01",
      schedulePattern: "MWF",
      timeSlot: "10:00 AM - 12:00 PM",
      courses: [{ courseId: "c1", facultyId: "f1" }, { courseId: "c2", facultyId: "f2" }],
    });

    assert.strictEqual(rows[0].startDate, "2026-04-01");
    assert.strictEqual(rows[0].schedulePattern, "MWF");
    assert.strictEqual(rows[1].startDate, "2026-04-01");
    assert.strictEqual(rows[1].schedulePattern, "MWF");
  });
});

describe("Per-course default schedule building", () => {
  test("MWF and TTS produce distinct day sets for different courses", () => {
    const mwfDays = getDaysForPattern("MWF");
    const ttsDays = getDaysForPattern("TTS");
    assert.deepStrictEqual(mwfDays, [1, 3, 5]);
    assert.deepStrictEqual(ttsDays, [2, 4, 6]);

    const start = new Date("2026-04-01");
    const javaSlots = buildDefaultSchedules("MWF", "10:00 AM - 12:00 PM", start);
    const reactSlots = buildDefaultSchedules("TTS", "2:00 PM - 4:00 PM", start);

    assert.strictEqual(javaSlots.length, 3);
    assert.strictEqual(reactSlots.length, 3);
    assert.ok(javaSlots.every((s) => s.startTime === "10:00 AM"));
    assert.ok(reactSlots.every((s) => s.startTime === "2:00 PM"));
    assert.ok(!javaSlots.some((s) => reactSlots.some((r) => r.dayOfWeek === s.dayOfWeek)));
  });

  test("session dedupe key includes batchCourseId so same day/time can exist per course", () => {
    const keyA = `2026-04-06|10:00 AM|bc-java`;
    const keyB = `2026-04-06|10:00 AM|bc-react`;
    assert.notStrictEqual(keyA, keyB);
  });
});
