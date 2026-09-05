export interface CreateInstituteDto {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  gstNumber?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  logoUrl?: string;
}

export interface UpdateInstituteDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  gstNumber?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  logoUrl?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface OrganizationAuditMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}
