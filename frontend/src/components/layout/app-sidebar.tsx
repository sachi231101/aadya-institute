import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
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
  Shield,
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

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Center Manager",
      url: "/administration",
      icon: Shield,
      isActive: false,
    },
    {
      title: "Students",
      url: "/admin/students",
      icon: GraduationCap,
      isActive: false,
      items: [
        { title: "All Students", url: "/admin/students/all" },
        { title: "Attendance", url: "/admin/students/attendance" },
      ],
    },
    {
      title: "Faculty",
      url: "/admin/faculty",
      icon: Users,
      isActive: false,
      items: [
        { title: "All Faculty", url: "/admin/faculty/all" },
        { title: "Assigned Courses", url: "/admin/faculty/courses" },
        { title: "Attendance", url: "/admin/faculty/attendance" },
      ],
    },
    {
      title: "Courses",
      url: "/admin/courses",
      icon: BookOpen,
      isActive: false,
      items: [
        { title: "All Courses", url: "/admin/courses/all" },
        { title: "Batches", url: "/admin/courses/batches" },
        { title: "Curriculum", url: "/admin/courses/curriculum" },
      ],
    },
    {
      title: "Admissions / Leads",
      url: "/admin/admissions",
      icon: Target,
      isActive: false,
      items: [
        { title: "Enquiries", url: "/admin/admissions/enquiries" },
        { title: "Applications", url: "/admin/admissions/applications" },
        { title: "All Admissions", url: "/admin/admissions/all" },
      ],
    },
    {
      title: "Counsellor",
      url: "/admin/counselor/overview",
      icon: UserCheck,
      isActive: false,
      items: [
        { title: "Overview", url: "/admin/counselor/overview" },
        { title: "Manage Counsellors", url: "/admin/counselor/all" },
        { title: "Create & Manage Batches", url: "/admin/counselor/batches" },
        { title: "Assign Students", url: "/admin/counselor/assign-students" },
        { title: "Assign Faculty", url: "/admin/counselor/assign-faculty" },
      ],
    },
    {
      title: "Schedule",
      url: "/admin/schedule",
      icon: Calendar,
      isActive: false,
      items: [
        { title: "Classes", url: "/admin/schedule/classes" },
        { title: "Timetable", url: "/admin/schedule/timetable" },
        { title: "Upcoming Classes", url: "/admin/schedule/upcoming" },
      ],
    },
    {
      title: "Fees",
      url: "/admin/fees",
      icon: CreditCard,
      isActive: false,
      items: [
        { title: "Payments", url: "/admin/fees/payments" },
        { title: "Pending Fees", url: "/admin/fees/pending" },
        { title: "Fee Reports", url: "/admin/fees/reports" },
      ],
    },
    {
      title: "Reports",
      url: "/admin/reports",
      icon: BarChart3,
      isActive: false,
      items: [
        { title: "Student Reports", url: "/admin/reports/students" },
        { title: "Faculty Reports", url: "/admin/reports/faculty" },
        { title: "Course Reports", url: "/admin/reports/courses" },
        { title: "Financial Reports", url: "/admin/reports/financial" },
      ],
    },
    {
      title: "Notifications",
      url: "/admin/notifications",
      icon: Bell,
      isActive: false,
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings,
      isActive: false,
    },

  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/50 bg-bg-secondary">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/admin/dashboard">
                <img src="/aadya-logo.png" alt="Aadya Institute" className="h-7 w-auto object-contain" />
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-text-primary">Aadya Portal</span>
                  <span className="text-xs text-accent-primary font-bold">ADMIN</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item) => {
              const isPathActive = location.pathname.startsWith(item.url)

              if (!item.items) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url} tooltip={item.title}>
                      <Link to={item.url}>
                        {item.icon && <item.icon />}
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
                  defaultOpen={isPathActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={isPathActive}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={location.pathname === subItem.url}>
                              <Link to={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
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
                <span className="text-sm font-semibold truncate">{user?.name || "Aadya Admin"}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email || "admin@aadya.in"}</span>
              </div>
              <button onClick={() => {
                logout();
                navigate("/login");
              }} className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
