import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  changeLeadStageSchema,
  markLeadLostSchema,
  convertLeadSchema,
  createFollowUpSchema,
} from "../modules/leads/lead.validation";
import { LeadService } from "../modules/leads/lead.service";
import { LeadAiOutcomeService } from "../modules/leads/services/lead-ai-outcome.service";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";

/** Ensure assign/bulk-assign gates pass when telephony left an in-flight log. */
async function ensureTerminalAiCall(
  leadId: string,
  instituteId: string,
  branchId: string | null | undefined
) {
  const existing = await prisma.callLog.findFirst({
    where: {
      leadId,
      status: {
        in: ["COMPLETED", "NO_ANSWER", "BUSY", "FAILED", "CALLBACK_REQUESTED"],
      },
    },
  });
  if (existing) return existing;

  return prisma.callLog.create({
    data: {
      instituteId,
      branchId: branchId ?? null,
      leadId,
      status: "COMPLETED",
      callType: "AI",
      duration: 45,
      idempotencyKey: `test_terminal_${leadId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      startedAt: new Date(),
      endedAt: new Date(),
    },
  });
}

describe("Lead Management Module Tests", () => {
  // Test Mock Users & Entities
  let instituteId: string;
  let branchAId: string;
  let branchBId: string;
  let courseId: string;
  let counsellorAUser: AuthUser;
  let counsellorBUser: AuthUser;
  let managerAUser: AuthUser;
  let adminUser: AuthUser;

  before(async () => {
    // 1. Create or find Institute
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-INST-LEADS" },
      update: {},
      create: {
        name: "Test Institute Leads",
        code: "TEST-INST-LEADS",
      },
    });
    instituteId = institute.id;

    // 2. Create Branches
    const branchA = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "BRANCH-A" } },
      update: {},
      create: {
        instituteId,
        name: "Branch A",
        code: "BRANCH-A",
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "BRANCH-B" } },
      update: {},
      create: {
        instituteId,
        name: "Branch B",
        code: "BRANCH-B",
      },
    });
    branchBId = branchB.id;

    // 3. Create Course
    const course = await prisma.course.upsert({
      where: { instituteId_code: { instituteId, code: "FSD-101" } },
      update: {},
      create: {
        instituteId,
        name: "Full Stack Development",
        code: "FSD-101",
      },
    });
    courseId = course.id;

    // 4. Ensure Roles exist
    const counsellorRole = await prisma.role.upsert({
      where: { name: "COUNSELLOR" },
      update: {},
      create: { name: "COUNSELLOR" },
    });

    const managerRole = await prisma.role.upsert({
      where: { name: "CENTER_MANAGER" },
      update: {},
      create: { name: "CENTER_MANAGER" },
    });

    // 5. Create Users
    const uCounsellorA = await prisma.user.upsert({
      where: { id: "test-counsellor-a" },
      update: {},
      create: {
        id: "test-counsellor-a",
        instituteId,
        branchId: branchAId,
        name: "Counsellor Priya",
        email: "priya@aadya.test",
        passwordHash: "hash",
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: uCounsellorA.id, roleId: counsellorRole.id } },
      update: {},
      create: { userId: uCounsellorA.id, roleId: counsellorRole.id },
    });

    const uCounsellorB = await prisma.user.upsert({
      where: { id: "test-counsellor-b" },
      update: {},
      create: {
        id: "test-counsellor-b",
        instituteId,
        branchId: branchBId,
        name: "Counsellor Rahul",
        email: "rahul@aadya.test",
        passwordHash: "hash",
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: uCounsellorB.id, roleId: counsellorRole.id } },
      update: {},
      create: { userId: uCounsellorB.id, roleId: counsellorRole.id },
    });

    const uManagerA = await prisma.user.upsert({
      where: { id: "test-manager-a" },
      update: {},
      create: {
        id: "test-manager-a",
        instituteId,
        branchId: branchAId,
        name: "Manager Suresh",
        email: "suresh@aadya.test",
        passwordHash: "hash",
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: uManagerA.id, roleId: managerRole.id } },
      update: {},
      create: { userId: uManagerA.id, roleId: managerRole.id },
    });

    counsellorAUser = {
      id: uCounsellorA.id,
      userId: uCounsellorA.id,
      instituteId,
      branchId: branchAId,
      roles: ["COUNSELLOR"],
      permissions: ["lead.create", "lead.read", "lead.update", "lead.assign"],
      name: uCounsellorA.name,
      email: uCounsellorA.email ?? "",
    };

    counsellorBUser = {
      id: uCounsellorB.id,
      userId: uCounsellorB.id,
      instituteId,
      branchId: branchBId,
      roles: ["COUNSELLOR"],
      permissions: ["lead.create", "lead.read", "lead.update", "lead.assign"],
      name: uCounsellorB.name,
      email: uCounsellorB.email ?? "",
    };

    managerAUser = {
      id: uManagerA.id,
      userId: uManagerA.id,
      instituteId,
      branchId: branchAId,
      roles: ["CENTER_MANAGER"],
      permissions: ["lead.create", "lead.read", "lead.update", "lead.assign", "lead.delete"],
      name: uManagerA.name,
      email: uManagerA.email ?? "",
    };

    const uAdmin = await prisma.user.upsert({
      where: { id: "test-admin-leads" },
      update: {},
      create: {
        id: "test-admin-leads",
        instituteId,
        name: "Admin Super",
        email: "admin@aadya.test",
        passwordHash: "hash",
      },
    });

    adminUser = {
      id: uAdmin.id,
      userId: uAdmin.id,
      instituteId,
      branchId: undefined,
      roles: ["ADMIN"],
      permissions: ["*"],
      name: uAdmin.name,
      email: uAdmin.email ?? "",
    };
  });

  after(async () => {
    await prisma.callLog.deleteMany({ where: { lead: { instituteId } } });
    await prisma.leadActivity.deleteMany({ where: { lead: { instituteId } } });
    await prisma.leadFollowUp.deleteMany({ where: { lead: { instituteId } } });
    await prisma.leadAssignment.deleteMany({ where: { lead: { instituteId } } });
    await prisma.leadStageHistory.deleteMany({ where: { lead: { instituteId } } });
    await prisma.notification.deleteMany({ where: { instituteId } });
    await prisma.lead.deleteMany({ where: { instituteId } });
  });

  describe("1. Lead Validation Schemas", () => {
    test("createLeadSchema validates and normalizes valid Indian phone", () => {
      const parsed = createLeadSchema.parse({
        name: "Aman Sharma",
        phoneNumber: "9876543210",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
      });
      assert.strictEqual(parsed.phoneNumber, "+919876543210");
      assert.strictEqual(parsed.name, "Aman Sharma");
      assert.strictEqual(parsed.email, undefined);
    });

    test("createLeadSchema allows optional email and trims", () => {
      const parsed = createLeadSchema.parse({
        name: "Aman Sharma",
        phoneNumber: "9876543210",
        email: "AMAN@gmail.com  ",
        interestedIn: "Data Science",
        source: "ONLINE",
      });
      assert.strictEqual(parsed.email, "aman@gmail.com");
    });

    test("createLeadSchema rejects invalid phone numbers", () => {
      const result = createLeadSchema.safeParse({
        name: "Invalid Phone",
        phoneNumber: "12345",
        interestedIn: "Web",
        source: "WALK_IN",
      });
      assert.strictEqual(result.success, false);
    });

    test("createLeadSchema rejects empty name or interestedIn", () => {
      assert.strictEqual(
        createLeadSchema.safeParse({
          name: " ",
          phoneNumber: "9876543210",
          interestedIn: "Web",
          source: "WALK_IN",
        }).success,
        false
      );
      assert.strictEqual(
        createLeadSchema.safeParse({
          name: "John",
          phoneNumber: "9876543210",
          interestedIn: "  ",
          source: "WALK_IN",
        }).success,
        false
      );
    });

    test("createLeadSchema accepts sourceMasterId", () => {
      const result = createLeadSchema.safeParse({
        name: "John",
        phoneNumber: "9876543210",
        interestedIn: "Web",
        sourceMasterId: "cuid123",
      });
      assert.strictEqual(result.success, true);
    });

    test("markLeadLostSchema requires supported reason", () => {
      assert.strictEqual(
        markLeadLostSchema.safeParse({ reason: "PRICE_HIGH" }).success,
        true
      );
      assert.strictEqual(
        markLeadLostSchema.safeParse({ reason: "RANDOM_REASON" }).success,
        false
      );
    });
  });

  describe("2. Lead Creation & Ownership", () => {
    let createdLeadId: string;

    test("Counsellor creates lead -> unassigned, AI call attempted, stage CONTACTED locally", async () => {
      const lead = await LeadService.createLead(counsellorAUser, {
        name: "Rohan Verma",
        phoneNumber: "+919876500001",
        email: "rohan@gmail.com",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
        courseId,
      });

      createdLeadId = lead.id;

      assert.ok(lead.id);
      assert.strictEqual(lead.name, "Rohan Verma");
      assert.strictEqual(lead.phoneNumber, "+919876500001");
      assert.strictEqual(lead.createdById, counsellorAUser.userId);
      assert.strictEqual(lead.assignedCounsellorId, null);
      assert.strictEqual(lead.branchId, branchAId);
      assert.strictEqual(lead.stage, "CONTACTED");
      assert.strictEqual(lead.status, "ACTIVE");
      assert.strictEqual(lead.courseId, courseId);

      const callLogs = await prisma.callLog.findMany({ where: { leadId: lead.id } });
      assert.ok(callLogs.length >= 1);
      assert.ok(["FAILED", "COMPLETED", "NO_ANSWER", "BUSY", "CALLBACK_REQUESTED"].includes(callLogs[0].status));
    });

    test("Duplicate active phone number returns 409 conflict", async () => {
      await assert.rejects(
        async () => {
          await LeadService.createLead(counsellorAUser, {
            name: "Rohan Duplicate",
            phoneNumber: "+919876500001",
            interestedIn: "Full Stack",
            source: "ONLINE",
          });
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 409);
          assert.match(err.message, /already exists/);
          return true;
        }
      );
    });

    test("Admin can create lead and it resolves institute default branch", async () => {
      const adminLead = await LeadService.createLead(adminUser, {
        name: "Admin Lead Test",
        phoneNumber: "+919876500002",
        interestedIn: "React Native",
        source: "ONLINE",
      });

      assert.ok(adminLead.id);
      assert.strictEqual(adminLead.createdById, adminUser.userId);
      assert.ok(adminLead.branchId);
    });
  });

  describe("3. Branch Isolation", () => {
    let branchALeadId: string;

    before(async () => {
      const lead = await LeadService.createLead(counsellorAUser, {
        name: "Branch A Student",
        phoneNumber: "+919876500003",
        interestedIn: "Data",
        source: "WALK_IN",
      });
      branchALeadId = lead.id;
    });

    test("Counsellor A can access Branch A lead", async () => {
      const lead = await LeadService.getLeadById(branchALeadId, counsellorAUser);
      assert.strictEqual(lead.id, branchALeadId);
    });

    test("Counsellor B (Branch B) is denied access (404) to Branch A lead", async () => {
      await assert.rejects(
        async () => {
          await LeadService.getLeadById(branchALeadId, counsellorBUser);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 404);
          return true;
        }
      );
    });

    test("Admin can access Branch A lead", async () => {
      const lead = await LeadService.getLeadById(branchALeadId, adminUser);
      assert.strictEqual(lead.id, branchALeadId);
    });
  });

  describe("4. Assignment, Stage Transition & Audit Activities", () => {
    let leadId: string;
    let blockedLeadId: string;

    before(async () => {
      const lead = await LeadService.createLead(counsellorAUser, {
        name: "Lifecycle Test Lead",
        phoneNumber: "+919876500004",
        interestedIn: "Full Stack Development",
        source: "PHONE_CALL",
      });
      leadId = lead.id;

      const blocked = await LeadService.createLead(managerAUser, {
        name: "Blocked Until AI Lead",
        phoneNumber: "+919876500014",
        interestedIn: "Full Stack Development",
        source: "ONLINE",
      });
      blockedLeadId = blocked.id;
      await prisma.callLog.deleteMany({ where: { leadId: blockedLeadId } });
      await prisma.lead.update({
        where: { id: blockedLeadId },
        data: { stage: "NEW" },
      });
    });

    test("Assign before terminal AI call is rejected", async () => {
      await assert.rejects(
        async () => {
          await LeadService.assignLead(blockedLeadId, managerAUser, {
            counsellorId: counsellorAUser.id,
          });
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /AI call has finished/);
          return true;
        }
      );
    });

    test("Manager assigns lead to Counsellor A after AI call", async () => {
      const result = await LeadService.assignLead(leadId, managerAUser, {
        counsellorId: counsellorAUser.id,
        notes: "Assigned after AI qualification",
      });

      assert.strictEqual(result.lead.assignedCounsellorId, counsellorAUser.id);
      assert.strictEqual(result.lead.stage, "ASSIGNED");
      assert.strictEqual(result.assignment.isCurrent, true);
    });

    test("Changing stage records LeadStageHistory and updates stage", async () => {
      const updated = await LeadService.changeStage(leadId, counsellorAUser, {
        stage: "CONTACTED",
        notes: "Student called and briefed on syllabus",
      });

      assert.strictEqual(updated.stage, "CONTACTED");

      const history = await LeadService.getLeadHistory(leadId, counsellorAUser);
      assert.ok(history.stageHistory.length >= 1);
      assert.ok(history.activities.some((a) => a.type === "STAGE_CHANGED"));
    });

    test("Marking lead as LOST sets stage and status to LOST with reason", async () => {
      const lostLead = await LeadService.markLost(leadId, counsellorAUser, {
        reason: "PRICE_HIGH",
        notes: "Budget mismatch",
      });

      assert.strictEqual(lostLead.stage, "LOST");
      assert.strictEqual(lostLead.status, "LOST");
      assert.strictEqual(lostLead.lostReason, "PRICE_HIGH");
      assert.ok(lostLead.lostAt);
    });
  });

  describe("5. Follow-Up Management", () => {
    let leadId: string;

    before(async () => {
      const lead = await LeadService.createLead(counsellorAUser, {
        name: "Follow-up Test Lead",
        phoneNumber: "+919876500005",
        interestedIn: "Cloud Computing",
        source: "INSTAGRAM",
      });
      leadId = lead.id;
    });

    test("Scheduling follow-up updates lead.nextFollowUpAt and stage", async () => {
      const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const followUp = await LeadService.createFollowUp(leadId, counsellorAUser, {
        type: "CALL",
        scheduledAt: scheduledDate,
        notes: "Call back after 5 PM",
      });

      assert.ok(followUp.id);
      assert.strictEqual(followUp.status, "PENDING");

      const lead = await LeadService.getLeadById(leadId, counsellorAUser);
      assert.strictEqual(lead.stage, "FOLLOW_UP");
      assert.ok(lead.nextFollowUpAt);
    });

    test("Completing follow-up sets completedAt and lastContactedAt", async () => {
      const followUps = await LeadService.getLeadFollowUps(leadId, counsellorAUser);
      assert.ok(followUps.length > 0);

      const completed = await LeadService.updateFollowUp(followUps[0].id, counsellorAUser, {
        status: "COMPLETED",
        outcome: "Student confirmed interest in weekend batch",
      });

      assert.strictEqual(completed.status, "COMPLETED");
      assert.ok(completed.completedAt);

      const lead = await LeadService.getLeadById(leadId, counsellorAUser);
      assert.ok(lead.lastContactedAt);
    });

    test("Follow-up dashboard returns summary counts", async () => {
      const dashboard = await LeadService.getFollowUpDashboard(managerAUser);
      assert.ok(typeof dashboard.summary.totalPending === "number");
    });
  });

  describe("6. Lead Conversion to Student & Admission", () => {
    let leadId: string;
    const convertPhone = `+91987${String(Date.now()).slice(-7)}`;

    before(async () => {
      const lead = await LeadService.createLead(counsellorAUser, {
        name: "Convertible Lead",
        phoneNumber: convertPhone,
        email: `convertible-${Date.now()}@aadya.test`,
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
        courseId,
      });
      leadId = lead.id;
    });

    test("Converts lead to Student & Admission atomically in transaction", async () => {
      await LeadService.assignLead(leadId, managerAUser, {
        counsellorId: counsellorAUser.id,
      });

      const result = await LeadService.convertLead(leadId, counsellorAUser, {
        courseId,
        feePlan: "FULL_PAYMENT",
        notes: "Paid token registration fee",
      });

      assert.ok(result.student.id);
      assert.ok(result.student.studentCode);
      assert.ok(result.admission.id);
      assert.ok(result.admission.admissionNo);
      assert.strictEqual(result.lead.status, "CONVERTED");
      assert.strictEqual(result.lead.stage, "CONVERTED");
      assert.strictEqual(result.lead.convertedStudentId, result.student.id);
      assert.strictEqual(result.lead.convertedAdmissionId, result.admission.id);
    });

    test("Convert without courseId is rejected when lead has no course", async () => {
      const lead = await LeadService.createLead(managerAUser, {
        name: "No Course Lead",
        phoneNumber: "+919876500016",
        interestedIn: "Unmatchable Course XYZ999",
        source: "WALK_IN",
      });

      await LeadService.assignLead(lead.id, managerAUser, {
        counsellorId: counsellorAUser.id,
      });

      await assert.rejects(
        async () => {
          await LeadService.convertLead(lead.id, managerAUser, {});
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Course is required/);
          return true;
        }
      );
    });

    test("Create application from lead sets leadId and stage INTERESTED", async () => {
      const lead = await LeadService.createLead(managerAUser, {
        name: "Application Path Lead",
        phoneNumber: "+919876500017",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
      });

      await LeadService.assignLead(lead.id, managerAUser, {
        counsellorId: counsellorAUser.id,
      });

      const application = await LeadService.createApplicationFromLead(lead.id, managerAUser, {
        courseId,
        notes: "Needs fee discussion",
      });

      assert.ok(application.id);
      assert.strictEqual(application.leadId, lead.id);
      assert.strictEqual(application.courseId, courseId);

      const updated = await LeadService.getLeadById(lead.id, managerAUser);
      assert.strictEqual(updated.stage, "INTERESTED");
    });

    test("Duplicate conversion attempt on already converted lead is rejected", async () => {
      await assert.rejects(
        async () => {
          await LeadService.convertLead(leadId, counsellorAUser, {
            courseId,
          });
        },
        (err: any) => {
          assert.ok([400, 409].includes(err.statusCode));
          assert.match(err.message, /already been converted|already registered/i);
          return true;
        }
      );
    });
  });

  describe("7. Dashboards & Analytics", () => {
    test("Dashboard summary returns stage metrics", async () => {
      const summary = await LeadService.getDashboardSummary(managerAUser);
      assert.ok(typeof summary.totalLeads === "number");
      assert.ok(typeof summary.converted === "number");
      assert.ok(typeof summary.lost === "number");
    });

    test("Counsellor performance returns aggregated stats", async () => {
      const performance = await LeadService.getCounsellorPerformance(managerAUser);
      assert.ok(Array.isArray(performance));
      if (performance.length > 0) {
        assert.ok(performance[0].counsellorId);
        assert.ok(typeof performance[0].totalLeads === "number");
        assert.ok(typeof performance[0].conversionRate === "string");
      }
    });
  });

  describe("8. Dashboard scoring bands & overdue follow-ups", () => {
    before(async () => {
      const hot = await LeadService.createLead(managerAUser, {
        name: "Hot Band Lead",
        phoneNumber: "+919876501001",
        interestedIn: "Full Stack Development",
        source: "ONLINE",
        branchId: branchAId,
      });
      const warm = await LeadService.createLead(managerAUser, {
        name: "Warm Band Lead",
        phoneNumber: "+919876501002",
        interestedIn: "Full Stack Development",
        source: "ONLINE",
        branchId: branchAId,
      });
      const cold = await LeadService.createLead(managerAUser, {
        name: "Cold Band Lead",
        phoneNumber: "+919876501003",
        interestedIn: "Full Stack Development",
        source: "ONLINE",
        branchId: branchAId,
      });

      await LeadService.updateLeadScore(hot.id, managerAUser, { leadScore: 85 });
      await LeadService.updateLeadScore(warm.id, managerAUser, { leadScore: 55 });
      await LeadService.updateLeadScore(cold.id, managerAUser, { leadScore: 20 });

      await ensureTerminalAiCall(hot.id, instituteId, branchAId);
      await LeadService.assignLead(hot.id, managerAUser, {
        counsellorId: counsellorAUser.id,
      });
      await LeadService.createFollowUp(hot.id, managerAUser, {
        type: "CALL",
        scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        notes: "Overdue for band KPI",
        priority: "HIGH",
        counsellorId: counsellorAUser.id,
      });
    });

    test("Summary includes hot/warm/cold bands and overdueFollowUps", async () => {
      const summary = await LeadService.getDashboardSummary(managerAUser, branchAId);
      assert.ok(typeof summary.hot === "number");
      assert.ok(typeof summary.warm === "number");
      assert.ok(typeof summary.cold === "number");
      assert.ok(typeof summary.unassigned === "number");
      assert.ok(typeof summary.todayCreated === "number");
      assert.ok(typeof summary.overdueFollowUps === "number");
      assert.ok(summary.hot >= 1);
      assert.ok(summary.warm >= 1);
      assert.ok(summary.cold >= 1);
      assert.ok(summary.overdueFollowUps >= 1);
    });
  });

  describe("9. Bulk assign + branch isolation", () => {
    let branchALead1: string;
    let branchALead2: string;
    let branchBLeadId: string;

    before(async () => {
      const a1 = await LeadService.createLead(managerAUser, {
        name: "Bulk A1",
        phoneNumber: "+919876501101",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
        branchId: branchAId,
      });
      const a2 = await LeadService.createLead(managerAUser, {
        name: "Bulk A2",
        phoneNumber: "+919876501102",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
        branchId: branchAId,
      });
      const b1 = await LeadService.createLead(counsellorBUser, {
        name: "Bulk B1",
        phoneNumber: "+919876501103",
        interestedIn: "Full Stack Development",
        source: "ONLINE",
      });
      branchALead1 = a1.id;
      branchALead2 = a2.id;
      branchBLeadId = b1.id;

      await Promise.all([
        ensureTerminalAiCall(branchALead1, instituteId, branchAId),
        ensureTerminalAiCall(branchALead2, instituteId, branchAId),
        ensureTerminalAiCall(branchBLeadId, instituteId, branchBId),
      ]);
    });

    test("Bulk assign succeeds for same-branch leads", async () => {
      const result = await LeadService.bulkAssignLeads(managerAUser, {
        leadIds: [branchALead1, branchALead2],
        counsellorId: counsellorAUser.id,
        notes: "Bulk assign test",
      });

      assert.strictEqual(result.total, 2);
      assert.strictEqual(result.succeeded, 2);
      assert.strictEqual(result.failed, 0);

      const lead1 = await LeadService.getLeadById(branchALead1, managerAUser);
      const lead2 = await LeadService.getLeadById(branchALead2, managerAUser);
      assert.strictEqual(lead1.assignedCounsellorId, counsellorAUser.id);
      assert.strictEqual(lead2.assignedCounsellorId, counsellorAUser.id);
    });

    test("Bulk assign isolates Branch B lead from Manager A", async () => {
      const result = await LeadService.bulkAssignLeads(managerAUser, {
        leadIds: [branchALead1, branchBLeadId],
        counsellorId: counsellorAUser.id,
      });

      assert.strictEqual(result.total, 2);
      assert.ok(result.succeeded >= 1);
      assert.ok(result.failed >= 1);

      const branchBResult = result.results.find((r) => r.leadId === branchBLeadId);
      assert.ok(branchBResult);
      assert.strictEqual(branchBResult.success, false);

      const branchBLead = await LeadService.getLeadById(branchBLeadId, adminUser);
      assert.notStrictEqual(branchBLead.assignedCounsellorId, counsellorAUser.id);
    });
  });

  describe("10. Merge moves CallLog/FollowUp and archives duplicate", () => {
    let primaryId: string;
    let duplicateId: string;
    let movedCallId: string;
    let movedFollowUpId: string;

    before(async () => {
      const primary = await LeadService.createLead(managerAUser, {
        name: "Primary Merge Lead",
        phoneNumber: "+919876501201",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
        branchId: branchAId,
      });
      const duplicate = await LeadService.createLead(managerAUser, {
        name: "Duplicate Merge Lead",
        phoneNumber: "+919876501202",
        interestedIn: "Full Stack Development",
        source: "ONLINE",
        branchId: branchAId,
      });
      primaryId = primary.id;
      duplicateId = duplicate.id;

      await LeadService.updateLeadTags(duplicateId, managerAUser, {
        tags: ["duplicate-tag", "neet"],
      });

      const callLog = await prisma.callLog.create({
        data: {
          instituteId,
          branchId: branchAId,
          leadId: duplicateId,
          status: "COMPLETED",
          callType: "AI",
          duration: 90,
          interestStatus: "INTERESTED",
          aiSummary: "Asked about fees",
          idempotencyKey: `test_merge_call_${duplicateId}`,
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });
      movedCallId = callLog.id;

      const followUp = await prisma.leadFollowUp.create({
        data: {
          leadId: duplicateId,
          counsellorId: counsellorAUser.id,
          createdById: managerAUser.id,
          type: "CALL",
          status: "PENDING",
          priority: "HIGH",
          scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          notes: "Merge follow-up",
        },
      });
      movedFollowUpId = followUp.id;
    });

    test("Merge relocates relations and archives duplicate", async () => {
      const result = await LeadService.mergeLeads(managerAUser, {
        primaryLeadId: primaryId,
        duplicateLeadId: duplicateId,
      });

      assert.strictEqual(result.duplicateId, duplicateId);
      assert.ok(result.primary.tags.includes("duplicate-tag"));
      assert.ok(result.primary.tags.includes("neet"));

      const movedCall = await prisma.callLog.findUnique({ where: { id: movedCallId } });
      assert.strictEqual(movedCall?.leadId, primaryId);

      const movedFu = await prisma.leadFollowUp.findUnique({
        where: { id: movedFollowUpId },
      });
      assert.strictEqual(movedFu?.leadId, primaryId);

      const duplicate = await prisma.lead.findUnique({ where: { id: duplicateId } });
      assert.strictEqual(duplicate?.status, "ARCHIVED");
      assert.strictEqual(duplicate?.stage, "LOST");
    });
  });

  describe("11. Post-call AI outcome from webhook fixture", () => {
    test("LeadAiOutcomeService sets score, stage, and follow-up", async () => {
      const lead = await prisma.lead.create({
        data: {
          instituteId,
          branchId: branchAId,
          name: "AI Outcome Lead",
          phoneNumber: "+919876501301",
          interestedIn: "NEET",
          source: "ONLINE",
          stage: "CONTACTED",
          status: "ACTIVE",
          createdById: managerAUser.id,
        },
      });

      const callLog = await prisma.callLog.create({
        data: {
          instituteId,
          branchId: branchAId,
          leadId: lead.id,
          status: "COMPLETED",
          callType: "AI",
          duration: 120,
          interestStatus: "HIGH_INTEREST",
          aiSummary: "Very interested in admission and asked about fee structure",
          idempotencyKey: `test_ai_outcome_${lead.id}`,
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });

      await LeadAiOutcomeService.process(callLog.id);

      const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
      assert.ok(updated);
      assert.ok((updated!.leadScore ?? 0) >= 70);
      assert.ok((updated!.admissionProbability ?? 0) >= 70);
      assert.ok(updated!.nextBestAction);
      assert.ok(updated!.lastContactedAt);
      assert.ok(["INTERESTED", "FOLLOW_UP"].includes(updated!.stage));

      const followUps = await prisma.leadFollowUp.findMany({
        where: { leadId: lead.id, status: "PENDING" },
      });
      assert.ok(followUps.length >= 1);
      assert.strictEqual(followUps[0].priority, "HIGH");

      const activities = await prisma.leadActivity.findMany({
        where: { leadId: lead.id, type: "SCORE_UPDATED" },
      });
      assert.ok(activities.length >= 1);
    });

    test("CALLBACK_REQUESTED creates high-priority follow-up", async () => {
      const lead = await prisma.lead.create({
        data: {
          instituteId,
          branchId: branchAId,
          name: "Callback Outcome Lead",
          phoneNumber: "+919876501302",
          interestedIn: "NEET",
          source: "PHONE_CALL",
          stage: "NEW",
          status: "ACTIVE",
          createdById: counsellorAUser.id,
        },
      });

      const callLog = await prisma.callLog.create({
        data: {
          instituteId,
          branchId: branchAId,
          leadId: lead.id,
          status: "CALLBACK_REQUESTED",
          callType: "AI",
          duration: 40,
          interestStatus: "CALLBACK",
          aiSummary: "Please call tomorrow morning",
          idempotencyKey: `test_callback_outcome_${lead.id}`,
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });

      await LeadAiOutcomeService.process(callLog.id);

      const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
      assert.ok((updated!.leadScore ?? 0) >= 70);
      assert.strictEqual(updated!.stage, "FOLLOW_UP");

      const followUps = await prisma.leadFollowUp.findMany({
        where: { leadId: lead.id },
      });
      assert.ok(followUps.some((f) => f.priority === "HIGH"));
    });
  });

  describe("12. Follow-up dashboard my vs team + complete/reschedule", () => {
    let counsellorCUser: AuthUser;
    let myFollowUpId: string;
    let teamFollowUpId: string;
    let rescheduleFollowUpId: string;

    before(async () => {
      const counsellorRole = await prisma.role.findUnique({
        where: { name: "COUNSELLOR" },
      });
      assert.ok(counsellorRole);

      const uCounsellorC = await prisma.user.upsert({
        where: { id: "test-counsellor-c-leads" },
        update: { branchId: branchAId, instituteId },
        create: {
          id: "test-counsellor-c-leads",
          instituteId,
          branchId: branchAId,
          name: "Counsellor Meera",
          email: "meera@aadya.test",
          passwordHash: "hash",
        },
      });
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: uCounsellorC.id,
            roleId: counsellorRole!.id,
          },
        },
        update: {},
        create: { userId: uCounsellorC.id, roleId: counsellorRole!.id },
      });

      counsellorCUser = {
        id: uCounsellorC.id,
        userId: uCounsellorC.id,
        instituteId,
        branchId: branchAId,
        roles: ["COUNSELLOR"],
        permissions: ["lead.create", "lead.read", "lead.update"],
        name: uCounsellorC.name,
        email: uCounsellorC.email ?? "",
      };

      const myLead = await LeadService.createLead(managerAUser, {
        name: "My Follow-up Lead",
        phoneNumber: "+919876501401",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
        branchId: branchAId,
      });
      const teamLead = await LeadService.createLead(managerAUser, {
        name: "Team Follow-up Lead",
        phoneNumber: "+919876501402",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
        branchId: branchAId,
      });

      await ensureTerminalAiCall(myLead.id, instituteId, branchAId);
      await ensureTerminalAiCall(teamLead.id, instituteId, branchAId);
      await LeadService.assignLead(myLead.id, managerAUser, {
        counsellorId: counsellorAUser.id,
      });
      await LeadService.assignLead(teamLead.id, managerAUser, {
        counsellorId: counsellorCUser.id,
      });

      const myFu = await LeadService.createFollowUp(myLead.id, counsellorAUser, {
        type: "CALL",
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        notes: "My pending follow-up",
        counsellorId: counsellorAUser.id,
      });
      myFollowUpId = myFu.id;

      const teamFu = await LeadService.createFollowUp(teamLead.id, counsellorCUser, {
        type: "WHATSAPP",
        scheduledAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
        notes: "Team pending follow-up",
        counsellorId: counsellorCUser.id,
      });
      teamFollowUpId = teamFu.id;

      const rescheduleFu = await LeadService.createFollowUp(myLead.id, counsellorAUser, {
        type: "MEETING",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: "To reschedule",
        counsellorId: counsellorAUser.id,
      });
      rescheduleFollowUpId = rescheduleFu.id;
    });

    test("Follow-up dashboard splits my vs team lists", async () => {
      const dashboard = await LeadService.getFollowUpDashboard(counsellorAUser, branchAId);

      assert.ok(Array.isArray(dashboard.lists.my));
      assert.ok(Array.isArray(dashboard.lists.team));
      assert.ok(Array.isArray(dashboard.lists.completed));
      assert.ok(typeof dashboard.summary.completed === "number");
      assert.ok(typeof dashboard.highlights.overdue === "number");

      assert.ok(dashboard.lists.my.some((f) => f.id === myFollowUpId));
      assert.ok(dashboard.lists.team.some((f) => f.id === teamFollowUpId));
      assert.ok(!dashboard.lists.my.some((f) => f.id === teamFollowUpId));
    });

    test("Reschedule updates scheduledAt; complete marks COMPLETED", async () => {
      const newTime = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const rescheduled = await LeadService.updateFollowUp(
        rescheduleFollowUpId,
        counsellorAUser,
        { scheduledAt: newTime, notes: "Moved to next week" }
      );
      assert.ok(
        Math.abs(new Date(rescheduled.scheduledAt).getTime() - newTime.getTime()) < 1000
      );

      const completed = await LeadService.updateFollowUp(myFollowUpId, counsellorAUser, {
        status: "COMPLETED",
        outcome: "Spoke with parent — interested",
      });
      assert.strictEqual(completed.status, "COMPLETED");
      assert.ok(completed.completedAt);

      const dashboard = await LeadService.getFollowUpDashboard(counsellorAUser, branchAId);
      assert.ok(dashboard.lists.completed.some((f) => f.id === myFollowUpId));
    });
  });

  describe("13. Call history filter AI vs MANUAL", () => {
    let leadId: string;

    before(async () => {
      const lead = await LeadService.createLead(managerAUser, {
        name: "Call History Filter Lead",
        phoneNumber: "+919876501501",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
        branchId: branchAId,
      });
      leadId = lead.id;

      await prisma.callLog.create({
        data: {
          instituteId,
          branchId: branchAId,
          leadId,
          status: "COMPLETED",
          callType: "AI",
          duration: 55,
          interestStatus: "WARM",
          idempotencyKey: `test_hist_ai_${leadId}`,
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });

      await LeadService.createManualCallLog(managerAUser, {
        leadId,
        status: "COMPLETED",
        duration: 180,
        outcome: "Discussed fees",
        notes: "Manual counsellor call",
        interestStatus: "INTERESTED",
      });
    });

    test("callType AI returns only AI logs", async () => {
      const { callLogs } = await LeadService.getCallHistory(managerAUser, {
        leadId,
        callType: "AI",
        page: 1,
        limit: 50,
      });
      assert.ok(callLogs.length >= 1);
      assert.ok(callLogs.every((c) => c.callType === "AI"));
    });

    test("callType MANUAL returns only MANUAL logs", async () => {
      const { callLogs } = await LeadService.getCallHistory(managerAUser, {
        leadId,
        callType: "MANUAL",
        page: 1,
        limit: 50,
      });
      assert.ok(callLogs.length >= 1);
      assert.ok(callLogs.every((c) => c.callType === "MANUAL"));
      assert.ok(callLogs.some((c) => c.callerUserId === managerAUser.id));
    });

    test("callType ALL returns both", async () => {
      const { callLogs } = await LeadService.getCallHistory(managerAUser, {
        leadId,
        callType: "ALL",
        page: 1,
        limit: 50,
      });
      const types = new Set(callLogs.map((c) => c.callType));
      assert.ok(types.has("AI"));
      assert.ok(types.has("MANUAL"));
    });
  });

  describe("14. RBAC counsellor scoping", () => {
    let assignedToA: string;
    let assignedToC: string;
    let counsellorCUser: AuthUser;

    before(async () => {
      const counsellorRole = await prisma.role.findUnique({
        where: { name: "COUNSELLOR" },
      });
      assert.ok(counsellorRole);

      const uCounsellorC = await prisma.user.upsert({
        where: { id: "test-counsellor-c-leads" },
        update: { branchId: branchAId, instituteId },
        create: {
          id: "test-counsellor-c-leads",
          instituteId,
          branchId: branchAId,
          name: "Counsellor Meera",
          email: "meera@aadya.test",
          passwordHash: "hash",
        },
      });
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: uCounsellorC.id,
            roleId: counsellorRole!.id,
          },
        },
        update: {},
        create: { userId: uCounsellorC.id, roleId: counsellorRole!.id },
      });

      counsellorCUser = {
        id: uCounsellorC.id,
        userId: uCounsellorC.id,
        instituteId,
        branchId: branchAId,
        roles: ["COUNSELLOR"],
        permissions: ["lead.create", "lead.read", "lead.update"],
        name: uCounsellorC.name,
        email: uCounsellorC.email ?? "",
      };

      const leadA = await LeadService.createLead(managerAUser, {
        name: "RBAC Lead For A",
        phoneNumber: "+919876501601",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
        branchId: branchAId,
      });
      const leadC = await LeadService.createLead(managerAUser, {
        name: "RBAC Lead For C",
        phoneNumber: "+919876501602",
        interestedIn: "Full Stack Development",
        source: "ONLINE",
        branchId: branchAId,
      });
      assignedToA = leadA.id;
      assignedToC = leadC.id;

      await ensureTerminalAiCall(assignedToA, instituteId, branchAId);
      await ensureTerminalAiCall(assignedToC, instituteId, branchAId);
      await LeadService.assignLead(assignedToA, managerAUser, {
        counsellorId: counsellorAUser.id,
      });
      await LeadService.assignLead(assignedToC, managerAUser, {
        counsellorId: counsellorCUser.id,
      });
    });

    test("Counsellor cannot read another counsellor's assigned lead", async () => {
      await assert.rejects(
        async () => {
          await LeadService.getLeadById(assignedToC, counsellorAUser);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 404);
          return true;
        }
      );
    });

    test("Counsellor list is scoped to assigned leads", async () => {
      const { leads } = await LeadService.getLeads(counsellorAUser, {
        page: 1,
        limit: 100,
      });
      const ids = leads.map((l) => l.id);
      assert.ok(ids.includes(assignedToA));
      assert.ok(!ids.includes(assignedToC));
    });

    test("Manager can read both counsellors' leads in branch", async () => {
      const leadA = await LeadService.getLeadById(assignedToA, managerAUser);
      const leadC = await LeadService.getLeadById(assignedToC, managerAUser);
      assert.strictEqual(leadA.id, assignedToA);
      assert.strictEqual(leadC.id, assignedToC);
    });
  });

  describe("15. Notify on AI follow-up and lead assign", () => {
    test("AI outcome follow-up notifies assigned counsellor", async () => {
      const lead = await prisma.lead.create({
        data: {
          instituteId,
          branchId: branchAId,
          name: "Notify FU Lead",
          phoneNumber: "+919876501701",
          interestedIn: "NEET",
          source: "ONLINE",
          stage: "ASSIGNED",
          status: "ACTIVE",
          createdById: managerAUser.id,
          assignedCounsellorId: counsellorAUser.id,
        },
      });

      const callLog = await prisma.callLog.create({
        data: {
          instituteId,
          branchId: branchAId,
          leadId: lead.id,
          status: "COMPLETED",
          callType: "AI",
          duration: 120,
          interestStatus: "HIGH_INTEREST",
          aiSummary: "Very interested in admission",
          idempotencyKey: `test_notify_fu_${lead.id}`,
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });

      await LeadAiOutcomeService.process(callLog.id);

      const notifications = await prisma.notification.findMany({
        where: {
          userId: counsellorAUser.id,
          instituteId,
          metadata: { path: ["leadId"], equals: lead.id },
        },
      });
      assert.ok(notifications.length >= 1);
      assert.ok(
        notifications.some(
          (n) =>
            n.title.includes("follow-up") ||
            (n.metadata as { event?: string } | null)?.event === "FOLLOW_UP_CREATED"
        )
      );
    });

    test("Assign notifies target counsellor", async () => {
      const lead = await LeadService.createLead(managerAUser, {
        name: "Notify Assign Lead",
        phoneNumber: "+919876501702",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
        branchId: branchAId,
      });
      await ensureTerminalAiCall(lead.id, instituteId, branchAId);

      await LeadService.assignLead(lead.id, managerAUser, {
        counsellorId: counsellorAUser.id,
        notes: "Notify test assign",
      });

      const notifications = await prisma.notification.findMany({
        where: {
          userId: counsellorAUser.id,
          instituteId,
          metadata: { path: ["event"], equals: "LEAD_ASSIGNED" },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      assert.ok(
        notifications.some(
          (n) => (n.metadata as { leadId?: string } | null)?.leadId === lead.id
        )
      );
    });

    test("addActivity accepts WHATSAPP_SENT", async () => {
      const lead = await LeadService.createLead(managerAUser, {
        name: "WhatsApp Activity Lead",
        phoneNumber: "+919876501703",
        interestedIn: "Full Stack Development",
        source: "WHATSAPP",
        branchId: branchAId,
      });

      const activity = await LeadService.addActivity(lead.id, managerAUser, {
        type: "WHATSAPP_SENT",
        title: "Opened WhatsApp",
        description: "wa.me link opened from Lead 360",
      });

      assert.strictEqual(activity.type, "WHATSAPP_SENT");
      assert.strictEqual(activity.title, "Opened WhatsApp");
    });
  });

  describe("16. Enquiry → Lead bridge for AI call", () => {
    test("ensureLeadFromEnquiry creates ACTIVE lead when none exists", async () => {
      const { ensureLeadFromEnquiry } = await import(
        "../modules/leads/services/lead-enquiry-bridge.service"
      );

      const phone = "+919876501801";
      const enquiry = await prisma.enquiry.create({
        data: {
          instituteId,
          branchId: branchAId,
          name: "Enquiry Bridge Person",
          phone,
          email: "bridge@aadya.test",
          courseId,
          source: "WEBSITE",
          status: "NEW",
          counselorNotes: "Wants demo",
        },
        include: { course: { select: { name: true } } },
      });

      const result = await ensureLeadFromEnquiry({
        enquiry,
        createdById: managerAUser.id,
      });

      assert.strictEqual(result.created, true);
      assert.ok(result.lead.id);

      const lead = await prisma.lead.findUnique({ where: { id: result.lead.id } });
      assert.ok(lead);
      assert.strictEqual(lead!.status, "ACTIVE");
      assert.strictEqual(lead!.courseId, courseId);
      assert.ok(lead!.phoneNumber.includes("9876501801"));

      const again = await ensureLeadFromEnquiry({
        enquiry,
        createdById: managerAUser.id,
      });
      assert.strictEqual(again.created, false);
      assert.strictEqual(again.lead.id, result.lead.id);

      await prisma.enquiry.delete({ where: { id: enquiry.id } });
    });

    test("triggerEnquiryAiCall auto-creates lead then dials", async () => {
      const { AdmissionsService } = await import(
        "../modules/admissions/admissions.service"
      );

      const phone = "+919876501802";
      const enquiry = await prisma.enquiry.create({
        data: {
          instituteId,
          branchId: branchAId,
          name: "Enquiry Dial Person",
          phone,
          courseId,
          source: "WEBSITE",
          status: "NEW",
        },
        include: { course: { select: { name: true } } },
      });

      const before = await prisma.lead.findFirst({
        where: {
          instituteId,
          status: "ACTIVE",
          OR: [{ normalizedPhone: "9876501802" }, { phoneNumber: phone }],
        },
      });
      assert.strictEqual(before, null);

      const updated = await AdmissionsService.triggerEnquiryAiCall(
        enquiry.id,
        instituteId,
        managerAUser.id
      );

      assert.ok(updated);
      assert.ok(updated!.counselorNotes?.includes("AI Call"));

      const lead = await prisma.lead.findFirst({
        where: {
          instituteId,
          status: "ACTIVE",
          OR: [{ normalizedPhone: "9876501802" }, { phoneNumber: phone }],
        },
      });
      assert.ok(lead);

      const callLogs = await prisma.callLog.findMany({ where: { leadId: lead!.id } });
      assert.ok(callLogs.length >= 1);

      await prisma.enquiry.delete({ where: { id: enquiry.id } });
    });
  });
});
