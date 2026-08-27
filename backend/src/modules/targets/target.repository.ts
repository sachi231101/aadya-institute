import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";
import type { TargetStatus, IncentiveStatus } from "@prisma/client";
import type {
  CreateTargetPlanDTO,
  UpdateTargetPlanDTO,
  CreateTargetDTO,
  UpdateTargetDTO,
  QueryTargetsDTO,
  QueryIncentivesDTO,
  CalculationResult,
} from "./target.types";

export const TargetRepository = {
  // ─── Target Plans ──────────────────────────────────────────────────────────

  async findTargetPlans(
    instituteId: string,
    branchId?: string | null,
    status?: TargetStatus
  ) {
    const where: Prisma.TargetPlanWhereInput = {
      instituteId,
      ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
      ...(status ? { status } : {}),
    };

    return prisma.targetPlan.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        targets: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            incentiveRule: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findTargetPlanById(
    id: string,
    instituteId: string,
    branchId?: string | null
  ) {
    const where: Prisma.TargetPlanWhereInput = {
      id,
      instituteId,
      ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
    };

    return prisma.targetPlan.findFirst({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        targets: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            incentiveRule: true,
            targetProgress: {
              orderBy: { calculatedAt: "desc" },
              take: 1,
            },
          },
        },
        incentives: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            approvedBy: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  async createTargetPlan(
    instituteId: string,
    createdById: string,
    dto: CreateTargetPlanDTO
  ) {
    return prisma.targetPlan.create({
      data: {
        instituteId,
        branchId: dto.branchId || null,
        name: dto.name,
        description: dto.description || null,
        periodType: dto.periodType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: "DRAFT",
        createdById,
      },
      include: {
        branch: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
  },

  async updateTargetPlan(
    id: string,
    instituteId: string,
    dto: UpdateTargetPlanDTO
  ) {
    return prisma.targetPlan.updateMany({
      where: { id, instituteId },
      data: {
        ...(dto.branchId !== undefined ? { branchId: dto.branchId || null } : {}),
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.periodType ? { periodType: dto.periodType } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  },

  // ─── Targets ───────────────────────────────────────────────────────────────

  async findTargets(
    instituteId: string,
    allowedBranchId?: string | null,
    params: QueryTargetsDTO = {}
  ) {
    const {
      branchId,
      targetPlanId,
      userId,
      metric,
      status,
      search,
      page = 1,
      limit = 50,
    } = params;

    const where: Prisma.TargetWhereInput = {
      instituteId,
      ...(allowedBranchId
        ? { OR: [{ branchId: allowedBranchId }, { branchId: null }] }
        : branchId
        ? { branchId }
        : {}),
      ...(targetPlanId ? { targetPlanId } : {}),
      ...(userId ? { userId } : {}),
      ...(metric ? { metric } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { user: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.target.count({ where }),
      prisma.target.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true, code: true } },
          targetPlan: { select: { id: true, name: true, periodType: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          incentiveRule: true,
          targetProgress: {
            orderBy: { calculatedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  async findTargetById(
    id: string,
    instituteId: string,
    allowedBranchId?: string | null
  ) {
    const where: Prisma.TargetWhereInput = {
      id,
      instituteId,
      ...(allowedBranchId
        ? { OR: [{ branchId: allowedBranchId }, { branchId: null }] }
        : {}),
    };

    return prisma.target.findFirst({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        targetPlan: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
        incentiveRule: true,
        targetProgress: {
          orderBy: { calculatedAt: "desc" },
          take: 10,
        },
        incentives: {
          include: {
            approvedBy: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  async createTarget(
    instituteId: string,
    createdById: string,
    dto: CreateTargetDTO
  ) {
    return prisma.$transaction(async (tx) => {
      const target = await tx.target.create({
        data: {
          instituteId,
          branchId: dto.branchId || null,
          targetPlanId: dto.targetPlanId || null,
          userId: dto.userId || null,
          title: dto.title,
          targetType: dto.targetType,
          metric: dto.metric,
          targetValue: new Prisma.Decimal(dto.targetValue),
          unit: dto.unit || "COUNT",
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: "ACTIVE",
          createdById,
        },
        include: {
          branch: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (dto.incentiveRule) {
        await tx.incentiveRule.create({
          data: {
            targetId: target.id,
            incentiveType: dto.incentiveRule.incentiveType,
            fixedAmount:
              dto.incentiveRule.fixedAmount !== undefined
                ? new Prisma.Decimal(dto.incentiveRule.fixedAmount)
                : null,
            slabs: dto.incentiveRule.slabs ? JSON.parse(JSON.stringify(dto.incentiveRule.slabs)) : null,
            percentages: dto.incentiveRule.percentages
              ? JSON.parse(JSON.stringify(dto.incentiveRule.percentages))
              : null,
          },
        });
      }

      return tx.target.findUnique({
        where: { id: target.id },
        include: {
          branch: true,
          user: { select: { id: true, name: true, email: true } },
          incentiveRule: true,
        },
      });
    });
  },

  async updateTarget(
    id: string,
    instituteId: string,
    dto: UpdateTargetDTO
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.target.updateMany({
        where: { id, instituteId },
        data: {
          ...(dto.branchId !== undefined ? { branchId: dto.branchId || null } : {}),
          ...(dto.userId !== undefined ? { userId: dto.userId || null } : {}),
          ...(dto.title ? { title: dto.title } : {}),
          ...(dto.targetType ? { targetType: dto.targetType } : {}),
          ...(dto.metric ? { metric: dto.metric } : {}),
          ...(dto.targetValue !== undefined ? { targetValue: new Prisma.Decimal(dto.targetValue) } : {}),
          ...(dto.unit ? { unit: dto.unit } : {}),
          ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
          ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
          ...(dto.status ? { status: dto.status } : {}),
        },
      });

      if (dto.incentiveRule) {
        await tx.incentiveRule.upsert({
          where: { targetId: id },
          update: {
            incentiveType: dto.incentiveRule.incentiveType,
            fixedAmount:
              dto.incentiveRule.fixedAmount !== undefined
                ? new Prisma.Decimal(dto.incentiveRule.fixedAmount)
                : null,
            slabs: dto.incentiveRule.slabs ? JSON.parse(JSON.stringify(dto.incentiveRule.slabs)) : null,
            percentages: dto.incentiveRule.percentages
              ? JSON.parse(JSON.stringify(dto.incentiveRule.percentages))
              : null,
          },
          create: {
            targetId: id,
            incentiveType: dto.incentiveRule.incentiveType,
            fixedAmount:
              dto.incentiveRule.fixedAmount !== undefined
                ? new Prisma.Decimal(dto.incentiveRule.fixedAmount)
                : null,
            slabs: dto.incentiveRule.slabs ? JSON.parse(JSON.stringify(dto.incentiveRule.slabs)) : null,
            percentages: dto.incentiveRule.percentages
              ? JSON.parse(JSON.stringify(dto.incentiveRule.percentages))
              : null,
          },
        });
      }

      return tx.target.findFirst({
        where: { id, instituteId },
        include: {
          branch: true,
          user: { select: { id: true, name: true, email: true } },
          incentiveRule: true,
          targetProgress: {
            orderBy: { calculatedAt: "desc" },
            take: 1,
          },
        },
      });
    });
  },

  async deleteTarget(id: string, instituteId: string) {
    return prisma.target.deleteMany({
      where: { id, instituteId },
    });
  },

  // ─── Target Progress Snapshots ─────────────────────────────────────────────

  async saveTargetProgress(result: CalculationResult) {
    return prisma.targetProgress.create({
      data: {
        targetId: result.targetId,
        userId: result.userId || null,
        targetValue: new Prisma.Decimal(result.targetValue),
        achievedValue: new Prisma.Decimal(result.achievedValue),
        achievementPercentage: new Prisma.Decimal(result.achievementPercentage),
        remainingValue: new Prisma.Decimal(result.remainingValue),
        potentialIncentive: new Prisma.Decimal(result.potentialIncentive),
        calculatedAt: result.calculatedAt,
      },
    });
  },

  async findMyActiveTargets(instituteId: string, userId: string) {
    return prisma.target.findMany({
      where: {
        instituteId,
        userId,
        status: { in: ["ACTIVE", "PUBLISHED", "COMPLETED"] },
      },
      include: {
        targetPlan: { select: { id: true, name: true, periodType: true } },
        incentiveRule: true,
        targetProgress: {
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { endDate: "asc" },
    });
  },

  // ─── Incentives ────────────────────────────────────────────────────────────

  async findIncentives(
    instituteId: string,
    allowedBranchId?: string | null,
    params: QueryIncentivesDTO = {}
  ) {
    const { branchId, userId, targetId, targetPlanId, status, page = 1, limit = 50 } = params;

    const where: Prisma.IncentiveWhereInput = {
      instituteId,
      ...(allowedBranchId
        ? { OR: [{ branchId: allowedBranchId }, { branchId: null }] }
        : branchId
        ? { branchId }
        : {}),
      ...(userId ? { userId } : {}),
      ...(targetId ? { targetId } : {}),
      ...(targetPlanId ? { targetPlanId } : {}),
      ...(status ? { status } : {}),
    };

    const [total, data] = await Promise.all([
      prisma.incentive.count({ where }),
      prisma.incentive.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          target: { select: { id: true, title: true, metric: true, targetValue: true, unit: true } },
          targetPlan: { select: { id: true, name: true, periodType: true } },
          branch: { select: { id: true, name: true, code: true } },
          approvedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  async findIncentiveById(
    id: string,
    instituteId: string,
    allowedBranchId?: string | null
  ) {
    const where: Prisma.IncentiveWhereInput = {
      id,
      instituteId,
      ...(allowedBranchId
        ? { OR: [{ branchId: allowedBranchId }, { branchId: null }] }
        : {}),
    };

    return prisma.incentive.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        target: {
          include: {
            incentiveRule: true,
          },
        },
        targetPlan: true,
        branch: true,
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async upsertCalculatedIncentive(data: {
    instituteId: string;
    branchId?: string | null;
    targetId: string;
    targetPlanId?: string | null;
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    targetValue: number;
    achievedValue: number;
    achievementPercentage: number;
    calculatedAmount: number;
  }) {
    // Check if an existing incentive for target & period is already created
    const existing = await prisma.incentive.findFirst({
      where: {
        instituteId: data.instituteId,
        targetId: data.targetId,
        userId: data.userId,
      },
    });

    if (existing) {
      // Don't overwrite if already approved or paid
      if (["APPROVED", "PAYROLL_PROCESSED", "PAID"].includes(existing.status)) {
        return existing;
      }

      return prisma.incentive.update({
        where: { id: existing.id },
        data: {
          targetValue: new Prisma.Decimal(data.targetValue),
          achievedValue: new Prisma.Decimal(data.achievedValue),
          achievementPercentage: new Prisma.Decimal(data.achievementPercentage),
          calculatedAmount: new Prisma.Decimal(data.calculatedAmount),
          status: "PENDING_APPROVAL",
        },
      });
    }

    return prisma.incentive.create({
      data: {
        instituteId: data.instituteId,
        branchId: data.branchId || null,
        targetId: data.targetId,
        targetPlanId: data.targetPlanId || null,
        userId: data.userId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        targetValue: new Prisma.Decimal(data.targetValue),
        achievedValue: new Prisma.Decimal(data.achievedValue),
        achievementPercentage: new Prisma.Decimal(data.achievementPercentage),
        calculatedAmount: new Prisma.Decimal(data.calculatedAmount),
        status: "PENDING_APPROVAL",
      },
    });
  },

  async updateIncentiveStatus(
    id: string,
    instituteId: string,
    status: IncentiveStatus,
    approvedById?: string,
    approvedAmount?: number,
    notes?: string,
    rejectionReason?: string
  ) {
    return prisma.incentive.updateMany({
      where: { id, instituteId },
      data: {
        status,
        ...(approvedById ? { approvedById, approvedAt: new Date() } : {}),
        ...(approvedAmount !== undefined ? { approvedAmount: new Prisma.Decimal(approvedAmount) } : {}),
        ...(notes ? { adjustmentNotes: notes } : {}),
        ...(rejectionReason ? { rejectionReason } : {}),
      },
    });
  },
};
