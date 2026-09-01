import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { UserCheck } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CounselorSidebar } from "@/components/layout/counselor-sidebar";
import { useAuthStore } from "@/store/auth.store";
import { useCurrentUserSync } from "@/hooks/useAuth";
import { NotificationPopover } from "../components/notifications/NotificationPopover";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { InstallLoginPopup } from "@/components/common/InstallLoginPopup";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TeamChatButton } from "@/components/chat/TeamChatButton";
import { TeamChatDrawer } from "@/components/chat/TeamChatDrawer";
import { NavbarAskAi } from "@/components/layout/NavbarAskAi";
import { PortalRouteGuard } from "@/components/permissions/PortalRouteGuard";

export const CounselorLayout: React.FC = () => {
  const { token, user } = useAuthStore();

  // Keep Counsellor permissions live-synced in real-time
  useCurrentUserSync();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = (user?.roles || (user?.role ? [user.role] : [])).map((r: string) =>
    typeof r === "string" ? r.toUpperCase() : ""
  );
  if (!userRoles.includes("COUNSELLOR") && !userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    return <Navigate to="/login" replace />;
  }
  return (
    <SidebarProvider>
      <InstallLoginPopup />
      <div className="flex min-h-screen w-full bg-background">
        <CounselorSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#0B4F8A] bg-gradient-to-r from-[#0B3B60] via-[#1769AA] to-[#0B4F8A] text-white px-4 sm:px-5 z-10 shadow-md">
            <div className="flex items-center gap-2 md:gap-3">
              <SidebarTrigger className="-ml-1 h-7 w-7 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-md transition-colors cursor-pointer" />
              <div className="flex items-center gap-1.5 text-white/90 hidden sm:flex">
                <UserCheck size={13} className="text-emerald-300" />
                <span className="text-[11px] font-semibold text-white">Counsellor Desk</span>
              </div>
              <div className="h-3.5 w-[1px] bg-white/20 hidden md:block" />
              <NavbarAskAi />
            </div>

            <div className="flex items-center gap-2">
              <InstallAppButton variant="header" />
              <TeamChatButton />
              <ThemeToggle />
              <NotificationPopover />
            </div>

          </header>
          
          <main className="flex-1 overflow-auto bg-bg-primary">
            <PortalRouteGuard portal="counselor">
              <Outlet />
            </PortalRouteGuard>
          </main>
        </div>
      </div>
      <TeamChatDrawer />
    </SidebarProvider>
  );
};
