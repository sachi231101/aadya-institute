import React, { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronDown,
  LogOut,
  User,
  ShieldCheck,
  Bell,
  Sparkles,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CenterSidebar } from "@/components/layout/center-sidebar";
import { useAuthStore } from "@/store/auth.store";
import { useBranch } from "@/hooks/useBranches";
import { useStudentStore } from "@/store/student.store";
import { useCourseStore } from "@/store/course.store";
import { NotificationPopover } from "../components/notifications/NotificationPopover";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { InstallLoginPopup } from "@/components/common/InstallLoginPopup";
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

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  if (!userRoles.includes("CENTER_MANAGER") && !userRoles.includes("ADMIN")) {
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
      <div className="flex min-h-screen w-full bg-[#F8FAFC]">
        <CenterSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ─── Top Header Navigation Bar ───────────────────────────────── */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6 z-20 shadow-2xs">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1 text-slate-600 hover:bg-slate-100 rounded-lg" />
              <div className="flex items-center gap-2 text-slate-800">
                <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  Center Manager Portal — <span className="text-[#1D4ED8]">{branchName}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <InstallAppButton variant="header" />
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
                    <p className="text-xs font-bold text-slate-900">{managerName}</p>
                    <p className="text-[11px] text-slate-500">{branchName}</p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => navigate("/center/settings")}
                    className="text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg px-2 py-1.5 cursor-pointer flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Branch Profile & Settings</span>
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

          <main className="flex-1 overflow-auto bg-[#F8FAFC]">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
