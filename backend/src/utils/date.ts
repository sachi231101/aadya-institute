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
