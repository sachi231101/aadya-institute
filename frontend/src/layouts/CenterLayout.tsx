import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Bell, Building2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CenterSidebar } from "@/components/layout/center-sidebar";
import { useAuthStore } from "@/store/auth.store";

import { NotificationPopover } from "../components/notifications/NotificationPopover";

export const CenterLayout: React.FC = () => {
  const { token, user } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  if (!userRoles.includes("CENTER_MANAGER") && !userRoles.includes("ADMIN")) {
    if (userRoles.includes("COUNSELLOR")) {
      return <Navigate to="/counselor/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <CenterSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-bg-secondary px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2" />
              <div className="flex items-center gap-2 text-muted-foreground hidden sm:flex">
                <Building2 size={18} />
                <span className="text-sm font-medium">Center Portal — Bengaluru Central Branch</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NotificationPopover />
            </div>

          </header>
          
          <main className="flex-1 overflow-auto bg-bg-primary">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
