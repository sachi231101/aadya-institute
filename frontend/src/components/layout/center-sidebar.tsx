import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  BookOpen,
  LayoutDashboard,
  Settings,
  Target,
  ChevronRight,
  LogOut,
  Sparkles,
  Bot
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

const centerNavItems = [
  {
    title: "ASK ME",
    url: "/center/ask-me",
    icon: Sparkles,
    isActive: false,
    isAi: true,
  },
  {
    title: "Dashboard",
    url: "/center/dashboard",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Leads & AI Calling",
    url: "/center/leads",
    icon: Bot,
    isActive: false,
    items: [
      { title: "All Leads", url: "/center/leads" },
      { title: "Add Lead", url: "/center/leads/add" },
    ],
  },
  {
    title: "Admissions",
    url: "/center/admissions/all",
    icon: Target,
    isActive: false,
    items: [
      { title: "All Admissions", url: "/center/admissions/all" },
      { title: "Applications", url: "/center/admissions/applications" },
      { title: "Enquiries", url: "/center/admissions/enquiries" },
    ],
  },
  {
    title: "Courses",
    url: "/center/courses/all",
    icon: BookOpen,
    isActive: false,
    items: [
      { title: "All Courses", url: "/center/courses/all" },
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
              <Link to="/center/home">
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
                              className={`h-4 w-4 shrink-0 ${
                                isDirectActive ? "text-white fill-white" : "text-[#1769AA]"
                              }`}
                            />
                            <span className="tracking-wide">✦ ASK ME</span>
                          </div>
                          <span
                            className={`${
                              isDirectActive ? "bg-white/20 text-white" : "bg-[#1769AA] text-white"
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
        <div className="px-2 pt-2">
          <InstallAppButton variant="sidebar" />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between p-2">
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-sm font-semibold truncate">{user?.name || "Center Manager"}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email || "center.manager@aadya.in"}</span>
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
