import { formatDateKey } from "./batch-schedule.util";
import { istTodayKey } from "../../utils/session-window.util";

export type BatchLifecycleStatus = "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type ResolveBatchLifecycleStatusParams = {
  startDate: Date | string;
  expectedEndDate?: Date | string | null;
  /** Only CANCELLED is treated as a manual override; other values are ignored. */
  currentStatus?: string | null;
  /** Override "today" for tests (institute-local YYYY-MM-DD). */
  todayKey?: string;
};

/**
 * Date-driven batch lifecycle status.
 * CANCELLED is a manual override; otherwise status follows start / end calendar days
 * (institute-local Asia/Kolkata "today" vs UTC date keys for stored dates).
 */
export function resolveBatchLifecycleStatus(
  params: ResolveBatchLifecycleStatusParams
): BatchLifecycleStatus {
  if (String(params.currentStatus || "").toUpperCase() === "CANCELLED") {
    return "CANCELLED";
  }

  const today = params.todayKey || istTodayKey();
  const startKey = formatDateKey(params.startDate);

  if (params.expectedEndDate) {
    const endKey = formatDateKey(params.expectedEndDate);
    if (today > endKey) {
      return "COMPLETED";
    }
  }

  if (today >= startKey) {
    return "ACTIVE";
  }

  return "UPCOMING";
}
