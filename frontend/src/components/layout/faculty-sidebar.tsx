import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Megaphone,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  MapPin,
  FileVideo,
  FileText,
  Clock,
  Star,
  Inbox,
  CheckCircle2,
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
import { useOrganization } from "@/hooks/useOrganizationContext"
import { DEFAULT_ORG_LOGO, DEFAULT_ORG_NAME } from "@/utils/organization-display"
import { InstallAppButton } from "@/components/common/InstallAppButton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface NavItem {
  title: string
  url: string
  icon?: any
  isAi?: boolean
  items?: { title: string; url: string; icon?: any }[]
}

const facultyNavItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/faculty/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Schedule",
    url: "/faculty/classes",
    icon: Calendar,
    items: [
      {
        title: "My Classes",
        url: "/faculty/classes",
        icon: Calendar,
      },
      {
        title: "Recordings",
        url: "/faculty/recordings",
        icon: FileVideo,
      },
    ],
  },
  {
    title: "Assignment Management",
    url: "/faculty/assignments",
    icon: FileText,
    items: [
      {
        title: "All Assignments",
        url: "/faculty/assignments",
        icon: FileText,
      },
      {
        title: "Create Assignment",
        url: "/faculty/assignments/create",
        icon: FileText,
      },
      {
        title: "Submissions Queue",
        url: "/faculty/assignments/submissions",
        icon: Inbox,
      },
      {
        title: "Grading Queue",
        url: "/faculty/assignments/reviews",
        icon: CheckCircle2,
      },
    ],
  },
  {
    title: "My Batches & Courses",
    url: "/faculty/courses",
    icon: BookOpen,
  },
  {
    title: "Students",
    url: "/faculty/students/all",
    icon: GraduationCap,
  },
  {
    title: "Feedback",
    url: "/faculty/feedback",
    icon: Star,
  },
  {
    title: "Attendance",
    url: "/faculty/attendance",
    icon: UserCheck,
  },
  {
    title: "Student Performance",
    url: "/faculty/reports/students",
    icon: BarChart3,
  },
  {
    title: "Announcements",
    url: "/faculty/announcements",
    icon: Megaphone,
  },
  {
    title: "Settings",
    url: "/faculty/settings",
    icon: Settings,
  },
]

export function FacultySidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { organization } = useOrganization()
  const orgName = organization?.name || DEFAULT_ORG_NAME
  const orgLogo = organization?.branding.logoUrl || DEFAULT_ORG_LOGO

  const facultyName = user?.name || "Ramesh Kumar"
  const facultyDesignation = (user as any)?.specialization || (user as any)?.department || "Java Faculty"
  const facultyCenter = (user as any)?.branchName || "Bangalore Center"
  const facultyAvatar = (user as any)?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/50 bg-bg-secondary">
      <SidebarHeader className="p-3 border-b border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link to="/faculty/dashboard" className="flex items-center gap-3">
                {organization?.branding.logoUrl ? (
                  <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-border/60 shadow-2xs shrink-0 p-1 overflow-hidden">
                    <img src={orgLogo} alt={orgName} className="h-7 w-auto object-contain" />
                  </div>
                ) : (
                  <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#3B82F6] text-white shadow-xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-black text-slate-900 tracking-tight text-sm">{orgName}</span>
                  <span className="truncate text-[10px] font-extrabold text-[#4F46E5] tracking-wider uppercase">FACULTY MEMBER</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {facultyNavItems.map((item) => {
              const isSubItemActive = item.items?.some(
                (subItem) => location.pathname === subItem.url || location.pathname.startsWith(subItem.url + "/")
              )
              const isDirectActive = location.pathname === item.url || (item.url === "/faculty/classes" && location.pathname === "/faculty/schedule/classes")
              const isExpanded = isSubItemActive || isDirectActive

              if (!item.items) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isDirectActive}
                      tooltip={item.title}
                    >
                      <Link to={item.url} className="flex items-center gap-2.5 w-full">
                        {item.icon && <item.icon className={`h-4 w-4 shrink-0 ${isDirectActive ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-muted-foreground"}`} />}
                        <span className="truncate min-w-0 flex-1 text-[13.5px] font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }

              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={true}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isSubItemActive || isDirectActive}
                        className="w-full justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.icon && <item.icon className={`h-4 w-4 shrink-0 ${isSubItemActive || isDirectActive ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-muted-foreground"}`} />}
                          <span className="truncate min-w-0 flex-1 text-[13.5px] font-medium">{item.title}</span>
                        </div>
                        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-0 group-data-[state=closed]/collapsible:-rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="my-1 ml-3.5 pl-2.5 border-l border-border/60 gap-0.5">
                        {item.items.map((subItem) => {
                          const isSubActive =
                            location.pathname === subItem.url ||
                            (subItem.url === "/faculty/classes" &&
                              (location.pathname === "/faculty/schedule/classes" ||
                                location.pathname === "/faculty/classes")) ||
                            (subItem.url === "/faculty/assignments" &&
                              location.pathname === "/faculty/assignments")

                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isSubActive}
                                className="h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all data-[active=true]:bg-indigo-50/90 dark:data-[active=true]:bg-indigo-950/50 data-[active=true]:text-indigo-600 dark:data-[active=true]:text-indigo-400 data-[active=true]:font-semibold"
                              >
                                <Link to={subItem.url} className="truncate min-w-0 flex-1">
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
        
      <SidebarFooter className="border-t border-border/50 p-2.5 gap-2 bg-bg-secondary">
        <InstallAppButton variant="sidebar" />
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-border/40">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-500/20">
              {(user?.name || "Faculty").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1 leading-tight">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.name || "Dr. Rajesh Kumar"}</span>
              <span className="text-[11px] text-muted-foreground truncate">{user?.email || "faculty@aadya.in"}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate("/login")
            }}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
