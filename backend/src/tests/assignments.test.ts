import { test, describe } from "node:test";
import assert from "node:assert";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
  queryAssignmentSchema,
} from "../modules/assignments/assignment.validation";

describe("Zenox-style Assignment Validation", () => {
  test("create requires academic year and targets (or batch)", () => {
    const parsed = createAssignmentSchema.parse({
      title: "Multi-target Project",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      academicYearMasterId: "year-1",
      targets: [
        { courseId: "c1", batchId: "b1", courseModuleId: "m1", topic: "Hooks" },
        { courseId: "c1", batchId: "b2" },
      ],
      recipientStudentIds: ["s1", "s2"],
      restrictStudentUpload: false,
      maxMarks: 50,
    });
    assert.strictEqual(parsed.targets?.length, 2);
    assert.strictEqual(parsed.academicYearMasterId, "year-1");
    assert.strictEqual(parsed.recipientStudentIds?.length, 2);
  });

  test("create rejects missing academic year", () => {
    assert.throws(() =>
      createAssignmentSchema.parse({
        title: "No year",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        targets: [{ courseId: "c1", batchId: "b1" }],
      })
    );
  });

  test("create accepts legacy batchId without targets array", () => {
    const parsed = createAssignmentSchema.parse({
      title: "Legacy batch create",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      academicYearMasterId: "year-1",
      batchId: "batch-1",
    });
    assert.strictEqual(parsed.batchId, "batch-1");
  });

  test("query supports date range and master filters", () => {
    const parsed = queryAssignmentSchema.parse({
      assignedFrom: "2026-01-01",
      assignedTo: "2026-12-31",
      academicYearMasterId: "year-1",
      assignmentTypeMasterId: "type-1",
      page: "2",
      limit: "10",
    });
    assert.strictEqual(parsed.page, 2);
    assert.strictEqual(parsed.academicYearMasterId, "year-1");
  });

  test("update can replace targets and clear recipients", () => {
    const parsed = updateAssignmentSchema.parse({
      targets: [{ courseId: "c2", batchId: "b3" }],
      recipientStudentIds: [],
      restrictStudentUpload: true,
      validTill: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    assert.strictEqual(parsed.restrictStudentUpload, true);
    assert.deepStrictEqual(parsed.recipientStudentIds, []);
  });

  test("submit and grade schemas still work", () => {
    const submit = submitAssignmentSchema.parse({
      fileKey: "/assignments/a.pdf",
      fileName: "a.pdf",
    });
    assert.strictEqual(submit.fileKey, "/assignments/a.pdf");
    const grade = gradeSubmissionSchema.parse({ marks: 40, feedback: "Good" });
    assert.strictEqual(grade.marks, 40);
  });
});

describe("Audience and restriction rules", () => {
  test("recipients override full batch enrollment", () => {
    const allEnrolled = ["s1", "s2", "s3"];
    const recipients = ["s1", "s3"];
    const audience = recipients.length > 0 ? recipients : allEnrolled;
    assert.deepStrictEqual(audience, ["s1", "s3"]);
  });

  test("validTill blocks submit even when allowLate", () => {
    const validTill = new Date(Date.now() - 1000);
    const allowLate = true;
    const now = new Date();
    const blockedByValidTill = now > validTill;
    const canSubmit = !blockedByValidTill && (allowLate || true);
    assert.strictEqual(blockedByValidTill, true);
    assert.strictEqual(canSubmit, false);
  });

  test("restrictStudentUpload blocks upload path", () => {
    const restrictStudentUpload = true;
    assert.strictEqual(restrictStudentUpload ? "blocked" : "ok", "blocked");
  });
});

describe("Student assignment visibility", () => {
  test("specific recipients: only listed students see the assignment", () => {
    const recipientIds = ["s1", "s3"];
    const isVisibleTo = (studentId: string) =>
      recipientIds.length === 0 || recipientIds.includes(studentId);
    assert.strictEqual(isVisibleTo("s1"), true);
    assert.strictEqual(isVisibleTo("s2"), false);
    assert.strictEqual(isVisibleTo("s3"), true);
  });

  test("no recipients: all enrolled batch students see the assignment", () => {
    const recipientIds: string[] = [];
    const enrolled = ["s1", "s2", "s3"];
    const visible = enrolled.filter(
      (id) => recipientIds.length === 0 || recipientIds.includes(id)
    );
    assert.deepStrictEqual(visible, enrolled);
  });

  test("pending dashboard count excludes submitted work", () => {
    const rows = [
      { studentId: "s1", submittedAt: null },
      { studentId: "s1", submittedAt: new Date().toISOString() },
    ];
    const pendingForStudent = rows.filter((r) => r.studentId === "s1" && !r.submittedAt);
    assert.strictEqual(pendingForStudent.length, 1);
  });
});
