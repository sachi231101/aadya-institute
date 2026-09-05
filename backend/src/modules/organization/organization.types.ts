export type OrganizationDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export interface OrganizationContextDto {
  id: string;
  name: string;
  branding: {
    logoUrl: string | null;
  };
  contact: {
    email: string | null;
    phone: string | null;
    website: string | null;
  };
  address: {
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
  };
  localization: {
    timezone: string;
    currency: string;
    dateFormat: OrganizationDateFormat;
  };
  legal: {
    gstNumber: string | null;
  };
}

/** Subset of Institute fields used for safe context mapping. */
export interface InstituteContextSource {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  gstNumber?: string | null;
  timezone?: string | null;
  currency?: string | null;
  dateFormat?: string | null;
  logoUrl?: string | null;
}
