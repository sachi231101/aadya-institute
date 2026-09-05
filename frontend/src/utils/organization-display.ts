import type { OrganizationContext } from "@/services/organization.api";

export type DisplayOrganizationMode = "organization" | "branch";

export interface BranchDisplaySource {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string | null;
}

export interface DisplayOrganizationInfo {
  name: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  timezone: string;
  currency: string;
  dateFormat: string;
  gstNumber: string | null;
  branchName: string | null;
}

/**
 * Resolves display info for documents/receipts.
 * Historical financial documents should snapshot this at generation time.
 */
export const resolveDisplayOrganizationInfo = (params: {
  organization: OrganizationContext;
  branch?: BranchDisplaySource | null;
  mode?: DisplayOrganizationMode;
}): DisplayOrganizationInfo => {
  const { organization, branch = null, mode = "organization" } = params;
  const useBranch = mode === "branch" && branch;

  return {
    name: organization.name,
    logoUrl: organization.branding.logoUrl,
    website: organization.contact.website,
    gstNumber: organization.legal.gstNumber,
    currency: organization.localization.currency,
    dateFormat: organization.localization.dateFormat,
    timezone:
      useBranch && branch?.timezone
        ? branch.timezone
        : organization.localization.timezone,
    email: useBranch && branch?.email ? branch.email : organization.contact.email,
    phone: useBranch && branch?.phone ? branch.phone : organization.contact.phone,
    address:
      useBranch && branch?.address ? branch.address : organization.address.address,
    city: useBranch ? null : organization.address.city,
    state: useBranch ? null : organization.address.state,
    country: useBranch ? null : organization.address.country,
    postalCode: useBranch ? null : organization.address.postalCode,
    branchName: useBranch ? branch?.name ?? null : null,
  };
};

export const DEFAULT_ORG_LOGO = "/aadya-logo.png";
export const DEFAULT_ORG_NAME = "Aadya Portal";
