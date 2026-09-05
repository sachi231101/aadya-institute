import type { OrganizationContextDto } from "../modules/organization/organization.types";

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
  /** When mode is branch, the branch name used for location context. */
  branchName: string | null;
  /**
   * Historical financial/legal documents should snapshot this payload at
   * generation time. Do not re-resolve against live org settings for past receipts.
   */
}

/**
 * Resolves display info for documents/receipts.
 * - organization mode: org branding + org address/contact
 * - branch mode: org branding/legal + branch address/phone/email when present
 */
export const resolveDisplayOrganizationInfo = (params: {
  organization: OrganizationContextDto;
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
    timezone: useBranch && branch?.timezone
      ? branch.timezone
      : organization.localization.timezone,
    email: useBranch && branch?.email ? branch.email : organization.contact.email,
    phone: useBranch && branch?.phone ? branch.phone : organization.contact.phone,
    address: useBranch && branch?.address ? branch.address : organization.address.address,
    city: useBranch ? null : organization.address.city,
    state: useBranch ? null : organization.address.state,
    country: useBranch ? null : organization.address.country,
    postalCode: useBranch ? null : organization.address.postalCode,
    branchName: useBranch ? branch?.name ?? null : null,
  };
};
