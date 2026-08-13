import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Calendar,
  BarChart3,
  Settings,
  ChevronRight,
  LogOut
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

const facultyNavItems = [
  {
    title: "Dashboard",
    url: "/faculty/dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "My Batches & Courses",
    url: "/faculty/courses",
    icon: BookOpen,
    isActive: false,
  },
  {
    title: "Students & Attendance",
    url: "/faculty/students/attendance",
    icon: GraduationCap,
    isActive: false,
    items: [
      { title: "Attendance Desk", url: "/faculty/students/attendance" },
      { title: "Enrolled Students", url: "/faculty/students/all" },
    ],
  },
  {
    title: "Class Schedule",
    url: "/faculty/schedule/classes",
    icon: Calendar,
    isActive: false,
  },
  {
    title: "Student Performance",
    url: "/faculty/reports/students",
    icon: BarChart3,
    isActive: false,
  },
  {
    title: "Settings",
    url: "/faculty/settings",
    icon: Settings,
    isActive: false,
  },
]

export function FacultySidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/50 bg-bg-secondary">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/faculty/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-amber-600 text-sidebar-primary-foreground font-bold">
                  F
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-amber-700">Aadya Portal</span>
                  <span className="truncate text-xs font-semibold text-amber-600">FACULTY MEMBER</span>
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
                      className={isDirectActive ? "bg-amber-500/10 text-amber-700 font-medium" : ""}
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
                        className={isSubItemActive ? "text-amber-700 font-medium" : ""}
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
                                className={isSubActive ? "bg-amber-500/10 text-amber-700 font-semibold" : ""}
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
                <span className="truncate font-semibold">{user?.name || "Prof. Dr. Rajesh Sharma"}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email || "faculty@aadya.in"}</span>
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
