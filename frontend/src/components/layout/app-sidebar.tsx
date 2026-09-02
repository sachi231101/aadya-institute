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
import { NAV_ITEM_LABELS } from "@/constants/nav-labels"

const { ADMIN: A } = ROUTES
const L = NAV_ITEM_LABELS

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
        { title: L["admissions.enquiries"] ?? "Enquiries", url: A.ADMISSIONS.ENQUIRIES },
        { title: L["admissions.applications"] ?? "Admission Applications", url: A.ADMISSIONS.APPLICATIONS },
        { title: L["admissions.all"] ?? "Admissions", url: A.ADMISSIONS.ALL },
      ],
    },
    {
      title: "Counsellor Management",
      url: A.COUNSELLORS.ALL,
      icon: UserCheck,
      items: [
        { title: L["counsellor.all"] ?? "All Counsellors", url: A.COUNSELLORS.ALL },
        { title: L["counsellor.lead_allocation"] ?? "Assign Leads to Counsellors", url: A.COUNSELLORS.LEAD_ALLOCATION },
        { title: L["counsellor.performance"] ?? "Counsellor Performance", url: A.COUNSELLORS.PERFORMANCE },
      ],
    },
    {
      title: "Student Management",
      url: A.STUDENTS.ALL,
      icon: GraduationCap,
      items: [
        { title: L["students.all"] ?? "All Students", url: A.STUDENTS.ALL },
        { title: L["students.documents"] ?? "Student Documents", url: A.STUDENTS.DOCUMENTS },
        { title: L["students.student_allocation"] ?? "Assign Students to Batches", url: A.STUDENTS.STUDENT_ALLOCATION },
        { title: L["students.attendance"] ?? "Student Attendance", url: A.STUDENTS.ATTENDANCE },
        { title: L["students.performance"] ?? "Academic Performance", url: A.STUDENTS.PERFORMANCE },
        { title: L["students.discontinuation"] ?? "Discontinuation Risk", url: A.STUDENTS.DISCONTINUATION },
      ],
    },
    {
      title: "Faculty Management",
      url: A.FACULTY.ALL,
      icon: Users,
      items: [
        { title: L["faculty.all"] ?? "All Faculty", url: A.FACULTY.ALL },
        { title: L["faculty.attendance"] ?? "Faculty Attendance", url: A.FACULTY.ATTENDANCE },
        { title: L["faculty.performance"] ?? "Faculty Ratings & Feedback", url: A.FACULTY.PERFORMANCE },
      ],
    },
    {
      title: "Course Management",
      url: A.COURSES.ALL,
      icon: BookOpen,
      items: [
        { title: L["courses.all"] ?? "All Courses", url: A.COURSES.ALL },
        { title: L["courses.curriculum"] ?? "Course Curriculum", url: A.COURSES.CURRICULUM },
        { title: L["courses.course_assignment"] ?? "Assign Faculty to Courses", url: A.COURSES.COURSE_ASSIGNMENT },
      ],
    },
    {
      title: "Batch Management",
      url: A.BATCHES.ALL,
      icon: FolderOpen,
      items: [
        { title: "All Batches", url: A.BATCHES.ALL },
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
        { title: L["assignments.all"] ?? "All Assignments", url: A.ASSIGNMENTS.ALL },
        { title: L["assignments.create"] ?? "Create Assignment", url: A.ASSIGNMENTS.CREATE },
        { title: L["assignments.submissions"] ?? "Submissions Queue", url: A.ASSIGNMENTS.SUBMISSIONS },
        { title: L["assignments.reviews"] ?? "Grading Queue", url: A.ASSIGNMENTS.REVIEWS },
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
        { title: L["fees.reports"] ?? "Fee Collection Reports", url: A.FEES.REPORTS },
      ],
    },
    {
      title: "Target & Incentive",
      url: A.TARGETS.ALL,
      icon: Award,
      items: [
        { title: L["targets.all"] ?? "Target Plans & Assignments", url: A.TARGETS.ALL },
        { title: L["targets.leaderboard"] ?? "Leaderboard", url: A.TARGETS.LEADERBOARD },
        { title: L["targets.incentives"] ?? "Incentive Approvals", url: A.TARGETS.INCENTIVES },
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
        { title: L["reports.financial"] ?? "Revenue & Finance Reports", url: A.REPORTS.FINANCE },
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
        { title: L["communication.automation"] ?? "Message Automation Rules", url: A.COMMUNICATION.AUTOMATION },
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
        { title: L["placement.applications"] ?? "Job Applications", url: A.PLACEMENT.APPLICATIONS },
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
      <SidebarHeader className="border-b border-border/40 py-3 px-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-accent/60 rounded-xl transition-all">
              <Link to={A.DASHBOARD} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-border/60 shadow-2xs shrink-0 p-1">
                  <img src="/aadya-logo.png" alt="Aadya Institute" className="h-7 w-auto object-contain" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none min-w-0 flex-1">
                  <span className="font-bold text-sm tracking-tight text-text-primary truncate">Aadya Portal</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#1769AA] dark:text-sky-400 font-extrabold tracking-wider bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                      ADMIN
                    </span>
                    <span className="text-[10px] text-muted-foreground">Workspace</span>
                  </div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup className="p-0">
          <SidebarMenu className="gap-1">
            {data.navMain.map((item) => {
              const isItemActive = location.pathname === item.url
              const isGroupActive = item.items?.some((sub) => isPathActive(location.pathname, sub.url))

              if (!item.items) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isItemActive} tooltip={item.title}>
                      <Link to={item.url!} className="flex items-center gap-2.5 w-full">
                        {item.icon && <item.icon className={`h-4 w-4 shrink-0 ${isItemActive ? "text-primary font-semibold" : "text-muted-foreground"}`} />}
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
                  defaultOpen={isGroupActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={isGroupActive} className="w-full justify-between">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.icon && <item.icon className={`h-4 w-4 shrink-0 ${isGroupActive ? "text-primary font-semibold" : "text-muted-foreground"}`} />}
                          <span className="truncate min-w-0 flex-1 text-[13.5px] font-medium">{item.title}</span>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="my-1 ml-3.5 pl-2.5 border-l border-border/60 gap-0.5">
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isPathActive(location.pathname, subItem.url)}
                              className="h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all data-[active=true]:bg-blue-50/90 dark:data-[active=true]:bg-blue-950/50 data-[active=true]:text-[#1769AA] dark:data-[active=true]:text-sky-400 data-[active=true]:font-semibold"
                            >
                              <Link to={subItem.url} className="truncate min-w-0 flex-1">
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

      <SidebarFooter className="border-t border-border/50 p-2.5 gap-2 bg-bg-secondary">
        <InstallAppButton variant="sidebar" />
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-border/40">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-full bg-[#1769AA]/10 text-[#1769AA] dark:text-sky-400 font-bold text-xs flex items-center justify-center shrink-0 border border-[#1769AA]/20">
              {(user?.name || "Admin").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1 leading-tight">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.name || "Aadya System Admin"}</span>
              <span className="text-[11px] text-muted-foreground truncate">{user?.email || "admin@aadya.in"}</span>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            title="Logout"
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <LogOut size={15} />
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

