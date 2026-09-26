import React from "react";
import { LogIn, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";
import { formatDurationMinutes, formatTime12h } from "@/utils/format";
import type { FacultyAttendancePunch, FacultyDaySessionSummary } from "@/types/faculty.types";

interface AttendancePunchListProps {
  punches: FacultyAttendancePunch[];
  openSession?: boolean;
  className?: string;
}

/** Chronological Check In / Check Out punches for one day. */
export const AttendancePunchList: React.FC<AttendancePunchListProps> = ({
  punches,
  openSession = false,
  className,
}) => {
  if (punches.length === 0) {
    return (
      <p className={cn("text-[11px] text-muted-foreground", className)}>
        No check-in / check-out punches recorded for this day.
      </p>
    );
  }

  return (
    <ol className={cn("space-y-1", className)}>
      {punches.map((punch, idx) => {
        const isIn = punch.type === "CHECK_IN";
        const isOpen = openSession && isIn && idx === punches.length - 1;
        return (
          <li key={punch.id} className="flex items-center gap-2 text-[11px]">
            <span className="font-mono tabular-nums font-semibold text-foreground w-16 whitespace-nowrap">
              {formatTime12h(punch.timeHmm)}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold w-20",
                isIn ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
              )}
            >
              {isIn ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
              {isIn ? "Check In" : "Check Out"}
            </span>
            <Badge
              variant={punch.source === "AUTO_GEOFENCE" ? "warning" : "secondary"}
              className="px-1.5 py-0 text-[10px] font-semibold"
              title={punch.source === "AUTO_GEOFENCE" ? "Auto check-out — left work location" : "Manual punch"}
            >
              {punch.source === "AUTO_GEOFENCE" ? "Auto" : "Manual"}
            </Badge>
            {isOpen ? (
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Open session</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};

interface AttendanceDaySummaryProps {
  summary: Pick<FacultyDaySessionSummary, "firstIn" | "lastOut" | "sessionCount" | "totalMinutes" | "openSession">;
  className?: string;
}

/** First In / Last Out / Sessions / Duration strip for one day. */
export const AttendanceDaySummary: React.FC<AttendanceDaySummaryProps> = ({ summary, className }) => {
  const items: { label: string; value: string }[] = [
    { label: "First In", value: formatTime12h(summary.firstIn) },
    { label: "Last Out", value: summary.openSession ? "Checked in" : formatTime12h(summary.lastOut) },
    { label: "Sessions", value: String(summary.sessionCount) },
    { label: "Duration", value: summary.sessionCount > 0 || summary.totalMinutes > 0 ? formatDurationMinutes(summary.totalMinutes) : "—" },
  ];

  return (
    <div className={cn("grid grid-cols-4 gap-2 text-xs", className)}>
      {items.map((item) => (
        <div key={item.label}>
          <span className="text-muted-foreground block text-[10px]">{item.label}</span>
          <span className="font-mono font-semibold tabular-nums text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
};
