import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useApplications,
  useApplicationById,
  useCreateApplication,
  useUpdateApplication,
} from "../../../hooks/useAdmissions";
import { useCourses } from "../../../hooks/useCourses";
import {
  mapApplicationFromApi,
  displayStatusToApi,
  type ApplicationListItem,
  type ApplicationDisplayStatus,
} from "../../../utils/map-application";
import type { ApplicationStatus } from "../../../types/admission.types";
import { PermissionGate, ReadOnlyBanner } from "@/components/permissions/PermissionGate";
import {
  FileCheck2,
  Plus,
  Search,
  CheckCircle2,
  ArrowRight,
  Copy,
  Filter,
  Phone,
  Mail,
  CreditCard,
  GraduationCap,
  ChevronRight,
  X,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type DetailedStatus = ApplicationDisplayStatus;

export const Applications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleConvertToAdmission = (app: ApplicationListItem) => {
    const rolePrefix = location.pathname.startsWith("/counselor")
      ? "/counselor"
      : location.pathname.startsWith("/center")
      ? "/center"
      : "/admin";
    navigate(`${rolePrefix}/admissions/direct-entry`, {
      state: {
        application: app,
        applicationId: app.id,
        leadId: app.leadId || undefined,
        lead: {
          id: app.leadId || app.id,
          applicationId: app.id,
          applicationNo: app.applicationNo,
          name: app.applicantName,
          phone: app.phone,
          email: app.email,
          course: app.courseName,
          courseId: app.courseId,
          courseCode: app.courseCode,
          feeStatus: app.feeStatus,
          notes: app.notes,
          source: "Application",
        },
      },
    });
  };

  const { courses } = useCourses();
  const { data: dbApplicationsRes, isLoading: isLoadingApplications } = useApplications();
  const createApplicationMutation = useCreateApplication();
  const updateApplicationMutation = useUpdateApplication();

  const applicationsList = useMemo(() => {
    const rawList = dbApplicationsRes?.data || [];
    return rawList.map((app) => mapApplicationFromApi(app as Parameters<typeof mapApplicationFromApi>[0]));
  }, [dbApplicationsRes]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [feeFilter, setFeeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedCourseFilter, setSelectedCourseFilter] =
    useState<string>("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const { data: selectedAppRes, isLoading: isLoadingDetails } = useApplicationById(selectedAppId || "");

  const selectedApplication = useMemo(() => {
    if (selectedAppRes?.data) {
      return mapApplicationFromApi(selectedAppRes.data as Parameters<typeof mapApplicationFromApi>[0]);
    }
    if (selectedAppId) {
      return applicationsList.find((a) => a.id === selectedAppId) ?? null;
    }
    return null;
  }, [selectedAppRes, selectedAppId, applicationsList]);

  // Note creation in Details Drawer
  const [newNoteInput, setNewNoteInput] = useState<string>("");

  // Create New Application Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createCourseId, setCreateCourseId] = useState("");
  const [createFeeStatus, setCreateFeeStatus] = useState<"PAID" | "PENDING">("PENDING");
  const [createStatus, setCreateStatus] = useState<ApplicationStatus>("SUBMITTED");
  const [createNotes, setCreateNotes] = useState("");

  // Copy Feedback state
  const [copiedAppNo, setCopiedAppNo] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleCopyAppNo = (appNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(appNo);
    setCopiedAppNo(appNo);
    showToast(`Copied ${appNo} to clipboard!`);
    setTimeout(() => setCopiedAppNo(null), 2000);
  };

  // KPI Calculations strictly from real data
  const totalAppsCount = applicationsList.length;
  const docsPendingCount = applicationsList.filter((a) => a.currentWorkflowStep < 3).length;
  const feePendingCount = applicationsList.filter((a) => a.feeStatus === "NOT_PAID").length;
  const feePaidCount = applicationsList.filter((a) => a.feeStatus === "PAID").length;
  const readyForAdmissionCount = applicationsList.filter((a) => a.feeStatus === "PAID" && a.status !== "ADMITTED").length;
  const convertedToAdmissionCount = applicationsList.filter((a) => a.status === "ADMITTED" || a.status === "APPROVED").length;

  const courseOptions = useMemo(() => {
    const names = new Set(applicationsList.map((a) => a.courseName).filter(Boolean));
    return Array.from(names).sort();
  }, [applicationsList]);

  // Filter Logic
  const filteredList = useMemo(() => {
    return applicationsList.filter((app) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.applicationNo.toLowerCase().includes(q) ||
        app.applicantName.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.phone.includes(q) ||
        app.courseName.toLowerCase().includes(q);

      const matchesFee =
        feeFilter === "ALL" ||
        (feeFilter === "PAID" && app.feeStatus === "PAID") ||
        (feeFilter === "NOT_PAID" && app.feeStatus === "NOT_PAID");

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "UNDER_REVIEW" &&
          (app.status === "UNDER_REVIEW_BLUE" ||
            app.status === "UNDER_REVIEW_ORANGE")) ||
        (statusFilter === "NEW_APPLICATION" &&
          app.status === "NEW_APPLICATION") ||
        (statusFilter === "APPROVED" && app.status === "APPROVED") ||
        (statusFilter === "ADMITTED" && app.status === "ADMITTED");

      const matchesCourse =
        selectedCourseFilter === "ALL" ||
        app.courseName.toLowerCase() === selectedCourseFilter.toLowerCase();

      return matchesSearch && matchesFee && matchesStatus && matchesCourse;
    });
  }, [
    applicationsList,
    searchTerm,
    feeFilter,
    statusFilter,
    selectedCourseFilter,
  ]);

  // Paginated Rows
  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const handleOpenDetails = (app: ApplicationListItem) => {
    setSelectedAppId(app.id);
    setIsDetailsOpen(true);
  };

  const handleAddNote = async () => {
    if (!newNoteInput.trim() || !selectedApplication) return;
    const existing = selectedApplication.notes?.trim();
    const updatedNotes = existing
      ? `${existing}\n\n${newNoteInput.trim()}`
      : newNoteInput.trim();
    try {
      await updateApplicationMutation.mutateAsync({
        id: selectedApplication.id,
        payload: { notes: updatedNotes },
      });
      setNewNoteInput("");
      showToast("Note saved successfully!");
    } catch {
      showToast("Failed to save note.");
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: DetailedStatus) => {
    try {
      await updateApplicationMutation.mutateAsync({
        id: appId,
        payload: { status: displayStatusToApi(newStatus) },
      });
      showToast(`Application status updated to ${newStatus.replace(/_/g, " ")}`);
    } catch {
      showToast("Failed to update status.");
    }
  };

  const handleToggleFeePaid = async (appId: string) => {
    const app = applicationsList.find((a) => a.id === appId);
    if (!app) return;
    const isPaid = app.feeStatus === "PAID";
    try {
      await updateApplicationMutation.mutateAsync({
        id: appId,
        payload: { feeStatus: isPaid ? "PENDING" : "PAID" },
      });
      showToast(isPaid ? "Marked as fee pending." : "Marked as fee paid.");
    } catch {
      showToast("Failed to update fee status.");
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createPhone || !createCourseId) return;

    try {
      await createApplicationMutation.mutateAsync({
        applicantName: createName,
        email: createEmail || undefined,
        phone: createPhone,
        courseId: createCourseId,
        feeStatus: createFeeStatus,
        status: createStatus,
        notes: createNotes || undefined,
      });
      setIsCreateModalOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePhone("");
      setCreateCourseId("");
      setCreateNotes("");
      showToast("Application created successfully!");
    } catch {
      showToast("Failed to create application.");
    }
  };

  // Helper for Status Badge Pill
  const renderStatusBadge = (status: DetailedStatus, feeStatus?: "PAID" | "NOT_PAID") => {
    if (status === "APPROVED" || status === "ADMITTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
          {status === "ADMITTED" ? "Admitted" : "Converted to Admission"}
        </span>
      );
    }
    if (feeStatus === "PAID") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Ready for Admission
        </span>
      );
    }
    switch (status) {
      case "NEW_APPLICATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Documents Pending
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Application Fee Pending
          </span>
        );
    }
  };

  return (
    <PermissionGate itemKey="admissions.applications" mode="read">
    <div className="p-4 lg:p-6 max-w-[1400px] w-full mx-auto space-y-4 bg-background min-h-screen text-foreground font-sans">
      <ReadOnlyBanner itemKey="admissions.applications" label="Applications" />
      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-popover text-popover-foreground px-4 py-3 rounded-xl shadow-2xl text-xs font-medium border border-border animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalAppsCount} total · {feePendingCount} fee pending · {convertedToAdmissionCount} admitted
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="h-9 gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          New application
        </Button>
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, app no, phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 pl-8 text-xs rounded-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-3 text-xs font-medium border border-border rounded-lg bg-background"
          >
            <option value="ALL">All statuses</option>
            <option value="NEW_APPLICATION">New</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="APPROVED">Approved</option>
            <option value="ADMITTED">Admitted</option>
          </select>
          <select
            value={feeFilter}
            onChange={(e) => {
              setFeeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-3 text-xs font-medium border border-border rounded-lg bg-background"
          >
            <option value="ALL">All fees</option>
            <option value="PAID">Paid</option>
            <option value="NOT_PAID">Not paid</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="h-9 gap-1.5 text-xs shrink-0"
          >
            <Filter className="h-3.5 w-3.5" />
            More
          </Button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <select
              value={selectedCourseFilter}
              onChange={(e) => {
                setSelectedCourseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 text-xs font-medium border border-border rounded-lg bg-background"
            >
              <option value="ALL">All courses</option>
              {courseOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {(searchTerm || feeFilter !== "ALL" || statusFilter !== "ALL" || selectedCourseFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFeeFilter("ALL");
                  setStatusFilter("ALL");
                  setSelectedCourseFilter("ALL");
                  setCurrentPage(1);
                }}
                className="h-9 text-xs text-muted-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      <Card className="border border-border shadow-xs rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pl-5">Applicant</TableHead>
                <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Course</TableHead>
                <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Fee</TableHead>
                <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Date</TableHead>
                <TableHead className="py-2.5 px-4 w-10" />
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border">
              {currentRows.length > 0 ? (
                currentRows.map((app) => (
                  <TableRow
                    key={app.id}
                    onClick={() => handleOpenDetails(app)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group border-border"
                  >
                    <TableCell className="py-3 px-4 pl-5 align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 border border-border shrink-0">
                          <AvatarImage src={app.avatar} alt={app.applicantName} />
                          <AvatarFallback className="text-[10px] font-semibold">
                            {app.applicantName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{app.applicantName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">{app.applicationNo}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 align-middle">
                      <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{app.courseName}</p>
                    </TableCell>
                    <TableCell className="py-3 px-4 align-middle hidden sm:table-cell">
                      <span className={`text-xs font-medium ${app.feeStatus === "PAID" ? "text-emerald-600" : "text-rose-600"}`}>
                        {app.feeStatus === "PAID" ? "Paid" : "Due"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 align-middle">
                      {renderStatusBadge(app.status, app.feeStatus)}
                    </TableCell>
                    <TableCell className="py-3 px-4 align-middle hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">{app.submittedDate}</p>
                    </TableCell>
                    <TableCell className="py-3 px-4 pr-4 align-middle text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary inline-block" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground py-6">
                      <FileCheck2 className="h-7 w-7 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">No applications found</p>
                      <p className="text-xs">Try adjusting search or filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredList.length)} of {filteredList.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            </Button>
            <span className="text-foreground font-medium">Page {currentPage}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage * pageSize >= filteredList.length}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── 6. DETAILED APPLICATION VIEW (SLIDE-OUT SHEET / DRAWER) ─── */}
      <Sheet
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) setSelectedAppId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl p-0 overflow-y-auto bg-card text-foreground border-l border-border"
        >
          {isLoadingDetails && !selectedApplication ? (
            <div className="p-8 text-sm text-muted-foreground">Loading application...</div>
          ) : selectedApplication ? (
            <div className="flex flex-col h-full">
              <div className="p-5 border-b border-border bg-muted/30 sticky top-0 z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 font-mono">
                        {selectedApplication.applicationNo}
                      </span>
                      {renderStatusBadge(selectedApplication.status, selectedApplication.feeStatus)}
                    </div>
                    <h2 className="text-lg font-bold text-foreground truncate">
                      {selectedApplication.applicantName}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Applied for <strong className="text-foreground">{selectedApplication.courseName}</strong>
                      {" · "}
                      {selectedApplication.submittedDate} at {selectedApplication.submittedTime}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyAppNo(selectedApplication.applicationNo)}
                    className="h-8 text-xs gap-1 shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="p-5 space-y-5 flex-1">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary" /> Contact
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/20 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Full name</p>
                      <p className="font-semibold text-foreground mt-0.5">{selectedApplication.applicantName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Mobile</p>
                      <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-emerald-500" /> {selectedApplication.phone}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[11px] text-muted-foreground">Email</p>
                      <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                        <Mail className="h-3 w-3 text-primary" /> {selectedApplication.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-primary" /> Course
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/20 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Program</p>
                      <p className="font-semibold text-foreground mt-0.5">{selectedApplication.courseName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Course code</p>
                      <p className="font-semibold text-foreground mt-0.5">{selectedApplication.courseCode}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" /> Application fee
                  </h4>
                  <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Status</p>
                      <p className={`font-bold mt-0.5 ${selectedApplication.feeStatus === "PAID" ? "text-emerald-600" : "text-rose-600"}`}>
                        {selectedApplication.feeStatus === "PAID" ? "Paid" : "Pending"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleToggleFeePaid(selectedApplication.id)}
                    >
                      Mark {selectedApplication.feeStatus === "PAID" ? "pending" : "paid"}
                    </Button>
                  </div>
                </div>

                {(selectedApplication.enquiryId || selectedApplication.leadId) && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Source</h4>
                    <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs space-y-1">
                      {selectedApplication.enquiryNo && (
                        <p><span className="text-muted-foreground">Enquiry:</span> {selectedApplication.enquiryNo}</p>
                      )}
                      {selectedApplication.enquirySource && (
                        <p><span className="text-muted-foreground">Channel:</span> {selectedApplication.enquirySource}</p>
                      )}
                      {selectedApplication.leadId && (
                        <p><span className="text-muted-foreground">Lead ID:</span> {selectedApplication.leadId}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Counsellor notes</h4>
                  {selectedApplication.notes ? (
                    <p className="text-xs text-foreground whitespace-pre-wrap p-3 rounded-xl border border-border bg-card">
                      {selectedApplication.notes}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No notes yet.</p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={newNoteInput}
                      onChange={(e) => setNewNoteInput(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Button size="sm" className="h-9 text-xs shrink-0" onClick={handleAddNote}>
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3 sticky bottom-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStatus(selectedApplication.id, "REJECTED")}
                  className="text-xs text-rose-600 border-border h-9"
                >
                  Reject
                </Button>
                <div className="flex items-center gap-2">
                  {selectedApplication.feeStatus !== "PAID" && (
                    <span className="text-[11px] font-medium text-amber-600">Fee pending</span>
                  )}
                  <Button
                    size="sm"
                    disabled={selectedApplication.feeStatus !== "PAID"}
                    onClick={() => {
                      handleConvertToAdmission(selectedApplication);
                      setIsDetailsOpen(false);
                      setSelectedAppId(null);
                    }}
                    className="font-bold text-xs h-9"
                  >
                    Convert to admission <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-sm text-muted-foreground">Application not found.</div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── 7. CREATE NEW APPLICATION MODAL ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 text-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    New Admission Application
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Log new applicant form into counsellor workflow
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Applicant Full Name *
                </label>
                <Input
                  placeholder="e.g. Ananya Sharma"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  className="bg-background border-border text-foreground text-xs h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Mobile Number *
                  </label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    required
                    className="bg-background border-border text-foreground text-xs h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="applicant@email.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="bg-background border-border text-foreground text-xs h-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Target Course *
                </label>
                <select
                  value={createCourseId}
                  onChange={(e) => setCreateCourseId(e.target.value)}
                  required
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Application Fee Status
                  </label>
                  <select
                    value={createFeeStatus}
                    onChange={(e) => setCreateFeeStatus(e.target.value as "PAID" | "PENDING")}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="PENDING">Not paid</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Initial Status
                  </label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value as ApplicationStatus)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_REVIEW">Under review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Counsellor Remarks / Initial Note
                </label>
                <Input
                  placeholder="e.g. Document verification initiated. Eligible for batch DM-01."
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-10"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 text-xs font-semibold text-foreground border-border hover:bg-muted/50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 text-xs font-bold px-5 cursor-pointer"
                >
                  Create Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PermissionGate>
  );
};
