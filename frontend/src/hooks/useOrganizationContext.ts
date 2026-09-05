import { useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import {
  ADMINISTRATION_ORGANIZATION_QUERY_KEY,
  ORGANIZATION_CONTEXT_QUERY_KEY,
  organizationApi,
  type OrganizationContext,
  type UpdateOrganizationPayload,
} from "@/services/organization.api";
import { OrganizationReactContext } from "@/features/organization/organization-context";

/** Preferred hook for shell branding — uses OrganizationProvider. */
export const useOrganization = () => {
  const ctx = useContext(OrganizationReactContext);
  if (!ctx) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return ctx;
};

/** Direct TanStack query for organization context (usable outside provider if needed). */
export const useOrganizationContextQuery = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ORGANIZATION_CONTEXT_QUERY_KEY,
    queryFn: () => organizationApi.getContext(),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAdministrationOrganization = () => {
  return useQuery({
    queryKey: ADMINISTRATION_ORGANIZATION_QUERY_KEY,
    queryFn: () => organizationApi.getAdministrationOrganization(),
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateOrganizationPayload) =>
      organizationApi.updateOrganization(payload),
    onSuccess: (updated: OrganizationContext) => {
      queryClient.setQueryData(ORGANIZATION_CONTEXT_QUERY_KEY, updated);
      queryClient.setQueryData(ADMINISTRATION_ORGANIZATION_QUERY_KEY, updated);
      queryClient.invalidateQueries({ queryKey: ADMINISTRATION_ORGANIZATION_QUERY_KEY });
    },
  });
};

export type OrganizationFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  gstNumber: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  logoUrl: string;
};

export const emptyOrganizationForm: OrganizationFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  gstNumber: "",
  timezone: "",
  currency: "",
  dateFormat: "",
  logoUrl: "",
};

export const organizationContextToForm = (
  data: OrganizationContext
): OrganizationFormState => ({
  name: data.name || "",
  email: data.contact.email || "",
  phone: data.contact.phone || "",
  address: data.address.address || "",
  website: data.contact.website || "",
  city: data.address.city || "",
  state: data.address.state || "",
  country: data.address.country || "",
  postalCode: data.address.postalCode || "",
  gstNumber: data.legal.gstNumber || "",
  timezone: data.localization.timezone || "",
  currency: data.localization.currency || "",
  dateFormat: data.localization.dateFormat || "",
  logoUrl: data.branding.logoUrl || "",
});
