import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FacultySidebar } from "@/components/layout/faculty-sidebar";
import { NotificationPopover } from "../components/notifications/NotificationPopover";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { InstallLoginPopup } from "@/components/common/InstallLoginPopup";

export const FacultyLayout: React.FC = () => {
  const { token, user } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  if (!userRoles.includes("FACULTY") && !userRoles.includes("ADMIN")) {
    if (userRoles.includes("COUNSELLOR")) {
      return <Navigate to="/counselor/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <InstallLoginPopup />
      <div className="flex min-h-screen w-full bg-background">
      <div className="flex h-screen w-full bg-[#F8FAFC] font-sans antialiased text-slate-800 overflow-hidden">
        <FacultySidebar />
        
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-6 shadow-2xs z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2 text-slate-600 hover:bg-slate-100 rounded-lg p-1.5" />
              <div className="flex items-center gap-2 text-slate-500 hidden sm:flex">
                <BookOpen size={17} className="text-[#5B50EC]" />
                <span className="text-xs font-semibold tracking-tight text-slate-700">Faculty Portal — Teaching Desk & Classroom Operations</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <InstallAppButton variant="header" />
              <NotificationPopover />
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
