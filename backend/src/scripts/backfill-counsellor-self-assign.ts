/**
 * One-off: assign counsellor-created unassigned leads to their creator.
 * Run from backend/: npx tsx src/scripts/backfill-counsellor-self-assign.ts
 */
import { prisma } from "../config/database";

async function main() {
  const counsellorRoles = await prisma.role.findMany({
    where: { name: "COUNSELLOR" },
    select: { id: true },
  });
  const roleIds = counsellorRoles.map((r) => r.id);
  if (!roleIds.length) {
    console.log("No COUNSELLOR role found");
    return;
  }

  const counsellorUserIds = (
    await prisma.userRole.findMany({
      where: { roleId: { in: roleIds } },
      select: { userId: true },
    })
  ).map((u) => u.userId);

  const adminManagerRoles = await prisma.role.findMany({
    where: { name: { in: ["ADMIN", "CENTER_MANAGER"] } },
    select: { id: true },
  });
  const adminManagerUserIds = new Set(
    (
      await prisma.userRole.findMany({
        where: { roleId: { in: adminManagerRoles.map((r) => r.id) } },
        select: { userId: true },
      })
    ).map((u) => u.userId)
  );

  const counsellorOnlyIds = counsellorUserIds.filter(
    (id) => !adminManagerUserIds.has(id)
  );
  console.log("Counsellor-only users:", counsellorOnlyIds.length);

  const unassigned = await prisma.lead.findMany({
    where: {
      assignedCounsellorId: null,
      createdById: { in: counsellorOnlyIds },
      status: { in: ["ACTIVE", "LOST"] },
    },
    select: { id: true, createdById: true, stage: true, name: true },
  });
  console.log("Unassigned counsellor-created leads:", unassigned.length);

  for (const lead of unassigned) {
    if (!lead.createdById) continue;
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          assignedCounsellorId: lead.createdById,
          stage:
            lead.stage === "NEW" || lead.stage === "CONTACTED"
              ? "ASSIGNED"
              : lead.stage,
        },
      });
      const existing = await tx.leadAssignment.findFirst({
        where: { leadId: lead.id, isCurrent: true },
      });
      if (!existing) {
        await tx.leadAssignment.create({
          data: {
            leadId: lead.id,
            counsellorId: lead.createdById!,
            assignedById: lead.createdById!,
            isCurrent: true,
            notes: "Backfill: counsellor self-assign for leads they created",
          },
        });
      }
    });
    console.log("Fixed:", lead.name, lead.id);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
