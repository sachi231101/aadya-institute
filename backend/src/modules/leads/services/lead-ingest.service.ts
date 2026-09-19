import { prisma } from "../../../config/database";
import { isValidIndianPhone, normalizePhone } from "../../../utils/phone";
import { normalizePhoneDigits } from "./lead-enquiry-sync.service";

const DEFAULT_INTERESTED_IN = "General enquiry";

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
    interestedIn?: string;
    branchId: string;
    source?: string;
  };
};

export type IngestLeadRowResult = {
  created: boolean;
  dialQueued: boolean;
  leadId: string;
  /** Always false — counsellor assign happens post-call when score ≥ threshold. */
  autoAssigned?: boolean;
  skippedReason?: string;
};

/**
 * Shared lead ingest for Data Management CSV/Excel and AI Calling imports.
 * - instituteId only from caller (JWT)
 * - phone stored as E.164 (+91…) for Sarvam dial
 * - duplicate ACTIVE lead by (instituteId, normalizedPhone) → skip create; may re-dial
 * - create → enqueue startInitialAiCall (no counsellor assign at ingest)
 * - auto-assign runs after AI call when leadScore ≥ institute threshold
 */
export async function ingestLeadRow(
  input: IngestLeadRowInput
): Promise<IngestLeadRowResult> {
  const { instituteId, createdById, importJobId, defaultSource, row } = input;
  const rawPhone = row.phoneNumber.trim();
  if (!isValidIndianPhone(rawPhone)) {
    throw new Error(
      `Invalid phone number: ${rawPhone || "(empty)"} — use a 10-digit Indian mobile (e.g. 9876543210)`
    );
  }
  const phoneNumber = normalizePhone(rawPhone);
  const normalizedPhone = normalizePhoneDigits(phoneNumber);

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
    // Duplicate ACTIVE lead: do not create again. Still try to dial if prior
    // attempts were only FAILED / stale in-flight (enqueueInitialLeadCall expires those).
    const { startInitialAiCall } = await import("./lead-ai-call.service");
    const dial = await startInitialAiCall({
      id: existing.id,
      phoneNumber: existing.phoneNumber,
      createdById: existing.createdById,
      instituteId: existing.instituteId,
      branchId: existing.branchId,
      importJobId: importJobId ?? existing.importJobId,
    });

    return {
      created: false,
      dialQueued: Boolean(dial.queued),
      leadId: existing.id,
      autoAssigned: false,
      skippedReason: dial.queued
        ? undefined
        : dial.skipped || "duplicate_active_lead",
    };
  }

  const source =
    row.source?.trim() || defaultSource?.trim() || "WALK_IN";
  const interestedIn =
    row.interestedIn?.trim() || DEFAULT_INTERESTED_IN;

  const lead = await prisma.lead.create({
    data: {
      instituteId,
      branchId: row.branchId,
      importJobId: importJobId ?? null,
      name: row.name.trim(),
      phoneNumber,
      normalizedPhone,
      email: row.email?.trim() || null,
      interestedIn,
      source,
      createdById,
    },
  });

  // Order: create → dial only (assign deferred until post-call score threshold)
  const { startInitialAiCall } = await import("./lead-ai-call.service");
  const dial = await startInitialAiCall({
    id: lead.id,
    phoneNumber: lead.phoneNumber,
    createdById: lead.createdById,
    instituteId: lead.instituteId,
    branchId: lead.branchId,
    importJobId: lead.importJobId,
  });

  return {
    created: true,
    dialQueued: Boolean(dial.queued),
    leadId: lead.id,
    autoAssigned: false,
    skippedReason: dial.queued ? undefined : dial.skipped,
  };
}
