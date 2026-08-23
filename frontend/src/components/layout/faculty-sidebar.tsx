import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  BarChart3,
  Settings,
  ChevronRight,
  LogOut,
  Sparkles,
  FileText,
  BookMarked,
  Megaphone,
  ShieldCheck,
  ChevronDown
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const facultyNavItems = [
  {
    title: "+ ASK ME",
    url: "/faculty/ask-me",
    icon: Sparkles,
    isActive: false,
    isAi: true,
  },
  {
    title: "Dashboard",
    url: "/faculty/dashboard",
    icon: LayoutDashboard,
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
    title: "Assignments",
    url: "/faculty/assignments",
    icon: FileText,
  },
  {
    title: "Student Performance",
    url: "/faculty/reports/students",
    icon: BarChart3,
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
  const facultyName = user?.name || "Ramesh Kumar"
  const facultyEmail = user?.email || "ramesh@aadya.in"

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-slate-200/80 bg-white">
      <SidebarHeader className="p-3 border-b border-slate-100">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link to="/faculty/dashboard" className="flex items-center gap-3">
                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#3B82F6] text-white shadow-xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-black text-slate-900 tracking-tight text-sm">Aadya Portal</span>
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
                      className={`text-xs font-semibold rounded-xl transition-colors ${
                        isDirectActive
                          ? "bg-[#5B50EC] text-white font-bold shadow-xs hover:bg-[#4F46E5] hover:text-white"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Link to={item.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-4 w-4 ${isDirectActive ? "text-white stroke-[2.2]" : "text-slate-400 stroke-[1.8]"}`} />
                          <span>{item.title}</span>
                        </div>
                        {(item as any).badge && (
                          <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {(item as any).badge}
                          </span>
                        )}
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
                        isActive={isSubItemActive}
                        className={`text-xs font-semibold rounded-xl transition-colors ${
                          isSubItemActive
                            ? "text-[#5B50EC] font-bold bg-indigo-50/60"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        {item.icon && <item.icon className={`h-4 w-4 ${isSubItemActive ? "text-[#5B50EC]" : "text-slate-400"}`} />}
                        <span>{item.title}</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-0 group-data-[state=closed]/collapsible:-rotate-90 text-slate-400" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-3.5 border-l-2 border-slate-100 pl-2 space-y-1">
                        {item.items.map((subItem) => {
                          const isSubActive = location.pathname === subItem.url
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isSubActive}
                                className={`text-xs rounded-lg transition-colors ${
                                  isSubActive 
                                    ? "bg-[#5B50EC] text-white font-bold shadow-xs hover:bg-[#4F46E5] hover:text-white" 
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                                }`}
                              >
                                <Link to={subItem.url} className="flex items-center justify-between">
                                  <span>{subItem.title}</span>
                                  {isSubActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto" />
                                  )}
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

      <SidebarFooter className="p-3 border-t border-slate-100">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between p-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar className="h-8 w-8 rounded-lg border border-slate-200 bg-blue-600 text-white font-bold text-xs">
                  <AvatarImage src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} alt={facultyName} />
                  <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                    RK
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-xs font-bold text-slate-800 truncate">{facultyName}</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate">{facultyEmail}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate("/login")
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
