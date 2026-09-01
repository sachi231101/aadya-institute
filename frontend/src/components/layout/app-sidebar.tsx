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
  UserCheck,
  Sparkles,
  Layers,
  Bot,
  Award,
  FileText,
  ClipboardList,
  Briefcase,
  MessageSquare,
  Building2,
  FolderOpen,
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
import { ROUTES } from "@/constants/routes"

const { ADMIN: A } = ROUTES

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: A.DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      title: "Lead Management",
      url: A.LEADS.ROOT,
      icon: Bot,
      items: [
        { title: "All Leads", url: A.LEADS.ROOT },
        { title: "New Lead", url: A.LEADS.NEW },
        { title: "AI Calling", url: A.LEADS.AI_CALLING },
        { title: "Follow-ups", url: A.LEADS.FOLLOW_UPS },
        { title: "Call History", url: A.LEADS.CALL_HISTORY },
      ],
    },
    {
      title: "Admission Management",
      url: A.ADMISSIONS.ALL,
      icon: Target,
      items: [
        { title: "Enquiries", url: A.ADMISSIONS.ENQUIRIES },
        { title: "Applications", url: A.ADMISSIONS.APPLICATIONS },
        { title: "Admissions", url: A.ADMISSIONS.ALL },
        { title: "Direct Admission", url: A.ADMISSIONS.DIRECT },
        { title: "Admission Documents", url: A.ADMISSIONS.DOCUMENTS },
      ],
    },
    {
      title: "Counsellor Management",
      url: A.COUNSELLORS.ALL,
      icon: UserCheck,
      items: [
        { title: "All Counsellors", url: A.COUNSELLORS.ALL },
        { title: "Lead Allocation", url: A.COUNSELLORS.LEAD_ALLOCATION },
        { title: "Student Allocation", url: A.COUNSELLORS.STUDENT_ALLOCATION },
        { title: "Performance", url: A.COUNSELLORS.PERFORMANCE },
      ],
    },
    {
      title: "Student Management",
      url: A.STUDENTS.ALL,
      icon: GraduationCap,
      items: [
        { title: "All Students", url: A.STUDENTS.ALL },
        { title: "Student Documents", url: A.STUDENTS.DOCUMENTS },
        { title: "Batch Allocation", url: A.STUDENTS.BATCH_ALLOCATION },
        { title: "Attendance", url: A.STUDENTS.ATTENDANCE },
        { title: "Performance", url: A.STUDENTS.PERFORMANCE },
        { title: "Discontinuation Risk", url: A.STUDENTS.DISCONTINUATION },
      ],
    },
    {
      title: "Faculty Management",
      url: A.FACULTY.ALL,
      icon: Users,
      items: [
        { title: "All Faculty", url: A.FACULTY.ALL },
        { title: "Course Assignment", url: A.FACULTY.COURSE_ASSIGNMENT },
        { title: "Batch Assignment", url: A.FACULTY.BATCH_ASSIGNMENT },
        { title: "Attendance", url: A.FACULTY.ATTENDANCE },
        { title: "Performance", url: A.FACULTY.PERFORMANCE },
      ],
    },
    {
      title: "Course Management",
      url: A.COURSES.ALL,
      icon: BookOpen,
      items: [
        { title: "All Courses", url: A.COURSES.ALL },
        { title: "Curriculum", url: A.COURSES.CURRICULUM },
        { title: "Modules", url: A.COURSES.MODULES },
      ],
    },
    {
      title: "Batch Management",
      url: A.BATCHES.ALL,
      icon: FolderOpen,
      items: [
        { title: "All Batches", url: A.BATCHES.ALL },
        { title: "Create Batch", url: A.BATCHES.CREATE },
        { title: "Student Allocation", url: A.BATCHES.STUDENT_ALLOCATION },
        { title: "Faculty Allocation", url: A.BATCHES.FACULTY_ALLOCATION },
      ],
    },
    {
      title: "Class & Schedule",
      url: A.SCHEDULE.CLASSES,
      icon: Calendar,
      items: [
        { title: "Timetable", url: A.SCHEDULE.TIMETABLE },
        { title: "Classes & Sessions", url: A.SCHEDULE.CLASSES },
        { title: "Live Classes", url: A.SCHEDULE.LIVE },
        { title: "Recordings", url: A.SCHEDULE.RECORDINGS },
      ],
    },
    {
      title: "Assignment Management",
      url: A.ASSIGNMENTS.ALL,
      icon: ClipboardList,
      items: [
        { title: "All Assignments", url: A.ASSIGNMENTS.ALL },
        { title: "Create Assignment", url: A.ASSIGNMENTS.CREATE },
        { title: "Submissions", url: A.ASSIGNMENTS.SUBMISSIONS },
        { title: "Reviews", url: A.ASSIGNMENTS.REVIEWS },
      ],
    },
    {
      title: "Examination Management",
      url: A.EXAMS.ALL,
      icon: FileText,
      items: [
        { title: "All Examinations", url: A.EXAMS.ALL },
        { title: "Create Examination", url: A.EXAMS.CREATE },
        { title: "Question Bank", url: A.EXAMS.QUESTION_BANK },
        { title: "Results", url: A.EXAMS.RESULTS },
      ],
    },
    {
      title: "Fee Management",
      url: A.FEES.PAYMENTS,
      icon: CreditCard,
      items: [
        { title: "Fee Plans", url: A.FEES.PLANS },
        { title: "Student Fees", url: A.FEES.STUDENT_FEES },
        { title: "Payments", url: A.FEES.PAYMENTS },
        { title: "Pending Fees", url: A.FEES.PENDING },
        { title: "Receipts", url: A.FEES.RECEIPTS },
        { title: "Fee Reports", url: A.FEES.REPORTS },
      ],
    },
    {
      title: "Target & Incentive",
      url: A.TARGETS.ALL,
      icon: Award,
      items: [
        { title: "Targets", url: A.TARGETS.ALL },
        { title: "Target Assignments", url: A.TARGETS.ASSIGNMENTS },
        { title: "Leaderboard", url: A.TARGETS.LEADERBOARD },
        { title: "Incentive Approvals", url: A.TARGETS.INCENTIVES },
      ],
    },
    {
      title: "Report Management",
      url: A.REPORTS.STUDENTS,
      icon: BarChart3,
      items: [
        { title: "Student Reports", url: A.REPORTS.STUDENTS },
        { title: "Admission Reports", url: A.REPORTS.ADMISSIONS },
        { title: "Attendance Reports", url: A.REPORTS.ATTENDANCE },
        { title: "Faculty Reports", url: A.REPORTS.FACULTY },
        { title: "Course Reports", url: A.REPORTS.COURSES },
        { title: "Examination Reports", url: A.REPORTS.EXAMINATIONS },
        { title: "Finance Reports", url: A.REPORTS.FINANCE },
      ],
    },
    {
      title: "Communication",
      url: A.COMMUNICATION.NOTIFICATIONS,
      icon: MessageSquare,
      items: [
        { title: "Notifications", url: A.COMMUNICATION.NOTIFICATIONS },
        { title: "WhatsApp", url: A.COMMUNICATION.WHATSAPP },
        { title: "Email", url: A.COMMUNICATION.EMAIL },
        { title: "Automation", url: A.COMMUNICATION.AUTOMATION },
      ],
    },
    {
      title: "Placement Management",
      url: A.PLACEMENT.ELIGIBLE,
      icon: Briefcase,
      items: [
        { title: "Eligible Students", url: A.PLACEMENT.ELIGIBLE },
        { title: "Companies", url: A.PLACEMENT.COMPANIES },
        { title: "Jobs", url: A.PLACEMENT.JOBS },
        { title: "Applications", url: A.PLACEMENT.APPLICATIONS },
        { title: "Interviews", url: A.PLACEMENT.INTERVIEWS },
        { title: "Placements", url: A.PLACEMENT.PLACEMENTS },
      ],
    },
    {
      title: "Administration",
      url: A.ADMINISTRATION.ORGANIZATION,
      icon: Building2,
      items: [
        { title: "Organization", url: A.ADMINISTRATION.ORGANIZATION },
        { title: "Centers & Branches", url: A.ADMINISTRATION.BRANCHES },
        { title: "Users", url: A.ADMINISTRATION.USERS },
        { title: "Roles & Permissions", url: A.ADMINISTRATION.ROLES },
        { title: "Masters", url: A.ADMINISTRATION.MASTERS },
        { title: "Integrations", url: A.ADMINISTRATION.INTEGRATIONS },
        { title: "Subscription & Billing", url: A.ADMINISTRATION.BILLING },
        { title: "Audit Logs", url: A.ADMINISTRATION.AUDIT_LOGS },
        { title: "Settings", url: A.ADMINISTRATION.SETTINGS },
      ],
    },
    {
      title: "ASK ME",
      url: A.ASK_ME,
      icon: Sparkles,
      isAi: true,
    },
  ],
}

function isPathActive(pathname: string, url: string) {
  if (url === A.LEADS.ROOT) {
    return pathname === url || pathname === `${url}/all` || pathname.startsWith(`${url}/`) && !["ai-calling", "follow-ups", "call-history", "new", "add"].some(s => pathname.includes(s))
  }
  return pathname === url || pathname.startsWith(`${url}/`)
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
              <Link to={A.DASHBOARD}>
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
              const isItemActive = location.pathname === item.url
              const isGroupActive = item.items?.some((sub) => isPathActive(location.pathname, sub.url))

              if (item.isAi) {
                return (
                  <SidebarMenuItem key={item.title} className="mb-2">
                    <SidebarMenuButton
                      asChild
                      isActive={isItemActive}
                      tooltip={item.title}
                      className={isItemActive
                        ? "bg-[#1769AA] text-white font-bold rounded-xl shadow-xs"
                        : "bg-blue-50/80 hover:bg-blue-100/90 text-[#1769AA] font-bold border border-blue-200/60 rounded-xl transition-all"
                      }
                    >
                      <Link to={item.url!} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Sparkles className={`h-4 w-4 shrink-0 ${isItemActive ? "text-white fill-white" : "text-[#1769AA]"}`} />
                          <span className="tracking-wide">✦ ASK ME</span>
                        </div>
                        <span className={`${isItemActive ? "bg-white/20 text-white" : "bg-[#1769AA] text-white"} text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs`}>
                          AI
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }

              if (!item.items) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isItemActive} tooltip={item.title}>
                      <Link to={item.url!}>
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
                  defaultOpen={isGroupActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={isGroupActive}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isPathActive(location.pathname, subItem.url)}
                              className="transition-all duration-150 rounded-lg hover:text-[#1769AA] hover:bg-blue-50/50 data-[active=true]:bg-blue-50/90 data-[active=true]:text-[#1769AA] data-[active=true]:font-semibold"
                            >
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
        <div className="px-2 pt-2">
          <InstallAppButton variant="sidebar" />
        </div>
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
