import React, { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import {
  ORGANIZATION_CONTEXT_QUERY_KEY,
  organizationApi,
  type OrganizationContext,
} from "@/services/organization.api";
import {
  OrganizationReactContext,
  type OrganizationContextValue,
} from "./organization-context";

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ORGANIZATION_CONTEXT_QUERY_KEY,
    queryFn: () => organizationApi.getContext(),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const refreshOrganization = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ORGANIZATION_CONTEXT_QUERY_KEY });
  }, [queryClient]);

  const updateOrganizationContext = useCallback(
    (updated: OrganizationContext) => {
      queryClient.setQueryData(ORGANIZATION_CONTEXT_QUERY_KEY, updated);
    },
    [queryClient]
  );

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organization: query.data ?? null,
      loading: query.isLoading,
      error:
        query.error instanceof Error
          ? query.error
          : query.error
            ? new Error("Failed to load organization")
            : null,
      refreshOrganization,
      updateOrganizationContext,
    }),
    [
      query.data,
      query.isLoading,
      query.error,
      refreshOrganization,
      updateOrganizationContext,
    ]
  );

  return (
    <OrganizationReactContext.Provider value={value}>
      {children}
    </OrganizationReactContext.Provider>
  );
};
