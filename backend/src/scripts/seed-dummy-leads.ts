/**
 * Seed 30 dummy leads across pipeline stages for UI/QA.
 * Does NOT trigger AI calling (direct Prisma insert).
 *
 * Usage: npx tsx src/scripts/seed-dummy-leads.ts
 * Optional: DUMMY_LEAD_TAG=DUMMY_SEED (default) to mark rows for cleanup.
 */
import { prisma } from "../config/database";

const TAG = process.env.DUMMY_LEAD_TAG || "DUMMY_SEED";

const COURSES = [
  "Full Stack Development",
  "Java Full Stack",
  "Python Data Science",
  "Digital Marketing",
  "UI/UX Design",
  "Cloud Computing",
];

const SOURCES = [
  "WALK_IN",
  "PHONE_CALL",
  "WHATSAPP",
  "INSTAGRAM",
  "GOOGLE",
  "REFERRAL",
  "AI_CALLING",
];

const FIRST = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Vihaan",
  "Arjun",
  "Sai",
  "Reyansh",
  "Ayaan",
  "Krishna",
  "Ishaan",
  "Ananya",
  "Diya",
  "Myra",
  "Aadhya",
  "Kiara",
  "Pari",
  "Saanvi",
  "Anika",
  "Navya",
  "Ira",
  "Rohan",
  "Kabir",
  "Dev",
  "Yash",
  "Om",
  "Meera",
  "Nisha",
  "Pooja",
  "Riya",
  "Tara",
];

type StageSpec = {
  stage: string;
  status: "ACTIVE" | "CONVERTED" | "LOST" | "ARCHIVED";
  count: number;
  assign?: boolean;
  withFollowUp?: "overdue" | "today" | "upcoming" | "none";
  score?: number | null;
  temperature?: string | null;
  lostReason?: "PRICE_HIGH" | "NOT_INTERESTED" | "NO_RESPONSE" | "OTHER";
};

/** 30 leads total across stages */
const STAGE_PLAN: StageSpec[] = [
  { stage: "NEW", status: "ACTIVE", count: 5, assign: false, score: null },
  { stage: "ASSIGNED", status: "ACTIVE", count: 4, assign: true, score: 35, temperature: "COOL" },
  { stage: "CONTACTED", status: "ACTIVE", count: 4, assign: true, score: 45, temperature: "WARM" },
  { stage: "INTERESTED", status: "ACTIVE", count: 4, assign: true, score: 72, temperature: "HOT" },
  {
    stage: "FOLLOW_UP",
    status: "ACTIVE",
    count: 2,
    assign: true,
    withFollowUp: "overdue",
    score: 68,
    temperature: "HOT",
  },
  {
    stage: "FOLLOW_UP",
    status: "ACTIVE",
    count: 2,
    assign: true,
    withFollowUp: "today",
    score: 55,
    temperature: "WARM",
  },
  {
    stage: "FOLLOW_UP",
    status: "ACTIVE",
    count: 2,
    assign: true,
    withFollowUp: "upcoming",
    score: 50,
    temperature: "WARM",
  },
  { stage: "CONVERTED", status: "CONVERTED", count: 4, assign: true, score: 90, temperature: "HOT" },
  {
    stage: "LOST",
    status: "LOST",
    count: 3,
    assign: true,
    score: 20,
    temperature: "COOL",
    lostReason: "NO_RESPONSE",
  },
];

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

function startOfTodayPlusHours(h: number): Date {
  const d = new Date();
  d.setHours(10 + h, 0, 0, 0);
  return d;
}

async function main() {
  console.log(`Seeding 30 dummy leads (tag=${TAG})...`);

  const institute = await prisma.institute.findFirst();
  if (!institute) {
    throw new Error("No institute found. Run seed:users first.");
  }

  // Prefer a counsellor's home branch when seeding assigned leads for portal tests.
  const preferredCounsellor = await prisma.user.findFirst({
    where: {
      instituteId: institute.id,
      userRoles: { some: { role: { name: "COUNSELLOR" } } },
      branchId: { not: null },
    },
    orderBy: { createdAt: "asc" },
  });

  const branch =
    (preferredCounsellor?.branchId
      ? await prisma.branch.findUnique({ where: { id: preferredCounsellor.branchId } })
      : null) ||
    (await prisma.branch.findFirst({
      where: { instituteId: institute.id, code: "BLR-HSR" },
    })) ||
    (await prisma.branch.findFirst({ where: { instituteId: institute.id } }));

  if (!branch) {
    throw new Error("No branch found. Run seed:users first.");
  }

  const admin =
    (await prisma.user.findFirst({
      where: { email: "admin@aadya.in", instituteId: institute.id },
    })) ||
    (await prisma.user.findFirst({
      where: {
        instituteId: institute.id,
        userRoles: { some: { role: { name: "ADMIN" } } },
      },
    }));

  if (!admin) {
    throw new Error("No admin user found. Run seed:users first.");
  }

  const counsellor =
    (await prisma.user.findFirst({
      where: { email: "counsellor@aadya.in", instituteId: institute.id },
    })) ||
    (await prisma.user.findFirst({
      where: {
        instituteId: institute.id,
        userRoles: { some: { role: { name: "COUNSELLOR" } } },
      },
    }));

  const counsellorId = counsellor?.id ?? admin.id;
  if (!counsellor) {
    console.warn("No counsellor found — assigning to admin instead.");
  }

  // Avoid phone collisions with prior dummy runs
  const existingDummy = await prisma.lead.count({
    where: { instituteId: institute.id, tags: { has: TAG } },
  });
  const phoneBase = 9100000000 + existingDummy * 100;

  let nameIdx = 0;
  let created = 0;
  const byStage: Record<string, number> = {};

  for (const plan of STAGE_PLAN) {
    for (let i = 0; i < plan.count; i++) {
      const name = `${FIRST[nameIdx % FIRST.length]} Dummy${String(created + 1).padStart(2, "0")}`;
      nameIdx += 1;
      const phone = String(phoneBase + created + 1);
      const course = COURSES[created % COURSES.length];
      const source = SOURCES[created % SOURCES.length];
      const assigned = plan.assign ? counsellorId : null;

      let nextFollowUpAt: Date | null = null;
      if (plan.withFollowUp === "overdue") nextFollowUpAt = daysFromNow(-2);
      if (plan.withFollowUp === "today") nextFollowUpAt = startOfTodayPlusHours(2);
      if (plan.withFollowUp === "upcoming") nextFollowUpAt = daysFromNow(3);

      const lead = await prisma.lead.create({
        data: {
          instituteId: institute.id,
          branchId: branch.id,
          name,
          phoneNumber: phone,
          normalizedPhone: phone,
          email: `dummy.lead${created + 1}@example.com`,
          interestedIn: course,
          source,
          stage: plan.stage,
          status: plan.status,
          priority: plan.score && plan.score >= 70 ? "HIGH" : "MEDIUM",
          leadScore: plan.score ?? undefined,
          leadTemperature: plan.temperature ?? undefined,
          tags: [TAG, plan.stage],
          notes: `[DUMMY] Seeded for QA — stage ${plan.stage}`,
          createdById: admin.id,
          assignedCounsellorId: assigned,
          lastContactedAt:
            plan.stage === "NEW" ? null : hoursFromNow(-(24 + created)),
          nextFollowUpAt,
          convertedAt: plan.status === "CONVERTED" ? hoursFromNow(-48) : null,
          lostAt: plan.status === "LOST" ? hoursFromNow(-72) : null,
          lostReason: plan.lostReason ?? undefined,
          lostNotes: plan.status === "LOST" ? "Dummy lost lead for UI testing" : undefined,
        },
      });

      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: admin.id,
          type: "LEAD_CREATED",
          title: "Dummy lead created",
          description: `Seeded with stage ${plan.stage}`,
        },
      });

      await prisma.leadStageHistory.create({
        data: {
          leadId: lead.id,
          fromStage: null,
          toStage: plan.stage,
          changedById: admin.id,
          notes: "Dummy seed",
        },
      });

      if (assigned) {
        await prisma.leadAssignment.create({
          data: {
            leadId: lead.id,
            counsellorId: assigned,
            assignedById: admin.id,
            isCurrent: true,
            notes: "Dummy seed assignment",
          },
        });
      }

      if (plan.withFollowUp && plan.withFollowUp !== "none" && nextFollowUpAt) {
        await prisma.leadFollowUp.create({
          data: {
            leadId: lead.id,
            counsellorId: assigned || counsellorId,
            createdById: admin.id,
            type: "CALL",
            status: "PENDING",
            priority: plan.score && plan.score >= 70 ? "HIGH" : "MEDIUM",
            scheduledAt: nextFollowUpAt,
            notes: `[DUMMY] ${plan.withFollowUp} follow-up`,
          },
        });
      }

      byStage[plan.stage] = (byStage[plan.stage] || 0) + 1;
      created += 1;
    }
  }

  console.log(`✓ Created ${created} dummy leads on branch ${branch.name}`);
  console.log("  By stage:", byStage);
  console.log(`  Tag filter: tags has "${TAG}"`);
  console.log("  FOLLOW_UP leads include PENDING tasks (overdue / today / upcoming).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
