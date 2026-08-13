import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  SlidersHorizontal 
} from "lucide-react";
import { 
  useGetNotifications, 
  useMarkAsRead, 
  useMarkAllAsRead, 
  useDeleteNotification 
} from "../../../hooks/useNotifications";
import type { NotificationType, NotificationItem } from "../../../services/notifications.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const filters = {
    page,
    limit: 15,
    type: selectedType === "ALL" ? undefined : (selectedType as NotificationType),
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
      navigate(item.link);
    }
  };

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case "ADMISSION":
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case "PAYMENT":
        return <DollarSign className="h-5 w-5 text-emerald-600" />;
      case "DISCONTINUATION_RISK":
      case "ATTENDANCE":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case "AI_CALL":
        return <PhoneCall className="h-5 w-5 text-purple-600" />;
      case "CLASS_SESSION":
        return <Calendar className="h-5 w-5 text-indigo-600" />;
      default:
        return <Bell className="h-5 w-5 text-slate-600" />;
    }
  };

  const renderBadge = (type: NotificationType) => {
    switch (type) {
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Bell className="h-6 w-6 text-[#1769AA]" />
            Notifications & System Alerts Center
          </h2>
          <p className="text-sm text-text-secondary">
            Monitor real-time academy operations alerts, admissions, payments, attendance risks, and AI voice calls.
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
                placeholder="Search notifications..."
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
            {[
              { id: "ALL", label: "All Alerts" },
              { id: "ADMISSION", label: "Admissions" },
              { id: "PAYMENT", label: "Payments" },
              { id: "DISCONTINUATION_RISK", label: "Discontinuation Risks" },
              { id: "ATTENDANCE", label: "Attendance" },
              { id: "AI_CALL", label: "AI Calls" },
              { id: "CLASS_SESSION", label: "Class Schedules" },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                  selectedType === tab.id
                    ? "bg-[#1769AA] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
                onClick={() => {
                  setSelectedType(tab.id);
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
                  {renderIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-base font-bold ${!item.isRead ? "text-slate-900" : "text-slate-700"}`}>
                        {item.title}
                      </h4>
                      {renderBadge(item.type)}
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
            <p className="text-xs text-slate-500 mt-1">There are no operational notifications matching your filter criteria.</p>
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
