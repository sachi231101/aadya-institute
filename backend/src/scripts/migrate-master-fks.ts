/**
 * Maps legacy enum/string values to master record IDs after seeding.
 * Run after seed-masters: npx ts-node src/scripts/migrate-master-fks.ts
 */
import { prisma } from "../config/database";

async function linkMastersByCode(
  instituteId: string,
  entityType: string,
  code: string
): Promise<string | null> {
  const record = await prisma.masterRecord.findFirst({
    where: { instituteId, entityType, code },
    select: { id: true },
  });
  return record?.id ?? null;
}

async function main() {
  const institute = await prisma.institute.findFirst();
  if (!institute) {
    console.log("No institute found.");
    return;
  }

  const instituteId = institute.id;
  console.log("Linking master FKs for institute:", institute.name);

  // Leads: source and stage
  const leads = await prisma.lead.findMany({ where: { instituteId } });
  for (const lead of leads) {
    const sourceMasterId = await linkMastersByCode(instituteId, "leadsource", lead.source);
    const stageMasterId = await linkMastersByCode(instituteId, "leadstage", lead.stage);
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...(sourceMasterId ? { sourceMasterId } : {}),
        ...(stageMasterId ? { stageMasterId } : {}),
      },
    });
  }
  console.log(`✓ Linked ${leads.length} leads`);

  // Payments: method
  const payments = await prisma.payment.findMany({ where: { instituteId } });
  for (const payment of payments) {
    const paymentModeMasterId = await linkMastersByCode(
      instituteId,
      "paymentmodes",
      payment.method
    );
    if (paymentModeMasterId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { paymentModeMasterId },
      });
    }
  }
  console.log(`✓ Linked ${payments.length} payments`);

  // Class sessions: match roomNo to classroom name
  const classrooms = await prisma.masterRecord.findMany({
    where: { instituteId, entityType: "classroom", status: "ACTIVE" },
  });
  const sessions = await prisma.classSession.findMany({
    where: { roomNo: { not: null } },
  });
  for (const session of sessions) {
    if (!session.roomNo) continue;
    const match = classrooms.find(
      (c) =>
        c.name === session.roomNo ||
        c.code === session.roomNo ||
        session.roomNo?.includes(c.name)
    );
    if (match) {
      await prisma.classSession.update({
        where: { id: session.id },
        data: { classroomMasterId: match.id, roomNo: match.name },
      });
    }
  }
  console.log(`✓ Processed ${sessions.length} class sessions`);

  // Admissions: status
  const admissions = await prisma.admission.findMany({ where: { instituteId } });
  for (const admission of admissions) {
    const statusMasterId = await linkMastersByCode(
      instituteId,
      "admissionstatus",
      admission.status
    );
    if (statusMasterId) {
      await prisma.admission.update({
        where: { id: admission.id },
        data: { statusMasterId },
      });
    }
  }
  console.log(`✓ Linked ${admissions.length} admissions`);

  console.log("✨ Master FK migration complete");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
