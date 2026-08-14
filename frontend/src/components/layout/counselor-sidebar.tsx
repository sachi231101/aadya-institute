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

const counselorNavItems = [
  {
    title: "Dashboard",
    url: "/counselor/dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Admissions / Leads",
    url: "/counselor/admissions/enquiries",
    icon: Target,
    isActive: false,
    items: [
      { title: "Enquiries", url: "/counselor/admissions/enquiries" },
      { title: "Applications", url: "/counselor/admissions/applications" },
      { title: "All Admissions", url: "/counselor/admissions/all" },
    ],
  },
  {
    title: "Students",
    url: "/counselor/students/all",
    icon: GraduationCap,
    isActive: false,
    items: [
      { title: "All Students", url: "/counselor/students/all" },
      { title: "Attendance", url: "/counselor/students/attendance" },
    ],
  },
  {
    title: "Faculty",
    url: "/counselor/faculty/all",
    icon: Users,
    isActive: false,
    items: [
      { title: "All Faculty", url: "/counselor/faculty/all" },
      { title: "Assigned Courses", url: "/counselor/faculty/courses" },
      { title: "Attendance", url: "/counselor/faculty/attendance" },
    ],
  },
  {
    title: "Fees",
    url: "/counselor/fees/payments",
    icon: CreditCard,
    isActive: false,
    items: [
      { title: "Payments", url: "/counselor/fees/payments" },
      { title: "Pending Fees", url: "/counselor/fees/pending" },
      { title: "Fee Reports", url: "/counselor/fees/reports" },
    ],
  },
  {
    title: "Reports",
    url: "/counselor/reports/students",
    icon: BarChart3,
    isActive: false,
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
    isActive: false,
  },
]

export function CounselorSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/50 bg-bg-secondary">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/counselor/dashboard">
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
            {counselorNavItems.map((item) => {
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
