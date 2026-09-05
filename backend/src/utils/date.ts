import { format, parseISO, startOfDay, endOfDay } from "date-fns";

export const toISOString = (date: Date): string => date.toISOString();

export const formatDate = (date: Date | string, fmt = "dd MMM yyyy"): string => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt);
};

export const getDayRange = (date: Date) => ({
  start: startOfDay(date),
  end: endOfDay(date),
});

export type OrganizationDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

/**
 * Formats a UTC/ISO timestamp for display using organization date format.
 * Does not mutate stored timestamps — display only.
 */
export const formatOrganizationDate = (
  date: Date | string,
  dateFormat: OrganizationDateFormat = "DD/MM/YYYY",
  _timezone = "Asia/Kolkata"
): string => {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (Number.isNaN(d.getTime())) return "N/A";

  const map: Record<OrganizationDateFormat, string> = {
    "DD/MM/YYYY": "dd/MM/yyyy",
    "MM/DD/YYYY": "MM/dd/yyyy",
    "YYYY-MM-DD": "yyyy-MM-dd",
  };
  return format(d, map[dateFormat] ?? "dd/MM/yyyy");
};

export const formatCurrencyAmount = (
  amount: number,
  currency = "INR",
  locale = "en-IN"
): string =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
