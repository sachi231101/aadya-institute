import { useMemo } from "react";
import { useActiveMasterRecords } from "./useMasters";

export interface MasterDropdownOption {
  value: string;
  label: string;
  code?: string | null;
  description?: string | null;
  data?: Record<string, any> | null;
}

// Standard sensible defaults for common entity types when custom master records haven't been seeded yet
const DEFAULT_MASTER_OPTIONS: Record<string, MasterDropdownOption[]> = {
  leadsource: [
    { value: "Website", label: "Website" },
    { value: "WhatsApp Enquiry", label: "WhatsApp Enquiry" },
    { value: "Walk-in", label: "Walk-in" },
    { value: "Referral", label: "Referral" },
    { value: "Social Media", label: "Social Media" },
    { value: "Google Ads", label: "Google Ads" },
    { value: "Direct Call", label: "Direct Call" },
  ],
  designation: [
    { value: "Senior Faculty", label: "Senior Faculty" },
    { value: "Assistant Professor", label: "Assistant Professor" },
    { value: "Technical Instructor", label: "Technical Instructor" },
    { value: "Lab Instructor", label: "Lab Instructor" },
    { value: "Department Head", label: "Department Head" },
    { value: "Guest Lecturer", label: "Guest Lecturer" },
  ],
  paymentmodes: [
    { value: "UPI", label: "UPI / QR Code" },
    { value: "Net Banking", label: "Net Banking (NEFT/RTGS)" },
    { value: "Card", label: "Credit / Debit Card" },
    { value: "Cash", label: "Cash" },
    { value: "Cheque", label: "Cheque" },
  ],
  bankaccounts: [
    { value: "HDFC-01", label: "HDFC Bank - Current A/C (Aadya Inst)" },
    { value: "ICICI-01", label: "ICICI Bank - Operations A/C" },
    { value: "SBI-01", label: "State Bank of India - Main A/C" },
  ],
  concessionheads: [
    { value: "Early Bird", label: "Early Bird Discount (10%)" },
    { value: "Merit", label: "Merit Scholarship (15%)" },
    { value: "Referral", label: "Sibling / Alumni Referral" },
  ],
  classroom: [
    { value: "Room-101", label: "Room 101 - Lecture Hall" },
    { value: "Lab-01", label: "Lab 1 - Full Stack & React Lab" },
    { value: "Lab-02", label: "Lab 2 - Data Science & AI Lab" },
    { value: "Seminar-A", label: "Seminar Hall A" },
  ],
  area: [
    { value: "Koramangala", label: "Koramangala" },
    { value: "Indiranagar", label: "Indiranagar" },
    { value: "HSR Layout", label: "HSR Layout" },
    { value: "Whitefield", label: "Whitefield" },
    { value: "Jayanagar", label: "Jayanagar" },
  ],
  education: [
    { value: "B.Tech / B.E", label: "B.Tech / B.E (Computer Science / IT)" },
    { value: "BCA / MCA", label: "BCA / MCA" },
    { value: "B.Sc", label: "B.Sc (IT / Statistics / Physics)" },
    { value: "Diploma", label: "Diploma in Engineering" },
    { value: "High School", label: "High School (10+2)" },
  ],
};

/**
 * Reusable hook for fetching master data as dropdown options.
 * 
 * Usage:
 * ```tsx
 * const { options, isLoading } = useMasterDropdown("area");
 * // options: [{ value: "cuid123", label: "Vidyanagar", code: "VNG", ... }]
 * ```
 * 
 * Can be used in any form/component that needs master data for select/dropdown fields.
 * Returns custom ACTIVE records when available, or built-in standard defaults.
 */
export const useMasterDropdown = (
  entityType: string | undefined,
  branchId?: string
): {
  options: MasterDropdownOption[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} => {
  const { data, isLoading, isError, error } = useActiveMasterRecords(entityType, branchId);

  const options = useMemo(() => {
    if (data?.data && data.data.length > 0) {
      return data.data.map((item) => ({
        value: item.id,
        label: item.name,
        code: item.code,
        description: item.description,
        data: item.data,
      }));
    }
    // Fallback to built-in standard defaults if no custom master records exist yet
    if (entityType && DEFAULT_MASTER_OPTIONS[entityType.toLowerCase()]) {
      return DEFAULT_MASTER_OPTIONS[entityType.toLowerCase()];
    }
    return [];
  }, [data, entityType]);

  return {
    options,
    isLoading,
    isError,
    error: error as Error | null,
  };
};
