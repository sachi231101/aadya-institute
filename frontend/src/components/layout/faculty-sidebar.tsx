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
    title: "Class Recordings",
    url: "/faculty/recordings",
    icon: FileVideo,
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
  const { organization } = useOrganization()

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/50 bg-bg-secondary">
      <SidebarHeader className="h-12 border-b border-[#334155] bg-[#172033] text-white px-3 flex flex-row items-center">
        <Link
          to="/faculty/dashboard"
          className="flex items-center justify-between gap-2 px-1 py-0.5 rounded-lg hover:bg-white/5 transition-colors w-full group-data-[collapsible=icon]:justify-center"
          title="Aadya Institute"
        >
          <img
            src="/aadya-logo.png"
            alt="Aadya Institute"
            className="h-6.5 w-auto max-w-[125px] object-contain shrink-0 drop-shadow-[0_0_1px_rgba(255,255,255,0.35)] group-data-[collapsible=icon]:max-w-[26px] group-data-[collapsible=icon]:object-left"
          />
          <span className="text-[10px] text-indigo-300 font-bold tracking-wider bg-white/10 border border-white/20 px-2 py-0.5 rounded-full shrink-0 group-data-[collapsible=icon]:hidden">
            FACULTY
          </span>
        </Link>
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
                        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-0 group-data-[state=closed]/collapsible:-rotate-90 group-data-[collapsible=icon]:hidden" />
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
        
      <SidebarFooter className="border-t border-border/50 p-2.5 bg-bg-secondary empty:hidden">
        <InstallAppButton variant="sidebar" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
