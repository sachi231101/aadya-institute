import React, { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronDown,
  LogOut,
  User,
  ShieldCheck,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CenterSidebar } from "@/components/layout/center-sidebar";
import { useAuthStore } from "@/store/auth.store";
import { useCurrentUserSync } from "@/hooks/useAuth";
import { useBranch } from "@/hooks/useBranches";
import { useStudentStore } from "@/store/student.store";
import { useCourseStore } from "@/store/course.store";
import { NotificationPopover } from "../components/notifications/NotificationPopover";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { InstallLoginPopup } from "@/components/common/InstallLoginPopup";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TeamChatButton } from "@/components/chat/TeamChatButton";
import { TeamChatDrawer } from "@/components/chat/TeamChatDrawer";
import { NavbarAskAi } from "@/components/layout/NavbarAskAi";
import { UserNav } from "@/components/layout/UserNav";
import { PortalRouteGuard } from "@/components/permissions/PortalRouteGuard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const CenterLayout: React.FC = () => {
  const { token, user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Keep Center Manager permissions & profile live-synced in real-time
  useCurrentUserSync();

  const { data: branchResponse } = useBranch(user?.branchId ?? undefined);
  const branchName = branchResponse?.data?.name || "Your Branch";
  const managerName = user?.name || "Suresh Sharma";
  const managerInitials = managerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const { fetchStudents } = useStudentStore();
  const { fetchBatches } = useCourseStore();

  useEffect(() => {
    if (user?.branchId && user.role === "CENTER_MANAGER") {
      fetchStudents(user.branchId);
      fetchBatches(user.branchId);
    }
  }, [user?.branchId, user?.role, fetchStudents, fetchBatches]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = (user?.roles || (user?.role ? [user.role] : [])).map((r: string) =>
    typeof r === "string" ? r.toUpperCase() : ""
  );
  if (!userRoles.includes("CENTER_MANAGER") && !userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    if (userRoles.includes("COUNSELLOR")) {
      return <Navigate to="/counselor/dashboard" replace />;
    }
    if (userRoles.includes("FACULTY")) {
      return <Navigate to="/faculty/dashboard" replace />;
    }
    if (userRoles.includes("STUDENT")) {
      return <Navigate to="/student/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <InstallLoginPopup />
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <CenterSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ─── Top Header Navigation Bar ───────────────────────────────── */}
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#334155] bg-gradient-to-r from-[#172033] via-[#1D4ED8] to-[#2563EB] text-white px-4 sm:px-5 z-20 shadow-md">
            <div className="flex items-center gap-2 md:gap-3">
              <SidebarTrigger className="-ml-1 h-7 w-7 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-md transition-colors cursor-pointer" />
              <div className="flex items-center gap-1.5 text-white hidden sm:flex">
                <div className="h-5 w-5 rounded-md bg-white/15 text-white flex items-center justify-center">
                  <Building2 size={12} />
                </div>
                <span className="text-[11px] font-bold text-white tracking-tight">
                  {branchName}
                </span>
              </div>
              <div className="h-3.5 w-[1px] bg-white/20 hidden md:block" />
              <NavbarAskAi />
            </div>

            <div className="flex items-center gap-2">
              <InstallAppButton variant="header" />
              <TeamChatButton />
              <ThemeToggle />
              <NotificationPopover />

              <div className="h-4 w-[1px] bg-white/20 mx-0.5 hidden sm:block" />
              <UserNav />
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-bg-primary">
            <PortalRouteGuard portal="center">
              <Outlet />
            </PortalRouteGuard>
          </main>
        </div>
      </div>
      <TeamChatDrawer />
    </SidebarProvider>
  );
};
