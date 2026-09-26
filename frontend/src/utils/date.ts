import { formatTime12h } from "@/utils/format";

export type OrganizationDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

/** Format a Date/ISO string for `<input type="datetime-local">` in the browser's local timezone. */
export const toDatetimeLocalValue = (date: Date | string | number): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 12-hour follow-up time slots (native datetime-local is always 24h). */
export const FOLLOW_UP_12H_TIME_OPTIONS = [
  "09:30 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "02:00 PM",
  "02:30 PM",
  "03:30 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
] as const;

export const DEFAULT_FOLLOW_UP_12H_TIME = "11:00 AM";

/** Combine `YYYY-MM-DD` + `h:mm AM/PM` into an ISO string in the local timezone. */
export const combineDateAnd12HourTime = (dateStr: string, timeStr: string): string => {
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!dateMatch || !timeMatch) return "";

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const ampm = timeMatch[3].toUpperCase();
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 1 || hours > 12 || minutes > 59) {
    return "";
  }
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const d = new Date(year, month, day, hours, minutes, 0, 0);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
};

/** Today's date as `YYYY-MM-DD` for `<input type="date">`. */
export const toDateInputValue = (date: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Format a Date/ISO string as `hh:mm AM/PM` in the local timezone. */
export const to12HourTimeValue = (date: Date | string | number): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return DEFAULT_FOLLOW_UP_12H_TIME;
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)} ${ampm}`;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (timeString?: string): string => formatTime12h(timeString, "N/A");

/**
 * Formats a date for display using organization date format and timezone.
 * Stored timestamps remain UTC; this is display-only.
 */
export const formatOrganizationDate = (
  date: Date | string | undefined | null,
  dateFormat: OrganizationDateFormat = "DD/MM/YYYY",
  timezone = "Asia/Kolkata"
): string => {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "N/A";

  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(d);

    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    const year = parts.find((p) => p.type === "year")?.value ?? "1970";

    switch (dateFormat) {
      case "MM/DD/YYYY":
        return `${month}/${day}/${year}`;
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      case "DD/MM/YYYY":
      default:
        return `${day}/${month}/${year}`;
    }
  } catch {
    return formatDate(d.toISOString());
  }
};
