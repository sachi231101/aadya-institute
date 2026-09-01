import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Bell,
  Users,
  Target,
  CreditCard,
  BarChart3,
  ChevronRight,
  LogOut,
  UserCheck,
  Sparkles,
  Layers,
  Bot,
  Building2,
  Lock,
  Award,
  FileText,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuthStore } from "@/store/auth.store";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { CENTER_NAV_PERMISSION_KEYS, canAccessNavUrl } from "@/constants/nav-permissions";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  isActive?: boolean;
  isAi?: boolean;
  moduleKey?: string; // Links to module permission key
  requiredPermissions?: string[]; // Fallback raw permissions check
  items?: { title: string; url: string }[];
}

const rawCenterNavItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/center/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Student Management",
    url: "/center/students",
    icon: GraduationCap,
    moduleKey: "students",
    requiredPermissions: ["student.read"],
    items: [
      { title: "All Students", url: "/center/students/all" },
      { title: "Attendance", url: "/center/students/attendance" },
      { title: "Discontinuation Risk", url: "/center/students/discontinuation-risk" },
    ],
  },
  {
    title: "Faculty Management",
    url: "/center/faculty",
    icon: Users,
    moduleKey: "faculty",
    requiredPermissions: ["faculty.read"],
    items: [
      { title: "All Faculty", url: "/center/faculty/all" },
      { title: "Assigned Courses", url: "/center/faculty/courses" },
      { title: "Attendance", url: "/center/faculty/attendance" },
      { title: "Faculty Ratings", url: "/center/faculty/ratings" },
    ],
  },
  {
    title: "Course Management",
    url: "/center/courses",
    icon: BookOpen,
    moduleKey: "courses",
    requiredPermissions: ["course.read", "module.read", "batch.read"],
    items: [
      { title: "All Courses", url: "/center/courses/all" },
      { title: "Curriculum", url: "/center/courses/curriculum" },
      { title: "Batches", url: "/center/courses/batches" },
    ],
  },
  {
    title: "Lead Management",
    url: "/center/leads",
    icon: Bot,
    moduleKey: "leads_ai_calling",
    requiredPermissions: ["lead.read", "ai_call.read"],
    items: [
      { title: "All Leads", url: "/center/leads" },
      { title: "AI Calling", url: "/center/leads/ai-calling" },
      { title: "Follow-ups", url: "/center/leads/follow-ups" },
    ],
  },
  {
    title: "Admission Management",
    url: "/center/admissions",
    icon: Target,
    moduleKey: "admissions",
    requiredPermissions: ["admission.read"],
    items: [
      { title: "All Admissions", url: "/center/admissions/all" },
      { title: "Applications", url: "/center/admissions/applications" },
      { title: "Enquiries", url: "/center/admissions/enquiries" },
    ],
  },
  {
    title: "Counsellor Management",
    url: "/center/counselor/overview",
    icon: UserCheck,
    moduleKey: "counsellor",
    requiredPermissions: ["user.read"],
    items: [
      { title: "Overview", url: "/center/counselor/overview" },
      { title: "Manage Counsellors", url: "/center/counselor/all" },
      { title: "Create & Manage Batches", url: "/center/counselor/batches" },
    ],
  },
  {
    title: "Target & Incentive",
    url: "/center/targets",
    icon: Award,
    moduleKey: "targets",
    requiredPermissions: ["target.read"],
    items: [
      { title: "Manage Targets", url: "/center/targets" },
      { title: "Leaderboard & Stats", url: "/center/performance" },
      { title: "Incentive Approvals", url: "/center/incentives" },
    ],
  },
  {
    title: "Class & Schedule",
    url: "/center/schedule",
    icon: Calendar,
    moduleKey: "schedule",
    requiredPermissions: ["schedule.read", "attendance.read"],
    items: [
      { title: "Classes", url: "/center/schedule/classes" },
      { title: "Timetable", url: "/center/schedule/timetable" },
      { title: "Recordings", url: "/center/schedule/recordings" },
      { title: "Assignments", url: "/center/schedule/assignments" },
    ],
  },
  {
    title: "Examination Management",
    url: "/center/exams",
    icon: FileText,
    moduleKey: "examinations",
    requiredPermissions: ["exam.read"],
    items: [
      { title: "All Examinations", url: "/center/exams" },
      { title: "Create Exam", url: "/center/exams/create" },
      { title: "Question Bank", url: "/center/exams/question-bank" },
    ],
  },
  {
    title: "Fee Management",
    url: "/center/fees",
    icon: CreditCard,
    moduleKey: "fees",
    requiredPermissions: ["fee.read"],
    items: [
      { title: "Payments", url: "/center/fees/payments" },
      { title: "Pending Fees", url: "/center/fees/pending" },
      { title: "Fee Reports", url: "/center/fees/reports" },
    ],
  },
  {
    title: "Report Management",
    url: "/center/reports",
    icon: BarChart3,
    moduleKey: "reports",
    requiredPermissions: ["report.read"],
    items: [
      { title: "Student Reports", url: "/center/reports/students" },
      { title: "Faculty Reports", url: "/center/reports/faculty" },
      { title: "Course Reports", url: "/center/reports/courses" },
      { title: "Financial Reports", url: "/center/reports/financial" },
      { title: "Placement Export", url: "/center/reports/placement" },
    ],
  },
  {
    title: "Notifications",
    url: "/center/notifications",
    icon: Bell,
    moduleKey: "notifications",
    requiredPermissions: ["notification.read"],
    items: [
      { title: "All Notifications", url: "/center/notifications" },
      { title: "WhatsApp Monitor", url: "/center/notifications/whatsapp" },
    ],
  },
  {
    title: "Masters",
    url: "/center/masters",
    icon: Layers,
    moduleKey: "masters",
  },
  {
    title: "Settings",
    url: "/center/settings",
    icon: Settings,
  },
];

export function CenterSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const managerName = user?.name || "Center Manager";
  const branchName = "Aadya Institute Malleshwaram";

  // Filter navigation items based on the user's assigned module permissions
  const filteredNavItems = React.useMemo(() => {
    // If ADMIN, give access to everything
    if (user?.roles?.includes("ADMIN")) {
      return rawCenterNavItems;
    }

    const grantedModules = user?.modulePermissions;
    const grantedPermissions = user?.permissions;
    const isAdmin = user?.roles?.includes("ADMIN");

    return rawCenterNavItems
      .map((item) => {
        if (!item.items?.length) return item;
        const visibleItems = item.items.filter((sub) =>
          canAccessNavUrl(sub.url, grantedPermissions, grantedModules, CENTER_NAV_PERMISSION_KEYS, isAdmin)
        );
        return { ...item, items: visibleItems };
      })
      .filter((item) => {
      if (!item.moduleKey) return true;
      if (item.items && item.items.length === 0) return false;

      if (grantedPermissions?.length) {
        if (item.items?.length) {
          return item.items.some((sub) =>
            canAccessNavUrl(sub.url, grantedPermissions, grantedModules, CENTER_NAV_PERMISSION_KEYS, isAdmin)
          );
        }
        return canAccessNavUrl(item.url, grantedPermissions, grantedModules, CENTER_NAV_PERMISSION_KEYS, isAdmin);
      }

      if (grantedModules && Array.isArray(grantedModules)) {
        return grantedModules.includes(item.moduleKey);
      }

      return false;
    });
  }, [user]);

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/50 bg-bg-secondary">
      {/* ─── Header: Brand Logo ────────────────────────────────────────── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/center/dashboard">
                <img src="/aadya-logo.png" alt="Aadya Institute" className="h-7 w-auto object-contain" />
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-text-primary">Aadya Portal</span>
                  <span className="text-xs text-amber-600 font-bold">CENTER MANAGER</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ─── Navigation Items (Filtered dynamically by granted permissions) ─────────── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {filteredNavItems.map((item) => {
              const isItemActive = location.pathname === item.url;
              const isGroupActive = item.items?.some(
                (sub) => location.pathname === sub.url || location.pathname.startsWith(sub.url)
              );

              if (!item.items) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isItemActive} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2.5 w-full">
                        {item.icon && <item.icon className={`h-4 w-4 shrink-0 ${isItemActive ? "text-primary font-semibold" : "text-muted-foreground"}`} />}
                        <span className="truncate min-w-0 flex-1 text-[13.5px] font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isGroupActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={isGroupActive} className="w-full justify-between">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.icon && <item.icon className={`h-4 w-4 shrink-0 ${isGroupActive ? "text-primary font-semibold" : "text-muted-foreground"}`} />}
                          <span className="truncate min-w-0 flex-1 text-[13.5px] font-medium">{item.title}</span>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="my-1 ml-3.5 pl-2.5 border-l border-border/60 gap-0.5">
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname === subItem.url}
                              className="h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all data-[active=true]:bg-blue-50/90 dark:data-[active=true]:bg-blue-950/50 data-[active=true]:text-[#1769AA] dark:data-[active=true]:text-sky-400 data-[active=true]:font-semibold"
                            >
                              <Link to={subItem.url} className="truncate min-w-0 flex-1">
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ─── Footer: Center Manager Profile & Locked Branch Indicator ── */}
      <SidebarFooter className="border-t border-border/50 p-2 space-y-2">
        <div className="px-1">
          <InstallAppButton variant="sidebar" />
        </div>

        {/* Center Manager Profile Card */}
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/40">
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className="text-xs font-bold truncate text-text-primary">
                  {managerName}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-amber-600">
                    Center Manager
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Locked Branch Indicator */}
        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Assigned Center
                </span>
                <Lock className="h-2.5 w-2.5 text-slate-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 block truncate">
                {branchName}
              </span>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
