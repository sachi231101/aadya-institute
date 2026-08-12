import React from "react";
import { Outlet } from "react-router-dom";
import { Bell, BookOpen } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FacultySidebar } from "@/components/layout/faculty-sidebar";

export const FacultyLayout: React.FC = () => {
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
              <button className="relative text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-bg-tertiary">
                <Bell size={20} />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </button>
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
