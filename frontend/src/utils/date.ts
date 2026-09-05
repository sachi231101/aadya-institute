export type OrganizationDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (timeString?: string): string => {
  if (!timeString) return "N/A";
  return timeString;
};

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
