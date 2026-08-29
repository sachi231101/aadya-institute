/**
 * Counsellor module integrity check against PostgreSQL via Prisma.
 * Run: npx tsx src/scripts/verify-counsellor-module.ts
 */
import { prisma } from "../config/database";

async function main() {
  const issues: string[] = [];
  const ok: string[] = [];

  const counsellors = await prisma.user.findMany({
    where: { userRoles: { some: { role: { name: "COUNSELLOR" } } } },
    select: {
      id: true,
      name: true,
      status: true,
      branchId: true,
      instituteId: true,
      email: true,
    },
  });
  ok.push(`Counsellors (User+role): ${counsellors.length}`);

  const active = counsellors.filter((c) => c.status === "ACTIVE");
  ok.push(`Active counsellors: ${active.length}`);

  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      assignedCounsellorId: true,
      phoneNumber: true,
      instituteId: true,
      stage: true,
    },
  });
  ok.push(`Leads total: ${leads.length}`);

  const assignedLeads = leads.filter((l) => l.assignedCounsellorId);
  const counsellorIds = new Set(counsellors.map((c) => c.id));
  const orphanAssign = assignedLeads.filter(
    (l) => l.assignedCounsellorId && !counsellorIds.has(l.assignedCounsellorId)
  );
  if (orphanAssign.length) {
    issues.push(
      `${orphanAssign.length} leads assigned to users without COUNSELLOR role (may be ADMIN/CM)`
    );
  } else {
    ok.push("Assigned leads reference known counsellor-role users (or none assigned)");
  }

  const enquiries = await prisma.enquiry.findMany({
    select: { id: true, phone: true, assignedToId: true, instituteId: true },
  });
  let mismatch = 0;
  for (const lead of assignedLeads) {
    const digits = lead.phoneNumber.replace(/\D/g, "").slice(-10);
    if (!digits) continue;
    const matches = enquiries.filter(
      (e) =>
        e.instituteId === lead.instituteId &&
        e.phone.replace(/\D/g, "").slice(-10) === digits
    );
    for (const e of matches) {
      if (e.assignedToId && e.assignedToId !== lead.assignedCounsellorId) {
        mismatch += 1;
      }
    }
  }
  if (mismatch) {
    issues.push(
      `${mismatch} Lead↔Enquiry assignee mismatches by phone (cleared on next assign sync)`
    );
  } else {
    ok.push("No Lead↔Enquiry assignee mismatches for matched phones");
  }

  const batches = await prisma.batch.findMany({
    select: {
      id: true,
      courseId: true,
      facultyId: true,
      _count: { select: { enrollments: true } },
    },
  });
  ok.push(`Batches: ${batches.length}`);
  const missingCourse = batches.filter((b) => !b.courseId);
  if (missingCourse.length) issues.push(`${missingCourse.length} batches missing courseId`);
  else ok.push("All batches have courseId");

  const callLogs = await prisma.callLog.count({ where: { leadId: { not: null } } });
  ok.push(`CallLogs linked to leads: ${callLogs}`);

  const followUps = await prisma.leadFollowUp.count({ where: { status: "PENDING" } });
  ok.push(`Pending LeadFollowUps (counsellor tasks): ${followUps}`);

  console.log("=== Counsellor module integrity ===");
  for (const line of ok) console.log("OK  ", line);
  for (const line of issues) console.log("WARN", line);
  console.log(
    issues.length
      ? `\nCompleted with ${issues.length} warning(s).`
      : "\nAll checks passed."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
