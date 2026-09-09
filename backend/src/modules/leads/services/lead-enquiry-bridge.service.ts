import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { isValidIndianPhone, normalizePhone } from "../../../utils/phone";
import { LeadRepository } from "../lead.repository";
import { normalizePhoneDigits } from "./lead-enquiry-sync.service";

export type EnsureLeadFromEnquiryResult = {
  lead: {
    id: string;
    phoneNumber: string;
    createdById: string;
    instituteId: string;
    branchId: string | null;
    importJobId: string | null;
  };
  created: boolean;
};

/**
 * Find or create an ACTIVE Lead for an Enquiry phone so AI calling can proceed.
 * Reuses LeadRepository.createLead (ACTIVE phone uniqueness enforced in app layer).
 * Does not enqueue dial — caller dials once via AiCallingService.enqueueLeadCall.
 */
export async function ensureLeadFromEnquiry(params: {
  enquiry: {
    id: string;
    instituteId: string;
    branchId: string | null;
    name: string;
    email: string | null;
    phone: string;
    courseId: string;
    source: string;
    counselorNotes: string | null;
    course?: { name: string } | null;
  };
  createdById: string;
}): Promise<EnsureLeadFromEnquiryResult> {
  const { enquiry, createdById } = params;
  const digits = normalizePhoneDigits(enquiry.phone);
  if (!digits || !isValidIndianPhone(enquiry.phone)) {
    throw new Error("Enquiry has no valid phone number");
  }

  const phoneNumber = normalizePhone(enquiry.phone);

  const existing = await prisma.lead.findFirst({
    where: {
      instituteId: enquiry.instituteId,
      status: "ACTIVE",
      OR: [{ normalizedPhone: digits }, { phoneNumber }],
    },
    select: {
      id: true,
      phoneNumber: true,
      createdById: true,
      instituteId: true,
      branchId: true,
      importJobId: true,
    },
  });
  if (existing) {
    return { lead: existing, created: false };
  }

  let branchId = enquiry.branchId;
  if (!branchId) {
    const defaultBranch = await prisma.branch.findFirst({
      where: { instituteId: enquiry.instituteId, status: "ACTIVE" },
    });
    if (!defaultBranch) {
      throw new Error("No active branch found for this institute");
    }
    branchId = defaultBranch.id;
  }

  const interestedIn =
    enquiry.course?.name?.trim() ||
    (
      await prisma.course.findUnique({
        where: { id: enquiry.courseId },
        select: { name: true },
      })
    )?.name ||
    "General enquiry";

  const sourceMap: Record<string, string> = {
    WEBSITE: "ONLINE",
    ONLINE: "ONLINE",
    WALK_IN: "WALK_IN",
    PHONE: "PHONE_CALL",
    PHONE_CALL: "PHONE_CALL",
    WHATSAPP: "WHATSAPP",
    REFERRAL: "REFERRAL",
    INSTAGRAM: "INSTAGRAM",
    FACEBOOK: "FACEBOOK",
    GOOGLE: "GOOGLE",
  };
  const source = sourceMap[enquiry.source?.toUpperCase?.() ?? ""] || "ONLINE";

  // Re-check immediately before create to reduce duplicate ACTIVE races
  const raceCheck = await prisma.lead.findFirst({
    where: {
      instituteId: enquiry.instituteId,
      status: "ACTIVE",
      OR: [{ normalizedPhone: digits }, { phoneNumber }],
    },
    select: {
      id: true,
      phoneNumber: true,
      createdById: true,
      instituteId: true,
      branchId: true,
      importJobId: true,
    },
  });
  if (raceCheck) {
    return { lead: raceCheck, created: false };
  }

  const lead = await LeadRepository.createLead({
    instituteId: enquiry.instituteId,
    branchId,
    name: enquiry.name.trim(),
    phoneNumber,
    email: enquiry.email ?? undefined,
    interestedIn,
    courseId: enquiry.courseId,
    source,
    stage: "NEW",
    priority: "MEDIUM",
    notes:
      enquiry.counselorNotes ||
      `Auto-created from enquiry ${enquiry.id} for AI calling`,
    createdById,
  });

  logger.info(
    { leadId: lead.id, enquiryId: enquiry.id, phoneNumber },
    "[LeadEnquiryBridge] Created ACTIVE lead from enquiry"
  );

  return {
    lead: {
      id: lead.id,
      phoneNumber: lead.phoneNumber,
      createdById: lead.createdById,
      instituteId: lead.instituteId,
      branchId: lead.branchId,
      importJobId: lead.importJobId ?? null,
    },
    created: true,
  };
}
