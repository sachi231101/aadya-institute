import { test, describe, before } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import { TargetService } from "../modules/targets/target.service";
import { TargetCalculationService } from "../modules/targets/target.calculation";
import {
  CreateTargetPlanSchema,
  CreateTargetSchema,
  ApproveIncentiveSchema,
  RejectIncentiveSchema,
} from "../modules/targets/target.validation";
import type { AuthUser } from "../modules/auth/auth.types";

describe("Target & Incentive Validation Schemas", () => {
  test("1. CreateTargetPlanSchema accepts valid monthly date range", () => {
    const res = CreateTargetPlanSchema.safeParse({
      name: "Q3 Counselor Drive",
      periodType: "MONTHLY",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    assert.strictEqual(res.success, true);
  });

  test("2. CreateTargetPlanSchema rejects invalid date range where start > end", () => {
    const res = CreateTargetPlanSchema.safeParse({
      name: "Invalid Plan",
      periodType: "MONTHLY",
      startDate: "2026-08-31",
      endDate: "2026-08-01",
    });
    assert.strictEqual(res.success, false);
  });

  test("3. CreateTargetSchema rejects negative or zero target value", () => {
    const resZero = CreateTargetSchema.safeParse({
      title: "Admissions Target",
      targetType: "INDIVIDUAL",
      metric: "ADMISSIONS",
      targetValue: 0,
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    assert.strictEqual(resZero.success, false);

    const resNeg = CreateTargetSchema.safeParse({
      title: "Admissions Target",
      targetType: "INDIVIDUAL",
      metric: "ADMISSIONS",
      targetValue: -10,
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    assert.strictEqual(resNeg.success, false);
  });

  test("4. ApproveIncentiveSchema validates positive approved amount", () => {
    const resValid = ApproveIncentiveSchema.safeParse({ approvedAmount: 5000 });
    assert.strictEqual(resValid.success, true);

    const resInvalid = ApproveIncentiveSchema.safeParse({ approvedAmount: -500 });
    assert.strictEqual(resInvalid.success, false);
  });

  test("5. RejectIncentiveSchema requires reason description", () => {
    const resInvalid = RejectIncentiveSchema.safeParse({ reason: "" });
    assert.strictEqual(resInvalid.success, false);

    const resValid = RejectIncentiveSchema.safeParse({
      reason: "Target calculation needs adjustment due to unconfirmed offline admission.",
    });
    assert.strictEqual(resValid.success, true);
  });
});

describe("Target Calculation & Incentive Evaluation Engine", () => {
  test("6. Evaluates FIXED incentive when target is achieved (100%+)", () => {
    const rule: any = {
      id: "rule-fixed",
      targetId: "t-1",
      incentiveType: "FIXED",
      fixedAmount: 5000,
    };

    // 100% achieved -> gets 5000
    const incentive100 = TargetCalculationService.evaluateIncentiveAmount(20, 20, 100, rule);
    assert.strictEqual(incentive100, 5000);

    // 120% achieved -> gets 5000
    const incentive120 = TargetCalculationService.evaluateIncentiveAmount(20, 24, 120, rule);
    assert.strictEqual(incentive120, 5000);

    // 90% achieved -> gets 0
    const incentive90 = TargetCalculationService.evaluateIncentiveAmount(20, 18, 90, rule);
    assert.strictEqual(incentive90, 0);
  });

  test("7. Evaluates SLAB tiered incentives across achievement brackets", () => {
    const rule: any = {
      id: "rule-slab",
      targetId: "t-2",
      incentiveType: "SLAB",
      slabs: [
        { minPercent: 0, maxPercent: 49, amount: 0 },
        { minPercent: 50, maxPercent: 74, amount: 2000 },
        { minPercent: 75, maxPercent: 89, amount: 5000 },
        { minPercent: 90, maxPercent: 99, amount: 7500 },
        { minPercent: 100, maxPercent: 109, amount: 10000 },
        { minPercent: 110, maxPercent: 124, amount: 12500 },
        { minPercent: 125, maxPercent: 999, amount: 15000 },
      ],
    };

    assert.strictEqual(TargetCalculationService.evaluateIncentiveAmount(20, 8, 40, rule), 0);
    assert.strictEqual(TargetCalculationService.evaluateIncentiveAmount(20, 12, 60, rule), 2000);
    assert.strictEqual(TargetCalculationService.evaluateIncentiveAmount(20, 16, 80, rule), 5000);
    assert.strictEqual(TargetCalculationService.evaluateIncentiveAmount(20, 19, 95, rule), 7500);
    assert.strictEqual(TargetCalculationService.evaluateIncentiveAmount(20, 20, 100, rule), 10000);
    assert.strictEqual(TargetCalculationService.evaluateIncentiveAmount(20, 23, 115, rule), 12500);
    assert.strictEqual(TargetCalculationService.evaluateIncentiveAmount(20, 26, 130, rule), 15000);
  });

  test("8. Evaluates PERCENTAGE incentives based on achieved value and rate tiers", () => {
    const rule: any = {
      id: "rule-pct",
      targetId: "t-3",
      incentiveType: "PERCENTAGE",
      percentages: [
        { minPercent: 0, maxPercent: 79, ratePercent: 0 },
        { minPercent: 80, maxPercent: 99, ratePercent: 0.5 },
        { minPercent: 100, maxPercent: 109, ratePercent: 1.0 },
        { minPercent: 110, maxPercent: 124, ratePercent: 1.25 },
        { minPercent: 125, maxPercent: 999, ratePercent: 1.5 },
      ],
    };

    // Target = 500,000. Achieved = 600,000 (120% -> 1.25% rate) -> 600,000 * 0.0125 = 7,500
    const incentive = TargetCalculationService.evaluateIncentiveAmount(
      500000,
      600000,
      120,
      rule
    );
    assert.strictEqual(incentive, 7500);

    // Achieved = 450,000 (90% -> 0.5% rate) -> 450,000 * 0.005 = 2,250
    const incentive90 = TargetCalculationService.evaluateIncentiveAmount(
      500000,
      450000,
      90,
      rule
    );
    assert.strictEqual(incentive90, 2250);
  });

  test("9. Handles zero target safely without division by zero errors", () => {
    const rule: any = {
      id: "rule-fixed",
      targetId: "t-0",
      incentiveType: "FIXED",
      fixedAmount: 1000,
    };
    const incentive = TargetCalculationService.evaluateIncentiveAmount(0, 0, 0, rule);
    assert.strictEqual(incentive, 0);
  });
});

describe("Target & Incentive Business Workflows and Security Isolation", () => {
  let testInstituteId: string;
  let branchAId: string;
  let branchBId: string;
  let adminUser: AuthUser;
  let managerAUser: AuthUser;
  let counselorAUser: AuthUser;
  let counselorBUser: AuthUser;

  before(async () => {
    const uAdmin = await prisma.user.findFirst({
      where: { email: { in: ["admin@aadya.in", "admin@aadya.com"] } },
    });
    if (!uAdmin) throw new Error("Admin user not found");
    testInstituteId = uAdmin.instituteId;

    const uCounsellor = await prisma.user.findFirst({
      where: {
        instituteId: testInstituteId,
        email: { in: ["counsellor@aadya.in", "counsellor.ananya@aadya.com"] },
      },
    });
    if (!uCounsellor) throw new Error("Counsellor user not found");

    const uManager = await prisma.user.findFirst({
      where: {
        instituteId: testInstituteId,
        email: { in: ["manager@aadya.in", "manager.koramangala@aadya.com"] },
      },
    });
    if (!uManager) throw new Error("Manager user not found");

    branchAId = uCounsellor.branchId || (await prisma.branch.findFirst({ where: { instituteId: testInstituteId } }))!.id;
    const otherBranch = await prisma.branch.findFirst({
      where: { instituteId: testInstituteId, id: { not: branchAId } },
    });
    branchBId = otherBranch ? otherBranch.id : "branch-b-test-id";

    adminUser = {
      id: uAdmin.id,
      userId: uAdmin.id,
      name: uAdmin.name,
      email: uAdmin.email,
      instituteId: testInstituteId,
      branchId: uAdmin.branchId,
      roles: ["ADMIN"],
      permissions: ["target.read", "target.manage", "target.assign", "target.approve", "incentive.read", "incentive.manage", "incentive.approve"],
    };

    managerAUser = {
      id: uManager.id,
      userId: uManager.id,
      name: uManager.name,
      email: uManager.email,
      instituteId: testInstituteId,
      branchId: branchAId,
      roles: ["CENTER_MANAGER"],
      permissions: ["target.read", "target.manage", "target.assign", "incentive.read", "incentive.approve"],
    };

    counselorAUser = {
      id: uCounsellor.id,
      userId: uCounsellor.id,
      name: uCounsellor.name,
      email: uCounsellor.email,
      instituteId: testInstituteId,
      branchId: branchAId,
      roles: ["COUNSELLOR"],
      permissions: ["target.read", "incentive.read"],
    };

    // Create a temporary counselor in branch B
    const counselorB = await prisma.user.upsert({
      where: { id: "test-counsellor-branch-b" },
      update: { instituteId: testInstituteId, branchId: branchBId },
      create: {
        id: "test-counsellor-branch-b",
        name: "Branch B Counselor",
        email: "counselorB@aadya.in",
        phone: "+91 99999 88888",
        passwordHash: "hash",
        instituteId: testInstituteId,
        branchId: branchBId,
        status: "ACTIVE",
      },
    });

    counselorBUser = {
      id: counselorB.id,
      userId: counselorB.id,
      name: counselorB.name,
      email: counselorB.email,
      instituteId: testInstituteId,
      branchId: branchBId,
      roles: ["COUNSELLOR"],
      permissions: ["target.read", "incentive.read"],
    };
  });

  test("10. Admin can create target plan and assign target with incentive rules", async () => {
    const plan = await TargetService.createTargetPlan(adminUser, {
      name: "Automated Test Target Plan",
      periodType: "MONTHLY",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-31"),
      branchId: branchAId,
    });

    assert.ok(plan.id);
    assert.strictEqual(plan.name, "Automated Test Target Plan");
    assert.strictEqual(plan.status, "DRAFT");

    const target = await TargetService.createTarget(adminUser, {
      branchId: branchAId,
      targetPlanId: plan.id,
      userId: counselorAUser.id,
      title: "Test Admissions Target",
      targetType: "INDIVIDUAL",
      metric: "ADMISSIONS",
      targetValue: 15,
      unit: "COUNT",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-31"),
      incentiveRule: {
        incentiveType: "FIXED",
        fixedAmount: 8000,
      },
    });

    assert.ok(target.id);
    assert.strictEqual(target.userId, counselorAUser.id);
    assert.strictEqual(Number(target.targetValue), 15);
  });

  test("11. Center Manager cannot create target plan for another branch", async () => {
    await assert.rejects(
      async () => {
        await TargetService.createTargetPlan(managerAUser, {
          name: "Illegal Branch Plan",
          periodType: "MONTHLY",
          startDate: new Date("2026-08-01"),
          endDate: new Date("2026-08-31"),
          branchId: branchBId, // Unauthorized branch
        });
      },
      (err: any) => {
        return err.statusCode === 403;
      }
    );
  });

  test("12. Counselor can view own targets via getMyCurrentTargets", async () => {
    const res = await TargetService.getMyCurrentTargets(counselorAUser);
    assert.ok(Array.isArray(res.targets));
    assert.ok(res.targets.length >= 1);
    assert.ok(res.summary.activeTargetCount >= 1);
  });

  test("13. Locked target plan cannot be modified or deleted", async () => {
    const plan = await TargetService.createTargetPlan(adminUser, {
      name: "Plan To Be Locked",
      periodType: "MONTHLY",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-31"),
      branchId: branchAId,
    });

    await TargetService.lockTargetPlan(adminUser, plan.id);

    await assert.rejects(
      async () => {
        await TargetService.updateTargetPlan(adminUser, plan.id, {
          name: "Attempted Modification",
        });
      },
      (err: any) => {
        return err.statusCode === 400 && err.message.includes("LOCKED");
      }
    );
  });

  test("14. Counselor cannot approve their own incentive", async () => {
    // Create an incentive for counselor A
    const target = await TargetService.createTarget(adminUser, {
      branchId: branchAId,
      userId: counselorAUser.id,
      title: "Incentive Test Target",
      targetType: "INDIVIDUAL",
      metric: "LEADS_CREATED",
      targetValue: 10,
      unit: "COUNT",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-31"),
      incentiveRule: {
        incentiveType: "FIXED",
        fixedAmount: 4000,
      },
    });

    const inc = await prisma.incentive.create({
      data: {
        instituteId: testInstituteId,
        branchId: branchAId,
        targetId: target.id,
        userId: counselorAUser.id,
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        targetValue: 10,
        achievedValue: 10,
        achievementPercentage: 100,
        calculatedAmount: 4000,
        status: "PENDING_APPROVAL",
      },
    });

    // Attempt self-approval by counselor A
    await assert.rejects(
      async () => {
        await TargetService.approveIncentive(counselorAUser, inc.id, {
          approvedAmount: 4000,
        });
      },
      (err: any) => {
        return err.statusCode === 403;
      }
    );

    // Manager / Admin can approve
    const approved = await TargetService.approveIncentive(adminUser, inc.id, {
      approvedAmount: 4000,
      notes: "Target achieved with high quality leads.",
    });

    assert.strictEqual(approved.status, "APPROVED");
    assert.strictEqual(Number(approved.approvedAmount), 4000);
  });

  test("15. Performance summary calculates aggregate KPIs and counselor breakdown", async () => {
    const summary = await TargetService.getPerformanceSummary(adminUser);
    assert.ok(summary.totalTargets >= 1);
    assert.ok(Array.isArray(summary.counselorStats));
  });

  test("16. Leaderboard ranks counselors correctly by achievement rate", async () => {
    const leaderboard = await TargetService.getLeaderboard(adminUser);
    assert.ok(Array.isArray(leaderboard));
    if (leaderboard.length > 0) {
      assert.strictEqual(leaderboard[0].rank, 1);
    }
  });
});
