import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/database";

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Sets Lead.nextFollowUpAt from the earliest PENDING LeadFollowUp.scheduledAt,
 * or null when none remain.
 */
export async function recomputeNextFollowUpAt(
  leadId: string,
  tx?: Prisma.TransactionClient
): Promise<Date | null> {
  const client: DbClient = tx ?? prisma;

  const earliestPending = await client.leadFollowUp.findFirst({
    where: { leadId, status: "PENDING" },
    orderBy: { scheduledAt: "asc" },
    select: { scheduledAt: true },
  });

  const nextFollowUpAt = earliestPending?.scheduledAt ?? null;

  await client.lead.update({
    where: { id: leadId },
    data: { nextFollowUpAt },
  });

  return nextFollowUpAt;
}
