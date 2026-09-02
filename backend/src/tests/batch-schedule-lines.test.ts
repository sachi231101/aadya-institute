import { test, describe } from "node:test";
import assert from "node:assert";
import {
  coursesFromScheduleLines,
  normalizeBatchCourses,
} from "../modules/batches/batch.repository";
import { derivePatternFromDays } from "../modules/batches/batch-schedule.util";

describe("Zenox scheduleLines → BatchCourse derivation", () => {
  test("coursesFromScheduleLines groups unique courses and first faculty", () => {
    const items = coursesFromScheduleLines(
      [
        {
          courseId: "java",
          dayOfWeek: 1,
          facultyId: "f-a",
          timeSlot: "10:00 AM - 12:00 PM",
          classroomMasterId: "room-1",
        },
        {
          courseId: "java",
          dayOfWeek: 3,
          facultyId: "f-a",
          timeSlot: "10:00 AM - 12:00 PM",
          classroomMasterId: "room-1",
        },
        {
          courseId: "react",
          dayOfWeek: 2,
          facultyId: "f-b",
          timeSlot: "2:00 PM - 4:00 PM",
          classroomMasterId: "room-2",
        },
      ],
      { startDate: "2026-04-01", expectedEndDate: "2026-07-01" }
    );

    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].courseId, "java");
    assert.strictEqual(items[0].facultyId, "f-a");
    assert.strictEqual(items[0].schedulePattern, "CUSTOM"); // Mon+Wed only → CUSTOM
    assert.strictEqual(items[1].courseId, "react");
    assert.strictEqual(items[1].facultyId, "f-b");
  });

  test("normalizeBatchCourses prefers scheduleLines over courses[]", () => {
    const items = normalizeBatchCourses({
      startDate: "2026-04-01",
      courses: [{ courseId: "ignored", facultyId: "x" }],
      scheduleLines: [
        { courseId: "c1", dayOfWeek: 1, facultyId: "f1", timeSlot: "9:00 AM - 10:00 AM" },
        { courseId: "c1", dayOfWeek: 3, facultyId: "f1", timeSlot: "9:00 AM - 10:00 AM" },
        { courseId: "c1", dayOfWeek: 5, facultyId: "f1", timeSlot: "9:00 AM - 10:00 AM" },
      ],
    });
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].courseId, "c1");
    assert.strictEqual(items[0].schedulePattern, "MWF");
  });
});

describe("derivePatternFromDays", () => {
  test("detects MWF TTS WEEKEND CUSTOM", () => {
    assert.strictEqual(derivePatternFromDays([1, 3, 5]), "MWF");
    assert.strictEqual(derivePatternFromDays([2, 4, 6]), "TTS");
    assert.strictEqual(derivePatternFromDays([0, 6]), "WEEKEND");
    assert.strictEqual(derivePatternFromDays([1, 2]), "CUSTOM");
  });
});

describe("Available faculty conflict key logic", () => {
  test("busy faculty set excludes matching day/slot", () => {
    const busy = [
      { facultyId: "f1", dayOfWeek: 1, startTime: "10:00 AM" },
      { facultyId: "f2", dayOfWeek: 1, startTime: "10:00 AM" },
      { facultyId: "f1", dayOfWeek: 2, startTime: "10:00 AM" },
    ];
    const busyOnMon10 = [
      ...new Set(
        busy.filter((b) => b.dayOfWeek === 1 && b.startTime === "10:00 AM").map((b) => b.facultyId)
      ),
    ];
    assert.deepStrictEqual(busyOnMon10.sort(), ["f1", "f2"]);
  });
});
