/**
 * Append a timestamped remark to Lead.notes without replacing existing text.
 * Format: `[YYYY-MM-DD <actor>] <remark text>`
 */
export function formatLeadRemarkLine(
  remark: string,
  actor = "counsellor",
  at = new Date()
): string {
  const date = at.toISOString().slice(0, 10);
  return `[${date} ${actor}] ${remark.trim()}`;
}

/** @deprecated use formatLeadRemarkLine */
export function formatCounsellorNoteLine(remark: string, at = new Date()): string {
  return formatLeadRemarkLine(remark, "counsellor", at);
}

export function appendLeadRemarks(
  existing: string | null | undefined,
  remark: string | null | undefined,
  actor = "counsellor",
  at = new Date()
): string | undefined {
  const trimmed = remark?.trim();
  if (!trimmed) return undefined;

  const line = formatLeadRemarkLine(trimmed, actor, at);
  const existingNotes = existing?.trim() || "";
  if (existingNotes.includes(line)) {
    return existingNotes || undefined;
  }
  return existingNotes ? `${existingNotes}\n${line}` : line;
}

/** @deprecated use appendLeadRemarks */
export function appendCounsellorLeadNotes(
  existing: string | null | undefined,
  remark: string | null | undefined,
  at = new Date()
): string | undefined {
  return appendLeadRemarks(existing, remark, "counsellor", at);
}
