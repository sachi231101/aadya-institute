import { prisma } from "../../../config/database";

/** Normalize phone to last 10 digits for cross-module matching. */
export const normalizePhoneDigits = (phone: string | null | undefined): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10);
};

/**
 * When a Lead is assigned to a counsellor, mirror onto matching Enquiries
 * (same institute + phone) so admissions/targets stay aligned.
 */
export const syncEnquiryAssigneeFromLead = async (params: {
  instituteId: string;
  phoneNumber: string;
  counsellorId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any;
}) => {
  const phone = normalizePhoneDigits(params.phoneNumber);
  if (!phone) return { updated: 0 };

  const db = params.tx ?? prisma;
  const enquiries: Array<{ id: string; phone: string }> = await db.enquiry.findMany({
    where: { instituteId: params.instituteId },
    select: { id: true, phone: true },
  });

  const matchingIds = enquiries
    .filter((e) => normalizePhoneDigits(e.phone) === phone)
    .map((e) => e.id);

  if (matchingIds.length === 0) return { updated: 0 };

  const result = await db.enquiry.updateMany({
    where: { id: { in: matchingIds } },
    data: { assignedToId: params.counsellorId },
  });

  return { updated: result.count };
};

/**
 * When an Enquiry is assigned, mirror onto matching Leads
 * (same institute + phone) so Overview / counsellor desk stay aligned.
 */
export const syncLeadAssigneeFromEnquiry = async (params: {
  instituteId: string;
  phone: string;
  counsellorId: string | null;
}) => {
  const phone = normalizePhoneDigits(params.phone);
  if (!phone) return { updated: 0 };

  const leads = await prisma.lead.findMany({
    where: { instituteId: params.instituteId },
    select: { id: true, phoneNumber: true, stage: true },
  });

  const matching = leads.filter((l) => normalizePhoneDigits(l.phoneNumber) === phone);
  if (matching.length === 0) return { updated: 0 };

  let updated = 0;
  for (const lead of matching) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        assignedCounsellorId: params.counsellorId,
        ...(params.counsellorId && lead.stage === "NEW" ? { stage: "ASSIGNED" } : {}),
      },
    });

    if (params.counsellorId) {
      await prisma.leadAssignment.updateMany({
        where: { leadId: lead.id, isCurrent: true },
        data: { isCurrent: false, unassignedAt: new Date() },
      });
      await prisma.leadAssignment.create({
        data: {
          leadId: lead.id,
          counsellorId: params.counsellorId,
          assignedById: params.counsellorId,
          isCurrent: true,
          notes: "Synced from Enquiry assignment",
        },
      });
    } else {
      await prisma.leadAssignment.updateMany({
        where: { leadId: lead.id, isCurrent: true },
        data: { isCurrent: false, unassignedAt: new Date() },
      });
    }
    updated += 1;
  }

  return { updated };
};
