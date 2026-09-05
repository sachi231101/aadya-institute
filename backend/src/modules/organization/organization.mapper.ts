import type {
  InstituteContextSource,
  OrganizationContextDto,
  OrganizationDateFormat,
} from "./organization.types";

const DATE_FORMATS: OrganizationDateFormat[] = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

const normalizeDateFormat = (value?: string | null): OrganizationDateFormat => {
  if (value && DATE_FORMATS.includes(value as OrganizationDateFormat)) {
    return value as OrganizationDateFormat;
  }
  return "DD/MM/YYYY";
};

/**
 * Maps an Institute row to a safe, nested organization context DTO.
 * Never includes secrets, credentials, or internal status fields.
 */
export const toOrganizationContext = (
  institute: InstituteContextSource
): OrganizationContextDto => ({
  id: institute.id,
  name: institute.name,
  branding: {
    logoUrl: institute.logoUrl ?? null,
  },
  contact: {
    email: institute.email ?? null,
    phone: institute.phone ?? null,
    website: institute.website ?? null,
  },
  address: {
    address: institute.address ?? null,
    city: institute.city ?? null,
    state: institute.state ?? null,
    country: institute.country ?? null,
    postalCode: institute.postalCode ?? null,
  },
  localization: {
    timezone: institute.timezone || "Asia/Kolkata",
    currency: (institute.currency || "INR").toUpperCase(),
    dateFormat: normalizeDateFormat(institute.dateFormat),
  },
  legal: {
    gstNumber: institute.gstNumber ?? null,
  },
});
