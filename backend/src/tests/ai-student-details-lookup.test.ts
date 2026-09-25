import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import { executeGetStudentDetails } from "../modules/ai-agent/tools/student.tools";
import type { AIToolAuthContext } from "../modules/ai-agent/security/ai-scope.service";

describe("AI get_student_details by name/phone", () => {
  let instituteId: string;
  let branchId: string;
  let userId: string;
  let studentId: string;
  let studentCode: string;
  const phone = "919900112233";
  const studentName = "Vec Lookup Student";

  before(async () => {
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-STU-LOOKUP" },
      update: {},
      create: {
        name: "Student Lookup Test Institute",
        code: "TEST-STU-LOOKUP",
        status: "ACTIVE",
      },
    });
    instituteId = institute.id;

    const branch = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "SL-A" } },
      update: {},
      create: {
        instituteId,
        name: "Lookup Branch",
        code: "SL-A",
        status: "ACTIVE",
      },
    });
    branchId = branch.id;

    studentCode = `SL-${Date.now().toString().slice(-6)}`;

    const user = await prisma.user.create({
      data: {
        email: `stu-lookup-${Date.now()}@test.local`,
        name: studentName,
        phone,
        passwordHash: "test",
        instituteId,
        branchId,
        status: "ACTIVE",
      },
    });
    userId = user.id;

    const student = await prisma.student.create({
      data: {
        instituteId,
        branchId,
        userId,
        studentCode,
        status: "ACTIVE",
        gender: "MALE",
      },
    });
    studentId = student.id;
  });

  after(async () => {
    if (studentId) {
      await prisma.student.deleteMany({ where: { id: studentId } });
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  const ctx = (): AIToolAuthContext => ({
    userId: "admin-test",
    instituteId,
    branchId,
    roles: ["CENTER_MANAGER"],
    permissions: [],
    isAdmin: false,
    isCenterManager: true,
  });

  test("returns full details when queried by name", async () => {
    const result = await executeGetStudentDetails(ctx(), { query: studentName });
    assert.strictEqual(result.found, true);
    const student = (result as { student: { name: string; phone: string; studentCode: string } })
      .student;
    assert.strictEqual(student.name, studentName);
    assert.strictEqual(student.phone, phone);
    assert.strictEqual(student.studentCode, studentCode);
    assert.ok(String(result.summaryText).includes(studentName));
  });

  test("returns full details when queried by phone digits", async () => {
    const result = await executeGetStudentDetails(ctx(), { phone: "9900112233" });
    assert.strictEqual(result.found, true);
    const student = (result as { student: { id: string } }).student;
    assert.strictEqual(student.id, studentId);
  });

  test("returns full details when queried by student code", async () => {
    const result = await executeGetStudentDetails(ctx(), { studentCode });
    assert.strictEqual(result.found, true);
  });
});
