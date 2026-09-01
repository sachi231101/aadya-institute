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
import { useStudentStore } from "@/store/student.store";
import { useCourseStore } from "@/store/course.store";
import { NotificationPopover } from "../components/notifications/NotificationPopover";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { InstallLoginPopup } from "@/components/common/InstallLoginPopup";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TeamChatButton } from "@/components/chat/TeamChatButton";
import { TeamChatDrawer } from "@/components/chat/TeamChatDrawer";
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

  // Strict branch lock for Center Manager
  const branchName = "Aadya Institute Malleshwaram";
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
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-bg-secondary px-4 sm:px-6 z-20 shadow-2xs">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1 text-muted-foreground hover:bg-accent rounded-lg" />
              <div className="flex items-center gap-2 text-foreground">
                <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1D4ED8] dark:text-sky-400 flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <span className="text-xs sm:text-sm font-black text-foreground tracking-tight">
                  Center Manager Portal — <span className="text-[#1D4ED8] dark:text-sky-400">{branchName}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <InstallAppButton variant="header" />
              <TeamChatButton />
              <ThemeToggle />
              <NotificationPopover />

              {/* Center Manager Profile Pill & Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-slate-50 border border-slate-200/70 transition-colors cursor-pointer outline-none">
                    <Avatar className="w-8 h-8 rounded-lg border border-slate-200 bg-amber-600 text-white font-bold text-xs">
                      <AvatarImage
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
                        alt={managerName}
                      />
                      <AvatarFallback className="bg-amber-600 text-white font-bold text-xs">
                        {managerInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden sm:block">
                      <span className="text-xs font-bold text-slate-800 block leading-tight">
                        {managerName}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-600 block leading-tight">
                        Center Manager
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-1.5"
                >
                  <DropdownMenuLabel className="text-xs text-slate-400 font-semibold px-2 py-1.5">
                    Center Manager Account
                  </DropdownMenuLabel>
                  <div className="px-2 py-1.5 mb-1 bg-slate-50 rounded-xl">
                    <p className="text-xs font-bold text-slate-900 leading-none mb-1">
                      {managerName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {user?.email || "manager@aadya.in"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                        <ShieldCheck size={10} /> Center Manager
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                        <Building2 size={10} /> Active
                      </span>
                    </div>
                  </div>
                  <DropdownMenuItem
                    onClick={() => navigate("/center/dashboard")}
                    className="text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg px-2 py-1.5 cursor-pointer flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Manager Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 border-slate-100" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg px-2 py-1.5 cursor-pointer flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
