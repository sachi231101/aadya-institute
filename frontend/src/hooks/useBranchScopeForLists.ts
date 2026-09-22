import { useCallback, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/hooks/useBranches";
import { isBranchLockedUser } from "@/utils/branch-scope.util";

type BranchOption = { id: string; name: string };

/**
 * Branch filter scope for shared student list pages.
 * Center Manager / Counsellor: hide "All branches", always send a concrete branchId.
 * Admin: may use "ALL" (omit branchId on queries).
 */
export function useBranchScopeForLists() {
  const user = useAuthStore((s) => s.user);
  const isBranchLocked = isBranchLockedUser(user);
  const { selectedBranchId: storedBranchId, setSelectedBranchId: setStored } =
    useBranchStore();
  const { data: branchesResponse, isLoading: branchesLoading } = useBranches({
    limit: 100,
  });
  const branches = (branchesResponse?.data ?? []) as BranchOption[];

  const preferredLockedBranchId = useMemo(() => {
    if (!branches.length) return undefined;
    if (user?.branchId && branches.some((b) => b.id === user.branchId)) {
      return user.branchId;
    }
    return branches[0]?.id;
  }, [branches, user?.branchId]);

  useEffect(() => {
    if (branches.length === 0) return;

    if (isBranchLocked) {
      if (
        storedBranchId === "ALL" ||
        !branches.some((b) => b.id === storedBranchId)
      ) {
        if (preferredLockedBranchId) {
          setStored(preferredLockedBranchId);
        }
      }
      return;
    }

    if (
      storedBranchId !== "ALL" &&
      !branches.some((b) => b.id === storedBranchId)
    ) {
      setStored("ALL");
    }
  }, [
    branches,
    isBranchLocked,
    storedBranchId,
    preferredLockedBranchId,
    setStored,
  ]);

  const selectedBranchId = useMemo(() => {
    if (isBranchLocked) {
      if (
        storedBranchId !== "ALL" &&
        branches.some((b) => b.id === storedBranchId)
      ) {
        return storedBranchId;
      }
      return preferredLockedBranchId ?? storedBranchId;
    }
    return storedBranchId;
  }, [isBranchLocked, storedBranchId, branches, preferredLockedBranchId]);

  /** Concrete branch for API queries; undefined only when admin views All. */
  const branchIdForQuery = useMemo(() => {
    if (isBranchLocked) {
      return selectedBranchId !== "ALL"
        ? selectedBranchId
        : preferredLockedBranchId;
    }
    return selectedBranchId !== "ALL" ? selectedBranchId : undefined;
  }, [isBranchLocked, selectedBranchId, preferredLockedBranchId]);

  const setSelectedBranchId = useCallback(
    (id: string) => {
      if (isBranchLocked && (id === "ALL" || !branches.some((b) => b.id === id))) {
        return;
      }
      setStored(id);
    },
    [isBranchLocked, branches, setStored]
  );

  return {
    branches,
    branchesLoading,
    isBranchLocked,
    /** Admin (and other non-locked roles) may select All branches. */
    allowAllBranches: !isBranchLocked,
    /** Hide selector when only one allowed branch. */
    showBranchSelector: branches.length > 1,
    selectedBranchId,
    branchIdForQuery,
    setSelectedBranchId,
  };
}
