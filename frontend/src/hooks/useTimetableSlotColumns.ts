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

  // All configured master slots are bookable (no invented break/lunch).
  const bookableSlots = slots;

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
