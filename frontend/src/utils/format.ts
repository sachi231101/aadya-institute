export const formatCurrency = (
  amount: number,
  currency = "INR",
  locale = "en-IN"
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
};

/** Minutes → "7h 25m" / "45m" / "0m". */
export const formatDurationMinutes = (minutes: number | null | undefined): string => {
  const total = Math.max(0, Math.round(minutes ?? 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/**
 * Display-only 12-hour time: `h:mm AM/PM` (e.g. `9:05 AM`).
 * Accepts `HH:mm`, `HH:mm:ss`, `h:mm AM/PM`, ISO datetimes (local timezone) or Date.
 * Returns `fallback` for empty/invalid input; unrecognised strings are returned as-is.
 */
export const formatTime12h = (
  value: string | Date | null | undefined,
  fallback = "—"
): string => {
  if (value == null) return fallback;

  let hours: number;
  let minutes: number;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback;
    hours = value.getHours();
    minutes = value.getMinutes();
  } else {
    const raw = value.trim();
    if (!raw) return fallback;

    const ampm = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (ampm) return `${Number(ampm[1])}:${ampm[2]} ${ampm[3].toUpperCase()}`;

    const hhmm = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
    if (hhmm) {
      hours = Number(hhmm[1]);
      minutes = Number(hhmm[2]);
    } else {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return raw;
      hours = d.getHours();
      minutes = d.getMinutes();
    }
  }

  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
};

/** `9:00 AM – 10:00 AM`; falls back to whichever end is present. */
export const formatTimeRange12h = (
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  fallback = "—"
): string => {
  const s = formatTime12h(start, "");
  const e = formatTime12h(end, "");
  if (s && e) return `${s} – ${e}`;
  return s || e || fallback;
};

export const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
