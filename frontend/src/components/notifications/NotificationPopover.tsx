import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, 
  UserPlus, 
  DollarSign, 
  AlertTriangle, 
  PhoneCall, 
  Calendar, 
  CheckCheck, 
  ChevronRight, 
  Loader2, 
  Info 
} from "lucide-react";
import { 
  useGetNotifications, 
  useGetUnreadCount, 
  useMarkAsRead, 
  useMarkAllAsRead 
} from "../../hooks/useNotifications";
import type { NotificationType, NotificationItem } from "../../services/notifications.api";
import { Badge } from "@/components/ui/badge";

import { useAuthStore } from "@/store/auth.store";

export const NotificationPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isCounselor = userRoles.includes("COUNSELLOR") && !userRoles.includes("ADMIN");
  const isCenter = userRoles.includes("CENTER_MANAGER") && !userRoles.includes("ADMIN");
  const isFaculty = userRoles.includes("FACULTY") && !userRoles.includes("ADMIN");
  const isStudent = userRoles.includes("STUDENT") && !userRoles.includes("ADMIN");

  const rolePrefix = isCounselor ? "/counselor" : isCenter ? "/center" : isFaculty ? "/faculty" : isStudent ? "/student" : "/admin";

  const roleParam = isCenter
    ? "CENTER_MANAGER"
    : isFaculty
    ? "FACULTY"
    : isStudent
    ? "STUDENT"
    : isCounselor
    ? "COUNSELLOR"
    : undefined;

  const { data: unreadData } = useGetUnreadCount();
  const { data: listData, isLoading } = useGetNotifications({
    limit: 5,
    role: roleParam,
  });
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const unreadCount = unreadData?.unreadCount ?? 0;
  const notifications = listData?.notifications || [];

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await markAsReadMutation.mutateAsync(item.id);
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
    }
    setIsOpen(false);
    if (item.link) {
      const mappedLink = item.link.replace(/^\/(admin|center|faculty|student|counselor)/, rolePrefix);
      navigate(mappedLink);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (err) {
      console.error("Failed to mark all as read", err);
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
        return item.type || "System";
    }
  };

  const renderIcon = (type: NotificationType, module?: string) => {
    const mod = module?.toLowerCase();
    if (mod === "fees" || type === "PAYMENT") {
      return <DollarSign className="h-4 w-4 text-emerald-600" />;
    }
    if (mod === "admissions" || type === "ADMISSION") {
      return <UserPlus className="h-4 w-4 text-blue-600" />;
    }
    if (mod === "counsellor" || type === "AI_CALL") {
      return <PhoneCall className="h-4 w-4 text-purple-600" />;
    }
    if (mod === "attendance" || type === "ATTENDANCE") {
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    }
    if (mod === "students" || type === "DISCONTINUATION_RISK") {
      return <AlertTriangle className="h-4 w-4 text-rose-600" />;
    }
    if (mod === "courses" || mod === "schedule" || type === "CLASS_SESSION") {
      return <Calendar className="h-4 w-4 text-indigo-600" />;
    }
    return <Info className="h-4 w-4 text-slate-600" />;
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 rounded-full bg-red-600 text-[10px] font-bold text-white items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
              {unreadCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-2 py-0.5">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs font-semibold text-[#1769AA] hover:text-[#F39A16] flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* Body List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#1769AA]" />
                Loading alerts...
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !item.isRead ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs shrink-0">
                    {renderIcon(item.type, item.module)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {getModuleLabel(item)}
                        </span>
                        <p className={`text-xs font-bold truncate ${!item.isRead ? "text-slate-900" : "text-slate-700"}`}>
                          {item.title}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#1769AA] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                {isCenter
                  ? "No notifications found for Center Manager modules."
                  : isFaculty
                  ? "No notifications found for Faculty Teaching Desk."
                  : isStudent
                  ? "No notifications found for Student Portal."
                  : "No notifications found."}
              </div>
            )}
          </div>

          {/* Footer Link */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(`${rolePrefix}/notifications`);
              }}
              className="text-xs font-bold text-[#1769AA] hover:text-[#F39A16] flex items-center justify-center gap-1 w-full py-1 transition-colors"
            >
              View All Notifications <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
