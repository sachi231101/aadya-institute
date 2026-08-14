import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Bell, 
  UserPlus, 
  DollarSign, 
  AlertTriangle, 
  PhoneCall, 
  Calendar, 
  CheckCheck, 
  Search, 
  Trash2, 
  Check, 
  ExternalLink, 
  Loader2, 
  SlidersHorizontal,
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  Target,
  BookOpen,
  Settings as SettingsIcon,
  Video,
  FileText,
  BarChart3,
  CheckSquare,
  Info
} from "lucide-react";
import { 
  useGetNotifications, 
  useMarkAsRead, 
  useMarkAllAsRead, 
  useDeleteNotification 
} from "../../../hooks/useNotifications";
import type { NotificationType, NotificationItem } from "../../../services/notifications.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isCenter = location.pathname.startsWith("/center") || (userRoles.includes("CENTER_MANAGER") && !userRoles.includes("ADMIN"));
  const isFaculty = location.pathname.startsWith("/faculty") || (userRoles.includes("FACULTY") && !userRoles.includes("ADMIN"));
  const isStudent = location.pathname.startsWith("/student") || (userRoles.includes("STUDENT") && !userRoles.includes("ADMIN"));
  const isCounselor = location.pathname.startsWith("/counselor") || (userRoles.includes("COUNSELLOR") && !userRoles.includes("ADMIN"));

  const rolePrefix = isCenter ? "/center" : isFaculty ? "/faculty" : isStudent ? "/student" : isCounselor ? "/counselor" : "/admin";
  const roleParam = isCenter ? "CENTER_MANAGER" : isFaculty ? "FACULTY" : isStudent ? "STUDENT" : isCounselor ? "COUNSELLOR" : undefined;

  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const isRoleSpecific = isCenter || isFaculty || isStudent || isCounselor;

  const filters = {
    page,
    limit: 15,
    role: roleParam,
    module: isRoleSpecific && selectedFilter !== "ALL" ? selectedFilter : undefined,
    type: !isRoleSpecific && selectedFilter !== "ALL" ? (selectedFilter as NotificationType) : undefined,
    unreadOnly,
    search: search || undefined,
  };

  const { data, isLoading, isError, refetch } = useGetNotifications(filters);
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAsReadMutation.mutateAsync(id);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotificationMutation.mutateAsync(id);
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id);
    }
    if (item.link) {
      const mappedLink = item.link.replace(/^\/(admin|center|faculty|student|counselor)/, rolePrefix);
      navigate(mappedLink);
    }
  };

  const getModuleLabel = (item: NotificationItem) => {
    const mod = item.module?.toLowerCase();
    switch (mod) {
      case "students":
        return "Students";
      case "attendance":
        return "Attendance";
      case "schedule":
        return "Schedule";
      case "assignments":
        return "Assignments";
      case "recordings":
        return "Recordings";
      case "reports":
        return "Reports";
      case "fees":
        return "Fees";
      case "admissions":
        return "Admissions";
      case "courses":
        return "Courses";
      case "counsellor":
      case "counselor":
        return "Counsellor";
      case "faculty":
        return "Faculty";
      case "settings":
        return "Settings";
      case "dashboard":
        return "Dashboard";
      default:
        return item.type || "General";
    }
  };

  const renderIcon = (type: NotificationType, module?: string) => {
    const mod = module?.toLowerCase();
    if (mod === "fees" || type === "PAYMENT") {
      return <DollarSign className="h-5 w-5 text-emerald-600" />;
    }
    if (mod === "admissions" || type === "ADMISSION") {
      return <Target className="h-5 w-5 text-blue-600" />;
    }
    if (mod === "counsellor" || type === "AI_CALL") {
      return <PhoneCall className="h-5 w-5 text-purple-600" />;
    }
    if (mod === "attendance" || type === "ATTENDANCE") {
      return <CheckSquare className="h-5 w-5 text-emerald-600" />;
    }
    if (mod === "students" || type === "DISCONTINUATION_RISK") {
      return <AlertTriangle className="h-5 w-5 text-rose-600" />;
    }
    if (mod === "faculty") {
      return <Users className="h-5 w-5 text-indigo-600" />;
    }
    if (mod === "courses" || type === "CLASS_SESSION") {
      return <BookOpen className="h-5 w-5 text-teal-600" />;
    }
    if (mod === "schedule") {
      return <Calendar className="h-5 w-5 text-indigo-600" />;
    }
    if (mod === "assignments" || type === "ASSIGNMENT") {
      return <FileText className="h-5 w-5 text-amber-600" />;
    }
    if (mod === "recordings") {
      return <Video className="h-5 w-5 text-violet-600" />;
    }
    if (mod === "reports") {
      return <BarChart3 className="h-5 w-5 text-sky-600" />;
    }
    if (mod === "settings") {
      return <SettingsIcon className="h-5 w-5 text-slate-600" />;
    }
    if (mod === "dashboard") {
      return <LayoutDashboard className="h-5 w-5 text-[#1769AA]" />;
    }
    return <Bell className="h-5 w-5 text-slate-600" />;
  };

  const renderBadge = (item: NotificationItem) => {
    const mod = item.module?.toLowerCase();
    if (mod === "students") {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Students</Badge>;
    }
    if (mod === "attendance") {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Attendance</Badge>;
    }
    if (mod === "schedule") {
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Schedule</Badge>;
    }
    if (mod === "assignments") {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Assignments</Badge>;
    }
    if (mod === "recordings") {
      return <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">Recordings</Badge>;
    }
    if (mod === "reports") {
      return <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">Reports</Badge>;
    }
    if (mod === "fees") {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Fees</Badge>;
    }
    if (mod === "admissions") {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Admissions / Leads</Badge>;
    }
    if (mod === "courses") {
      return <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">Courses</Badge>;
    }
    if (mod === "counsellor" || mod === "counselor") {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Counsellor</Badge>;
    }
    if (mod === "faculty") {
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Faculty</Badge>;
    }
    if (mod === "settings") {
      return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Settings</Badge>;
    }
    if (mod === "dashboard") {
      return <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">Dashboard</Badge>;
    }

    switch (item.type) {
      case "ADMISSION":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Admission</Badge>;
      case "PAYMENT":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Payment</Badge>;
      case "DISCONTINUATION_RISK":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Risk Alert</Badge>;
      case "ATTENDANCE":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Attendance</Badge>;
      case "AI_CALL":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">AI Call</Badge>;
      case "CLASS_SESSION":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Schedule</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">System</Badge>;
    }
  };

  const centerTabs = [
    { id: "ALL", label: "All Center Alerts" },
    { id: "dashboard", label: "Dashboard" },
    { id: "students", label: "Students" },
    { id: "counsellor", label: "Counsellor" },
    { id: "faculty", label: "Faculty" },
    { id: "fees", label: "Fees" },
    { id: "admissions", label: "Admissions / Leads" },
    { id: "courses", label: "Courses" },
    { id: "settings", label: "Settings" },
  ];

  const facultyTabs = [
    { id: "ALL", label: "All Faculty Alerts" },
    { id: "dashboard", label: "Dashboard" },
    { id: "courses", label: "My Batches & Courses" },
    { id: "students", label: "Students & Attendance" },
    { id: "schedule", label: "Class Schedule" },
    { id: "assignments", label: "Assignments" },
    { id: "reports", label: "Student Reports" },
    { id: "settings", label: "Settings" },
  ];

  const studentTabs = [
    { id: "ALL", label: "All Student Alerts" },
    { id: "dashboard", label: "Dashboard" },
    { id: "attendance", label: "Attendance" },
    { id: "schedule", label: "Class Schedule" },
    { id: "assignments", label: "Assignments" },
    { id: "recordings", label: "Video Recordings" },
    { id: "settings", label: "Settings" },
  ];

  const adminTabs = [
    { id: "ALL", label: "All Alerts" },
    { id: "ADMISSION", label: "Admissions" },
    { id: "PAYMENT", label: "Payments" },
    { id: "DISCONTINUATION_RISK", label: "Discontinuation Risks" },
    { id: "ATTENDANCE", label: "Attendance" },
    { id: "AI_CALL", label: "AI Calls" },
    { id: "CLASS_SESSION", label: "Class Schedules" },
  ];

  const tabs = isCenter ? centerTabs : isFaculty ? facultyTabs : isStudent ? studentTabs : adminTabs;

  const headerTitle = isCenter
    ? "Center Operations Alerts & Notifications"
    : isFaculty
    ? "Faculty Alerts & Notification Desk"
    : isStudent
    ? "Student Learning Alerts & Notifications"
    : "Notifications & System Alerts Center";

  const headerDescription = isCenter
    ? "Monitor real-time notifications for your center across Dashboard, Students, Counsellor, Faculty, Fees, Admissions, Courses, and Settings."
    : isFaculty
    ? "Monitor class schedules, student attendance reminders, assigned batch updates, and teaching desk alerts."
    : isStudent
    ? "Monitor class reminders, personal attendance records, homework assignments, lecture recordings, and academy updates."
    : "Monitor real-time academy operations alerts, admissions, payments, attendance risks, and AI voice calls.";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Bell className="h-6 w-6 text-[#1769AA]" />
            {headerTitle}
          </h2>
          <p className="text-sm text-text-secondary">
            {headerDescription}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm gap-2"
          >
            <CheckCheck className="h-4 w-4" /> Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="border-border/50 bg-white shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder={
                  isCenter
                    ? "Search center notifications..."
                    : isFaculty
                    ? "Search faculty notifications..."
                    : isStudent
                    ? "Search student notifications..."
                    : "Search notifications..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-slate-300 text-slate-900"
              />
            </div>

            {/* Unread Only Toggle */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                variant={unreadOnly ? "default" : "outline"}
                size="sm"
                className={unreadOnly ? "bg-[#1769AA] text-white" : ""}
                onClick={() => setUnreadOnly(!unreadOnly)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                Unread Only {unreadCount > 0 ? `(${unreadCount})` : ""}
              </Button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedFilter === tab.id
                    ? "bg-[#1769AA] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
                onClick={() => {
                  setSelectedFilter(tab.id);
                  setPage(1);
                }}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#1769AA] mx-auto" />
            <p className="text-sm font-medium">Fetching real-time notifications...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold">Failed to load notifications from server.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              Retry
            </Button>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((item) => (
            <Card
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`border-border/50 bg-white shadow-xs transition-all hover:shadow-md cursor-pointer relative overflow-hidden ${
                !item.isRead ? "border-l-4 border-l-[#1769AA] bg-blue-50/20" : ""
              }`}
            >
              <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs shrink-0">
                  {renderIcon(item.type, item.module)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-base font-bold ${!item.isRead ? "text-slate-900" : "text-slate-700"}`}>
                        {item.title}
                      </h4>
                      {renderBadge(item)}
                      {!item.isRead && (
                        <Badge variant="default" className="bg-[#1769AA] text-white text-[10px]">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.message}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 self-center">
                  {!item.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Mark as Read"
                      className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-8 w-8 p-0"
                      onClick={(e) => handleMarkRead(item.id, e)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {item.link && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="View Feature"
                      className="text-slate-400 hover:text-[#1769AA] hover:bg-blue-50 h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete Notification"
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                    onClick={(e) => handleDelete(item.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border/50 bg-white p-12 text-center text-slate-500">
            <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">No Notifications Found</h4>
            <p className="text-xs text-slate-500 mt-1">
              {isCenter
                ? "There are no operational notifications matching your selected Center Manager module criteria."
                : isFaculty
                ? "There are no operational notifications matching your selected Faculty teaching desk criteria."
                : isStudent
                ? "There are no notifications matching your selected Student portal criteria."
                : "There are no operational notifications matching your filter criteria."}
            </p>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Showing Page <span className="font-bold">{pagination.page}</span> of{" "}
            <span className="font-bold">{pagination.totalPages}</span> ({pagination.total} items)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
