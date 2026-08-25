import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import { authApi } from "../services/auth.api";

export const useAuth = () => {
  const { user, token, setAuth, updateUser, logout } = useAuthStore();
  return {
    user,
    token,
    isAuthenticated: !!token,
    setAuth,
    updateUser,
    logout,
  };
};

// Global broadcast channel / custom event helper for instant cross-tab & local sync
const SYNC_CHANNEL = "aadya_auth_sync";

export const notifyPermissionChange = () => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aadya_user_sync"));
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel(SYNC_CHANNEL);
        bc.postMessage({ type: "USER_SYNC", timestamp: Date.now() });
        bc.close();
      }
    }
  } catch (e) {
    // Ignore channel errors
  }
};

/**
 * Hook to automatically keep the authenticated user's profile and permissions
 * synchronized in real-time with the database (e.g. when an Admin edits permissions).
 */
export const useCurrentUserSync = () => {
  const { token, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for custom sync events (e.g. within same tab)
    const handleCustomSync = () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserSync"] });
    };

    // Listen for cross-tab broadcast messages
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel(SYNC_CHANNEL);
      bc.onmessage = (event) => {
        if (event.data?.type === "USER_SYNC") {
          queryClient.invalidateQueries({ queryKey: ["currentUserSync"] });
        }
      };
    }

    window.addEventListener("aadya_user_sync", handleCustomSync);
    window.addEventListener("focus", handleCustomSync);

    return () => {
      window.removeEventListener("aadya_user_sync", handleCustomSync);
      window.removeEventListener("focus", handleCustomSync);
      if (bc) {
        bc.close();
      }
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["currentUserSync"],
    queryFn: async () => {
      const freshUser = await authApi.getCurrentUser();
      if (freshUser) {
        updateUser(freshUser);
      }
      return freshUser;
    },
    enabled: !!token,
    refetchInterval: 2000, // Auto-sync every 2 seconds for immediate live updates
    refetchOnWindowFocus: true, // Sync immediately when returning to the tab
    staleTime: 0,
  });
};
