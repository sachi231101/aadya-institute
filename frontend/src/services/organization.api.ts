import { api } from "./api";

export type OrganizationDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export interface OrganizationContext {
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

export interface UpdateOrganizationPayload {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  gstNumber?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: OrganizationDateFormat | "";
  logoUrl?: string;
}

export const ORGANIZATION_CONTEXT_QUERY_KEY = ["organization", "context"] as const;
export const ADMINISTRATION_ORGANIZATION_QUERY_KEY = ["administration", "organization"] as const;

export const organizationApi = {
  getContext: async (): Promise<OrganizationContext> => {
    const res = await api.get("/organization/context");
    return res.data.data;
  },

  getAdministrationOrganization: async (): Promise<OrganizationContext> => {
    const res = await api.get("/administration/organization");
    return res.data.data;
  },

  updateOrganization: async (
    payload: UpdateOrganizationPayload
  ): Promise<OrganizationContext> => {
    const res = await api.patch("/administration/organization", payload);
    return res.data.data;
  },
};
