import { prisma } from "../../../config/database";
import { normalizePhoneDigits } from "./lead-enquiry-sync.service";

export type IngestLeadRowInput = {
  instituteId: string;
  createdById: string;
  importJobId?: string | null;
  /** Default source when row.source is empty (e.g. AI_CALLING from AI Calling page). */
  defaultSource?: string;
  row: {
    name: string;
    phoneNumber: string;
    email?: string;
    interestedIn: string;
    branchId: string;
    source?: string;
  };
};

export type IngestLeadRowResult = {
  created: boolean;
  dialQueued: boolean;
  leadId: string;
  skippedReason?: string;
};

/**
 * Shared lead ingest for Data Management CSV and AI Calling imports.
 * - instituteId only from caller (JWT)
 * - duplicate ACTIVE lead by (instituteId, normalizedPhone) → skip create
 * - enqueue startInitialAiCall after create (never dial inline)
 */
export async function ingestLeadRow(
  input: IngestLeadRowInput
): Promise<IngestLeadRowResult> {
  const { instituteId, createdById, importJobId, defaultSource, row } = input;
  const phoneNumber = row.phoneNumber.trim();
  const normalizedPhone = normalizePhoneDigits(phoneNumber);

  if (!normalizedPhone) {
    throw new Error("Invalid phone number");
  }

  const existing = await prisma.lead.findFirst({
    where: {
      instituteId,
      status: "ACTIVE",
      OR: [
        { normalizedPhone },
        { phoneNumber },
      ],
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
    // Duplicate ACTIVE lead: never create again; do not auto-dial from import
    // (manual POST /leads/:id/ai-call can retry). Prevents CSV re-import spam.
    return {
      created: false,
      dialQueued: false,
      leadId: existing.id,
      skippedReason: "duplicate_active_lead",
    };
  }

  const source =
    row.source?.trim() || defaultSource?.trim() || "WALK_IN";

  const lead = await prisma.lead.create({
    data: {
      instituteId,
      branchId: row.branchId,
      importJobId: importJobId ?? null,
      name: row.name.trim(),
      phoneNumber,
      normalizedPhone,
      email: row.email?.trim() || null,
      interestedIn: row.interestedIn.trim(),
      source,
      createdById,
    },
  });

  const { startInitialAiCall } = await import("./lead-ai-call.service");
  await startInitialAiCall({
    id: lead.id,
    phoneNumber: lead.phoneNumber,
    createdById: lead.createdById,
    instituteId: lead.instituteId,
    branchId: lead.branchId,
    importJobId: lead.importJobId,
  });

  return {
    created: true,
    dialQueued: true,
    leadId: lead.id,
  };
}
