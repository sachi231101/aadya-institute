import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  PhoneCall,
  Bot,
  UserCheck,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Calendar,
  XCircle,
  Pencil,
  GraduationCap,
  MessageCircle,
  StickyNote,
  Activity,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useLeadById,
  useLeadFollowUps,
  useLeadHistory,
  useCallHistory,
  useCreateFollowUp,
  useUpdateFollowUp,
  useTriggerLeadCall,
  useChangeLeadStage,
  useAssignLead,
  useMarkLeadLost,
  useUpdateLead,
  useUpdateLeadTags,
  useUpdateLeadScore,
  useCreateApplicationFromLead,
  useConvertLead,
  useCreateManualCallLog,
} from "@/hooks/useLeads";
import { leadsApi, type CallLog, type LeadActivity } from "@/services/leads.api";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { useAdminUsers } from "@/hooks/useUsers";
import { useCourses } from "@/hooks/useCourses";
import { getPortalBasePath } from "@/utils/portal-path";
import {
  DEFAULT_LEAD_STAGE_PIPELINE,
  LeadStageBadge,
  isTerminalAiCallStatus,
} from "@/components/common/LeadStageBadge";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/store/auth.store";
import { PageContainer, PageHeader } from "@/components/layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadScoreBadge } from "./components/LeadScoreBadge";
import { CallDetailDrawer } from "./components/CallDetailDrawer";
import { LeadIntentBadge } from "./components/LeadIntentBadge";
import { LeadAiInsightsPanel } from "./components/LeadAiInsightsPanel";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN");
}

function isCommActivity(type?: string) {
  const t = (type || "").toUpperCase();
  return (
    t.includes("CALL") ||
    t.includes("WHATSAPP") ||
    t.includes("SMS") ||
    t.includes("EMAIL") ||
    t.includes("MESSAGE") ||
    t.includes("NOTE")
  );
}

function isNoteActivity(type?: string) {
  const t = (type || "").toUpperCase();
  return t.includes("NOTE");
}

export const LeadDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = getPortalBasePath(location.pathname);
  const queryClient = useQueryClient();
  const { canEditItem } = usePermissions();
  const canEditLeads = canEditItem("leads.all");
  const { user } = useAuthStore();
  const roles = (user?.roles || []).map((r) => r.toUpperCase());
  const canBypassAiAssignGate =
    roles.includes("ADMIN") ||
    roles.includes("SUPER_ADMIN") ||
    roles.includes("CENTER_MANAGER");

  const [convertError, setConvertError] = useState<string | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const tabFromUrl = searchParams.get("tab") || "profile";
  const allowedTabs = new Set([
    "profile",
    "calls",
    "follow-ups",
    "communication",
    "notes",
    "timeline",
  ]);
  const initialTab = allowedTabs.has(tabFromUrl) ? tabFromUrl : "profile";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [showManualCallDialog, setShowManualCallDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState("");
  const [scoreDraft, setScoreDraft] = useState("");
  const [probDraft, setProbDraft] = useState("");
  const [nextActionDraft, setNextActionDraft] = useState("");

  const [appCourseId, setAppCourseId] = useState("");
  const [appNotes, setAppNotes] = useState("");

  useEffect(() => {
    const fromUrl = searchParams.get("tab") || "profile";
    if (allowedTabs.has(fromUrl) && fromUrl !== activeTab) {
      setActiveTab(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync URL → tab
  }, [searchParams]);

  const { data: leadResponse, isLoading } = useLeadById(id || "");
  const { options: leadStageOptions } = useMasterDropdown("leadstage");
  const { data: usersData } = useAdminUsers({ role: "COUNSELLOR", limit: 100 });
  const { courses } = useCourses({ status: "ACTIVE" });
  const counsellors = (usersData?.data ?? []) as { id: string; name: string }[];

  const stagePipeline = useMemo(() => {
    const known = new Set([...DEFAULT_LEAD_STAGE_PIPELINE]);
    const fromMasters = leadStageOptions
      .map((opt) => opt.code || opt.label.toUpperCase().replace(/\s+/g, "_"))
      .filter((code) => known.has(code));
    if (fromMasters.length >= 4) return fromMasters;
    return [...DEFAULT_LEAD_STAGE_PIPELINE, "LOST"];
  }, [leadStageOptions]);

  const { data: followUpsResponse } = useLeadFollowUps(id || "");
  const { data: historyResponse } = useLeadHistory(id || "");
  const { data: callHistoryResponse, isLoading: callsLoading } = useCallHistory({
    leadId: id,
    limit: 50,
  });

  const createAppMutation = useCreateApplicationFromLead();
  const convertLeadMutation = useConvertLead();
  const createFollowUpMutation = useCreateFollowUp();
  const updateFollowUpMutation = useUpdateFollowUp();
  const triggerCallMutation = useTriggerLeadCall();
  const changeStageMutation = useChangeLeadStage();
  const assignMutation = useAssignLead();
  const markLostMutation = useMarkLeadLost();
  const updateLeadMutation = useUpdateLead();
  const updateTagsMutation = useUpdateLeadTags();
  const updateScoreMutation = useUpdateLeadScore();
  const manualCallMutation = useCreateManualCallLog();

  const addNoteMutation = useMutation({
    mutationFn: (description: string) =>
      leadsApi.addActivity(id!, {
        type: "NOTE_ADDED",
        title: "Note added",
        description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", id] });
      queryClient.invalidateQueries({ queryKey: ["leads", id, "history"] });
      setNoteDraft("");
    },
  });

  const lead = leadResponse?.data;

  const navigateToDirectAdmission = () => {
    if (!lead) return;
    navigate(`${basePath}/admissions/direct-entry`, {
      state: {
        lead: {
          id: lead.id,
          name: lead.name,
          phone: lead.phoneNumber,
          email: lead.email,
          courseId: lead.courseId,
          course: lead.course?.name || lead.interestedIn,
          source: lead.source,
          notes: lead.notes,
          branchId: lead.branchId,
        },
        leadId: lead.id,
      },
    });
  };

  const followUps: Array<{
    id: string;
    type: string;
    status: string;
    priority?: string;
    scheduledAt: string;
    notes?: string;
    outcome?: string;
    counsellor?: { name: string };
  }> = Array.isArray(followUpsResponse?.data)
    ? followUpsResponse.data
    : followUpsResponse?.data?.followUps || lead?.followUps || [];

  const activities: LeadActivity[] = Array.isArray(historyResponse?.data)
    ? historyResponse.data
    : historyResponse?.data?.activities || lead?.activities || [];

  const callLogs: CallLog[] = useMemo(() => {
    const fromHistory = callHistoryResponse?.data?.data ?? callHistoryResponse?.data;
    if (Array.isArray(fromHistory) && fromHistory.length > 0) return fromHistory;
    return lead?.callLogs || [];
  }, [callHistoryResponse, lead?.callLogs]);

  const noteActivities = activities.filter((a) => isNoteActivity(a.type));
  const commActivities = activities.filter((a) => isCommActivity(a.type));

  const latestCall = callLogs[0] || lead?.callLogs?.[0];
  const aiReady = Boolean(
    callLogs.some((c) => isTerminalAiCallStatus(c.status)) ||
      (lead && lead.stage !== "NEW")
  );
  const isAssigned = Boolean(lead?.assignedCounsellorId);
  const isClosed = lead?.stage === "CONVERTED" || lead?.stage === "LOST";
  const canAssign = (aiReady || canBypassAiAssignGate) && !isClosed;
  const canAct = isAssigned && !isClosed;

  const openApplication = () => {
    setAppCourseId(lead?.courseId || "");
    setAppNotes("");
    setShowApplicationDialog(true);
  };

  const openConvertDialog = () => {
    setAppCourseId(lead?.courseId || "");
    setAppNotes("");
    setConvertError(null);
    setShowConvertDialog(true);
  };

  const handleConvertLead = () => {
    if (!id) return;
    if (!appCourseId && !lead?.courseId) {
      setConvertError("Select a course before converting this lead.");
      return;
    }
    setConvertError(null);
    convertLeadMutation.mutate(
      {
        id,
        data: {
          courseId: appCourseId || lead?.courseId || undefined,
          notes: appNotes || undefined,
          feePlan: "INSTALLMENT",
          createStudentUser: true,
        },
      },
      {
        onSuccess: (res) => {
          setShowConvertDialog(false);
          const admissionId =
            res?.data?.admission?.id || res?.data?.lead?.convertedAdmissionId;
          navigate(`${basePath}/admissions/all`, {
            state: { admissionId },
          });
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ||
            (err as Error)?.message ||
            "Failed to convert lead";
          setConvertError(msg);
        },
      }
    );
  };

  const handleCreateApplication = () => {
    if (!id || !appCourseId) return;
    createAppMutation.mutate(
      { id, data: { courseId: appCourseId, notes: appNotes || undefined } },
      {
        onSuccess: (res) => {
          setShowApplicationDialog(false);
          const applicationId = res?.data?.id;
          navigate(`${basePath}/admissions/applications`, {
            state: { applicationId },
          });
        },
      }
    );
  };

  const handleStageChange = (newStage: string) => {
    if (!id || !lead || newStage === lead.stage) return;
    if (newStage === "CONVERTED") {
      if (canAct) navigateToDirectAdmission();
      return;
    }
    if (newStage === "LOST") {
      if (canAct) setShowLostDialog(true);
      return;
    }
    changeStageMutation.mutate({
      id,
      data: { stage: newStage, notes: `Stage moved to ${newStage}` },
    });
  };

  const handleWhatsApp = async () => {
    if (!lead) return;
    const phone = lead.phoneNumber.replace(/\D/g, "");
    const digits = phone.startsWith("91") ? phone : `91${phone}`;
    try {
      await leadsApi.addActivity(lead.id, {
        type: "WHATSAPP_SENT",
        title: "WhatsApp opened",
        description: `Opened WhatsApp chat for ${lead.phoneNumber}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["leads", id] });
      await queryClient.invalidateQueries({ queryKey: ["leads", id, "history"] });
    } catch {
      // Non-blocking
    }
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  };

  const startEditing = () => {
    if (!lead) return;
    setTagsDraft((lead.tags || []).join(", "));
    setScoreDraft(lead.leadScore != null ? String(lead.leadScore) : "");
    setProbDraft(
      lead.admissionProbability != null ? String(lead.admissionProbability) : ""
    );
    setNextActionDraft(lead.nextBestAction || "");
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <PageContainer className="flex justify-center py-20">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary">Loading lead details...</p>
        </div>
      </PageContainer>
    );
  }

  if (!lead) {
    return (
      <PageContainer maxWidth="narrow" className="text-center py-20">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-text-secondary font-medium mb-4">Lead not found</p>
        <Button
          variant="outline"
          onClick={() => navigate(`${basePath}/leads`)}
          className="gap-2"
        >
          <ArrowLeft size={16} /> Back to Leads
        </Button>
      </PageContainer>
    );
  }

  const currentStageIndex = stagePipeline.indexOf(lead.stage);
  const interestLabel = lead.interestedIn || lead.course?.name || "—";
  const headerDescription = [
    lead.phoneNumber,
    lead.email,
    interestLabel !== "—" ? `Interest: ${interestLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const primaryAction = (() => {
    if (lead.stage === "CONVERTED") {
      return (
        <Button
          className="gap-2"
          onClick={() =>
            navigate(`${basePath}/admissions/all`, {
              state: { admissionId: lead.convertedAdmissionId },
            })
          }
        >
          <CheckCircle2 size={14} /> View Admission
        </Button>
      );
    }
    if (canAct) {
      return (
        <PermissionGate itemKey="leads.all" mode="write">
          <Button
            className="gap-2"
            onClick={openConvertDialog}
            disabled={convertLeadMutation.isPending}
          >
            <GraduationCap size={14} /> Convert to Admission
          </Button>
        </PermissionGate>
      );
    }
    if (canAssign && !isAssigned) {
      return (
        <PermissionGate itemKey="leads.all" mode="write">
          <Button
            className="gap-2"
            onClick={() => setShowAssignDialog(true)}
            title={
              !aiReady
                ? "Wait for the AI call to finish before assigning"
                : undefined
            }
          >
            <UserCheck size={14} /> Assign
          </Button>
        </PermissionGate>
      );
    }
    return (
      <PermissionGate itemKey="leads.all" mode="write">
        <Button
          className="gap-2"
          onClick={() => id && triggerCallMutation.mutate(id)}
          disabled={triggerCallMutation.isPending || isClosed}
        >
          <Bot size={14} />
          {triggerCallMutation.isPending ? "Calling..." : "AI Call"}
        </Button>
      </PermissionGate>
    );
  })();

  return (
    <PageContainer>
      <Button
        variant="ghost"
        onClick={() => navigate(`${basePath}/leads`)}
        className="gap-2 -ml-2 w-fit"
      >
        <ArrowLeft size={16} /> Back to Leads
      </Button>

      <PageHeader
        title={lead.name}
        description={headerDescription}
        actions={
          <>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {lead.leadScore != null ? `${lead.leadScore}/100` : "—"}
            </span>
            <LeadScoreBadge
              score={lead.leadScore}
              temperature={lead.leadTemperature}
              showScore={false}
            />
            <LeadStageBadge stage={lead.stage} />
            <LeadIntentBadge
              intent={lead.leadIntent || latestCall?.interestStatus}
            />
            {primaryAction}
            <PermissionGate itemKey="leads.all" mode="write">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {(canAct || (canAssign && !isAssigned)) && !isClosed && (
                    <DropdownMenuItem
                      onClick={() => id && triggerCallMutation.mutate(id)}
                      disabled={triggerCallMutation.isPending}
                    >
                      <Bot size={14} className="mr-2" /> AI Call
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setShowManualCallDialog(true)}>
                    <PhoneCall size={14} className="mr-2" /> Log Call
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleWhatsApp()}>
                    <MessageCircle size={14} className="mr-2" /> Open WhatsApp
                  </DropdownMenuItem>
                  {!(canAssign && !isAssigned && !canAct) && (
                    <DropdownMenuItem
                      onClick={() => setShowAssignDialog(true)}
                      disabled={!canAssign}
                    >
                      <UserCheck size={14} className="mr-2" /> Assign
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowFollowUpDialog(true)}
                    disabled={!canAct}
                  >
                    <Calendar size={14} className="mr-2" /> Follow-Up
                  </DropdownMenuItem>
                  {canAct && lead.stage !== "CONVERTED" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={navigateToDirectAdmission}>
                        <GraduationCap size={14} className="mr-2" /> Continue to Admission Form
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={openApplication}>
                        <FileText size={14} className="mr-2" /> Create Application
                      </DropdownMenuItem>
                    </>
                  )}
                  {canAct && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setShowLostDialog(true)}
                      >
                        <XCircle size={14} className="mr-2" /> Mark Lost
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGate>
          </>
        }
      />

      {lead.nextBestAction && (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-text-secondary">
          <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
          <span>
            <span className="font-medium text-foreground">Next best action:</span>{" "}
            {lead.nextBestAction}
          </span>
        </div>
      )}

      {!aiReady && !canBypassAiAssignGate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          AI call is in progress. Assign a counsellor after the call completes,
          no-answers, is busy, or fails.
        </div>
      )}
      {!aiReady && canBypassAiAssignGate && !isClosed && (
        <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-text-secondary">
          AI call has not finished yet. As Admin/Center Manager you can still assign a counsellor.
        </div>
      )}
      {aiReady && !isAssigned && !isClosed && (
        <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-text-secondary">
          AI call finished ({latestCall?.status || "attempted"}). Assign a
          counsellor to continue follow-up.
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {stagePipeline.map((stage, idx) => {
          const masterOpt = leadStageOptions.find((opt) => opt.code === stage);
          const isCompleted = idx <= currentStageIndex;
          const isCurrent = stage === lead.stage;
          return (
            <div key={stage} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStageChange(stage)}
                disabled={changeStageMutation.isPending || isClosed || !canEditLeads}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {masterOpt?.label || stage.replace(/_/g, " ")}
              </button>
              {idx < stagePipeline.length - 1 && (
                <div
                  className={`w-5 h-px ${isCompleted ? "bg-primary/40" : "bg-border"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          const next = new URLSearchParams(searchParams);
          if (value === "profile") next.delete("tab");
          else next.set("tab", value);
          setSearchParams(next, { replace: true });
        }}
        className="space-y-4"
      >
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="profile" className="gap-1.5">
            <FileText size={14} /> Profile
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-1.5">
            <PhoneCall size={14} /> Calls ({callLogs.length})
          </TabsTrigger>
          <TabsTrigger value="follow-ups" className="gap-1.5">
            <Calendar size={14} /> Follow-ups ({followUps.length})
          </TabsTrigger>
          <TabsTrigger value="communication" className="gap-1.5">
            <MessageCircle size={14} /> Communication
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <StickyNote size={14} /> Notes
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <Activity size={14} /> Activity Timeline
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Lead profile</CardTitle>
              {!isClosed && (
                <PermissionGate itemKey="leads.all" mode="write">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => (isEditing ? setIsEditing(false) : startEditing())}
                  >
                    <Pencil size={14} /> {isEditing ? "Cancel" : "Edit"}
                  </Button>
                </PermissionGate>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!id) return;
                    const form = new FormData(e.currentTarget);
                    const tags = tagsDraft
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean);
                    updateLeadMutation.mutate(
                      {
                        id,
                        data: {
                          name: String(form.get("name") || ""),
                          phoneNumber: String(form.get("phoneNumber") || ""),
                          email: String(form.get("email") || "") || undefined,
                          interestedIn: String(form.get("interestedIn") || ""),
                          courseId: String(form.get("courseId") || "") || undefined,
                          priority: String(form.get("priority") || "MEDIUM"),
                          notes: String(form.get("notes") || "") || undefined,
                        },
                      },
                      {
                        onSuccess: () => {
                          updateTagsMutation.mutate({ id, data: { tags } });
                          const scoreVal =
                            scoreDraft.trim() === ""
                              ? null
                              : Number(scoreDraft);
                          const probVal =
                            probDraft.trim() === "" ? null : Number(probDraft);
                          updateScoreMutation.mutate({
                            id,
                            data: {
                              leadScore:
                                scoreVal != null && !Number.isNaN(scoreVal)
                                  ? scoreVal
                                  : null,
                              admissionProbability:
                                probVal != null && !Number.isNaN(probVal)
                                  ? probVal
                                  : null,
                              nextBestAction: nextActionDraft.trim() || null,
                            },
                          });
                          setIsEditing(false);
                        },
                      }
                    );
                  }}
                >
                  <div>
                    <Label>Name</Label>
                    <Input name="name" defaultValue={lead.name} className="mt-1" required />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      name="phoneNumber"
                      defaultValue={lead.phoneNumber}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input name="email" defaultValue={lead.email || ""} className="mt-1" />
                  </div>
                  <div>
                    <Label>Interested in</Label>
                    <Input
                      name="interestedIn"
                      defaultValue={lead.interestedIn}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label>Course</Label>
                    <select
                      name="courseId"
                      defaultValue={lead.courseId || ""}
                      className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
                    >
                      <option value="">None</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <select
                      name="priority"
                      defaultValue={lead.priority}
                      className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div>
                    <Label>Lead score (0–100)</Label>
                    <Input
                      value={scoreDraft}
                      onChange={(e) => setScoreDraft(e.target.value)}
                      type="number"
                      min={0}
                      max={100}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Admission probability (0–100)</Label>
                    <Input
                      value={probDraft}
                      onChange={(e) => setProbDraft(e.target.value)}
                      type="number"
                      min={0}
                      max={100}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={tagsDraft}
                      onChange={(e) => setTagsDraft(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Next best action</Label>
                    <Input
                      value={nextActionDraft}
                      onChange={(e) => setNextActionDraft(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea name="notes" defaultValue={lead.notes || ""} className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      type="submit"
                      disabled={updateLeadMutation.isPending}
                      className="bg-primary text-white"
                    >
                      {updateLeadMutation.isPending ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </form>
              ) : (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-text-muted">Source</dt>
                    <dd className="font-medium">{lead.source || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Status</dt>
                    <dd className="font-medium">{lead.status || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Priority</dt>
                    <dd className="font-medium">{lead.priority || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Branch</dt>
                    <dd className="font-medium">{lead.branch?.name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Counsellor</dt>
                    <dd className="font-medium">
                      {lead.assignedCounsellor?.name || "Unassigned"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Course / program</dt>
                    <dd className="font-medium">
                      {lead.course?.name || lead.interestedIn || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Lead score</dt>
                    <dd className="font-medium mt-0.5">
                      {lead.leadScore != null ? `${lead.leadScore}/100` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Temperature</dt>
                    <dd className="font-medium mt-0.5">
                      <LeadScoreBadge
                        score={lead.leadScore}
                        temperature={lead.leadTemperature}
                        showScore={false}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">AI Intent</dt>
                    <dd className="font-medium mt-0.5">
                      <LeadIntentBadge
                        intent={lead.leadIntent || latestCall?.interestStatus}
                        emptyLabel="—"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Next follow-up</dt>
                    <dd className="font-medium">
                      {lead.nextFollowUpAt
                        ? new Date(lead.nextFollowUpAt).toLocaleString("en-IN")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Admission probability</dt>
                    <dd className="font-medium">
                      {lead.admissionProbability != null
                        ? `${lead.admissionProbability}%`
                        : "—"}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-text-muted">Tags</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {(lead.tags || []).length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        lead.tags!.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))
                      )}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-text-muted">Next best action</dt>
                    <dd className="font-medium">{lead.nextBestAction || "—"}</dd>
                  </div>
                  {lead.notes && (
                    <div className="md:col-span-2">
                      <dt className="text-text-muted">Notes</dt>
                      <dd className="mt-1 whitespace-pre-wrap">{lead.notes}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

          <LeadAiInsightsPanel lead={lead} latestCall={latestCall} />
        </TabsContent>

        {/* Calls */}
        <TabsContent value="calls">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Call history</CardTitle>
              <PermissionGate itemKey="leads.all" mode="write">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setShowManualCallDialog(true)}
                >
                  <PhoneCall size={14} /> Log manual call
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent className="space-y-2">
              {callsLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Loading calls...
                </p>
              ) : callLogs.length === 0 ? (
                <p className="text-sm text-text-secondary py-8 text-center">
                  No calls logged yet.
                </p>
              ) : (
                callLogs.map((call) => (
                  <button
                    key={call.id}
                    type="button"
                    onClick={() => setSelectedCall(call)}
                    className="w-full text-left border rounded-md p-3 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {call.callType || "AI"}
                        </Badge>
                        <span className="text-sm font-medium">{call.status}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(call.startedAt || call.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Duration {call.duration || 0}s
                      {call.interestStatus ? (
                        <>
                          {" · "}
                          <span className="text-foreground font-medium">
                            {call.interestStatus.replace(/_/g, " ")}
                          </span>
                        </>
                      ) : (
                        ""
                      )}
                      {call.caller?.name ? ` · ${call.caller.name}` : ""}
                    </p>
                    {call.aiSummary && (
                      <p className="text-xs mt-1 line-clamp-2">{call.aiSummary}</p>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-ups */}
        <TabsContent value="follow-ups">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Follow-ups</CardTitle>
              <PermissionGate itemKey="leads.all" mode="write">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setShowFollowUpDialog(true)}
                  disabled={!canAct}
                >
                  <Calendar size={14} /> Schedule
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent className="space-y-3">
              {followUps.length === 0 ? (
                <p className="text-sm text-text-secondary py-8 text-center">
                  No follow-ups scheduled.
                </p>
              ) : (
                followUps.map((fu) => (
                  <div
                    key={fu.id}
                    className="flex items-center justify-between border rounded-md p-3 gap-3"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {fu.type} · {fu.status}
                        {fu.priority ? ` · ${fu.priority}` : ""}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatDateTime(fu.scheduledAt)}
                        {fu.counsellor?.name ? ` · ${fu.counsellor.name}` : ""}
                      </p>
                      {fu.notes && <p className="text-xs mt-1">{fu.notes}</p>}
                      {fu.outcome && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          Outcome: {fu.outcome}
                        </p>
                      )}
                    </div>
                    {fu.status === "PENDING" && canAct && (
                      <PermissionGate itemKey="leads.all" mode="write">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            id &&
                            updateFollowUpMutation.mutate({
                              leadId: id,
                              followUpId: fu.id,
                              data: {
                                status: "COMPLETED",
                                outcome: "Completed from lead details",
                              },
                            })
                          }
                        >
                          Complete
                        </Button>
                      </PermissionGate>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication */}
        <TabsContent value="communication">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Communication</CardTitle>
              <PermissionGate itemKey="leads.all" mode="write">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => void handleWhatsApp()}
                >
                  <MessageCircle size={14} /> Open WhatsApp
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent className="space-y-3">
              {commActivities.length === 0 ? (
                <p className="text-sm text-text-secondary py-8 text-center">
                  No communication activity yet.
                </p>
              ) : (
                commActivities.map((act) => (
                  <div key={act.id} className="border-b last:border-0 pb-3">
                    <p className="text-sm font-medium">{act.title}</p>
                    <p className="text-xs text-text-secondary">
                      {act.type} · {formatDateTime(act.createdAt)}
                      {act.user?.name ? ` · ${act.user.name}` : ""}
                    </p>
                    {act.description && (
                      <p className="text-xs mt-1">{act.description}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead notes</CardTitle>
              </CardHeader>
              <CardContent>
                <PermissionGate
                  itemKey="leads.all"
                  mode="write"
                  fallback={
                    <p className="text-sm whitespace-pre-wrap">
                      {lead.notes || "No notes."}
                    </p>
                  }
                >
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!id) return;
                      const form = new FormData(e.currentTarget);
                      updateLeadMutation.mutate({
                        id,
                        data: {
                          notes: String(form.get("notes") || "") || undefined,
                        },
                      });
                    }}
                  >
                    <Textarea
                      name="notes"
                      defaultValue={lead.notes || ""}
                      rows={6}
                      className="text-sm"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-primary text-white"
                      disabled={updateLeadMutation.isPending}
                    >
                      {updateLeadMutation.isPending ? "Saving..." : "Save notes"}
                    </Button>
                  </form>
                </PermissionGate>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <PermissionGate itemKey="leads.all" mode="write">
                  <div className="flex gap-2">
                    <Textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Add a note..."
                      rows={2}
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      className="bg-primary text-white shrink-0 self-end"
                      disabled={!noteDraft.trim() || addNoteMutation.isPending}
                      onClick={() => addNoteMutation.mutate(noteDraft.trim())}
                    >
                      Add
                    </Button>
                  </div>
                </PermissionGate>
                {noteActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No note activities yet.
                  </p>
                ) : (
                  noteActivities.map((act) => (
                    <div key={act.id} className="border rounded-md p-3">
                      <p className="text-sm">{act.description || act.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(act.createdAt)}
                        {act.user?.name ? ` · ${act.user.name}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock size={16} /> Activity timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-sm text-text-secondary py-8 text-center">
                  No activity yet.
                </p>
              ) : (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className="relative pl-4 border-l-2 border-border pb-4 last:pb-0"
                  >
                    <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-primary/80" />
                    <p className="text-sm font-medium">{act.title}</p>
                    <p className="text-xs text-text-secondary">
                      {act.type} · {formatDateTime(act.createdAt)}
                      {act.user?.name ? ` · ${act.user.name}` : ""}
                    </p>
                    {act.description && (
                      <p className="text-xs mt-1">{act.description}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CallDetailDrawer
        call={selectedCall}
        open={!!selectedCall}
        onOpenChange={(open) => {
          if (!open) setSelectedCall(null);
        }}
      />

      {/* Dialogs reused from previous Lead Details */}
      <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-text-secondary">
              Creates an application for paperwork and fees. The lead stays open.
            </p>
            <div>
              <Label>Course *</Label>
              <select
                value={appCourseId}
                onChange={(e) => setAppCourseId(e.target.value)}
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={appNotes}
                onChange={(e) => setAppNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplicationDialog(false)}>
              Cancel
            </Button>
            <PermissionGate itemKey="leads.all" mode="write">
              <Button
                onClick={handleCreateApplication}
                disabled={!appCourseId || createAppMutation.isPending}
                className="bg-primary text-white"
              >
                {createAppMutation.isPending ? "Creating..." : "Create Application"}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Admission</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-text-secondary">
              Creates a student and admission from this lead, then marks the lead as converted.
            </p>
            {convertError ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {convertError}
              </p>
            ) : null}
            <div>
              <Label>Course *</Label>
              <select
                value={appCourseId}
                onChange={(e) => setAppCourseId(e.target.value)}
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {!lead?.courseId && !appCourseId ? (
                <p className="text-xs text-amber-700 mt-1">
                  This lead has no matched course yet — select one to convert.
                </p>
              ) : null}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={appNotes}
                onChange={(e) => setAppNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
              Cancel
            </Button>
            <PermissionGate itemKey="leads.all" mode="write">
              <Button
                onClick={handleConvertLead}
                disabled={(!appCourseId && !lead?.courseId) || convertLeadMutation.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {convertLeadMutation.isPending ? "Converting..." : "Convert to Admission"}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-Up</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (!id) return;
              createFollowUpMutation.mutate(
                {
                  id,
                  data: {
                    type: formData.get("type") as string,
                    scheduledAt: formData.get("scheduledAt") as string,
                    notes: formData.get("notes") as string,
                    counsellorId: lead.assignedCounsellorId || lead.createdById,
                    priority: (formData.get("priority") as string) || "MEDIUM",
                  },
                },
                { onSuccess: () => setShowFollowUpDialog(false) }
              );
            }}
            className="space-y-4 py-2"
          >
            <div>
              <Label>Follow-Up Type</Label>
              <select
                name="type"
                className="w-full mt-1 h-9 px-3 rounded-md border text-sm bg-background"
              >
                <option value="CALL">Phone Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="MEETING">Meeting</option>
                <option value="REMINDER">Reminder</option>
              </select>
            </div>
            <div>
              <Label>Scheduled Date & Time</Label>
              <Input name="scheduledAt" type="datetime-local" className="mt-1" required />
            </div>
            <div>
              <Label>Priority</Label>
              <select
                name="priority"
                defaultValue="MEDIUM"
                className="w-full mt-1 h-9 px-3 rounded-md border text-sm bg-background"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input name="notes" className="mt-1" />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFollowUpDialog(false)}
              >
                Cancel
              </Button>
              <PermissionGate itemKey="leads.all" mode="write">
                <Button
                  type="submit"
                  className="bg-primary text-white"
                  disabled={createFollowUpMutation.isPending}
                >
                  {createFollowUpMutation.isPending
                    ? "Scheduling..."
                    : "Schedule Follow-Up"}
                </Button>
              </PermissionGate>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Lead to Counsellor</DialogTitle>
          </DialogHeader>
          {!canAssign ? (
            <p className="text-sm text-text-secondary py-2">
              Wait for the AI call to finish before assigning.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const counsellorId = formData.get("counsellorId") as string;
                if (!id || !counsellorId) return;
                assignMutation.mutate(
                  {
                    id,
                    data: {
                      counsellorId,
                      notes: (formData.get("notes") as string) || undefined,
                    },
                  },
                  { onSuccess: () => setShowAssignDialog(false) }
                );
              }}
              className="space-y-4 py-2"
            >
              <div>
                <Label>Counsellor</Label>
                <select
                  name="counsellorId"
                  className="w-full mt-1 h-10 px-3 rounded-md border text-sm bg-background"
                  required
                  defaultValue={lead.assignedCounsellorId || ""}
                >
                  <option value="">Select counsellor</option>
                  {counsellors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Assignment Notes</Label>
                <Input name="notes" className="mt-1" />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAssignDialog(false)}
                >
                  Cancel
                </Button>
                <PermissionGate itemKey="leads.all" mode="write">
                  <Button
                    type="submit"
                    className="bg-primary text-white"
                    disabled={assignMutation.isPending}
                  >
                    {assignMutation.isPending ? "Assigning..." : "Assign Counsellor"}
                  </Button>
                </PermissionGate>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Lead as Lost</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (!id) return;
              markLostMutation.mutate(
                {
                  id,
                  data: {
                    reason: formData.get("reason") as string,
                    notes: (formData.get("notes") as string) || undefined,
                  },
                },
                { onSuccess: () => setShowLostDialog(false) }
              );
            }}
            className="space-y-4 py-2"
          >
            <div>
              <Label>Reason for Loss</Label>
              <select
                name="reason"
                className="w-full mt-1 h-9 px-3 rounded-md border text-sm bg-background"
                required
              >
                <option value="PRICE_HIGH">Price / Fees Too High</option>
                <option value="TIMING_ISSUE">Batch Timing Issue</option>
                <option value="NOT_INTERESTED">Not Interested Anymore</option>
                <option value="JOINED_COMPETITOR">Joined Another Institute</option>
                <option value="LOCATION_ISSUE">Location Too Far</option>
                <option value="NO_RESPONSE">No Response After Multiple Calls</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>
            <div>
              <Label>Details / Notes</Label>
              <Input name="notes" className="mt-1" />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLostDialog(false)}
              >
                Cancel
              </Button>
              <PermissionGate itemKey="leads.all" mode="write">
                <Button
                  type="submit"
                  className="bg-red-600 text-white"
                  disabled={markLostMutation.isPending}
                >
                  {markLostMutation.isPending ? "Marking..." : "Confirm Mark Lost"}
                </Button>
              </PermissionGate>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showManualCallDialog} onOpenChange={setShowManualCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log manual call</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!id) return;
              const form = new FormData(e.currentTarget);
              manualCallMutation.mutate(
                {
                  leadId: id,
                  status: String(form.get("status") || "COMPLETED"),
                  duration: Number(form.get("duration") || 0) || undefined,
                  outcome: String(form.get("outcome") || "") || null,
                  notes: String(form.get("notes") || "") || null,
                  interestStatus:
                    String(form.get("interestStatus") || "") || null,
                },
                { onSuccess: () => setShowManualCallDialog(false) }
              );
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <select
                  name="status"
                  defaultValue="COMPLETED"
                  className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
                >
                  <option value="COMPLETED">Completed</option>
                  <option value="NO_ANSWER">No answer</option>
                  <option value="BUSY">Busy</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
              <div>
                <Label>Duration (sec)</Label>
                <Input name="duration" type="number" min={0} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Interest</Label>
              <select
                name="interestStatus"
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="">—</option>
                <option value="INTERESTED">Interested</option>
                <option value="NOT_INTERESTED">Not interested</option>
                <option value="CALLBACK">Callback</option>
                <option value="NEUTRAL">Neutral</option>
              </select>
            </div>
            <div>
              <Label>Outcome</Label>
              <Input name="outcome" className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="notes" className="mt-1" rows={3} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowManualCallDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-white"
                disabled={manualCallMutation.isPending}
              >
                {manualCallMutation.isPending ? "Saving..." : "Log call"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
