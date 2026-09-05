import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ChatSocketProvider } from "@/components/chat/ChatSocketProvider";
import { OrganizationProvider } from "@/features/organization/OrganizationProvider";
import { useAuthStore } from "@/store/auth.store";
import { authApi } from "@/services/auth.api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const SessionValidator: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!token) return;

    authApi
      .getCurrentUser()
      .then((freshUser) => {
        if (freshUser) {
          updateUser(freshUser);
        }
      })
      .catch((err) => {
        // If user no longer exists (e.g. after DB re-seeding)
        if (err.response?.status === 404 || err.response?.status === 401) {
          console.warn("[Auth] Stale session detected, logging out...");
          logout();
          localStorage.removeItem("aadya-admin-branch-selection");
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      });
  }, [token, updateUser, logout]);

  return null;
};

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SessionValidator />
        <OrganizationProvider>
          <ChatSocketProvider />
          {children}
        </OrganizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
