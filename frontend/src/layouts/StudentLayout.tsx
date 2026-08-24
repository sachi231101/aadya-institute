import React, { useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  FileText, 
  BookOpen, 
  Video, 
  User, 
  Sparkles, 
  Headphones, 
  ChevronDown,
  ShieldCheck,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { NotificationPopover } from "../components/notifications/NotificationPopover";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { InstallLoginPopup } from "@/components/common/InstallLoginPopup";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const StudentLayout: React.FC = () => {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  if (!userRoles.includes("STUDENT") && !userRoles.includes("ADMIN")) {
    if (userRoles.includes("COUNSELLOR")) {
      return <Navigate to="/counselor/dashboard" replace />;
    }
    if (userRoles.includes("CENTER_MANAGER")) {
      return <Navigate to="/center/dashboard" replace />;
    }
    if (userRoles.includes("FACULTY")) {
      return <Navigate to="/faculty/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const studentName = user?.name || "Rahul Verma";
  const studentInitials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/student/dashboard" },
    { label: "My Class Schedule", icon: Calendar, path: "/student/schedule" },
    { label: "Attendance", icon: CheckSquare, path: "/student/attendance" },
    { label: "Assignments", icon: FileText, path: "/student/assignments" },
    { label: "Study Materials", icon: BookOpen, path: "/student/study-materials" },
    { label: "Video Recordings", icon: Video, path: "/student/recordings" },
    { label: "My Profile", icon: User, path: "/student/profile" },
  ];

  const isAiActive = location.pathname === "/student/ask-me";

  const renderSidebarContent = () => (
    <div className="flex flex-col justify-between h-full space-y-4">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link 
            to="/student/dashboard" 
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-2 py-1.5 no-underline group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none tracking-tight group-hover:text-[#5B50EC] transition-colors">
                Aadya Student
              </h2>
              <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase mt-1 block">
                LEARNER PORTAL
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Ask Me Button */}
        <div>
          <Link
            to="/student/ask-me"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
              isAiActive
                ? "bg-[#5B50EC] text-white border-[#5B50EC] shadow-xs"
                : "bg-blue-50/70 hover:bg-blue-100/80 text-[#5B50EC] border-blue-200/60"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${isAiActive ? "text-white" : "text-[#5B50EC]"}`} />
              <span>ASK ME Anything</span>
            </div>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                isAiActive ? "bg-white/20 text-white" : "bg-[#5B50EC] text-white"
              }`}
            >
              AI
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[#5B50EC] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white stroke-[2.2]" : "text-slate-400 stroke-[1.8]"}`} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}

          <div className="pt-2">
            <InstallAppButton variant="sidebar" />
          </div>

          {/* Exit Button Directly Below My Profile */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 text-rose-500 stroke-[1.8]" />
            <span>Exit</span>
          </button>
        </nav>
      </div>

      {/* Bottom "Need Help?" Card */}
      <div className="pt-3 border-t border-slate-100 space-y-2.5">
        <div className="bg-slate-50/90 border border-slate-200/70 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100/80 flex items-center justify-center text-[#5B50EC]">
              <Headphones className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Need Help?</h4>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Our support team is here to help you.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Connecting to Aadya Student Support...")}
            className="w-full h-8 text-[11px] font-semibold text-[#5B50EC] border-indigo-200 bg-white hover:bg-indigo-50 rounded-xl"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] font-sans antialiased text-slate-800 overflow-hidden">
      <InstallLoginPopup />
      {/* ── Desktop Fixed Left Sidebar (Locked & Non-scrollable) ─────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-200/80 flex-col justify-between p-4 h-screen sticky top-0 z-30 shadow-2xs overflow-hidden select-none">
        {renderSidebarContent()}
      </aside>

      {/* ── Mobile Drawer Backdrop & Sidebar ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-150">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full p-4 z-50 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* ── Main Layout Body & Header ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 lg:h-18 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-20 shadow-2xs">
          {/* Hamburger + Greeting */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-sm lg:text-base font-bold text-slate-900 flex items-center gap-1.5">
                Hello, {studentName}! 👋
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden md:block">
                Here's your class schedule (Only assigned by your Counsellor)
              </p>
            </div>
          </div>

          {/* Right Header Widgets */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Date Pill */}
            <div className="hidden xl:flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tuesday, 13 Aug 2026</span>
            </div>

            <InstallAppButton variant="header" />
            {/* Notification Bell */}
            <NotificationPopover />

            {/* Profile Avatar Pill */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1 sm:pl-1.5 pr-2 sm:pr-2.5 py-1 rounded-xl hover:bg-slate-50 border border-slate-200/70 transition-colors cursor-pointer">
                  <Avatar className="w-8 h-8 rounded-lg border border-slate-200 bg-[#8B5CF6] text-white font-bold text-xs">
                    <AvatarImage src={(user as any)?.avatar} alt={studentName} />
                    <AvatarFallback className="bg-[#8B5CF6] text-white font-bold text-xs">
                      {studentInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <span className="text-xs font-bold text-slate-800 block leading-tight">
                      {studentName}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 block leading-tight">
                      Student
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-1">
                <DropdownMenuLabel className="text-xs text-slate-400 font-semibold px-2 py-1.5">
                  Student Account
                </DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => navigate("/student/profile")}
                  className="text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg px-2 py-1.5 cursor-pointer"
                >
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 border-slate-100" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg px-2 py-1.5 cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
