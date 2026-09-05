import { createContext } from "react";
import type { OrganizationContext } from "@/services/organization.api";

export interface OrganizationContextValue {
  organization: OrganizationContext | null;
  loading: boolean;
  error: Error | null;
  refreshOrganization: () => Promise<void>;
  updateOrganizationContext: (updated: OrganizationContext) => void;
}

export const OrganizationReactContext =
  createContext<OrganizationContextValue | null>(null);
