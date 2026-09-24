import { useMemo } from "react";
import { useMasterDropdown, type MasterDropdownOption } from "./useMasterDropdown";
import {
  buildTimetableSlotsFromMasters,
  type TimetablePeriodSlot,
} from "@/constants/timetable-slots";

/**
 * Active Time Slot masters as timetable column structure.
 * Empty masters → empty slots (UIs should show Master Setup guidance).
 */
export const useTimetableSlotColumns = (branchId?: string) => {
  const { options, isLoading, isError, error } = useMasterDropdown("timeslot", branchId);

  const slots = useMemo(
    () => buildTimetableSlotsFromMasters(options),
    [options]
  );

  // Teaching periods only — used by Classes / ClassDetails (Break/Lunch stay structural there).
  // Timetable modal/move selects use `slots` so Break/Lunch can be booked as overrides.
  const bookableSlots = useMemo(
    () => slots.filter((s) => !s.isBreak && !s.isLunch),
    [slots]
  );

  return {
    slots,
    bookableSlots,
    masters: options as MasterDropdownOption[],
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && slots.length === 0,
  };
};
