import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
  Target,
  CreditCard,
  ChevronRight,
  LogOut,
  UserCheck
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

const centerNavItems = [
  {
    title: "Dashboard",
    url: "/center/dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Students",
    url: "/center/students/all",
    icon: GraduationCap,
    isActive: false,
    items: [
      { title: "All Students", url: "/center/students/all" },
      { title: "Add Student", url: "/center/students/add" },
      { title: "Attendance", url: "/center/students/attendance" },
      { title: "Performance", url: "/center/students/performance" },
    ],
  },
  {
    title: "Counsellor",
    url: "/center/counselor/overview",
    icon: UserCheck,
    isActive: false,
    items: [
      { title: "Overview", url: "/center/counselor/overview" },
      { title: "Manage Counsellors", url: "/center/counselor/all" },
      { title: "Create & Manage Batches", url: "/center/counselor/batches" },
      { title: "Assign Students", url: "/center/counselor/assign-students" },
      { title: "Assign Faculty", url: "/center/counselor/assign-faculty" },
    ],
  },
  {
    title: "Faculty",
    url: "/center/faculty/all",
    icon: Users,
    isActive: false,
    items: [
      { title: "All Faculty", url: "/center/faculty/all" },
      { title: "Add Faculty", url: "/center/faculty/add" },
      { title: "Assigned Courses", url: "/center/faculty/courses" },
      { title: "Attendance", url: "/center/faculty/attendance" },
    ],
  },
  {
    title: "Fees",
    url: "/center/fees/payments",
    icon: CreditCard,
    isActive: false,
    items: [
      { title: "Payments", url: "/center/fees/payments" },
      { title: "Pending Fees", url: "/center/fees/pending" },
      { title: "Fee Reports", url: "/center/fees/reports" },
    ],
  },
  {
    title: "Admissions / Leads",
    url: "/center/admissions/enquiries",
    icon: Target,
    isActive: false,
    items: [
      { title: "Enquiries", url: "/center/admissions/enquiries" },
      { title: "Applications", url: "/center/admissions/applications" },
      { title: "All Admissions", url: "/center/admissions/all" },
    ],
  },
  {
    title: "Courses",
    url: "/center/courses/all",
    icon: BookOpen,
    isActive: false,
    items: [
      { title: "All Courses", url: "/center/courses/all" },
      { title: "Add Course", url: "/center/courses/add" },
      { title: "Batches", url: "/center/courses/batches" },
      { title: "Curriculum", url: "/center/courses/curriculum" },
    ],
  },
  {
    title: "Settings",
    url: "/center/settings",
    icon: Settings,
    isActive: false,
  },
]

export function CenterSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/50 bg-bg-secondary">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/center/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#1769AA] text-sidebar-primary-foreground font-bold">
                  A
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-[#1769AA]">Aadya Portal</span>
                  <span className="truncate text-xs font-semibold text-amber-600">CENTER MANAGER</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {centerNavItems.map((item) => {
              const isSubItemActive = item.items?.some((subItem) => location.pathname === subItem.url)
              const isDirectActive = location.pathname === item.url
              const isExpanded = isSubItemActive || isDirectActive

              if (!item.items) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isDirectActive}
                      tooltip={item.title}
                      className={isDirectActive ? "bg-accent-primary/10 text-accent-primary font-medium" : ""}
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
                        className={isSubItemActive ? "text-accent-primary font-medium" : ""}
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
                                className={isSubActive ? "bg-accent-primary/10 text-accent-primary font-semibold" : ""}
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user?.name || "Center Manager"}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email || "center.manager@aadya.in"}</span>
              </div>
              <button
                onClick={() => {
                  logout()
                  navigate("/login")
                }}
                className="text-muted-foreground hover:text-destructive transition-colors ml-auto p-1"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
