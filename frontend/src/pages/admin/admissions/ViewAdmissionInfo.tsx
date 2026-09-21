import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  Phone,
  Mail,
  CreditCard,
  UserCheck,
  User,
  MapPin,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  CalendarDays,
  Building2,
  Copy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePermissions } from "@/hooks/usePermissions";
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

const Field = ({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`min-w-0 space-y-1 ${className}`}>
    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
      {label}
    </span>
    <div className="text-sm font-medium text-foreground break-words">{children}</div>
  </div>
);

const SectionCard = ({
  icon: Icon,
  title,
  action,
  children,
  accent = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  accent?: "primary" | "emerald" | "amber" | "sky";
}) => {
  const accentMap = {
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  };

  return (
    <Card className="bg-card border-border shadow-xs rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${accentMap[accent]}`}>
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <CardContent className="p-4 sm:p-5">{children}</CardContent>
    </Card>
  );
};

export const ViewAdmissionInfo: React.FC<ViewAdmissionInfoProps> = ({
  admission,
  onBack,
  onOpenManageAdmission,
  onOpenChangeBatch,
  onOpenFeeDetails,
  onCopyAdmNo,
  renderAdmissionStatusBadge,
  basePath,
}) => {
  const navigate = useNavigate();
  const { canEditItem } = usePermissions();
  const canEditAdmissions = canEditItem("admissions.all");

  const hasAssignedBatch = Boolean(
    admission.batchId ||
      (admission.batchCode &&
        !admission.batchCode.toLowerCase().includes("pending") &&
        admission.batchCode !== "—")
  );

  const initials = admission.studentName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleNavigateToStudent360 = () => {
    if (admission.studentId) {
      navigate(`${basePath}/students/${admission.studentId}`);
    } else {
      navigate(`${basePath}/students/all?search=${encodeURIComponent(admission.studentName)}`);
    }
  };

  const displayOrFallback = (value?: string | null, fallback = "Not provided") => {
    if (!value || value === "—") return fallback;
    return value;
  };

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-200">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-9 rounded-lg border-border text-foreground hover:bg-muted/50 cursor-pointer gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs font-semibold">Back to Admissions</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {canEditAdmissions && (
            <Button
              onClick={onOpenManageAdmission}
              variant="outline"
              className="h-9 px-3.5 text-xs font-semibold border-border text-foreground hover:bg-muted/50 flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              Manage
            </Button>
          )}
          <Button
            onClick={handleNavigateToStudent360}
            className="h-9 px-3.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Student 360
          </Button>
        </div>
      </div>

      {/* Hero profile */}
      <Card className="bg-card border-border shadow-xs rounded-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-sky-500 to-emerald-500" />
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-8">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <Avatar className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] border-2 border-primary/20 shadow-sm shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {initials || "ST"}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 space-y-2.5 flex-1">
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground break-words">
                    {admission.studentName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => onCopyAdmNo(admission.admissionNo, e)}
                      className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg hover:bg-primary/15 transition-colors cursor-pointer"
                      title="Copy admission number"
                    >
                      {admission.admissionNo}
                      <Copy className="h-3 w-3 opacity-70" />
                    </button>
                    {renderAdmissionStatusBadge(admission.status)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                    <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate max-w-[180px]">{displayOrFallback(admission.phone)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border px-2.5 py-1 text-xs font-medium text-foreground max-w-full">
                    <Mail className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                    <span className="truncate max-w-[240px]">{displayOrFallback(admission.email)}</span>
                  </span>
                  {admission.branchName && admission.branchName !== "—" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate max-w-[200px]">{admission.branchName}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 lg:min-w-[280px] xl:min-w-[420px]">
              <div className="rounded-xl border border-border bg-muted/40 p-3 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Admission</p>
                <div className="mt-1.5">{renderAdmissionStatusBadge(admission.status)}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Batch</p>
                <p className={`mt-1.5 text-xs font-semibold ${hasAssignedBatch ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {hasAssignedBatch ? "Assigned" : "Pending"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> Date
                </p>
                <p className="mt-1.5 text-xs font-semibold text-foreground break-words">{admission.admissionDate}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Source</p>
                <p className="mt-1.5 text-xs font-semibold text-foreground break-words">{displayOrFallback(admission.admissionSource, "—")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <SectionCard icon={User} title="Student Information" accent="primary">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name">{admission.studentName}</Field>
            <Field label="Student ID">
              <span className="font-mono text-sm">{displayOrFallback(admission.studentCode || admission.studentId)}</span>
            </Field>
            <Field label="Primary Mobile">{displayOrFallback(admission.phone)}</Field>
            <Field label="Alternative Mobile">
              {displayOrFallback(admission.altPhone && admission.altPhone !== "—" ? admission.altPhone : null)}
            </Field>
            <Field label="Email" className="sm:col-span-2">
              {displayOrFallback(admission.email && admission.email !== "—" ? admission.email : null)}
            </Field>
            <Field label="Date of Birth">{displayOrFallback(admission.dob && admission.dob !== "—" ? admission.dob : null)}</Field>
            <Field label="Gender">{displayOrFallback(admission.gender)}</Field>
            <Field label="Blood Group">{displayOrFallback(admission.bloodGroup)}</Field>
            <Field label="Highest Qualification" className="sm:col-span-2">
              {displayOrFallback(admission.highestQualification)}
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} title="Guardian & Address" accent="sky">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Guardian Name">
              {displayOrFallback(admission.guardianName && admission.guardianName !== "—" ? admission.guardianName : null)}
            </Field>
            <Field label="Guardian Mobile">
              {displayOrFallback(
                admission.emergencyContact && admission.emergencyContact !== "—"
                  ? admission.emergencyContact
                  : admission.phone
              )}
            </Field>
            <Field label="Emergency Contact" className="sm:col-span-2">
              {displayOrFallback(admission.emergencyContact && admission.emergencyContact !== "—" ? admission.emergencyContact : null)}
            </Field>
            <Field label="Residential Address" className="sm:col-span-2">
              {displayOrFallback(admission.address && admission.address !== "—" ? admission.address : null)}
            </Field>
            <Field label="City / Location" className="sm:col-span-2">
              {admission.city && admission.city !== "—"
                ? `${admission.city}${admission.state && admission.state !== "—" ? `, ${admission.state}` : ""}${
                    admission.pincode && admission.pincode !== "—" ? ` – ${admission.pincode}` : ""
                  }`
                : "Not provided"}
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={FileText} title="Admission Details" accent="primary">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Admission Number">
              <span className="font-mono">{admission.admissionNo}</span>
            </Field>
            <Field label="Admission Date">{admission.admissionDate}</Field>
            <Field label="Admission Type">{admission.admissionType || "Regular Admission"}</Field>
            <Field label="Branch / Center">
              {displayOrFallback(admission.branchName, "Aadya Institute")}
            </Field>
            <Field label="Academic Year">{displayOrFallback(admission.academicYear, "2025 – 2026")}</Field>
            <Field label="Counsellor">{displayOrFallback(admission.counselorName)}</Field>
            <Field label="Lead Source">{displayOrFallback(admission.admissionSource)}</Field>
            <Field label="Status">{renderAdmissionStatusBadge(admission.status)}</Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={GraduationCap}
          title="Course & Batch"
          accent="emerald"
          action={
            canEditAdmissions ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenChangeBatch}
                className="h-8 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 gap-1 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                {hasAssignedBatch ? "Change Batch" : "Assign Batch"}
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label={`Selected Course${(admission.courses?.length || 0) > 1 ? "s" : ""}`}
                className={(admission.courses?.length || 0) > 1 ? "sm:col-span-2" : undefined}
              >
                {(admission.courses?.length || 0) > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
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
                  <span className="text-primary font-semibold">{admission.courseName}</span>
                )}
              </Field>
              <Field label="Duration">{displayOrFallback(admission.programDuration)}</Field>
              <Field label="Total Course Fee">
                <span className="font-semibold">₹{admission.totalCourseFee.toLocaleString()}</span>
              </Field>
              <Field label="Batch Status">
                {hasAssignedBatch ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold text-[10px]">
                    Batch Assigned
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold text-[10px]">
                    Assignment Pending
                  </Badge>
                )}
              </Field>
            </div>

            {hasAssignedBatch ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Field label="Batch Name">
                  <span className="font-mono font-semibold">{admission.batchCode}</span>
                </Field>
                <Field label="Faculty">{displayOrFallback(admission.assignedFaculty)}</Field>
                <Field label="Start Date">{displayOrFallback(admission.batchStartDate)}</Field>
                <Field label="Schedule">{displayOrFallback(admission.batchTiming)}</Field>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3.5 text-center">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Batch not assigned yet</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                  Assign this student to an active batch to complete scheduling.
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          icon={CreditCard}
          title="Fee Summary"
          accent="amber"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenFeeDetails}
              className="h-8 text-xs font-semibold border-border text-foreground hover:bg-muted/50 gap-1 cursor-pointer"
            >
              View Fee Details
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/40 p-3.5">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Fee</p>
              <p className="mt-1 text-base font-semibold text-foreground">₹{admission.totalCourseFee.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700/80 dark:text-emerald-300/80">Paid</p>
              <p className="mt-1 text-base font-semibold text-emerald-700 dark:text-emerald-300">
                ₹{admission.amountPaid.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-700/80 dark:text-amber-300/80">Balance</p>
              <p className="mt-1 text-base font-semibold text-amber-700 dark:text-amber-300">
                ₹{admission.amountDue.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3.5">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Payment Status</p>
              <div className="mt-1.5">
                <Badge
                  className={
                    admission.totalCourseFee <= 0 && admission.amountPaid <= 0
                      ? "bg-muted text-muted-foreground border-border font-semibold text-[10px]"
                      : admission.amountDue === 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold text-[10px]"
                        : admission.amountPaid > 0
                          ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 font-semibold text-[10px]"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold text-[10px]"
                  }
                >
                  {admission.totalCourseFee <= 0 && admission.amountPaid <= 0
                    ? "No Fee Setup"
                    : admission.amountDue === 0
                      ? "Paid in Full"
                      : admission.amountPaid > 0
                        ? "Partially Paid"
                        : "Installment Due"}
                </Badge>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
