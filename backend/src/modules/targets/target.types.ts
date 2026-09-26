import type {
  TargetPeriod,
  TargetStatus,
  TargetMetric,
  TargetType,
  IncentiveType,
  IncentiveStatus,
} from "@prisma/client";

export interface IncentiveSlab {
  /** Absolute achieved amount/count range (preferred). */
  minValue?: number;
  maxValue?: number;
  /** Legacy % of target — still supported for old records. */
  minPercent?: number;
  maxPercent?: number;
  amount: number;
}

export interface IncentivePercentageTier {
  minPercent: number;
  maxPercent: number;
  ratePercent: number;
}

export interface CreateTargetPlanDTO {
  branchId?: string;
  name: string;
  description?: string;
  periodType: TargetPeriod;
  startDate: string | Date;
  endDate: string | Date;
}

export interface UpdateTargetPlanDTO {
  branchId?: string;
  name?: string;
  description?: string;
  periodType?: TargetPeriod;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: TargetStatus;
}

export interface CreateIncentiveRuleInput {
  incentiveType: IncentiveType;
  fixedAmount?: number;
  slabs?: IncentiveSlab[];
  percentages?: IncentivePercentageTier[];
}

export interface CreateTargetDTO {
  branchId?: string;
  targetPlanId?: string;
  userId?: string;
  title: string;
  targetType: TargetType;
  metric: TargetMetric;
  targetValue: number;
  unit?: string;
  startDate: string | Date;
  endDate: string | Date;
  incentiveRule?: CreateIncentiveRuleInput;
}

export interface UpdateTargetDTO {
  branchId?: string | null;
  userId?: string | null;
  title?: string;
  targetType?: TargetType;
  metric?: TargetMetric;
  targetValue?: number;
  unit?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: TargetStatus;
  incentiveRule?: CreateIncentiveRuleInput | null;
}

/** Shared fields applied to every day in a target plan series. */
export interface BulkUpdatePlanTargetsDTO {
  title?: string;
  userId?: string | null;
  targetType?: TargetType;
  metric?: TargetMetric;
  targetValue?: number;
  unit?: string;
  incentiveRule?: CreateIncentiveRuleInput | null;
}

export interface QueryTargetsDTO {
  branchId?: string;
  targetPlanId?: string;
  userId?: string;
  metric?: TargetMetric;
  status?: TargetStatus;
  search?: string;
  page?: number;
  limit?: number;
  /**
   * Counsellor/CM viewer: own individual targets OR Entire Branch Team Goals
   * for their branch (never faculty/student).
   */
  staffViewer?: {
    userId: string;
    branchId?: string | null;
  };
}

export interface QueryIncentivesDTO {
  branchId?: string;
  userId?: string;
  targetId?: string;
  targetPlanId?: string;
  status?: IncentiveStatus;
  page?: number;
  limit?: number;
}

export interface ApproveIncentiveDTO {
  approvedAmount?: number;
  notes?: string;
}

export interface RejectIncentiveDTO {
  reason: string;
}

export interface CalculationResult {
  targetId: string;
  userId?: string | null;
  targetValue: number;
  achievedValue: number;
  achievementPercentage: number;
  remainingValue: number;
  potentialIncentive: number;
  calculatedAt: Date;
}

export interface PerformanceSummary {
  totalTargets: number;
  totalTargetValue: number;
  totalAchievedValue: number;
  averageAchievementRate: number;
  topPerformer?: {
    userId: string;
    name: string;
    achievementRate: number;
    achievedValue: number;
  } | null;
  needsAttentionCount: number;
  counselorStats: Array<{
    userId: string;
    name: string;
    branchId: string;
    branchName: string;
    targetCount: number;
    totalTarget: number;
    totalAchieved: number;
    achievementRate: number;
    potentialIncentive: number;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  branchName: string;
  achievementPercentage: number;
  achievedCount: number;
  admissionsCount: number;
  revenueCollected: number;
}
