import type { TargetStatus } from "@prisma/client";

/** Institute operating timezone (Aadya). */
const TZ_OFFSET = "+05:30";

function toDateOnly(input: string | Date): string {
  if (typeof input === "string") {
    return input.slice(0, 10);
  }
  // Prefer calendar day in IST rather than UTC shift
  return input.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Start of calendar day in Asia/Kolkata. */
export function toDayStart(input: string | Date): Date {
  return new Date(`${toDateOnly(input)}T00:00:00.000${TZ_OFFSET}`);
}

/** End of calendar day in Asia/Kolkata (inclusive). */
export function toDayEnd(input: string | Date): Date {
  return new Date(`${toDateOnly(input)}T23:59:59.999${TZ_OFFSET}`);
}

/**
 * Initial lifecycle status from the target date window.
 * - before start → UPCOMING
 * - within window → ACTIVE
 * - after end → COMPLETED
 */
export function resolveTargetLifecycleStatus(
  startDate: Date,
  endDate: Date,
  now: Date = new Date()
): TargetStatus {
  if (now < startDate) return "UPCOMING";
  if (now > endDate) return "COMPLETED";
  return "ACTIVE";
}
