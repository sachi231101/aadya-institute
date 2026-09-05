import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  Copy,
  Phone,
  Mail,
  CreditCard,
  ShieldCheck,
  UserCheck,
  User,
  MapPin,
  FileText,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { EnrichedAdmission, AdmissionRecordStatus } from "./AllAdmissions";

interface ViewAdmissionInfoProps {
  admission: EnrichedAdmission;
  onBack: () => void;
  onOpenManageAdmission: () => void;
  onOpenChangeBatch: () => void;
  onOpenFeeDetails: () => void;
  onOpenDocs: () => void;
  onCopyAdmNo: (admNo: string, e?: React.MouseEvent) => void;
  renderAdmissionStatusBadge: (status: AdmissionRecordStatus | string) => React.ReactNode;
  basePath: string;
}

export const ViewAdmissionInfo: React.FC<ViewAdmissionInfoProps> = ({
  admission,
  onBack,
  onOpenManageAdmission,
  onOpenChangeBatch,
  onOpenFeeDetails,
  onOpenDocs,
  onCopyAdmNo,
  renderAdmissionStatusBadge,
  basePath,
}) => {
  const navigate = useNavigate();

  const hasAssignedBatch = Boolean(
    admission.batchId ||
      (admission.batchCode &&
        !admission.batchCode.toLowerCase().includes("pending") &&
        admission.batchCode !== "—")
  );

  const docStats = {
    total: admission.documents.length,
    verified: admission.documents.filter((d) => d.verified).length,
    pending: admission.documents.filter((d) => !d.verified).length,
    submitted: admission.documents.length,
  };

  const handleNavigateToStudent360 = () => {
    if (admission.studentId) {
      navigate(`${basePath}/students/${admission.studentId}`);
    } else {
      navigate(`${basePath}/students/all?search=${encodeURIComponent(admission.studentName)}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* ─── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 rounded-lg border-border text-foreground hover:bg-muted/50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer"
              >
                ← Back to All Admissions
              </Button>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-0.5">
              View Student Information
            </h1>
            <p className="text-xs text-muted-foreground">
              Complete admission and student details.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenManageAdmission}
            variant="outline"
            className="h-9 px-3.5 text-xs font-semibold border-border text-foreground hover:bg-muted/50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Manage Admission</span>
          </Button>

          <Button
            onClick={handleNavigateToStudent360}
            className="h-9 px-3.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>View Full Student 360</span>
          </Button>
        </div>
      </div>

      {/* ─── STUDENT SUMMARY ──────────────────────────────────────────── */}
      <Card className="bg-card border-border shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border border-border">
                <AvatarImage src={admission.avatar} alt={admission.studentName} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {admission.studentName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                    {admission.studentName}
                  </h2>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    {admission.admissionNo}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => onCopyAdmNo(admission.admissionNo, e)}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copy Admission Number"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-emerald-500" />
                    {admission.phone}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-primary" />
                    {admission.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:border-l lg:border-border lg:pl-5">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Admission Status</p>
                <div className="mt-1">
                  {renderAdmissionStatusBadge(admission.status)}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Batch Status</p>
                <p className="text-xs font-bold text-foreground mt-1">
                  {hasAssignedBatch ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Batch Assigned</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Batch Assignment Pending</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Admission Date</p>
                <p className="text-xs font-medium text-foreground mt-1">
                  {admission.admissionDate}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Source</p>
                <p className="text-xs font-medium text-foreground mt-1">
                  {admission.admissionSource}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 6 SECTIONS IN BALANCED 2-COLUMN GRID ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SECTION 1: STUDENT INFORMATION */}
        <Card className="bg-card border-border shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2 font-bold text-sm text-foreground">
            <User className="h-4 w-4 text-primary" />
            <span>Section 1 — Student Information</span>
          </div>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Full Name</span>
              <span className="text-foreground font-bold text-sm mt-0.5 block">{admission.studentName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Student ID</span>
              <span className="text-foreground font-mono font-bold mt-0.5 block">{admission.studentCode || admission.studentId || "Not Provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Primary Mobile Number</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.phone || "Not Provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Alternative Mobile</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.altPhone && admission.altPhone !== "—" ? admission.altPhone : "Not Provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Email Address</span>
              <span className="text-foreground font-medium mt-0.5 block truncate">{admission.email && admission.email !== "—" ? admission.email : "Not Provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Date of Birth</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.dob && admission.dob !== "—" ? admission.dob : "Not Provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Gender</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.gender || "Not Provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Blood Group</span>
              <span className="text-foreground font-semibold mt-0.5 block">{admission.bloodGroup || "Not Provided"}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Highest Qualification</span>
              <span className="text-foreground font-semibold text-xs mt-0.5 block">{admission.highestQualification || "Not Provided"}</span>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: PARENT / GUARDIAN & ADDRESS */}
        <Card className="bg-card border-border shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2 font-bold text-sm text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Section 2 — Parent / Guardian & Address</span>
          </div>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Parent / Guardian Name</span>
              <span className="text-foreground font-semibold mt-0.5 block">{admission.guardianName && admission.guardianName !== "—" ? admission.guardianName : "Not Provided"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Parent / Guardian Mobile</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.emergencyContact && admission.emergencyContact !== "—" ? admission.emergencyContact : admission.phone || "Not Provided"}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Emergency Contact</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.emergencyContact && admission.emergencyContact !== "—" ? admission.emergencyContact : "Not Provided"}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Residential Address</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.address && admission.address !== "—" ? admission.address : "Not Provided"}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">City / Location</span>
              <span className="text-foreground font-medium mt-0.5 block">
                {admission.city && admission.city !== "—"
                  ? `${admission.city}, ${admission.state && admission.state !== "—" ? admission.state : "Karnataka"} ${admission.pincode && admission.pincode !== "—" ? `- ${admission.pincode}` : ""}`
                  : "Not Provided"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: ADMISSION DETAILS */}
        <Card className="bg-card border-border shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2 font-bold text-sm text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            <span>Section 3 — Admission Details</span>
          </div>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Admission Number</span>
              <span className="text-foreground font-mono font-bold mt-0.5 block">{admission.admissionNo}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Admission Date</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.admissionDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Admission Type</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.admissionType || "Regular Admission"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Branch / Center</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.branchName || "Aadya Institute Malleshwaram"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Academic Year</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.academicYear || "2025 – 2026"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Assigned Counsellor</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.counselorName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Lead / Enquiry Source</span>
              <span className="text-foreground font-medium mt-0.5 block">{admission.admissionSource}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Admission Status</span>
              <div className="mt-0.5">{renderAdmissionStatusBadge(admission.status)}</div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: COURSE & BATCH DETAILS */}
        <Card className="bg-card border-border shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between font-bold text-sm text-foreground">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>Section 4 — Course & Batch Details</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenChangeBatch}
              className="h-7 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>{hasAssignedBatch ? "Assign / Change Batch" : "Assign Batch"}</span>
            </Button>
          </div>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={(admission.courses?.length || 0) > 1 ? "sm:col-span-2" : undefined}>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  Selected Course{(admission.courses?.length || 0) > 1 ? "s" : ""}
                </span>
                {(admission.courses?.length || 0) > 1 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {admission.courses!.map((c) => (
                      <Badge
                        key={c.admissionId || c.id}
                        variant="outline"
                        className="text-[11px] font-semibold border-primary/30 text-primary bg-primary/5"
                      >
                        {c.name}
                        {c.code ? ` (${c.code})` : ""}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-primary font-bold text-sm mt-0.5 block">{admission.courseName}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Course Duration</span>
                <span className="text-foreground font-medium mt-0.5 block">{admission.programDuration}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Course Fee</span>
                <span className="text-foreground font-bold mt-0.5 block">₹{admission.totalCourseFee.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Batch Status</span>
                <span className="mt-0.5 block font-semibold text-foreground">
                  {hasAssignedBatch ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Batch Assigned</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">● Batch Assignment Pending</span>
                  )}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              {hasAssignedBatch ? (
                <div className="p-3.5 bg-muted/40 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Batch Name</span>
                    <span className="font-bold text-foreground font-mono mt-0.5 block">{admission.batchCode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Faculty</span>
                    <span className="font-medium text-foreground mt-0.5 block">{admission.assignedFaculty}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Batch Start Date</span>
                    <span className="font-medium text-foreground mt-0.5 block">{admission.batchStartDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Class Schedule</span>
                    <span className="font-medium text-foreground mt-0.5 block">{admission.batchTiming}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
                  <p className="font-bold text-xs">Batch Not Assigned Yet</p>
                  <p className="text-[11px] mt-0.5 opacity-90">Click "Assign Batch" to assign this student to an active batch.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 5: FEE SUMMARY */}
        <Card className="bg-card border-border shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between font-bold text-sm text-foreground">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Section 5 — Fee Summary</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenFeeDetails}
              className="h-7 text-xs font-semibold border-border text-foreground hover:bg-muted/50 gap-1 cursor-pointer"
            >
              <CreditCard className="h-3 w-3 text-emerald-500" />
              <span>View Fee Details</span>
            </Button>
          </div>
          <CardContent className="p-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Course Fee</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">₹{admission.totalCourseFee.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Amount Paid</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">₹{admission.amountPaid.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Remaining Balance</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">₹{admission.amountDue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Payment Status</span>
                <span className="mt-1 block">
                  <Badge className={admission.amountDue === 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-[10px]" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold text-[10px]"}>
                    {admission.amountDue === 0 ? "Paid in Full" : "Installment Due"}
                  </Badge>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 6: DOCUMENT SUMMARY */}
        <Card className="bg-card border-border shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between font-bold text-sm text-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Section 6 — Document Summary</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenDocs}
              className="h-7 text-xs font-semibold border-border text-foreground hover:bg-muted/50 gap-1 cursor-pointer"
            >
              <FileText className="h-3 w-3 text-primary" />
              <span>View Documents</span>
            </Button>
          </div>
          <CardContent className="p-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border text-center">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Documents</span>
                <span className="text-base font-bold text-foreground mt-0.5 block">{docStats.total}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Submitted</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">{docStats.submitted}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Pending</span>
                <span className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{docStats.pending}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Verified</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{docStats.verified}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
