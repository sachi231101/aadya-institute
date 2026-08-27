export type TargetPeriod =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY"
  | "CUSTOM";

export type TargetStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ACTIVE"
  | "COMPLETED"
  | "LOCKED"
  | "CANCELLED";

export type TargetMetric =
  | "LEADS_CREATED"
  | "LEADS_CONTACTED"
  | "FOLLOW_UPS"
  | "QUALIFIED_LEADS"
  | "COUNSELLING_SESSIONS"
  | "DEMO_SESSIONS"
  | "ADMISSIONS"
  | "CONVERTED_LEADS"
  | "ADMISSION_REVENUE"
  | "FEE_COLLECTION";

export type TargetType = "INDIVIDUAL" | "BRANCH";

export type IncentiveType = "FIXED" | "SLAB" | "PERCENTAGE";

export type IncentiveStatus =
  | "CALCULATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PAYROLL_PROCESSED"
  | "PAID"
  | "CANCELLED";

export interface IncentiveSlab {
  minPercent: number;
  maxPercent: number;
  amount: number;
}

export interface IncentivePercentageTier {
  minPercent: number;
  maxPercent: number;
  ratePercent: number;
}

export interface IncentiveRule {
  id: string;
  targetId: string;
  incentiveType: IncentiveType;
  fixedAmount?: number | string | null;
  slabs?: IncentiveSlab[] | null;
  percentages?: IncentivePercentageTier[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface TargetProgress {
  id: string;
  targetId: string;
  userId?: string | null;
  targetValue: number | string;
  achievedValue: number | string;
  achievementPercentage: number | string;
  remainingValue: number | string;
  potentialIncentive: number | string;
  calculatedAt: string;
}

export interface Target {
  id: string;
  instituteId: string;
  branchId?: string | null;
  targetPlanId?: string | null;
  userId?: string | null;
  title: string;
  targetType: TargetType;
  metric: TargetMetric;
  targetValue: number | string;
  unit: string;
  startDate: string;
  endDate: string;
  status: TargetStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string; code: string } | null;
  targetPlan?: { id: string; name: string; periodType: TargetPeriod } | null;
  user?: { id: string; name: string; email: string; phone?: string | null } | null;
  createdBy?: { id: string; name: string } | null;
  incentiveRule?: IncentiveRule | null;
  targetProgress?: TargetProgress[];
  currentProgress?: {
    targetId: string;
    targetValue: number;
    achievedValue: number;
    achievementPercentage: number;
    remainingValue: number;
    potentialIncentive: number;
    calculatedAt: string;
  };
  daysRemaining?: number;
}

export interface TargetPlan {
  id: string;
  instituteId: string;
  branchId?: string | null;
  name: string;
  description?: string | null;
  periodType: TargetPeriod;
  startDate: string;
  endDate: string;
  status: TargetStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string; code: string } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  targets?: Target[];
}

export interface Incentive {
  id: string;
  instituteId: string;
  branchId?: string | null;
  targetId: string;
  targetPlanId?: string | null;
  userId: string;
  periodStart: string;
  periodEnd: string;
  targetValue: number | string;
  achievedValue: number | string;
  achievementPercentage: number | string;
  calculatedAmount: number | string;
  approvedAmount?: number | string | null;
  status: IncentiveStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  adjustmentNotes?: string | null;
  paidAt?: string | null;
  payrollRef?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string; phone?: string | null } | null;
  target?: {
    id: string;
    title: string;
    metric: TargetMetric;
    targetValue: number | string;
    unit: string;
    incentiveRule?: IncentiveRule | null;
  } | null;
  targetPlan?: { id: string; name: string; periodType: TargetPeriod } | null;
  branch?: { id: string; name: string; code: string } | null;
  approvedBy?: { id: string; name: string; email: string } | null;
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
