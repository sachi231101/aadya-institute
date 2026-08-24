import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import { AISecurityScopeService } from "../modules/ai-agent/security/ai-scope.service";
import {
  chatRequestSchema,
  conversationParamSchema,
} from "../modules/ai-agent/ai-agent.validation";
import { executeAITool } from "../modules/ai-agent/tools";
import { AIAgentService } from "../modules/ai-agent/ai-agent.service";

describe("AI Institute Data Agent Module Tests", () => {
  let instituteId: string;
  let branchAId: string;
  let branchBId: string;
  let courseId: string;
  let batchAId: string;
  let studentAId: string;
  let studentBId: string;

  let adminUser: AuthUser;
  let managerAUser: AuthUser;
  let managerBUser: AuthUser;
  let studentUser: AuthUser;

  before(async () => {
    // 1. Setup Test Institute
    const inst = await prisma.institute.upsert({
      where: { code: "TEST-AI-INST" },
      update: {},
      create: {
        name: "Aadya AI Test Institute",
        code: "TEST-AI-INST",
      },
    });
    instituteId = inst.id;

    // Purge any stale test records from previous runs
    await prisma.aIMessage.deleteMany({ where: { conversation: { instituteId } } });
    await prisma.aIConversation.deleteMany({ where: { instituteId } });
    await prisma.studentAttendance.deleteMany({ where: { student: { instituteId } } });
    await prisma.classSession.deleteMany({ where: { batch: { instituteId } } });
    await prisma.pendingFee.deleteMany({ where: { instituteId } });
    await prisma.admission.deleteMany({ where: { instituteId } });
    await prisma.lead.deleteMany({ where: { instituteId } });

    // 2. Setup Branches
    const bA = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "AI-BR-A" } },
      update: {},
      create: {
        instituteId,
        name: "Branch A (Bengaluru)",
        code: "AI-BR-A",
      },
    });
    branchAId = bA.id;

    const bB = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "AI-BR-B" } },
      update: {},
      create: {
        instituteId,
        name: "Branch B (Hyderabad)",
        code: "AI-BR-B",
      },
    });
    branchBId = bB.id;

    // 3. Setup Course & Batch
    const course = await prisma.course.upsert({
      where: { instituteId_code: { instituteId, code: "AI-FSD" } },
      update: {},
      create: {
        instituteId,
        name: "Full Stack AI Development",
        code: "AI-FSD",
        duration: 6,
      },
    });
    courseId = course.id;

    const batch = await prisma.batch.upsert({
      where: { instituteId_code: { instituteId, code: "BATCH-AI-A" } },
      update: {},
      create: {
        instituteId,
        branchId: branchAId,
        courseId,
        name: "Batch AI Alpha",
        code: "BATCH-AI-A",
        startDate: new Date(),
        status: "ACTIVE",
      },
    });
    batchAId = batch.id;

    // 4. Setup Test Users
    const uAdmin = await prisma.user.upsert({
      where: { id: "test-ai-admin" },
      update: {},
      create: {
        id: "test-ai-admin",
        instituteId,
        name: "Admin Tester",
        email: "ai.admin@aadya.test",
        passwordHash: "hash",
      },
    });

    const uManagerA = await prisma.user.upsert({
      where: { id: "test-ai-mgr-a" },
      update: {},
      create: {
        id: "test-ai-mgr-a",
        instituteId,
        branchId: branchAId,
        name: "Manager A",
        email: "ai.mgr.a@aadya.test",
        passwordHash: "hash",
      },
    });

    const uManagerB = await prisma.user.upsert({
      where: { id: "test-ai-mgr-b" },
      update: {},
      create: {
        id: "test-ai-mgr-b",
        instituteId,
        branchId: branchBId,
        name: "Manager B",
        email: "ai.mgr.b@aadya.test",
        passwordHash: "hash",
      },
    });

    const uStudent = await prisma.user.upsert({
      where: { id: "test-ai-student" },
      update: {},
      create: {
        id: "test-ai-student",
        instituteId,
        branchId: branchAId,
        name: "Student Alpha",
        email: "ai.student@aadya.test",
        passwordHash: "hash",
      },
    });

    // 5. Create Students, Admissions, Attendance, Leads, Pending Fees in Branch A
    const stuA = await prisma.student.upsert({
      where: { userId: uStudent.id },
      update: {},
      create: {
        userId: uStudent.id,
        instituteId,
        branchId: branchAId,
        studentCode: "STU-AI-001",
        status: "ACTIVE",
      },
    });
    studentAId = stuA.id;

    await prisma.admission.upsert({
      where: { admissionNo: "ADM-AI-001" },
      update: {},
      create: {
        admissionNo: "ADM-AI-001",
        studentId: studentAId,
        instituteId,
        branchId: branchAId,
        courseId,
        batchId: batchAId,
        studentName: "Student Alpha",
        feePlan: "FULL_PAYMENT",
        status: "CONFIRMED",
      },
    });

    // Create test faculty
    const uFaculty = await prisma.user.upsert({
      where: { id: "test-ai-faculty" },
      update: {},
      create: {
        id: "test-ai-faculty",
        instituteId,
        branchId: branchAId,
        name: "Faculty AI Instructor",
        email: "ai.faculty@aadya.test",
        passwordHash: "hash",
      },
    });

    const faculty = await prisma.faculty.upsert({
      where: { instituteId_employeeCode: { instituteId, employeeCode: "FAC-AI-001" } },
      update: {},
      create: {
        userId: uFaculty.id,
        instituteId,
        branchId: branchAId,
        employeeCode: "FAC-AI-001",
      },
    });

    // Create session & attendance (1 absent out of 2 classes = 50% attendance)
    const session1 = await prisma.classSession.create({
      data: {
        batchId: batchAId,
        facultyId: faculty.id,
        branchId: branchAId,
        title: "Introduction to Agents",
        scheduledDate: new Date(),
        startTime: "10:00",
        endTime: "12:00",
      },
    });
    const session2 = await prisma.classSession.create({
      data: {
        batchId: batchAId,
        facultyId: faculty.id,
        branchId: branchAId,
        title: "Prompt Engineering",
        scheduledDate: new Date(),
        startTime: "14:00",
        endTime: "16:00",
      },
    });

    await prisma.studentAttendance.createMany({
      data: [
        { classSessionId: session1.id, studentId: studentAId, status: "PRESENT" },
        { classSessionId: session2.id, studentId: studentAId, status: "ABSENT" },
      ],
    });

    // Create Pending Fee for Student A
    await prisma.pendingFee.create({
      data: {
        instituteId,
        branchId: branchAId,
        studentId: studentAId,
        studentName: "Student Alpha",
        admissionNo: "ADM-AI-001",
        phone: "+919876500001",
        courseName: "Full Stack AI Development",
        totalFee: 50000,
        amountPaid: 20000,
        dueAmount: 30000,
        dueDate: new Date(),
        status: "OVERDUE",
      },
    });

    // Create Lead in Branch A
    await prisma.lead.create({
      data: {
        instituteId,
        branchId: branchAId,
        createdById: uManagerA.id,
        name: "Prospective AI Lead",
        phoneNumber: "+919876509999",
        interestedIn: "Full Stack AI Development",
        source: "WALK_IN",
        stage: "INTERESTED",
        status: "ACTIVE",
      },
    });

    // 6. Create Student in Branch B
    const uStudentB = await prisma.user.upsert({
      where: { id: "test-ai-student-b" },
      update: {},
      create: {
        id: "test-ai-student-b",
        instituteId,
        branchId: branchBId,
        name: "Student Beta",
        email: "ai.student.b@aadya.test",
        passwordHash: "hash",
      },
    });
    const stuB = await prisma.student.upsert({
      where: { userId: uStudentB.id },
      update: {},
      create: {
        userId: uStudentB.id,
        instituteId,
        branchId: branchBId,
        studentCode: "STU-AI-002",
        status: "ACTIVE",
      },
    });
    studentBId = stuB.id;

    adminUser = {
      id: uAdmin.id,
      userId: uAdmin.id,
      instituteId,
      branchId: undefined,
      roles: ["ADMIN"],
      permissions: [],
      name: uAdmin.name,
      email: uAdmin.email ?? "",
    };

    managerAUser = {
      id: uManagerA.id,
      userId: uManagerA.id,
      instituteId,
      branchId: branchAId,
      roles: ["CENTER_MANAGER"],
      permissions: [],
      name: uManagerA.name,
      email: uManagerA.email ?? "",
    };

    managerBUser = {
      id: uManagerB.id,
      userId: uManagerB.id,
      instituteId,
      branchId: branchBId,
      roles: ["CENTER_MANAGER"],
      permissions: [],
      name: uManagerB.name,
      email: uManagerB.email ?? "",
    };

    studentUser = {
      id: uStudent.id,
      userId: uStudent.id,
      instituteId,
      branchId: branchAId,
      roles: ["STUDENT"],
      permissions: [],
      name: uStudent.name,
      email: uStudent.email ?? "",
    };
  });

  after(async () => {
    // Cleanup test data
    await prisma.aIMessage.deleteMany({
      where: { conversation: { instituteId } },
    });
    await prisma.aIConversation.deleteMany({
      where: { instituteId },
    });
    await prisma.studentAttendance.deleteMany({
      where: { student: { instituteId } },
    });
    await prisma.classSession.deleteMany({
      where: { batch: { instituteId } },
    });
    await prisma.pendingFee.deleteMany({
      where: { instituteId },
    });
    await prisma.admission.deleteMany({
      where: { instituteId },
    });
    await prisma.lead.deleteMany({
      where: { instituteId },
    });
    await prisma.student.deleteMany({
      where: { instituteId },
    });
    await prisma.batch.deleteMany({
      where: { instituteId },
    });
    await prisma.course.deleteMany({
      where: { instituteId },
    });
    await prisma.faculty.deleteMany({
      where: { instituteId },
    });
    await prisma.user.deleteMany({
      where: { instituteId },
    });
    await prisma.branch.deleteMany({
      where: { instituteId },
    });
    await prisma.institute.deleteMany({
      where: { id: instituteId },
    });
  });

  describe("1. Validation Schemas", () => {
    test("chatRequestSchema validates standard message", () => {
      const parsed = chatRequestSchema.parse({
        message: "How many students do we have?",
      });
      assert.strictEqual(parsed.message, "How many students do we have?");
    });

    test("chatRequestSchema rejects empty message or overly long message (>500 chars)", () => {
      assert.strictEqual(chatRequestSchema.safeParse({ message: "   " }).success, false);
      assert.strictEqual(
        chatRequestSchema.safeParse({ message: "a".repeat(501) }).success,
        false
      );
    });

    test("conversationParamSchema accepts valid cuid", () => {
      assert.strictEqual(
        conversationParamSchema.safeParse({ id: "clx1234567890abcdefghijk" }).success,
        true
      );
    });
  });

  describe("2. Security Scope & Branch Isolation", () => {
    test("Admin gets institute-wide context without branch restrictions", () => {
      const context = AISecurityScopeService.buildAuthContext(adminUser);
      assert.strictEqual(context.isAdmin, true);
      assert.strictEqual(context.instituteId, instituteId);
      assert.strictEqual(context.branchId, undefined);
    });

    test("Center Manager gets strictly locked to their branch", () => {
      const context = AISecurityScopeService.buildAuthContext(managerAUser);
      assert.strictEqual(context.isAdmin, false);
      assert.strictEqual(context.isCenterManager, true);
      assert.strictEqual(context.branchId, branchAId);
    });

    test("Unauthorized roles (STUDENT) are rejected with 403 Forbidden", () => {
      assert.throws(
        () => {
          AISecurityScopeService.buildAuthContext(studentUser);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    test("Sanitizer strips spoofed branchId, instituteId, and userId from tool args", () => {
      const context = AISecurityScopeService.buildAuthContext(managerAUser);
      const sanitized = AISecurityScopeService.sanitizeToolArgs(
        {
          branchId: "hacked-branch",
          instituteId: "hacked-inst",
          userId: "hacked-user",
          threshold: 75,
        },
        context
      );

      assert.strictEqual((sanitized as any).branchId, undefined);
      assert.strictEqual((sanitized as any).instituteId, undefined);
      assert.strictEqual((sanitized as any).userId, undefined);
      assert.strictEqual((sanitized as any).threshold, 75);
    });
  });

  describe("3. Read-Only Domain Tool Handlers", () => {
    test("get_student_summary respects branch scope (Admin vs Manager A vs Manager B)", async () => {
      const adminCtx = AISecurityScopeService.buildAuthContext(adminUser);
      const mgrACtx = AISecurityScopeService.buildAuthContext(managerAUser);
      const mgrBCtx = AISecurityScopeService.buildAuthContext(managerBUser);

      const adminSummary = await executeAITool("get_student_summary", {}, adminCtx);
      const mgrASummary = await executeAITool("get_student_summary", {}, mgrACtx);
      const mgrBSummary = await executeAITool("get_student_summary", {}, mgrBCtx);

      assert.strictEqual(adminSummary.data.totalStudents >= 2, true);
      assert.strictEqual(mgrASummary.data.totalStudents, 1);
      assert.strictEqual(mgrBSummary.data.totalStudents, 1);
    });

    test("get_low_attendance_students identifies 50% attendance student", async () => {
      const mgrACtx = AISecurityScopeService.buildAuthContext(managerAUser);
      const result = await executeAITool("get_low_attendance_students", { threshold: 75 }, mgrACtx);

      assert.strictEqual(result.data.totalLowAttendanceCount, 1);
      assert.strictEqual(result.data.students[0].attendancePercentage, 50);
      assert.strictEqual(result.data.students[0].name, "Student Alpha");
    });

    test("get_fee_summary returns pending fees for Branch A", async () => {
      const mgrACtx = AISecurityScopeService.buildAuthContext(managerAUser);
      const result = await executeAITool("get_fee_summary", {}, mgrACtx);

      assert.strictEqual(result.data.totalPendingDue, 30000);
      assert.strictEqual(result.data.overdueRecordsCount, 1);
    });

    test("get_overdue_fees lists student with overdue amount", async () => {
      const mgrACtx = AISecurityScopeService.buildAuthContext(managerAUser);
      const result = await executeAITool("get_overdue_fees", {}, mgrACtx);

      assert.strictEqual(result.data.count, 1);
      assert.strictEqual(result.data.studentsWithPendingFees[0].dueAmount, 30000);
    });

    test("get_lead_summary returns active leads in scope", async () => {
      const mgrACtx = AISecurityScopeService.buildAuthContext(managerAUser);
      const result = await executeAITool("get_lead_summary", { period: "month" }, mgrACtx);

      assert.strictEqual(result.data.totalLeads >= 1, true);
      assert.strictEqual(result.data.interested >= 1, true);
    });

    test("get_course_summary returns course with enrolled students", async () => {
      const adminCtx = AISecurityScopeService.buildAuthContext(adminUser);
      const result = await executeAITool("get_course_summary", {}, adminCtx);

      assert.strictEqual(result.data.totalCourses >= 1, true);
      assert.ok(result.data.courses.some((c: any) => c.name === "Full Stack AI Development"));
    });

    test("get_branch_summary returns high-level metrics for branch", async () => {
      const mgrACtx = AISecurityScopeService.buildAuthContext(managerAUser);
      const result = await executeAITool("get_branch_summary", {}, mgrACtx);

      assert.strictEqual(result.data.activeStudents, 1);
      assert.strictEqual(result.data.activeBatches, 1);
      assert.strictEqual(result.data.activeLeads >= 1, true);
    });
  });

  describe("4. End-to-End AI Agent Service & Conversation Flow", () => {
    let convId: string;

    test("Admin asks 'How many students do we have?' -> Executes student tool", async () => {
      const res = await AIAgentService.processChatMessage(adminUser, {
        message: "How many students do we have?",
      });

      assert.ok(res.conversationId);
      assert.ok(res.message);
      assert.ok(res.toolsUsed.includes("get_student_summary"));
      convId = res.conversationId;
    });

    test("Manager A asks 'How many students have attendance below 75%?' -> Strictly returns Branch A", async () => {
      const res = await AIAgentService.processChatMessage(managerAUser, {
        message: "How many students have attendance below 75%?",
      });

      assert.ok(res.message);
      assert.ok(res.toolsUsed.includes("get_low_attendance_students"));
      assert.match(res.message, /1.*active student|Student Alpha/i);
    });

    test("Multi-condition query: 'Show students with low attendance and pending fees'", async () => {
      const res = await AIAgentService.processChatMessage(managerAUser, {
        message: "Show students with low attendance below 75% and pending fees",
      });

      assert.ok(res.toolsUsed.includes("get_low_attendance_students"));
      assert.ok(res.toolsUsed.includes("get_overdue_fees"));
      assert.ok(res.message);
    });

    test("General knowledge / unrelated query 'What is Python?' is rejected", async () => {
      const res = await AIAgentService.processChatMessage(adminUser, {
        message: "What is Python?",
      });

      assert.strictEqual(
        res.message,
        "I can only answer questions about your institute's data and operations."
      );
      assert.strictEqual(res.toolsUsed.length, 0);
    });

    test("Conversation history is persisted and retrievable", async () => {
      const conversations = await AIAgentService.getUserConversations(adminUser);
      assert.ok(conversations.length >= 1);

      const conversationDetails = await AIAgentService.getConversationById(convId, adminUser);
      assert.ok(conversationDetails.messages.length >= 2);
    });
  });
});
