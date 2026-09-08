import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FacultySidebar } from "@/components/layout/faculty-sidebar";
import { UserNav } from "@/components/layout/UserNav";

export const FacultyLayout: React.FC = () => {
  const { token, user } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = (user?.roles || (user?.role ? [user.role] : [])).map((r: string) =>
    typeof r === "string" ? r.toUpperCase() : ""
  );
  if (!userRoles.includes("FACULTY") && !userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    if (userRoles.includes("COUNSELLOR")) {
      return <Navigate to="/counselor/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background font-sans antialiased text-foreground overflow-hidden">
        <FacultySidebar />
        
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#334155] bg-gradient-to-r from-[#172033] via-[#1D4ED8] to-[#2563EB] text-white px-4 sm:px-5 shadow-md z-10">
            <div className="flex items-center gap-2 md:gap-3">
              <SidebarTrigger className="-ml-1 h-7 w-7 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-md transition-colors cursor-pointer" />
              <div className="flex items-center gap-1.5 text-white/90">
                <BookOpen size={13} className="text-indigo-200" />
                <span className="text-[11px] font-semibold tracking-tight text-white">Faculty Teaching Desk</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <UserNav />
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto bg-bg-primary">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
