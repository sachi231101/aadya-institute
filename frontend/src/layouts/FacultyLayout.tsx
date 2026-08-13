import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { BookOpen, Bell } from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FacultySidebar } from "@/components/layout/faculty-sidebar";
import { NotificationPopover } from "../components/notifications/NotificationPopover";

export const FacultyLayout: React.FC = () => {
  const { token } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <FacultySidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-bg-secondary px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2" />
              <div className="flex items-center gap-2 text-muted-foreground hidden sm:flex">
                <BookOpen size={18} className="text-amber-600" />
                <span className="text-sm font-medium">Faculty Portal — Teaching Desk & Classroom Operations</span>
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
