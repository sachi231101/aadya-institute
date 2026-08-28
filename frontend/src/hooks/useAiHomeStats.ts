import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Users,
  GraduationCap,
  Calendar,
  IndianRupee,
  Wallet,
  UserCheck,
  BookOpen,
  CheckCircle,
  ClipboardList,
  TrendingUp,
  Video,
  MessageSquareQuote,
} from "lucide-react";
import { useBranches, useBranchStats } from "@/hooks/useBranches";
import { useFacultyList, useFacultyCourses } from "@/hooks/useFaculty";
import { useStudentReport, useFacultyReport, useFinancialReport, useCourseReport } from "@/hooks/useReports";
import { useLeadDashboard } from "@/hooks/useLeads";
import { useBatches } from "@/hooks/useBatches";
import { admissionsApi } from "@/services/admissions.api";
import { leadsApi } from "@/services/leads.api";
import { attendanceApi } from "@/services/attendance.api";
import type { User } from "@/types/auth.types";

export interface AiHomeStat {
  icon: LucideIcon;
  color: string;
  value: string;
  label: string;
  sub: string;
  isText?: boolean;
}

export type AiHomeRoleKey = "admin" | "center" | "faculty" | "counselor" | "student";

export const resolveAiHomeRole = (path: string, user?: User | null): AiHomeRoleKey => {
  if (path.startsWith("/center") || user?.roles?.includes("CENTER_MANAGER") || user?.role === "CENTER_MANAGER") {
    return "center";
  }
  if (path.startsWith("/faculty") || user?.roles?.includes("FACULTY") || user?.role === "FACULTY") {
    return "faculty";
  }
  if (path.startsWith("/counselor") || user?.roles?.includes("COUNSELLOR") || user?.role === "COUNSELLOR") {
    return "counselor";
  }
  if (path.startsWith("/student") || user?.roles?.includes("STUDENT") || user?.role === "STUDENT") {
    return "student";
  }
  return "admin";
};

const formatCount = (value?: number | null) => (value ?? 0).toLocaleString("en-IN");

const formatCurrency = (value?: number | null) => {
  const amount = value ?? 0;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
};

const formatGrowth = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? "New this month" : "Live from database";
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `↑ ${pct}% vs last month` : `↓ ${Math.abs(pct)}% vs last month`;
};

const trendGrowth = (
  trend: Array<{ collected?: number; students?: number; pending?: number }> | undefined,
  key: "collected" | "students" | "pending"
) => {
  if (!trend || trend.length < 2) return "Live from database";
  const current = trend[trend.length - 1]?.[key] ?? 0;
  const previous = trend[trend.length - 2]?.[key] ?? 0;
  return formatGrowth(current, previous);
};

const loadingValue = (isLoading: boolean, value: string) => (isLoading ? "—" : value);

export const useAiHomeStats = (roleKey: AiHomeRoleKey, user?: User | null, branchName?: string) => {
  const queryClient = useQueryClient();
  const branchId = user?.branchId || undefined;
  const facultyId = user?.facultyId || undefined;
  const studentId = user?.studentId || undefined;
  const isAdmin = roleKey === "admin";
  const isCenter = roleKey === "center";
  const isFaculty = roleKey === "faculty";
  const isCounselor = roleKey === "counselor";
  const isStudent = roleKey === "student";
  const scopedBranchId = isAdmin ? undefined : branchId;

  const { data: branchesResponse, isLoading: branchesLoading } = useBranches(
    isAdmin ? { limit: 100 } : undefined
  );
  const { data: branchStatsResponse, isLoading: branchStatsLoading } = useBranchStats(
    isCenter ? branchId : undefined
  );
  const { data: studentReport, isLoading: studentReportLoading } = useStudentReport(scopedBranchId);
  const { data: facultyReport, isLoading: facultyReportLoading } = useFacultyReport(scopedBranchId);
  const { data: financialReport, isLoading: financialLoading } = useFinancialReport(scopedBranchId);
  const { data: courseReport, isLoading: courseReportLoading } = useCourseReport();
  const { data: facultyListResponse, isLoading: facultyListLoading } = useFacultyList(
    isAdmin || isCenter ? { limit: 100, branchId: scopedBranchId } : undefined
  );
  const { data: leadDashboard, isLoading: leadDashboardLoading } = useLeadDashboard(scopedBranchId);
  const { batches, loading: batchesLoading } = useBatches();
  const { data: facultyCoursesResponse, isLoading: facultyCoursesLoading } = useFacultyCourses(
    isFaculty && facultyId ? { facultyId, limit: 50 } : undefined
  );

  const { data: admissionsCountResponse, isLoading: admissionsLoading } = useQuery({
    queryKey: ["admissions", "count", scopedBranchId],
    queryFn: () => admissionsApi.getAdmissions({ limit: 1 }),
    enabled: isAdmin || isCenter,
    staleTime: 1000 * 60 * 5,
  });

  const { data: followUpDashboard, isLoading: followUpLoading } = useQuery({
    queryKey: ["leads", "follow-ups", "dashboard", scopedBranchId],
    queryFn: () => leadsApi.getFollowUpDashboard({ branchId: scopedBranchId }),
    enabled: isCounselor,
    staleTime: 1000 * 60 * 2,
  });

  const { data: studentAttendanceResponse, isLoading: studentAttendanceLoading } = useQuery({
    queryKey: ["student", "attendance-summary", studentId],
    queryFn: () => attendanceApi.getStudentSummary(studentId!),
    enabled: isStudent && !!studentId,
    staleTime: 1000 * 60 * 5,
  });

  const leadSummary = leadDashboard?.data ?? leadDashboard;
  const followUpSummary = followUpDashboard?.data?.summary ?? followUpDashboard?.summary;
  const studentAttendanceSummary = studentAttendanceResponse?.data ?? studentAttendanceResponse;

  const stats = useMemo((): AiHomeStat[] => {
    const totalBranches = branchesResponse?.meta?.total ?? branchesResponse?.data?.length ?? 0;
    const totalStudents =
      (isCenter ? branchStatsResponse?.data?.totalStudents : undefined) ??
      studentReport?.summary?.totalStudents ??
      0;
    const totalAdmissions =
      (isCenter ? branchStatsResponse?.data?.totalAdmissions : undefined) ??
      admissionsCountResponse?.meta?.total ??
      0;
    const totalFaculty =
      (isCenter ? branchStatsResponse?.data?.totalFaculty : undefined) ??
      facultyReport?.summary?.totalActiveFaculty ??
      facultyListResponse?.meta?.total ??
      facultyListResponse?.data?.length ??
      0;
    const totalCollected = financialReport?.summary?.totalCollected ?? 0;
    const totalPending = financialReport?.summary?.totalPending ?? 0;
    const collectionRate = financialReport?.summary?.collectionRate ?? 0;
    const activeBatches = batches.filter((batch) => batch.status === "ACTIVE").length;
    const enrollmentTrend = studentReport?.enrollmentTrend;
    const revenueTrend = financialReport?.monthlyTrend;

    if (isCenter) {
      return [
        {
          icon: Building2,
          color: "text-blue-500",
          value: branchName?.replace("Aadya ", "") || "Branch",
          label: "Branch",
          sub: "Assigned Center",
          isText: true,
        },
        {
          icon: Users,
          color: "text-emerald-500",
          value: formatCount(totalStudents),
          label: "Active Students",
          sub: trendGrowth(enrollmentTrend, "students"),
        },
        {
          icon: GraduationCap,
          color: "text-purple-500",
          value: formatCount(totalAdmissions),
          label: "Admissions",
          sub: `${collectionRate}% fee collection`,
        },
        {
          icon: UserCheck,
          color: "text-orange-500",
          value: formatCount(totalFaculty),
          label: "Total Faculty",
          sub: `${activeBatches} active batches`,
        },
        {
          icon: IndianRupee,
          color: "text-emerald-500",
          value: formatCurrency(totalCollected),
          label: "Revenue",
          sub: trendGrowth(revenueTrend, "collected"),
        },
        {
          icon: Wallet,
          color: "text-amber-500",
          value: formatCurrency(totalPending),
          label: "Pending Fees",
          sub: trendGrowth(revenueTrend, "pending"),
        },
      ];
    }

    if (isFaculty) {
      const facultyCourses = facultyCoursesResponse?.data ?? [];
      const assignedStudents = facultyCourses.reduce(
        (sum, course) => sum + (course._count?.enrollments ?? 0),
        0
      );
      const avgRating = facultyReport?.summary?.avgStudentRating ?? 0;

      return [
        {
          icon: BookOpen,
          color: "text-blue-500",
          value: formatCount(activeBatches || facultyCourses.length),
          label: "Active Batches",
          sub: "Assigned courses",
        },
        {
          icon: Users,
          color: "text-emerald-500",
          value: formatCount(assignedStudents),
          label: "Total Students",
          sub: "Across all batches",
        },
        {
          icon: Calendar,
          color: "text-purple-500",
          value: formatCount(courseReport?.summary?.activeBatches ?? activeBatches),
          label: "Institute Batches",
          sub: "Currently running",
        },
        {
          icon: CheckCircle,
          color: "text-orange-500",
          value: `${Math.round(studentReport?.summary?.avgAttendanceRate ?? 0)}%`,
          label: "Avg Attendance",
          sub: "Branch average",
        },
        {
          icon: ClipboardList,
          color: "text-emerald-500",
          value: formatCount(facultyReport?.summary?.monthlyTeachingHours ?? 0),
          label: "Teaching Hours",
          sub: "This month",
        },
        {
          icon: TrendingUp,
          color: "text-amber-500",
          value: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "—",
          label: "Student Rating",
          sub: "Faculty average",
        },
      ];
    }

    if (isCounselor) {
      const totalLeads = leadSummary?.totalLeads ?? 0;
      const converted = leadSummary?.converted ?? 0;
      const followUpCount = leadSummary?.followUp ?? 0;
      const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 1000) / 10 : 0;
      const followUpsToday = followUpSummary?.today ?? 0;
      const overdueFollowUps = followUpSummary?.overdue ?? 0;

      return [
        {
          icon: Users,
          color: "text-blue-500",
          value: formatCount(totalLeads),
          label: "Assigned Leads",
          sub: `${leadSummary?.interested ?? 0} interested`,
        },
        {
          icon: GraduationCap,
          color: "text-emerald-500",
          value: formatCount(converted),
          label: "Converted",
          sub: "Admissions closed",
        },
        {
          icon: TrendingUp,
          color: "text-purple-500",
          value: `${conversionRate}%`,
          label: "Conversion Rate",
          sub: totalLeads > 0 ? "Live pipeline" : "No leads yet",
        },
        {
          icon: Calendar,
          color: "text-orange-500",
          value: formatCount(followUpsToday),
          label: "Follow-ups Today",
          sub: overdueFollowUps > 0 ? `${overdueFollowUps} overdue` : "On schedule",
        },
        {
          icon: MessageSquareQuote,
          color: "text-emerald-500",
          value: formatCount(leadSummary?.contacted ?? 0),
          label: "Contacted Leads",
          sub: `${followUpCount} in follow-up`,
        },
        {
          icon: Wallet,
          color: "text-amber-500",
          value: formatCurrency(totalCollected),
          label: "Fee Realized",
          sub: `${collectionRate}% collected`,
        },
      ];
    }

    if (isStudent) {
      const attendancePct = Number(studentAttendanceSummary?.attendancePercentage ?? 0);

      return [
        {
          icon: BookOpen,
          color: "text-blue-500",
          value: user?.role === "STUDENT" ? "Your Course" : "Course",
          label: "Enrolled Course",
          sub: "From your profile",
          isText: true,
        },
        {
          icon: CheckCircle,
          color: "text-emerald-500",
          value: studentId ? `${Math.round(attendancePct)}%` : "—",
          label: "My Attendance",
          sub: studentId ? "Live attendance" : "Profile not linked",
        },
        {
          icon: Calendar,
          color: "text-purple-500",
          value: formatCount(activeBatches),
          label: "Active Batches",
          sub: "Institute-wide",
        },
        {
          icon: Video,
          color: "text-orange-500",
          value: formatCount(courseReport?.summary?.totalModules ?? 0),
          label: "Course Modules",
          sub: "Available curriculum",
        },
        {
          icon: ClipboardList,
          color: "text-emerald-500",
          value: studentId ? `${Math.round(attendancePct)}%` : "—",
          label: "Attendance Trend",
          sub: studentId ? "Live from database" : "Profile not linked",
        },
        {
          icon: TrendingUp,
          color: "text-amber-500",
          value: `${Math.round(attendancePct)}%`,
          label: "Course Progress",
          sub: "Based on attendance",
        },
      ];
    }

    return [
      {
        icon: Building2,
        color: "text-blue-500",
        value: formatCount(totalBranches),
        label: "Total Branches",
        sub: "Across all locations",
      },
      {
        icon: Users,
        color: "text-emerald-500",
        value: formatCount(totalStudents),
        label: "Total Students",
        sub: trendGrowth(enrollmentTrend, "students"),
      },
      {
        icon: GraduationCap,
        color: "text-purple-500",
        value: formatCount(totalAdmissions),
        label: "Total Admissions",
        sub: trendGrowth(enrollmentTrend, "students"),
      },
      {
        icon: UserCheck,
        color: "text-orange-500",
        value: formatCount(totalFaculty),
        label: "Total Faculty",
        sub: `${activeBatches} active batches`,
      },
      {
        icon: IndianRupee,
        color: "text-emerald-500",
        value: formatCurrency(totalCollected),
        label: "Total Revenue",
        sub: trendGrowth(revenueTrend, "collected"),
      },
      {
        icon: Wallet,
        color: "text-amber-500",
        value: formatCurrency(totalPending),
        label: "Pending Fees",
        sub: `${collectionRate}% collection rate`,
      },
    ];
  }, [
    admissionsCountResponse?.meta?.total,
    batches,
    branchName,
    branchStatsResponse?.data,
    branchesResponse?.data?.length,
    branchesResponse?.meta?.total,
    courseReport?.summary?.activeBatches,
    courseReport?.summary?.totalModules,
    facultyCoursesResponse?.data,
    facultyListResponse?.data?.length,
    facultyListResponse?.meta?.total,
    facultyReport?.summary?.avgStudentRating,
    facultyReport?.summary?.monthlyTeachingHours,
    facultyReport?.summary?.totalActiveFaculty,
    financialReport?.monthlyTrend,
    financialReport?.summary?.collectionRate,
    financialReport?.summary?.totalCollected,
    financialReport?.summary?.totalPending,
    followUpSummary?.overdue,
    followUpSummary?.today,
    isCenter,
    isCounselor,
    isFaculty,
    isStudent,
    leadSummary?.contacted,
    leadSummary?.converted,
    leadSummary?.followUp,
    leadSummary?.interested,
    leadSummary?.totalLeads,
    studentAttendanceSummary?.attendancePercentage,
    studentId,
    studentReport?.enrollmentTrend,
    studentReport?.summary?.avgAttendanceRate,
    studentReport?.summary?.totalStudents,
    user?.role,
  ]);

  const isLoading =
    (isAdmin &&
      (branchesLoading ||
        studentReportLoading ||
        facultyReportLoading ||
        financialLoading ||
        admissionsLoading ||
        facultyListLoading ||
        batchesLoading)) ||
    (isCenter &&
      (branchStatsLoading ||
        studentReportLoading ||
        facultyReportLoading ||
        financialLoading ||
        admissionsLoading ||
        batchesLoading)) ||
    (isFaculty &&
      (facultyCoursesLoading || facultyReportLoading || studentReportLoading || courseReportLoading || batchesLoading)) ||
    (isCounselor && (leadDashboardLoading || followUpLoading || financialLoading)) ||
    (isStudent && (studentAttendanceLoading || courseReportLoading || batchesLoading));

  const refetch = () => {
    void queryClient.invalidateQueries({ queryKey: ["branches"] });
    void queryClient.invalidateQueries({ queryKey: ["reports"] });
    void queryClient.invalidateQueries({ queryKey: ["leads"] });
    void queryClient.invalidateQueries({ queryKey: ["admissions"] });
    void queryClient.invalidateQueries({ queryKey: ["faculty"] });
    void queryClient.invalidateQueries({ queryKey: ["student"] });
  };

  const displayStats = useMemo(
    () =>
      stats.map((stat) => ({
        ...stat,
        value: loadingValue(isLoading, stat.value),
        sub: isLoading ? "Loading live data..." : stat.sub,
      })),
    [isLoading, stats]
  );

  return { stats: displayStats, isLoading, refetch };
};
