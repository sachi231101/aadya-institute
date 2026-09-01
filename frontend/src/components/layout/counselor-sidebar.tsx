import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Target,
  GraduationCap,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ChevronRight,
  LogOut,
  Sparkles,
  Bot,
  Layers,
  Award,
} from "lucide-react"

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
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuthStore } from "@/store/auth.store"
import { InstallAppButton } from "@/components/common/InstallAppButton"
import { COUNSELOR_NAV_PERMISSION_KEYS, canAccessNavUrl } from "@/constants/nav-permissions"

interface CounselorNavItem {
  title: string;
  url: string;
  icon: any;
  isActive?: boolean;
  isAi?: boolean;
  moduleKey?: string; // Links to module permission key
  items?: { title: string; url: string }[];
}

const rawCounselorNavItems: CounselorNavItem[] = [
  {
    title: "ASK ME",
    url: "/counselor/ask-me",
    icon: Sparkles,
    isAi: true,
  },
  {
    title: "Dashboard",
    url: "/counselor/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Target & Incentive",
    url: "/counselor/performance",
    icon: Award,
    moduleKey: "targets",
  },
  {
    title: "Lead Management",
    url: "/counselor/leads",
    icon: Bot,
    moduleKey: "leads_ai_calling",
    items: [
      { title: "All Leads", url: "/counselor/leads" },
      { title: "AI Calling", url: "/counselor/leads/ai-calling" },
      { title: "Follow-ups", url: "/counselor/leads/follow-ups" },
    ],
  },
  {
    title: "Admission Management",
    url: "/counselor/admissions/all",
    icon: Target,
    moduleKey: "admissions",
    items: [
      { title: "All Admissions", url: "/counselor/admissions/all" },
      { title: "Applications", url: "/counselor/admissions/applications" },
      { title: "Enquiries", url: "/counselor/admissions/enquiries" },
    ],
  },
  {
    title: "Student Management",
    url: "/counselor/students/all",
    icon: GraduationCap,
    moduleKey: "students",
    items: [
      { title: "All Students", url: "/counselor/students/all" },
      { title: "Attendance", url: "/counselor/students/attendance" },
    ],
  },
  {
    title: "Faculty Management",
    url: "/counselor/faculty/all",
    icon: Users,
    moduleKey: "faculty",
    items: [
      { title: "All Faculty", url: "/counselor/faculty/all" },
      { title: "Assigned Courses", url: "/counselor/faculty/courses" },
      { title: "Attendance", url: "/counselor/faculty/attendance" },
    ],
  },
  {
    title: "Batch Management",
    url: "/counselor/batches",
    icon: Layers,
    moduleKey: "courses",
    items: [
      { title: "All Batches", url: "/counselor/batches" },
      { title: "Class Timetable", url: "/counselor/timetable" },
    ],
  },
  {
    title: "Fee Management",
    url: "/counselor/fees/payments",
    icon: CreditCard,
    moduleKey: "fees",
    items: [
      { title: "Payments", url: "/counselor/fees/payments" },
      { title: "Pending Fees", url: "/counselor/fees/pending" },
      { title: "Fee Reports", url: "/counselor/fees/reports" },
    ],
  },
  {
    title: "Report Management",
    url: "/counselor/reports/students",
    icon: BarChart3,
    moduleKey: "reports",
    items: [
      { title: "Student Reports", url: "/counselor/reports/students" },
      { title: "Faculty Reports", url: "/counselor/reports/faculty" },
      { title: "Course Reports", url: "/counselor/reports/courses" },
      { title: "Financial Reports", url: "/counselor/reports/financial" },
    ],
  },
  {
    title: "Settings",
    url: "/counselor/settings",
    icon: Settings,
  },
]

export function CounselorSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  // Filter navigation items based on the user's assigned module permissions
  const filteredNavItems = React.useMemo(() => {
    // If ADMIN, give access to everything
    if (user?.roles?.includes("ADMIN")) {
      return rawCounselorNavItems;
    }

    const grantedModules = user?.modulePermissions;
    const grantedPermissions = user?.permissions;
    const isAdmin = user?.roles?.includes("ADMIN");

    return rawCounselorNavItems
      .map((item) => {
        if (!item.items?.length) {
          if (item.moduleKey === "targets") {
            const visible = canAccessNavUrl(
              item.url,
              grantedPermissions,
              grantedModules,
              COUNSELOR_NAV_PERMISSION_KEYS,
              isAdmin
            );
            return visible ? item : { ...item, _hidden: true };
          }
          return item;
        }
        const visibleItems = item.items.filter((sub) =>
          canAccessNavUrl(sub.url, grantedPermissions, grantedModules, COUNSELOR_NAV_PERMISSION_KEYS, isAdmin)
        );
        return { ...item, items: visibleItems };
      })
      .filter((item) => {
      if ((item as { _hidden?: boolean })._hidden) return false;
      if (!item.moduleKey) return true;
      if (item.items && item.items.length === 0) return false;

      if (grantedPermissions?.length) {
        if (item.items?.length) {
          return item.items.some((sub) =>
            canAccessNavUrl(sub.url, grantedPermissions, grantedModules, COUNSELOR_NAV_PERMISSION_KEYS, isAdmin)
          );
        }
        return canAccessNavUrl(item.url, grantedPermissions, grantedModules, COUNSELOR_NAV_PERMISSION_KEYS, isAdmin);
      }

      if (grantedModules && Array.isArray(grantedModules)) {
        return grantedModules.includes(item.moduleKey);
      }

      return false;
    });
  }, [user]);

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/50 bg-bg-secondary">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/counselor/home">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-sidebar-primary-foreground font-bold">
                  C
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-emerald-700">Aadya Portal</span>
                  <span className="truncate text-xs font-semibold text-emerald-600">COUNSELLOR</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {filteredNavItems.map((item) => {
              const isSubItemActive = item.items?.some((subItem) => location.pathname === subItem.url)
              const isDirectActive = location.pathname === item.url
              const isExpanded = isSubItemActive || isDirectActive

              if (!item.items) {
                if ((item as any).isAi) {
                  return (
                    <SidebarMenuItem key={item.title} className="mb-2">
                      <SidebarMenuButton
                        asChild
                        isActive={isDirectActive}
                        tooltip={item.title}
                        className={
                          isDirectActive
                            ? "bg-[#1769AA] text-white font-bold rounded-xl shadow-xs"
                            : "bg-blue-50/80 hover:bg-blue-100/90 text-[#1769AA] font-bold border border-blue-200/60 rounded-xl transition-all"
                        }
                      >
                        <Link to={item.url} className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Sparkles
                              className={`h-4 w-4 shrink-0 ${isDirectActive ? "text-white fill-white" : "text-[#1769AA]"
                                }`}
                            />
                            <span className="tracking-wide">✦ ASK ME</span>
                          </div>
                          <span
                            className={`${isDirectActive ? "bg-white/20 text-white" : "bg-[#1769AA] text-white"
                              } text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs`}
                          >
                            AI
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isDirectActive}
                      tooltip={item.title}
                      className={isDirectActive ? "bg-emerald-500/10 text-emerald-700 font-medium" : ""}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }

              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isExpanded}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isSubItemActive}
                        className={isSubItemActive ? "text-emerald-700 font-medium" : ""}
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => {
                          const isSubActive = location.pathname === subItem.url
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isSubActive}
                                className={isSubActive ? "bg-emerald-500/10 text-emerald-700 font-semibold" : ""}
                              >
                                <Link to={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50">
        <div className="px-2 pt-2">
          <InstallAppButton variant="sidebar" />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between p-2">
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-sm font-semibold truncate">{user?.name || "Kavita Nair (Counsellor)"}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email || "counselor@aadya.in"}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate("/login")
                }}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
