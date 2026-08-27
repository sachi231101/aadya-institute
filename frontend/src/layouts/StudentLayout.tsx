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
  X,
  Megaphone,
  MessageSquareQuote,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { NotificationPopover } from "../components/notifications/NotificationPopover";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { InstallLoginPopup } from "@/components/common/InstallLoginPopup";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

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

  const userRoles = (user?.roles || (user?.role ? [user.role] : [])).map((r: string) =>
    typeof r === "string" ? r.toUpperCase() : ""
  );

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Allow Student, Admin, Super Admin, Center Manager, and Faculty to access the student portal / preview
  const isAllowed =
    userRoles.includes("STUDENT") ||
    userRoles.includes("ADMIN") ||
    userRoles.includes("SUPER_ADMIN") ||
    userRoles.includes("CENTER_MANAGER") ||
    userRoles.includes("FACULTY");

  if (!isAllowed) {
    if (userRoles.includes("COUNSELLOR")) {
      return <Navigate to="/counselor/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const studentName = user?.name || "Rahul Verma";
  const studentInitials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  interface NavItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    dot?: boolean;
    badge?: string;
    isExternal?: boolean;
  }

  const navItems: NavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/student/dashboard" },
    { label: "My Class Schedule", icon: Calendar, path: "/student/schedule" },
    { label: "Attendance", icon: CheckSquare, path: "/student/attendance" },
    { label: "Online Exams", icon: ShieldCheck, path: "/student/exams", badge: "PROCTORED" },
    { label: "Announcements", icon: Megaphone, path: "/student/announcements", dot: true },
    { label: "Assignments", icon: FileText, path: "/student/assignments" },
    { label: "Study Materials", icon: BookOpen, path: "/student/study-materials" },
    { label: "Video Recordings", icon: Video, path: "/student/recordings" },
    { label: "Placement Portal", icon: Briefcase, path: "https://placement.aadyainstitution.com/", isExternal: true, badge: "NEW" },
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
              <h2 className="text-base font-bold text-foreground leading-none tracking-tight group-hover:text-[#5B50EC] dark:group-hover:text-indigo-400 transition-colors">
                Aadya Student
              </h2>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase mt-1 block">
                LEARNER PORTAL
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
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
                : "bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 text-[#5B50EC] dark:text-indigo-300 border-blue-200/60 dark:border-indigo-900/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${isAiActive ? "text-white" : "text-[#5B50EC] dark:text-indigo-400"}`} />
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

            if (item.isExternal) {
              return (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors no-underline group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 stroke-[1.8] group-hover:scale-110 transition-transform" />
                    <span className="flex items-center gap-1.5 text-foreground font-bold">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs">
                        {item.badge}
                      </span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                  </div>
                </a>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[#5B50EC] text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white stroke-[2.2]" : "text-muted-foreground stroke-[1.8]"}`} />
                  <span className="flex items-center gap-1.5">
                    {item.label}
                    {(item as any).dot && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shadow-xs" />
                    )}
                  </span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-indigo-100 text-indigo-700 font-black"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-2">
            <InstallAppButton variant="sidebar" />
          </div>

          {/* Exit Button Directly Below My Profile */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 text-rose-500 stroke-[1.8]" />
            <span>Exit</span>
          </button>
        </nav>
      </div>

      {/* Bottom "Need Help?" Card */}
      <div className="pt-3 border-t border-border/40 space-y-2.5">
        <div className="bg-card border border-border/60 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100/80 dark:bg-indigo-950/60 flex items-center justify-center text-[#5B50EC] dark:text-indigo-400">
              <Headphones className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-foreground">Need Help?</h4>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Our support team is here to help you.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Connecting to Aadya Student Support...")}
            className="w-full h-8 text-[11px] font-semibold text-[#5B50EC] dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-background hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background font-sans antialiased text-foreground overflow-hidden">
      <InstallLoginPopup />
      {/* ── Desktop Fixed Left Sidebar (Locked & Non-scrollable) ─────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-bg-secondary border-r border-border/50 flex-col justify-between p-4 h-screen sticky top-0 z-30 shadow-2xs overflow-hidden select-none">
        {renderSidebarContent()}
      </aside>

      {/* ── Mobile Drawer Backdrop & Sidebar ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-150">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-bg-secondary border-r border-border/50 h-full p-4 z-50 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* ── Main Layout Body & Header ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 lg:h-18 bg-bg-secondary border-b border-border/50 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-20 shadow-2xs">
          {/* Hamburger + Greeting */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-sm lg:text-base font-bold text-foreground flex items-center gap-1.5">
                Hello, {studentName}! 👋
              </h1>
              <p className="text-xs text-muted-foreground font-medium hidden md:block">
                Here's your class schedule (Only assigned by your Counsellor)
              </p>
            </div>
          </div>

          {/* Right Header Widgets */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Dynamic Date & Time Pill */}
            <div className="hidden xl:flex items-center gap-2 bg-muted/40 border border-border/60 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                {currentTime.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                • {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <InstallAppButton variant="header" />
            <ThemeToggle />
            {/* Notification Bell */}
            <NotificationPopover />

            {/* Profile Avatar Pill */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1 sm:pl-1.5 pr-2 sm:pr-2.5 py-1 rounded-xl hover:bg-muted/50 border border-border/70 transition-colors cursor-pointer">
                  <Avatar className="w-8 h-8 rounded-lg border border-border bg-[#8B5CF6] text-white font-bold text-xs">
                    <AvatarImage src={(user as any)?.avatar} alt={studentName} />
                    <AvatarFallback className="bg-[#8B5CF6] text-white font-bold text-xs">
                      {studentInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <span className="text-xs font-bold text-foreground block leading-tight">
                      {studentName}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground block leading-tight">
                      Student
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover rounded-xl shadow-lg border border-border p-1">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5">
                  Student Account
                </DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => navigate("/student/profile")}
                  className="text-xs font-medium text-foreground hover:bg-muted rounded-lg px-2 py-1.5 cursor-pointer"
                >
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 border-border/60" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg px-2 py-1.5 cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-bg-primary">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
