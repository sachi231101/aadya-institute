/**
 * Seeds all Tier 1 master records for Aadya Institute.
 * Run: npx ts-node src/scripts/seed-masters.ts
 */
import { prisma } from "../config/database";

interface MasterSeed {
  entityType: string;
  name: string;
  code: string;
  data?: Record<string, unknown>;
  sortOrder?: number;
}

const TIER1_MASTERS: MasterSeed[] = [
  // Classrooms
  { entityType: "classroom", name: "Lab 101 (Frontend Studio)", code: "LAB-101", data: { capacity: 35, type: "Lab" }, sortOrder: 1 },
  { entityType: "classroom", name: "Lab 102 (Backend & AI Lab)", code: "LAB-102", data: { capacity: 30, type: "Lab" }, sortOrder: 2 },
  { entityType: "classroom", name: "Room 101 - Lecture Hall", code: "ROOM-101", data: { capacity: 50, type: "Lecture" }, sortOrder: 3 },
  { entityType: "classroom", name: "Seminar Hall A", code: "SEMINAR-A", data: { capacity: 80, type: "Seminar" }, sortOrder: 4 },

  // Areas
  { entityType: "area", name: "Koramangala", code: "KORA", data: { city: "Bengaluru" }, sortOrder: 1 },
  { entityType: "area", name: "HSR Layout", code: "HSR", data: { city: "Bengaluru" }, sortOrder: 2 },
  { entityType: "area", name: "Indiranagar", code: "INDIRA", data: { city: "Bengaluru" }, sortOrder: 3 },
  { entityType: "area", name: "Whitefield", code: "WHITEFIELD", data: { city: "Bengaluru" }, sortOrder: 4 },

  // Designations
  { entityType: "designation", name: "Senior Faculty", code: "SR_FACULTY", sortOrder: 1 },
  { entityType: "designation", name: "Assistant Professor", code: "ASST_PROF", sortOrder: 2 },
  { entityType: "designation", name: "Technical Instructor", code: "TECH_INSTR", sortOrder: 3 },
  { entityType: "designation", name: "Lab Instructor", code: "LAB_INSTR", sortOrder: 4 },
  { entityType: "designation", name: "Department Head", code: "DEPT_HEAD", sortOrder: 5 },

  // Education
  { entityType: "education", name: "B.Tech / B.E (Computer Science / IT)", code: "BTECH", sortOrder: 1 },
  { entityType: "education", name: "BCA / MCA", code: "BCA_MCA", sortOrder: 2 },
  { entityType: "education", name: "B.Sc (IT / Statistics)", code: "BSC", sortOrder: 3 },
  { entityType: "education", name: "Diploma in Engineering", code: "DIPLOMA", sortOrder: 4 },
  { entityType: "education", name: "High School (10+2)", code: "HS", sortOrder: 5 },

  // Parent info
  { entityType: "parentinfo", name: "Father", code: "FATHER", sortOrder: 1 },
  { entityType: "parentinfo", name: "Mother", code: "MOTHER", sortOrder: 2 },
  { entityType: "parentinfo", name: "Guardian", code: "GUARDIAN", sortOrder: 3 },

  // Time slots
  { entityType: "timeslot", name: "Morning Slot (9:00 AM - 12:00 PM)", code: "MORNING", data: { startTime: "09:00", endTime: "12:00" }, sortOrder: 1 },
  { entityType: "timeslot", name: "Afternoon Slot (2:00 PM - 5:00 PM)", code: "AFTERNOON", data: { startTime: "14:00", endTime: "17:00" }, sortOrder: 2 },
  { entityType: "timeslot", name: "Evening Slot (6:00 PM - 9:00 PM)", code: "EVENING", data: { startTime: "18:00", endTime: "21:00" }, sortOrder: 3 },

  // Lead sources (codes align with legacy LeadSource enum)
  { entityType: "leadsource", name: "Walk-in Inquiry", code: "WALK_IN", sortOrder: 1 },
  { entityType: "leadsource", name: "WhatsApp Inquiry", code: "WHATSAPP", sortOrder: 2 },
  { entityType: "leadsource", name: "Google Search / Ads", code: "GOOGLE", sortOrder: 3 },
  { entityType: "leadsource", name: "Website", code: "ONLINE", sortOrder: 4 },
  { entityType: "leadsource", name: "Referral", code: "REFERRAL", sortOrder: 5 },
  { entityType: "leadsource", name: "Instagram", code: "INSTAGRAM", sortOrder: 6 },
  { entityType: "leadsource", name: "Facebook", code: "FACEBOOK", sortOrder: 7 },
  { entityType: "leadsource", name: "Phone Call", code: "PHONE_CALL", sortOrder: 8 },
  { entityType: "leadsource", name: "AI Calling", code: "AI_CALLING", sortOrder: 9 },
  { entityType: "leadsource", name: "Other", code: "OTHER", sortOrder: 10 },

  // Lead stages (codes align with legacy LeadStage enum)
  { entityType: "leadstage", name: "New", code: "NEW", sortOrder: 1 },
  { entityType: "leadstage", name: "Assigned", code: "ASSIGNED", sortOrder: 2 },
  { entityType: "leadstage", name: "Contacted", code: "CONTACTED", sortOrder: 3 },
  { entityType: "leadstage", name: "Interested", code: "INTERESTED", sortOrder: 4 },
  { entityType: "leadstage", name: "Follow Up", code: "FOLLOW_UP", sortOrder: 5 },
  { entityType: "leadstage", name: "Converted", code: "CONVERTED", sortOrder: 6 },
  { entityType: "leadstage", name: "Lost", code: "LOST", sortOrder: 7 },

  // Admission status
  { entityType: "admissionstatus", name: "Draft", code: "DRAFT", sortOrder: 1 },
  { entityType: "admissionstatus", name: "Provisional", code: "PROVISIONAL", sortOrder: 2 },
  { entityType: "admissionstatus", name: "Confirmed", code: "CONFIRMED", sortOrder: 3 },
  { entityType: "admissionstatus", name: "Cancelled", code: "CANCELLED", sortOrder: 4 },

  // Payment modes (codes align with PaymentMethod enum)
  { entityType: "paymentmodes", name: "UPI / QR Code", code: "UPI", sortOrder: 1 },
  { entityType: "paymentmodes", name: "Net Banking (NEFT/RTGS)", code: "NET_BANKING", sortOrder: 2 },
  { entityType: "paymentmodes", name: "Credit / Debit Card", code: "CARD", sortOrder: 3 },
  { entityType: "paymentmodes", name: "Cash", code: "CASH", sortOrder: 4 },
  { entityType: "paymentmodes", name: "Cheque", code: "CHEQUE", sortOrder: 5 },

  // Bank accounts
  { entityType: "bankaccounts", name: "HDFC Bank - Current A/C (Aadya Inst)", code: "HDFC-01", sortOrder: 1 },
  { entityType: "bankaccounts", name: "ICICI Bank - Operations A/C", code: "ICICI-01", sortOrder: 2 },
  { entityType: "bankaccounts", name: "State Bank of India - Main A/C", code: "SBI-01", sortOrder: 3 },

  // Fee heads
  { entityType: "feeheads", name: "Tuition Fee", code: "TUITION", sortOrder: 1 },
  { entityType: "feeheads", name: "Exam Fee", code: "EXAM", sortOrder: 2 },
  { entityType: "feeheads", name: "Registration Fee", code: "REGISTRATION", sortOrder: 3 },
  { entityType: "feeheads", name: "Lab / Kit Fee", code: "LAB_KIT", sortOrder: 4 },
  { entityType: "feeheads", name: "Certification Fee", code: "CERTIFICATION", sortOrder: 5 },

  // Concession heads
  { entityType: "concessionheads", name: "Early Bird Discount (10%)", code: "EARLY_BIRD", data: { percentage: "10" }, sortOrder: 1 },
  { entityType: "concessionheads", name: "Merit Scholarship (15%)", code: "MERIT", data: { percentage: "15" }, sortOrder: 2 },
  { entityType: "concessionheads", name: "Sibling / Alumni Referral", code: "REFERRAL", sortOrder: 3 },

  // Exam terms
  { entityType: "examterm", name: "Mid Term", code: "MID", sortOrder: 1 },
  { entityType: "examterm", name: "Final Term", code: "FINAL", sortOrder: 2 },
  { entityType: "examterm", name: "Module Assessment", code: "MODULE", sortOrder: 3 },

  // ─── Numbering Series (auto-generation patterns) ──────────────────────────
  {
    entityType: "numberingseries",
    name: "Admission Number Series",
    code: "ADMISSION",
    data: {
      target: "ADMISSION",
      pattern: "AADYA/{YEAR}/{SEQ:4}",
      startNumber: 1,
      currentSequence: 0,
      resetFrequency: "YEARLY",
      lastResetPeriod: "",
    },
    sortOrder: 1,
  },
  {
    entityType: "numberingseries",
    name: "Student Code Series",
    code: "STUDENT",
    data: {
      target: "STUDENT",
      pattern: "AAD-{YEAR}-{SEQ:4}",
      startNumber: 1,
      currentSequence: 0,
      resetFrequency: "YEARLY",
      lastResetPeriod: "",
    },
    sortOrder: 2,
  },
  {
    entityType: "numberingseries",
    name: "Receipt Number Series",
    code: "RECEIPT",
    data: {
      target: "RECEIPT",
      pattern: "RCP/{YEAR}/{SEQ:4}",
      startNumber: 1,
      currentSequence: 0,
      resetFrequency: "YEARLY",
      lastResetPeriod: "",
    },
    sortOrder: 3,
  },
  {
    entityType: "numberingseries",
    name: "Enquiry Number Series",
    code: "ENQUIRY",
    data: {
      target: "ENQUIRY",
      pattern: "ENQ-{YEAR}-{SEQ:4}",
      startNumber: 1,
      currentSequence: 0,
      resetFrequency: "YEARLY",
      lastResetPeriod: "",
    },
    sortOrder: 4,
  },
  {
    entityType: "numberingseries",
    name: "Application Number Series",
    code: "APPLICATION",
    data: {
      target: "APPLICATION",
      pattern: "APP-{YEAR}-{SEQ:4}",
      startNumber: 1,
      currentSequence: 0,
      resetFrequency: "YEARLY",
      lastResetPeriod: "",
    },
    sortOrder: 5,
  },

];

export async function seedMastersForInstitute(
  instituteId: string,
  branchId?: string | null
): Promise<number> {
  let created = 0;
  for (const m of TIER1_MASTERS) {
    const existing = await prisma.masterRecord.findFirst({
      where: {
        instituteId,
        entityType: m.entityType,
        OR: [
          { name: m.name },
          { code: m.code },
        ],
      },
    });
    if (!existing) {
      await prisma.masterRecord.create({
        data: {
          instituteId,
          branchId: m.entityType === "classroom" ? branchId ?? null : null,
          entityType: m.entityType,
          name: m.name,
          code: m.code,
          data: (m.data ?? {}) as object,
          status: "ACTIVE",
          sortOrder: m.sortOrder ?? 0,
        },
      });
      created++;
    }
  }
  return created;
}

async function main() {
  console.log("🌱 Seeding Tier 1 master records...");
  const institute = await prisma.institute.findFirst();
  if (!institute) {
    console.error("No institute found. Run seed-initial-users first.");
    process.exit(1);
  }
  const branch = await prisma.branch.findFirst({
    where: { instituteId: institute.id },
  });
  const created = await seedMastersForInstitute(institute.id, branch?.id);
  console.log(`✓ Created ${created} master records (${TIER1_MASTERS.length} defined)`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error("❌ Master seeding failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
