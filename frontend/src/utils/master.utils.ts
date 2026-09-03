import type { MasterDropdownOption } from "@/hooks/useMasterDropdown";

/** Convert `09:00` / `9:00 AM` → display `9:00 AM`. */
export const formatTimeToAmPm = (time: string | null | undefined): string => {
  if (!time?.trim()) return "";
  const raw = time.trim();

  const ampmMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    const h = Number(ampmMatch[1]);
    const min = ampmMatch[2];
    const ap = ampmMatch[3].toUpperCase();
    return `${h}:${min} ${ap}`;
  }

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!hhmm) return raw;

  let h = Number(hhmm[1]);
  const min = hhmm[2];
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ap}`;
};

/** Convert display/AM-PM times back to `HH:mm` for `<input type="time">`. */
export const parseAmPmToTimeInput = (time: string | null | undefined): string => {
  if (!time?.trim()) return "";
  const raw = time.trim();

  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";

  let h = Number(match[1]);
  const m = match[2];
  const ap = match[3].toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
};

/** Build timeslot label: `9:00 AM - 10:00 AM`. */
export const buildTimeslotName = (
  startTime?: string | null,
  endTime?: string | null
): string => {
  const start = formatTimeToAmPm(startTime || "");
  const end = formatTimeToAmPm(endTime || "");
  if (!start || !end) return "";
  return `${start} - ${end}`;
};

/** Get display label for a master record ID from dropdown options. */
export const getMasterLabel = (
  options: MasterDropdownOption[],
  masterId: string | null | undefined
): string => {
  if (!masterId) return "";
  const match = options.find((o) => o.value === masterId);
  return match?.label ?? "";
};

/** Display label for select options (timeslots show start–end range). */
export const formatMasterOptionLabel = (
  entityType: string,
  option: MasterDropdownOption
): string => {
  if (entityType.toLowerCase() !== "timeslot") return option.label;
  const fromData = buildTimeslotName(
    typeof option.data?.startTime === "string" ? option.data.startTime : undefined,
    typeof option.data?.endTime === "string" ? option.data.endTime : undefined
  );
  return fromData || option.label;
};

/** Resolve start/end times from a timeslot master option. */
export const getTimeslotTimes = (
  options: MasterDropdownOption[],
  masterId: string | null | undefined
): { startTime?: string; endTime?: string; label: string } => {
  if (!masterId) return { label: "" };
  const match = options.find((o) => o.value === masterId);
  if (!match) return { label: "" };
  const startRaw =
    typeof match.data?.startTime === "string" ? match.data.startTime : undefined;
  const endRaw =
    typeof match.data?.endTime === "string" ? match.data.endTime : undefined;
  const startTime = startRaw ? formatTimeToAmPm(startRaw) : undefined;
  const endTime = endRaw ? formatTimeToAmPm(endRaw) : undefined;
  return {
    startTime,
    endTime,
    label: buildTimeslotName(startRaw, endRaw) || match.label,
  };
};

/** Get master code for a record ID. */
export const getMasterCode = (
  options: MasterDropdownOption[],
  masterId: string | null | undefined
): string => {
  if (!masterId) return "";
  const match = options.find((o) => o.value === masterId);
  return match?.code ?? "";
};

/** Find master ID by legacy label/name (for edit forms loading existing data). */
export const findMasterIdByLabel = (
  options: MasterDropdownOption[],
  label: string | null | undefined
): string => {
  if (!label) return "";
  const match = options.find(
    (o) => o.label === label || o.code === label || o.value === label
  );
  return match?.value ?? "";
};

/** Find master ID by code (for enum migration). */
export const findMasterIdByCode = (
  options: MasterDropdownOption[],
  code: string | null | undefined
): string => {
  if (!code) return "";
  const match = options.find((o) => o.code === code);
  return match?.value ?? "";
};

export interface MasterSelectChangePayload {
  masterId: string;
  label: string;
  code?: string | null;
}

/** Parse a master select change event into ID + denormalized label. */
export const parseMasterSelectChange = (
  options: MasterDropdownOption[],
  masterId: string
): MasterSelectChangePayload => {
  const match = options.find((o) => o.value === masterId);
  return {
    masterId,
    label: match?.label ?? masterId,
    code: match?.code,
  };
};
