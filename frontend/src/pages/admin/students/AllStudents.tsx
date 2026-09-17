import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  Search,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, FilterToolbar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/hooks/useBranches";
import { useStudentList } from "@/hooks/useStudents";
import { ReadOnlyBanner, PermissionGate } from "@/components/permissions/PermissionGate";
import { CourseChips } from "@/components/common/CourseChips";
import { coursesFromStudent } from "@/utils/admission-package.utils";

export const AllStudents: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState("All Students");
  const [searchTerm, setSearchTerm] = useState("");

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";
  const isFacultyPortal = basePath === "/faculty";
  const isRestrictedPortal = basePath === "/center" || basePath === "/counselor";

  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];

  // If selected branch doesn't exist in current branches (e.g. after re-seeding), reset to "ALL"
  useEffect(() => {
    if (branches.length > 0 && selectedBranchId !== "ALL" && !branches.some((b) => b.id === selectedBranchId)) {
      setSelectedBranchId("ALL");
    }
  }, [branches, selectedBranchId, setSelectedBranchId]);

  const activeBranchId =
    selectedBranchId !== "ALL" && branches.some((b) => b.id === selectedBranchId)
      ? selectedBranchId
      : undefined;

  // Live database students filtered by branch
  const { data: liveStudentsResponse, isLoading, isError } = useStudentList({
    limit: 200,
    branchId: activeBranchId,
  });
  const liveStudents = liveStudentsResponse?.data || [];

  const combinedStudents = useMemo(() => {
    return liveStudents.map((s) => {
      const hasAttendance = (s.attendance?.totalClasses ?? 0) > 0;
      const isRisk =
        s.status === "DISCONTINUED" ||
        (s.attendance?.consecutiveAbsences ?? 0) >= 2 ||
        (hasAttendance && (s.attendance?.overallPercentage ?? 0) < 65);
      const isDraft = (s.status as string) === "DRAFT" || (s as any).isDraft || (s as any).admissionStatus === "PENDING" || (s as any).admissions?.[0]?.status === "PENDING" || (s as any).admissions?.[0]?.status === "Admission Pending";
      const hasBatch = Boolean(s.batchName && s.batchName !== "Not assigned" && s.batchName !== "—" && !s.batchName.toLowerCase().includes("pending"));
      const isBatchPending = !isDraft && s.status === "ACTIVE" && !hasBatch;
      const computedStatus = isDraft
        ? "Admission Pending"
        : isBatchPending
        ? "Batch Assignment Pending"
        : s.status === "ACTIVE"
        ? (isRisk ? "At Risk" : "Active")
        : s.status === "COMPLETED"
        ? "Completed"
        : "Dropped";
      return {
        id: s.id,
        studentCode: s.studentCode,
        name: (s as any).displayName || s.user?.name || s.studentCode,
        email: s.user?.email || "—",
        phone: s.user?.phone || "—",
        course: s.courseName || "Not assigned",
        courses: s.courses,
        batch: s.batchName || "Not assigned",
        admissionNo: s.admissionNo || "—",
        admissionDate: s.admissionDate
          ? new Date(s.admissionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
          : "—",
        faculty: s.facultyName || "â€”",
        branch: s.branch?.name || "â€”",
        branchId: s.branchId,
        attendance: s.attendance?.overallPercentage ?? 0,
        totalClasses: s.attendance?.totalClasses ?? 0,
        consecutiveAbsences: s.attendance?.consecutiveAbsences ?? 0,
        progress: s.status === "COMPLETED" ? 100 : 75,
        gender: s.gender || "Male",
        dob: s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : "â€”",
        qualification: s.qualification || "Graduate",
        guardianName: s.guardian?.name || "Parent/Guardian",
        guardianPhone: s.guardian?.phone || "â€”",
        fees: s.fees || { total: 0, paid: 0, pending: 0, status: "Pending" },
        status: computedStatus,
        joinDate: new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        counsellor: s.counsellorName || "Admissions Desk",
      };
    });
  }, [liveStudents]);

  // Filter students by selected branch, search, course, and tab
  const filteredStudents = useMemo(() => {
    return combinedStudents.filter((student) => {
      // Branch Filter
      const matchesBranch =
        selectedBranchId === "ALL" ||
        student.branchId === selectedBranchId ||
        branches.find((b) => b.id === selectedBranchId)?.name.toLowerCase().includes(student.branch.toLowerCase());

      // Search Filter
      const matchesSearch =
        !searchTerm ||
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone.includes(searchTerm) ||
        student.counsellor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.courses || []).some((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

      // Tab Filter
      const matchesTab =
        selectedTab === "All Students" ||
        (selectedTab === "Active" && (student.status === "Active" || student.status === "Batch Assignment Pending")) ||
        (selectedTab === "Draft" && student.status === "Admission Pending") ||
        (selectedTab === "At Risk" && student.status === "At Risk") ||
        (selectedTab === "Completed" && student.status === "Completed") ||
        (selectedTab === "Dropped" && student.status === "Dropped");

      return matchesBranch && matchesSearch && matchesTab;
    });
  }, [combinedStudents, selectedBranchId, branches, searchTerm, selectedTab]);

  const branchStudents = useMemo(() => {
    return combinedStudents.filter((student) => (
      selectedBranchId === "ALL" ||
      student.branchId === selectedBranchId ||
      branches.find((branch) => branch.id === selectedBranchId)?.name.toLowerCase().includes(student.branch.toLowerCase())
    ));
  }, [combinedStudents, selectedBranchId, branches]);

  const statusCards = [
    { value: "All Students", label: "All students", count: branchStudents.length },
    { value: "Active", label: "Active", count: branchStudents.filter((student) => student.status === "Active" || student.status === "Batch Assignment Pending").length },
    { value: "Draft", label: "Admission pending", count: branchStudents.filter((student) => student.status === "Admission Pending").length },
    { value: "At Risk", label: "At risk", count: branchStudents.filter((student) => student.status === "At Risk").length },
    { value: "Completed", label: "Completed", count: branchStudents.filter((student) => student.status === "Completed").length },
    { value: "Dropped", label: "Dropped", count: branchStudents.filter((student) => student.status === "Dropped").length },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Students"
        description="Search a student and open their record."
        actions={
          !isFacultyPortal ? (
            <PermissionGate itemKey="admissions.all" mode="write">
              <Button
                className="h-9 bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                onClick={() => navigate(`${basePath}/admissions/direct-entry`)}
              >
                <Plus className="h-4 w-4 mr-2" /> Register Student
              </Button>
            </PermissionGate>
          ) : undefined
        }
      />

      {isRestrictedPortal && (
        <ReadOnlyBanner itemKey="students.all" label="All Students" />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statusCards.map((card) => {
          const selected = selectedTab === card.value;
          return (
            <button
              key={card.value}
              type="button"
              onClick={() => setSelectedTab(card.value)}
              className="text-left"
            >
              <Card className={`border shadow-sm ${selected ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-primary/40"}`}>
                <CardContent className="p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{card.count}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <FilterToolbar className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code, or phone"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {branches.length > 1 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-9 text-sm border border-slate-200 rounded-xl px-3 text-slate-700 bg-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </FilterToolbar>

      <p className="text-sm text-muted-foreground">
        {isLoading ? "Loading students..." : `${filteredStudents.length} student${filteredStudents.length === 1 ? "" : "s"}`}
      </p>

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-5">Student</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">Admission No.</th>
                <th className="p-3.5">Admission Date</th>
                <th className="p-3.5">Course</th>
                <th className="p-3.5">Batch</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
                    Loading students...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-red-600">
                    <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                    Unable to load students.
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No students found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try another name or clear the status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => navigate(`${basePath}/students/${student.id}`)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-200">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {student.name.split(" ").map((part: string) => part[0]).filter(Boolean).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-900">{student.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-xs text-slate-700">{student.phone}</td>
                    <td className="p-3.5 font-mono text-xs text-slate-700">{student.admissionNo}</td>
                    <td className="p-3.5 text-xs text-slate-700">{student.admissionDate}</td>
                    <td className="p-3.5">
                      <CourseChips
                        courses={coursesFromStudent({ courses: student.courses, courseName: student.course })}
                        fallback="Not assigned"
                        maxVisible={2}
                      />
                    </td>
                    <td className="p-3.5 text-xs font-medium text-slate-800">{student.batch}</td>
                    <td className="p-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        student.status === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : student.status === "At Risk"
                            ? "bg-red-100 text-red-800"
                            : student.status === "Admission Pending" || student.status === "Batch Assignment Pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                      }`}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
};
