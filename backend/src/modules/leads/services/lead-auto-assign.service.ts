import { prisma } from "../../../config/database";
import { getRedis, isRedisAvailable } from "../../../config/redis";
import { logger } from "../../../config/logger";
import { LeadActivityService } from "./lead-activity.service";
import { LeadAssignmentService } from "./lead-assignment.service";

const REDIS_KEY_PREFIX = "lead:auto-assign";

/** In-memory fallback counters when Redis is unavailable (per process). */
const memoryCounters = new Map<string, number>();

function counterKey(instituteId: string, branchId: string): string {
  return `${REDIS_KEY_PREFIX}:${instituteId}:${branchId}`;
}

/** Test-only: reset round-robin cursors (memory + Redis when reachable). */
export async function resetAutoAssignCountersForTests(
  instituteId: string,
  branchId: string
): Promise<void> {
  const key = counterKey(instituteId, branchId);
  memoryCounters.delete(key);
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect().catch(() => undefined);
    }
    // SET 0 so the next INCR yields 1 → index 0 (same as a fresh key)
    await redis.set(key, "0");
  } catch {
    // leave memory cleared; Redis optional
  }
}

/**
 * Atomically pick the next round-robin index for a branch.
 * Prefers Redis INCR; falls back to in-memory when Redis is down.
 */
async function nextRoundRobinIndex(
  instituteId: string,
  branchId: string,
  modulo: number
): Promise<number> {
  if (modulo <= 0) return 0;

  const key = counterKey(instituteId, branchId);
  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    try {
      const n = await redis.incr(key);
      return (n - 1) % modulo;
    } catch (err) {
      logger.debug(
        { err, instituteId, branchId },
        "[lead-auto-assign] Redis incr failed — using memory counter"
      );
    }
  }

  const current = memoryCounters.get(key) ?? 0;
  memoryCounters.set(key, current + 1);
  return current % modulo;
}

async function listActiveBranchCounsellors(
  instituteId: string,
  branchId: string
): Promise<Array<{ id: string; name: string }>> {
  return prisma.user.findMany({
    where: {
      instituteId,
      branchId,
      status: "ACTIVE",
      userRoles: {
        some: {
          role: { name: "COUNSELLOR" },
        },
      },
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
}

export type AutoAssignResult = {
  assigned: boolean;
  counsellorId?: string;
  counsellorName?: string;
  reason?: string;
};

/**
 * Round-robin assign a newly ingested lead to an ACTIVE COUNSELLOR on the branch.
 * Uses internal assign (bypasses AI-call gate). Leaves unassigned + activity note if none.
 */
export async function autoAssignLeadToBranchCounsellor(params: {
  leadId: string;
  instituteId: string;
  branchId: string;
  assignedById: string;
  /** Override default import notes (e.g. post-call branch change). */
  notes?: string;
  metadata?: Record<string, unknown>;
}): Promise<AutoAssignResult> {
  const {
    leadId,
    instituteId,
    branchId,
    assignedById,
    notes = "Auto-assigned by branch round-robin on import",
    metadata,
  } = params;

  try {
    const counsellors = await listActiveBranchCounsellors(instituteId, branchId);

    if (counsellors.length === 0) {
      await LeadActivityService.logActivity(
        leadId,
        "NOTE_ADDED",
        "Auto-assign skipped — no branch counsellor",
        {
          userId: assignedById,
          description:
            "No ACTIVE COUNSELLOR users found for this branch. Lead left unassigned.",
          metadata: { instituteId, branchId, autoAssign: true, ...metadata },
        }
      );
      return { assigned: false, reason: "no_counsellor" };
    }

    const index = await nextRoundRobinIndex(instituteId, branchId, counsellors.length);
    const counsellor = counsellors[index];

    await LeadAssignmentService.assignLeadInternal({
      leadId,
      counsellorId: counsellor.id,
      assignedById,
      assignedByName: "System (auto-assign)",
      notes,
      metadata: {
        autoAssign: true,
        roundRobinIndex: index,
        counsellorCount: counsellors.length,
        ...metadata,
      },
      notify: true,
    });

    return {
      assigned: true,
      counsellorId: counsellor.id,
      counsellorName: counsellor.name,
    };
  } catch (err) {
    logger.warn(
      { err, leadId, instituteId, branchId },
      "[lead-auto-assign] failed — leaving lead unassigned"
    );

    try {
      await LeadActivityService.logActivity(
        leadId,
        "NOTE_ADDED",
        "Auto-assign failed",
        {
          userId: assignedById,
          description:
            err instanceof Error
              ? err.message
              : "Unexpected error during auto-assign",
          metadata: { instituteId, branchId, autoAssign: true, ...metadata },
        }
      );
    } catch (activityErr) {
      logger.debug({ activityErr, leadId }, "[lead-auto-assign] activity note failed");
    }

    return {
      assigned: false,
      reason: err instanceof Error ? err.message : "auto_assign_failed",
    };
  }
}
