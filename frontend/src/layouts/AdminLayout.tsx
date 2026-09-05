import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NotificationPopover } from "../components/notifications/NotificationPopover";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { InstallLoginPopup } from "@/components/common/InstallLoginPopup";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TeamChatButton } from "@/components/chat/TeamChatButton";
import { TeamChatDrawer } from "@/components/chat/TeamChatDrawer";
import { NavbarAskAi } from "@/components/layout/NavbarAskAi";
import { useAuthStore } from "@/store/auth.store";

export const AdminLayout: React.FC = () => {
  const { token, user } = useAuthStore();

  const userRoles = (user?.roles || (user?.role ? [user.role] : [])).map((r: string) =>
    typeof r === "string" ? r.toUpperCase() : ""
  );

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    if (userRoles.includes("COUNSELLOR")) {
      return <Navigate to="/counselor/dashboard" replace />;
    }
    if (userRoles.includes("CENTER_MANAGER")) {
      return <Navigate to="/center/dashboard" replace />;
    }
    if (userRoles.includes("FACULTY")) {
      return <Navigate to="/faculty/dashboard" replace />;
    }
    if (userRoles.includes("STUDENT")) {
      return <Navigate to="/student/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <InstallLoginPopup />
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#0B4F8A] bg-gradient-to-r from-[#0B3B60] via-[#1769AA] to-[#0B4F8A] text-white px-4 sm:px-5 z-10 shadow-md">
            <div className="flex items-center gap-2 md:gap-3">
              <SidebarTrigger className="-ml-1 h-7 w-7 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-md transition-colors cursor-pointer" />
              <div className="h-3.5 w-[1px] bg-white/20 hidden sm:block" />
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
            <Outlet />
          </main>
        </div>
      </div>

      <TeamChatDrawer />
    </SidebarProvider>
  );
};
