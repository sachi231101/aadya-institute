import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  GraduationCap,
  Briefcase,
  Loader2,
  ExternalLink,
  User,
} from "lucide-react";
import { useBranch, useBranchStats } from "@/hooks/useBranches";
import { useAdminUsers } from "@/hooks/useUsers";
import { PageContainer, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const formatHours = (open?: string, close?: string) => {
  if (!open && !close) return "—";
  if (open && close) return `${open} – ${close}`;
  return open || close || "—";
};

export const ViewBranch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: branchResponse, isLoading, isError, refetch } = useBranch(id);
  const { data: statsResponse } = useBranchStats(id);
  const { data: usersResponse } = useAdminUsers({ limit: 100 });

  const branch = branchResponse?.data;
  const stats = statsResponse?.data;
  const allUsers = usersResponse?.data || [];
  const managers = allUsers.filter((u) => u.roles.includes("CENTER_MANAGER"));
  const manager =
    branch?.manager ||
    managers.find((m) => m.id === branch?.managerUserId || m.branchId === id);
  const counsellorCount =
    stats?.totalCounsellors ??
    allUsers.filter(
      (u) => u.roles.includes("COUNSELLOR") && u.branchId === id
    ).length;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Loading branch profile...</span>
        </div>
      </PageContainer>
    );
  }

  if (isError || !branch) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-muted-foreground">Branch not found.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go back
            </Button>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const hours = branch.workingHours;
  const openTime = typeof hours?.open === "string" ? hours.open : undefined;
  const closeTime = typeof hours?.close === "string" ? hours.close : undefined;

  return (
    <PageContainer className="animate-in fade-in">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            <Badge
              variant="outline"
              className="font-mono text-xs text-primary bg-primary/10 border-primary/20 font-bold"
            >
              {branch.code}
            </Badge>
            <Badge
              className={
                branch.status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-muted text-muted-foreground"
              }
            >
              {branch.status}
            </Badge>
            {branch.name}
          </span>
        }
        description="Branch profile and contact details"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-10 w-10 shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => navigate(`/admin/branch/${branch.id}/performance`)}
            >
              Analytics
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 border border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Branch details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Address
                </p>
                <p className="text-sm text-foreground flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  {branch.address || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Working hours
                </p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  {formatHours(openTime, closeTime)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Phone
                </p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  {branch.phone || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Email
                </p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  {branch.email || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Timezone
                </p>
                <p className="text-sm text-foreground">{branch.timezone || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Branch code
                </p>
                <p className="text-sm font-mono font-semibold text-foreground">{branch.code}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Center manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            {manager ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {(manager.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{manager.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {"email" in manager ? manager.email || "—" : "—"}
                    </p>
                  </div>
                </div>
                {"id" in manager && manager.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => navigate(`/admin/administration/admins/${manager.id}`)}
                  >
                    View manager profile
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No center manager assigned.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Students",
            value: stats?.totalStudents ?? 0,
            icon: GraduationCap,
          },
          {
            label: "Faculty",
            value: stats?.totalFaculty ?? 0,
            icon: Users,
          },
          {
            label: "Counsellors",
            value: counsellorCount,
            icon: Briefcase,
          },
          {
            label: "Batches",
            value: stats?.totalBatches ?? 0,
            icon: Building2,
          },
        ].map((item) => (
          <Card key={item.label} className="border border-border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{item.value}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <item.icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};
