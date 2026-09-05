import { useQuery } from "@tanstack/react-query";
import { securityApi, type PasswordRequirements } from "@/services/security.api";
import {
  buildPasswordRequirementsSummary,
  DEFAULT_PASSWORD_POLICY,
  type PasswordPolicyFields,
} from "@/utils/password-policy";

export const PASSWORD_REQUIREMENTS_QUERY_KEY = ["security", "password-requirements"] as const;

export const usePasswordRequirements = () => {
  const query = useQuery({
    queryKey: PASSWORD_REQUIREMENTS_QUERY_KEY,
    queryFn: () => securityApi.getPasswordRequirements(),
    staleTime: 5 * 60 * 1000,
  });

  const policy: PasswordPolicyFields = {
    ...DEFAULT_PASSWORD_POLICY,
    ...(query.data ?? {}),
  };

  return {
    ...query,
    policy,
    requirements: buildPasswordRequirementsSummary(policy),
  };
};

export type { PasswordRequirements };
