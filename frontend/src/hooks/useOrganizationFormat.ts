import { useCallback, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganizationContext";
import { formatCurrency } from "@/utils/format";
import {
  formatOrganizationDate,
  type OrganizationDateFormat,
} from "@/utils/date";

export const useFormatCurrency = () => {
  const { organization } = useOrganization();
  const currency = organization?.localization.currency || "INR";

  return useCallback(
    (amount: number) => formatCurrency(amount, currency),
    [currency]
  );
};

export const useOrganizationDate = () => {
  const { organization } = useOrganization();
  const dateFormat =
    (organization?.localization.dateFormat as OrganizationDateFormat) ||
    "DD/MM/YYYY";
  const timezone = organization?.localization.timezone || "Asia/Kolkata";

  return useMemo(
    () => ({
      dateFormat,
      timezone,
      format: (date: Date | string | undefined | null) =>
        formatOrganizationDate(date, dateFormat, timezone),
    }),
    [dateFormat, timezone]
  );
};
