import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
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
import { LeadScoreBadge } from "./components/LeadScoreBadge";
import { CallDetailDrawer } from "./components/CallDetailDrawer";

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
  const canAssign = aiReady && !isClosed;
  const canAct = isAssigned && !isClosed;

  const openApplication = () => {
    setAppCourseId(lead?.courseId || "");
    setAppNotes("");
    setShowApplicationDialog(true);
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
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`${basePath}/leads`)}
          className="gap-2 mb-4"
        >
          <ArrowLeft size={16} /> Back to Leads
        </Button>
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-text-secondary font-medium">Lead not found</p>
        </div>
      </div>
    );
  }

  const currentStageIndex = stagePipeline.indexOf(lead.stage);

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate(`${basePath}/leads`)}
        className="gap-2 -ml-2"
      >
        <ArrowLeft size={16} /> Back to Leads
      </Button>

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#2563EB] to-[#2088d8] rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {lead.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{lead.name}</h1>
                <LeadScoreBadge
                  score={lead.leadScore}
                  className="bg-white/90 border-white/40"
                />
                <LeadStageBadge stage={lead.stage} className="bg-white/90" />
              </div>
              <div className="flex items-center gap-3 mt-1 text-blue-100">
                <span className="flex items-center gap-1">
                  <Phone size={14} /> {lead.phoneNumber}
                </span>
                {lead.email && <span>• {lead.email}</span>}
              </div>
              <p className="text-sm text-blue-200 mt-1">
                Interested in:{" "}
                <span className="font-semibold text-white">
                  {lead.interestedIn || lead.course?.name}
                </span>
              </p>
              {lead.nextBestAction && (
                <p className="mt-2 text-sm bg-white/15 rounded-md px-3 py-1.5 inline-flex items-center gap-1.5 max-w-xl">
                  <Sparkles size={14} />
                  <span>
                    <strong>Next best action:</strong> {lead.nextBestAction}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate itemKey="leads.all" mode="write">
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
                onClick={() => id && triggerCallMutation.mutate(id)}
                disabled={triggerCallMutation.isPending}
              >
                <Bot size={14} />
                {triggerCallMutation.isPending ? "Calling..." : "AI Call"}
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
                onClick={() => setShowManualCallDialog(true)}
              >
                <PhoneCall size={14} /> Log Call
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
                onClick={() => void handleWhatsApp()}
              >
                <MessageCircle size={14} /> Open WhatsApp
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
                onClick={() => setShowAssignDialog(true)}
                disabled={!canAssign}
                title={
                  !aiReady
                    ? "Wait for the AI call to finish before assigning"
                    : undefined
                }
              >
                <UserCheck size={14} /> Assign
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
                onClick={() => setShowFollowUpDialog(true)}
                disabled={!canAct}
              >
                <Calendar size={14} /> Follow-Up
              </Button>
              {canAct && lead.stage !== "CONVERTED" && (
                <>
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 font-semibold"
                    onClick={navigateToDirectAdmission}
                  >
                    <GraduationCap size={14} /> Continue to Admission
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
                    onClick={openApplication}
                  >
                    <FileText size={14} /> Create Application
                  </Button>
                </>
              )}
              {canAct && (
                <Button
                  variant="outline"
                  className="bg-red-500/20 border-red-300/40 text-red-100 hover:bg-red-500/30 gap-1 text-xs"
                  onClick={() => setShowLostDialog(true)}
                >
                  <XCircle size={14} /> Mark Lost
                </Button>
              )}
            </PermissionGate>
            {lead.stage === "CONVERTED" && (
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 font-semibold"
                onClick={() =>
                  navigate(`${basePath}/admissions/all`, {
                    state: { admissionId: lead.convertedAdmissionId },
                  })
                }
              >
                <CheckCircle2 size={14} /> View Admission
              </Button>
            )}
          </div>
        </div>

        {!aiReady && (
          <p className="mt-4 text-sm bg-white/15 rounded-md px-3 py-2">
            AI call is in progress. Assign a counsellor after the call completes,
            no-answers, is busy, or fails.
          </p>
        )}
        {aiReady && !isAssigned && !isClosed && (
          <p className="mt-4 text-sm bg-white/15 rounded-md px-3 py-2">
            AI call finished ({latestCall?.status || "attempted"}). Assign a
            counsellor to continue follow-up.
          </p>
        )}

        <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-1">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-white text-[#2563EB] shadow-md"
                      : isCompleted
                        ? "bg-white/30 text-white"
                        : "bg-white/10 text-white/50"
                  }`}
                >
                  {masterOpt?.label || stage.replace(/_/g, " ")}
                </button>
                {idx < stagePipeline.length - 1 && (
                  <div
                    className={`w-6 h-0.5 ${isCompleted ? "bg-white/50" : "bg-white/15"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
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
        <TabsList className="bg-slate-100 flex-wrap h-auto gap-1">
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
        <TabsContent value="profile">
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
                      className="bg-[#2563EB] text-white"
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
                      <LeadScoreBadge score={lead.leadScore} />
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
                      {call.interestStatus ? ` · ${call.interestStatus}` : ""}
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
                      className="bg-[#2563EB] text-white"
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
                      className="bg-[#2563EB] text-white shrink-0 self-end"
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
                className="bg-[#2563EB] text-white"
              >
                {createAppMutation.isPending ? "Creating..." : "Create Application"}
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
                  className="bg-[#2563EB] text-white"
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
                    className="bg-[#2563EB] text-white"
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
                className="bg-[#2563EB] text-white"
                disabled={manualCallMutation.isPending}
              >
                {manualCallMutation.isPending ? "Saving..." : "Log call"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
