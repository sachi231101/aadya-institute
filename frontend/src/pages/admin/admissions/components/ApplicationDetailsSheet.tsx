import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Pencil,
  User,
  X,
} from "lucide-react";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MasterSelect } from "@/components/common/MasterSelect";
import type { ApplicationListItem } from "@/utils/map-application";
import type { ApplicationActivity } from "@/types/admission.types";
import { renderApplicationStatusBadge } from "./application-status-badges";

type CourseOption = { id: string; name: string };

export type MarkPaidPayload = {
  applicationFee: number;
  paymentModeMasterId: string;
  paymentRef?: string;
};

export type EditApplicationPayload = {
  applicantName: string;
  phone: string;
  email?: string;
  courseId: string;
};

interface ApplicationDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: ApplicationListItem | null;
  isLoading: boolean;
  activities: ApplicationActivity[];
  courses: CourseOption[];
  canEdit: boolean;
  isUpdating: boolean;
  isAddingNote: boolean;
  leadBasePath?: string;
  /** Portal root e.g. /admin — used for receipt deep links */
  portalBasePath?: string;
  onMarkPaid: (appId: string, payload: MarkPaidPayload) => Promise<void>;
  onReject: (appId: string, reason: string) => Promise<void>;
  onUpdateDetails: (appId: string, payload: EditApplicationPayload) => Promise<void>;
  onConvert: (app: ApplicationListItem) => void;
  onViewAdmission: (admissionId: string) => void;
  onAddNote: (appId: string, note: string) => Promise<void>;
}

const WORKFLOW_STEPS = ["Submitted", "Review", "Fee paid", "Admitted"] as const;

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

function toWhatsAppNumber(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 13) return digits;
  return null;
}

function formatPaidAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function convertDisabledReason(app: ApplicationListItem): string | null {
  if (app.status === "ADMITTED") return "Already admitted";
  if (app.status === "REJECTED") return "Rejected applications cannot be converted";
  if (app.feeStatus !== "PAID") return "Application fee must be paid first";
  return null;
}

export function ApplicationDetailsSheet({
  open,
  onOpenChange,
  application,
  isLoading,
  activities,
  courses,
  canEdit,
  isUpdating,
  isAddingNote,
  leadBasePath = "/admin/leads",
  portalBasePath = "/admin",
  onMarkPaid,
  onReject,
  onUpdateDetails,
  onConvert,
  onViewAdmission,
  onAddNote,
}: ApplicationDetailsSheetProps) {
  const [noteInput, setNoteInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCourseId, setEditCourseId] = useState("");

  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [paidModeId, setPaidModeId] = useState("");
  const [paidRef, setPaidRef] = useState("");
  const [paidError, setPaidError] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  useEffect(() => {
    if (!application) return;
    setIsEditing(false);
    setNoteInput("");
    setEditName(application.applicantName);
    setEditPhone(application.phone);
    setEditEmail(application.email || "");
    setEditCourseId(application.courseId);
  }, [application?.id, open]);

  const waNumber = useMemo(
    () => (application ? toWhatsAppNumber(application.phone) : null),
    [application]
  );
  const telHref = useMemo(() => {
    if (!application) return null;
    const d = digitsOnly(application.phone);
    return d ? `tel:+${d.length === 10 ? `91${d}` : d}` : null;
  }, [application]);

  const convertBlockReason = application ? convertDisabledReason(application) : null;
  const isTerminal =
    application?.status === "REJECTED" || application?.status === "ADMITTED";
  const showViewAdmission =
    application?.status === "ADMITTED" && Boolean(application.linkedAdmissionId);

  const handleSaveNote = async () => {
    if (!application || !noteInput.trim()) return;
    await onAddNote(application.id, noteInput.trim());
    setNoteInput("");
  };

  const handleSaveEdit = async () => {
    if (!application) return;
    await onUpdateDetails(application.id, {
      applicantName: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim() || undefined,
      courseId: editCourseId,
    });
    setIsEditing(false);
  };

  const openMarkPaid = () => {
    if (!application) return;
    setPaidAmount(application.applicationFee ?? "");
    setPaidModeId(application.paymentModeMasterId || "");
    setPaidRef(application.paymentRef || "");
    setPaidError(null);
    setMarkPaidOpen(true);
  };

  const submitMarkPaid = async () => {
    if (!application) return;
    if (paidAmount === "" || Number.isNaN(Number(paidAmount))) {
      setPaidError("Enter the application fee amount");
      return;
    }
    if (!paidModeId) {
      setPaidError("Payment mode is required");
      return;
    }
    setPaidError(null);
    await onMarkPaid(application.id, {
      applicationFee: Number(paidAmount),
      paymentModeMasterId: paidModeId,
      paymentRef: paidRef.trim() || undefined,
    });
    setMarkPaidOpen(false);
  };

  const submitReject = async () => {
    if (!application) return;
    if (!rejectReason.trim()) {
      setRejectError("Reject reason is required");
      return;
    }
    setRejectError(null);
    await onReject(application.id, rejectReason.trim());
    setRejectOpen(false);
    setRejectReason("");
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          hideClose
          className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-xl bg-card text-foreground border-l border-border"
        >
          {isLoading && !application ? (
            <div className="p-8 text-sm text-muted-foreground">Loading application...</div>
          ) : application ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-border bg-muted/30 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={application.avatar}
                      alt=""
                      className="h-11 w-11 rounded-full border border-border bg-muted shrink-0"
                    />
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderApplicationStatusBadge(application.status, application.feeStatus)}
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 font-mono">
                          {application.applicationNo}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-foreground truncate">
                        {application.applicantName}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Applied for{" "}
                        <strong className="text-foreground">{application.courseName}</strong>
                        {" · "}
                        {application.submittedDate} at {application.submittedTime}
                      </p>
                    </div>
                  </div>
                  <SheetClose asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                      aria-label="Close application details"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetClose>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {telHref && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" asChild>
                      <a href={telHref}>
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                    </Button>
                  )}
                  {waNumber && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" asChild>
                      <a
                        href={`https://wa.me/${waNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Progress
                  </h4>
                  <div className="grid grid-cols-4 gap-1.5">
                    {WORKFLOW_STEPS.map((label, idx) => {
                      const step = idx + 1;
                      const done = application.currentWorkflowStep >= step;
                      return (
                        <div
                          key={label}
                          className={`rounded-lg border px-2 py-2 text-center ${
                            done
                              ? "border-primary/30 bg-primary/10 text-foreground"
                              : "border-border bg-muted/20 text-muted-foreground"
                          }`}
                        >
                          <div className="text-[10px] font-semibold uppercase tracking-wide">
                            {step}
                          </div>
                          <div className="text-[11px] font-medium mt-0.5">{label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <User className="h-4 w-4 text-primary" /> Contact &amp; course
                    </h4>
                    {canEdit && !isTerminal && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          if (isEditing) {
                            setEditName(application.applicantName);
                            setEditPhone(application.phone);
                            setEditEmail(application.email || "");
                            setEditCourseId(application.courseId);
                          }
                          setIsEditing((v) => !v);
                        }}
                      >
                        {isEditing ? (
                          "Cancel"
                        ) : (
                          <>
                            <Pencil className="h-3 w-3" /> Edit
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
                      <div>
                        <label className="text-[11px] text-muted-foreground">Full name</label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-9 text-xs mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-muted-foreground">Mobile</label>
                          <Input
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="h-9 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground">Email</label>
                          <Input
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="h-9 text-xs mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground">Course</label>
                        <select
                          value={editCourseId}
                          onChange={(e) => setEditCourseId(e.target.value)}
                          className="w-full h-9 mt-1 px-3 bg-background border border-border rounded-md text-xs"
                        >
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => void handleSaveEdit()}
                        disabled={
                          !editName.trim() ||
                          !editPhone.trim() ||
                          !editCourseId ||
                          isUpdating
                        }
                      >
                        {isUpdating && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                        Save changes
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/20 text-xs">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Full name</p>
                        <p className="font-semibold text-foreground mt-0.5">
                          {application.applicantName}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Mobile</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-500" /> {application.phone || "—"}
                          </span>
                          {telHref && (
                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" asChild>
                              <a href={telHref}>Call</a>
                            </Button>
                          )}
                          {waNumber && (
                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" asChild>
                              <a
                                href={`https://wa.me/${waNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                WhatsApp
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[11px] text-muted-foreground">Email</p>
                        <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-primary" />{" "}
                          {application.email?.trim() ? application.email : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Program</p>
                        <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                          <GraduationCap className="h-3 w-3 text-primary" />
                          {application.courseName}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Course code</p>
                        <p className="font-semibold text-foreground mt-0.5">
                          {application.courseCode}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" /> Application Fee
                  </h4>
                  <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground">Status</p>
                        <p
                          className={`font-bold mt-0.5 ${
                            application.feeStatus === "PAID" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {application.feeStatus === "PAID" ? "Paid" : "Pending"}
                          {application.applicationFee != null && (
                            <span className="text-foreground font-semibold ml-1.5">
                              · ₹{Number(application.applicationFee).toLocaleString("en-IN")}
                            </span>
                          )}
                        </p>
                        {application.feeStatus === "PAID" && (
                          <div className="mt-2 space-y-1.5 text-muted-foreground">
                            <p className="text-foreground font-medium">Application Fee</p>
                            {application.receiptNo && (
                              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                <span>Receipt:</span>
                                {application.paymentId ? (
                                  <Link
                                    to={`${portalBasePath}/fees/receipts/${application.paymentId}`}
                                    className="font-mono font-semibold text-primary hover:underline"
                                  >
                                    {application.receiptNo}
                                  </Link>
                                ) : (
                                  <span className="font-mono font-semibold text-foreground">
                                    {application.receiptNo}
                                  </span>
                                )}
                              </p>
                            )}
                            {application.paymentModeName && (
                              <p>Mode: {application.paymentModeName}</p>
                            )}
                            {application.paymentRef && <p>Ref: {application.paymentRef}</p>}
                            {formatPaidAt(application.feePaidAt) && (
                              <p>Paid at: {formatPaidAt(application.feePaidAt)}</p>
                            )}
                            {application.paymentId && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 mt-1"
                                asChild
                              >
                                <Link to={`${portalBasePath}/fees/receipts/${application.paymentId}`}>
                                  <ExternalLink className="h-3 w-3" />
                                  View receipt
                                </Link>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {canEdit && !isTerminal && application.feeStatus !== "PAID" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs shrink-0"
                          onClick={openMarkPaid}
                          disabled={isUpdating}
                        >
                          Mark paid
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {application.leadId && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Source / Lead
                    </h4>
                    <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs space-y-2">
                      {application.leadSource && (
                        <p>
                          <span className="text-muted-foreground">Channel:</span>{" "}
                          {application.leadSource}
                        </p>
                      )}
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" asChild>
                        <Link to={`${leadBasePath}/${application.leadId}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open lead
                          {application.leadName ? ` — ${application.leadName}` : ""}
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Activity / Notes
                  </h4>
                  {activities.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {activities.map((act) => (
                        <div
                          key={act.id}
                          className="text-xs p-3 rounded-xl border border-border bg-card space-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground">{act.title}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(act.createdAt).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-muted-foreground whitespace-pre-wrap">
                              {act.description}
                            </p>
                          )}
                          {act.user?.name && (
                            <p className="text-[10px] text-muted-foreground">by {act.user.name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : application.notes ? (
                    <p className="text-xs text-foreground whitespace-pre-wrap p-3 rounded-xl border border-border bg-card">
                      {application.notes}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No notes yet.</p>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t border-border bg-card">
                {canEdit && application.status !== "REJECTED" && (
                  <div className="flex gap-2 border-b border-border p-3">
                    <Textarea
                      placeholder="Add a note… (Ctrl/Cmd+Enter to save)"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          void handleSaveNote();
                        }
                      }}
                      className="text-xs min-h-[56px]"
                    />
                    <Button
                      size="sm"
                      className="h-9 text-xs shrink-0 self-end"
                      onClick={() => void handleSaveNote()}
                      disabled={!noteInput.trim() || isAddingNote}
                    >
                      {isAddingNote ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                )}

                {canEdit && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    {!isTerminal ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectReason("");
                          setRejectError(null);
                          setRejectOpen(true);
                        }}
                        disabled={isUpdating}
                        className="text-xs text-rose-600 border-border h-9"
                      >
                        Reject
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {application.status === "REJECTED" ? "Rejected" : "Admitted"}
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      {showViewAdmission ? (
                        <Button
                          size="sm"
                          onClick={() => onViewAdmission(application.linkedAdmissionId!)}
                          className="font-bold text-xs h-9"
                        >
                          View admission <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0}>
                                <Button
                                  size="sm"
                                  disabled={Boolean(convertBlockReason) || isUpdating}
                                  onClick={() => setConvertOpen(true)}
                                  className="font-bold text-xs h-9"
                                >
                                  Convert to admission <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {convertBlockReason && (
                              <TooltipContent>
                                <p>{convertBlockReason}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-sm text-muted-foreground">Application not found.</div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark application fee paid</DialogTitle>
            <DialogDescription>
              Enter amount, payment mode, and optional transaction reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Application Fee (₹) *</label>
              <Input
                type="number"
                min={0}
                className="h-9 text-xs mt-1"
                value={paidAmount}
                onChange={(e) =>
                  setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium">Payment mode *</label>
              <MasterSelect
                entityType="paymentmodes"
                value={paidModeId}
                onChange={setPaidModeId}
                placeholder="Select payment mode"
                className="mt-1 h-9 text-xs rounded-md"
                branchId={application?.branchId || undefined}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Transaction / Ref</label>
              <Input
                className="h-9 text-xs mt-1"
                placeholder="Optional"
                value={paidRef}
                onChange={(e) => setPaidRef(e.target.value)}
              />
            </div>
            {paidError && <p className="text-xs text-rose-600">{paidError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMarkPaidOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={() => void submitMarkPaid()} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Confirm paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>A reason is required and will appear in activity.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-xs font-medium">Reason *</label>
            <Textarea
              className="text-xs mt-1 min-h-[80px]"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Not eligible for selected course"
            />
            {rejectError && <p className="text-xs text-rose-600 mt-1">{rejectError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void submitReject()}
              disabled={isUpdating}
            >
              {isUpdating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to admission?</DialogTitle>
            <DialogDescription>
              Continue to Direct Admission Entry with this application prefilled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!application) return;
                setConvertOpen(false);
                onConvert(application);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
