import { test, describe } from "node:test";
import assert from "node:assert";
import {
  batchIncludesCourse,
  formatBatchSubjectNames,
  getBatchCourseIds,
  getBatchCourseRows,
  getSessionSubjectLabel,
} from "../utils/batch-course.util";

describe("BatchCourse util", () => {
  const multiBatch = {
    courseId: "c1",
    course: { id: "c1", name: "Python", code: "PY" },
    batchCourses: [
      { courseId: "c1", sequence: 1, course: { id: "c1", name: "Python", code: "PY" } },
      { courseId: "c2", sequence: 2, course: { id: "c2", name: "Django", code: "DJ" } },
    ],
  };

  test("batchIncludesCourse matches primary and junction courses", () => {
    assert.strictEqual(batchIncludesCourse(multiBatch, "c1"), true);
    assert.strictEqual(batchIncludesCourse(multiBatch, "c2"), true);
    assert.strictEqual(batchIncludesCourse(multiBatch, "c9"), false);
  });

  test("getBatchCourseRows prefers batchCourses over legacy primary", () => {
    const rows = getBatchCourseRows(multiBatch);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].courseId, "c1");
    assert.strictEqual(rows[1].courseId, "c2");
  });

  test("formatBatchSubjectNames joins subject names", () => {
    assert.strictEqual(formatBatchSubjectNames(multiBatch), "Python, Django");
  });

  test("getBatchCourseIds returns unique course ids", () => {
    assert.deepStrictEqual(getBatchCourseIds(multiBatch), ["c1", "c2"]);
  });

  test("getSessionSubjectLabel prefers session title", () => {
    assert.strictEqual(
      getSessionSubjectLabel({ title: "Module 3 — ORM", batch: multiBatch }),
      "Module 3 — ORM"
    );
    assert.strictEqual(getSessionSubjectLabel({ title: "", batch: multiBatch }), "Python, Django");
  });
});
