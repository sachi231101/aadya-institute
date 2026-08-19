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
import { LeadRepository } from "../modules/leads/lead.repository";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";

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
    // Cleanup test data
    await prisma.leadActivity.deleteMany({ where: { lead: { instituteId } } });
    await prisma.leadFollowUp.deleteMany({ where: { lead: { instituteId } } });
    await prisma.leadAssignment.deleteMany({ where: { lead: { instituteId } } });
    await prisma.leadStageHistory.deleteMany({ where: { lead: { instituteId } } });
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

    test("createLeadSchema rejects invalid source enum", () => {
      const result = createLeadSchema.safeParse({
        name: "John",
        phoneNumber: "9876543210",
        interestedIn: "Web",
        source: "NEWSPAPER",
      });
      assert.strictEqual(result.success, false);
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

    test("Counsellor creates lead -> auto-assigned self, branch, stage ASSIGNED", async () => {
      const lead = await LeadService.createLead(counsellorAUser, {
        name: "Rohan Verma",
        phoneNumber: "+919876500001",
        email: "rohan@gmail.com",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
      });

      createdLeadId = lead.id;

      assert.ok(lead.id);
      assert.strictEqual(lead.name, "Rohan Verma");
      assert.strictEqual(lead.phoneNumber, "+919876500001");
      assert.strictEqual(lead.createdById, counsellorAUser.userId);
      assert.strictEqual(lead.assignedCounsellorId, counsellorAUser.userId);
      assert.strictEqual(lead.branchId, branchAId);
      assert.strictEqual(lead.stage, "ASSIGNED");
      assert.strictEqual(lead.status, "ACTIVE");
      assert.strictEqual(lead.courseId, courseId); // Auto-matched by name
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

    before(async () => {
      const lead = await LeadService.createLead(counsellorAUser, {
        name: "Lifecycle Test Lead",
        phoneNumber: "+919876500004",
        interestedIn: "Full Stack Development",
        source: "PHONE_CALL",
      });
      leadId = lead.id;
    });

    test("Manager reassigns lead to Counsellor A", async () => {
      const result = await LeadService.assignLead(leadId, managerAUser, {
        counsellorId: counsellorAUser.id,
        notes: "Reassigned by center manager",
      });

      assert.strictEqual(result.lead.assignedCounsellorId, counsellorAUser.id);
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

    before(async () => {
      const lead = await LeadService.createLead(counsellorAUser, {
        name: "Convertible Lead",
        phoneNumber: "+919876500006",
        email: "convertible@aadya.test",
        interestedIn: "Full Stack Development",
        source: "WALK_IN",
      });
      leadId = lead.id;
    });

    test("Converts lead to Student & Admission atomically in transaction", async () => {
      const result = await LeadService.convertLead(leadId, counsellorAUser, {
        courseId,
        feePlan: "FULL_PAYMENT",
        notes: "Paid token registration fee",
      });

      assert.ok(result.student.id);
      assert.ok(result.student.studentCode.startsWith("STU-2026-"));
      assert.ok(result.admission.id);
      assert.ok(result.admission.admissionNo?.startsWith("ADM-2026-"));
      assert.strictEqual(result.lead.status, "CONVERTED");
      assert.strictEqual(result.lead.stage, "CONVERTED");
      assert.strictEqual(result.lead.convertedStudentId, result.student.id);
      assert.strictEqual(result.lead.convertedAdmissionId, result.admission.id);
    });

    test("Duplicate conversion attempt on already converted lead is rejected", async () => {
      await assert.rejects(
        async () => {
          await LeadService.convertLead(leadId, counsellorAUser, {
            courseId,
          });
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /already been converted/);
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
});
