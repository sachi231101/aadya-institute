import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  INTEGRATIONS_QUERY_KEY,
  integrationsApi,
  type IntegrationType,
  type UpsertIntegrationPayload,
} from "@/services/integrations.api";

export const useIntegrationsCatalog = () =>
  useQuery({
    queryKey: INTEGRATIONS_QUERY_KEY,
    queryFn: () => integrationsApi.list(),
  });

export const useIntegrationDetail = (type: IntegrationType | undefined) =>
  useQuery({
    queryKey: [...INTEGRATIONS_QUERY_KEY, type],
    queryFn: () => integrationsApi.get(type!),
    enabled: Boolean(type),
  });

export const useUpsertIntegration = (type: IntegrationType) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertIntegrationPayload) =>
      integrationsApi.upsert(type, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATIONS_QUERY_KEY });
    },
  });
};

export const useTestIntegration = (type: IntegrationType) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsApi.test(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATIONS_QUERY_KEY });
    },
  });
};

export const useDisconnectIntegration = (type: IntegrationType) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsApi.disconnect(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATIONS_QUERY_KEY });
    },
  });
};

export const useConnectGoogle = () =>
  useMutation({
    mutationFn: () => integrationsApi.connectGoogle(),
    onSuccess: (data) => {
      const url = data?.url || data?.authUrl || data?.connectUrl;
      if (url) window.location.href = url;
    },
  });

export const useDisconnectGoogle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsApi.disconnectGoogle(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATIONS_QUERY_KEY });
    },
  });
};
