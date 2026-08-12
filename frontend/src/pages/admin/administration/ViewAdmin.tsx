import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "@/hooks/useUsers";
import { ArrowLeft, User, Shield, Activity, Mail, Phone, MapPin, Calendar, Clock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Map backend role names to display labels
const ROLE_DISPLAY: Record<string, string> = {
  ADMIN: "Admin",
  CENTER_MANAGER: "Center Manager",
  COUNSELLOR: "Counsellor",
  FACULTY: "Faculty",
  STUDENT: "Student",
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

export const ViewAdmin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: userResponse, isLoading, isError } = useUser(id);

  const admin = userResponse?.data;

  const [activeTab, setActiveTab] = React.useState<"overview" | "permissions" | "activity">("overview");

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading administrator...</span>
        </div>
      </div>
    );
  }

  if (isError || !admin) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/administration")} className="mb-4">
          <ArrowLeft size={16} className="mr-2" /> Back to Administrators
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-bold text-text-primary">Administrator Not Found</h2>
          <p className="text-muted-foreground mt-2">The administrator you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const statusLabel = admin.status === "ACTIVE" ? "Active" : admin.status === "INACTIVE" ? "Inactive" : "Blocked";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/administration")} size="icon">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Administrator Profile</h1>
          <p className="text-muted-foreground mt-1">Viewing details for {admin.name}</p>
        </div>
        <div className="ml-auto">
          <Link to={`/administration/admins/${admin.id}/edit`}>
            <Button className="bg-[#1769AA] hover:bg-[#F39A16] text-white">
              Edit Administrator
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar Profile Card */}
        <Card className="md:col-span-1">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-bg-secondary rounded-full flex items-center justify-center mb-4 text-[#1769AA]">
              <User size={40} />
            </div>
            <h2 className="text-xl font-bold text-text-primary">{admin.name}</h2>
            <p className="text-muted-foreground text-xs mb-4 font-mono">{admin.id.slice(0, 12)}...</p>
            <Badge variant="outline" className="mb-2 bg-bg-primary text-text-primary border-border">
              {admin.roles.map(r => ROLE_DISPLAY[r] || r).join(", ") || "No Role"}
            </Badge>
            <Badge
              variant="secondary"
              className={
                admin.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }
            >
              {statusLabel}
            </Badge>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Custom Tabs Navigation */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === "overview"
                  ? "border-[#1769AA] text-[#1769AA]"
                  : "border-transparent text-muted-foreground hover:text-text-primary"
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === "permissions"
                  ? "border-[#1769AA] text-[#1769AA]"
                  : "border-transparent text-muted-foreground hover:text-text-primary"
                }`}
            >
              Permissions
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === "activity"
                  ? "border-[#1769AA] text-[#1769AA]"
                  : "border-transparent text-muted-foreground hover:text-text-primary"
                }`}
            >
              Activity
            </button>
          </div>

          {/* Tab Content */}
          <Card>
            <CardContent className="p-6">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User size={18} className="text-[#1769AA]" /> Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Mail size={16} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">Email</p>
                        <p className="text-sm text-muted-foreground">{admin.email || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone size={16} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">Phone</p>
                        <p className="text-sm text-muted-foreground">{admin.phone || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">Branch</p>
                        <p className="text-sm text-muted-foreground">{admin.branchId || "Institute-wide"}</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-border my-4" />

                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock size={18} className="text-[#1769AA]" /> Account History
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Calendar size={16} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">Created Date</p>
                        <p className="text-sm text-muted-foreground">{formatDate(admin.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Activity size={16} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">Last Updated</p>
                        <p className="text-sm text-muted-foreground">{formatDate(admin.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "permissions" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield size={18} className="text-[#1769AA]" /> Access Level
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This administrator has the <strong>{admin.roles.map(r => ROLE_DISPLAY[r] || r).join(", ")}</strong> role.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded bg-bg-secondary text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div> User Management
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-bg-secondary text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div> Role Assignment
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-bg-secondary text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div> System Configuration
                    </div>
                    {admin.roles.includes("ADMIN") && (
                      <div className="flex items-center gap-2 p-2 rounded bg-bg-secondary text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Delete Administrators
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity size={18} className="text-[#1769AA]" /> Recent Activity
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Activity logs will appear here.
                  </p>
                  <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    No recent activity recorded for this user.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
