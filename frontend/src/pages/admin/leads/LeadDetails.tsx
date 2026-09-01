import React, { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Phone, PhoneCall, Bot, UserCheck, CheckCircle2, Clock,
  FileText, AlertCircle, Calendar, XCircle, Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useLeadById, useLeadFollowUps, useLeadHistory, useConvertLead,
  useCreateFollowUp, useUpdateFollowUp, useTriggerLeadCall, useChangeLeadStage,
  useAssignLead, useMarkLeadLost, useUpdateLead, useCreateApplicationFromLead,
} from "@/hooks/useLeads";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { useAdminUsers } from "@/hooks/useUsers";
import { useCourses } from "@/hooks/useCourses";
import { useBatches } from "@/hooks/useBatches";
import { getPortalBasePath } from "@/utils/portal-path";
import {
  DEFAULT_LEAD_STAGE_PIPELINE,
  LeadStageBadge,
  isTerminalAiCallStatus,
} from "@/components/common/LeadStageBadge";

export const LeadDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);

  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [convertCourseId, setConvertCourseId] = useState("");
  const [convertBatchId, setConvertBatchId] = useState("");
  const [convertFeePlan, setConvertFeePlan] = useState<"INSTALLMENT" | "FULL_PAYMENT">("INSTALLMENT");
  const [convertNotes, setConvertNotes] = useState("");
  const [appCourseId, setAppCourseId] = useState("");
  const [appNotes, setAppNotes] = useState("");

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

  const convertMutation = useConvertLead();
  const createAppMutation = useCreateApplicationFromLead();
  const createFollowUpMutation = useCreateFollowUp();
  const updateFollowUpMutation = useUpdateFollowUp();
  const triggerCallMutation = useTriggerLeadCall();
  const changeStageMutation = useChangeLeadStage();
  const assignMutation = useAssignLead();
  const markLostMutation = useMarkLeadLost();
  const updateLeadMutation = useUpdateLead();

  const lead = leadResponse?.data;
  const { batches } = useBatches({
    courseId: convertCourseId || lead?.courseId || undefined,
  });

  const followUps: Array<{
    id: string; type: string; status: string; scheduledAt: string;
    notes?: string; counsellor?: { name: string };
  }> = Array.isArray(followUpsResponse?.data)
    ? followUpsResponse.data
    : followUpsResponse?.data?.followUps || lead?.followUps || [];
  const activities: Array<{
    id: string; type: string; title: string; createdAt: string; description?: string;
  }> = Array.isArray(historyResponse?.data)
    ? historyResponse.data
    : historyResponse?.data?.activities || lead?.activities || [];

  const latestCall = lead?.callLogs?.[0];
  const aiReady = Boolean(
    lead?.callLogs?.some((c) => isTerminalAiCallStatus(c.status)) ||
    (lead && lead.stage !== "NEW")
  );
  const isAssigned = Boolean(lead?.assignedCounsellorId);
  const isClosed = lead?.stage === "CONVERTED" || lead?.stage === "LOST";
  const canAssign = aiReady && !isClosed;
  const canAct = isAssigned && !isClosed;

  const openConvert = () => {
    setConvertCourseId(lead?.courseId || "");
    setConvertBatchId("");
    setConvertFeePlan("INSTALLMENT");
    setConvertNotes("");
    setShowConvertDialog(true);
  };

  const openApplication = () => {
    setAppCourseId(lead?.courseId || "");
    setAppNotes("");
    setShowApplicationDialog(true);
  };

  const handleConvert = () => {
    if (!id || !convertCourseId) return;
    convertMutation.mutate(
      {
        id,
        data: {
          courseId: convertCourseId,
          batchId: convertBatchId || undefined,
          feePlan: convertFeePlan,
          notes: convertNotes || `Converted from lead: ${lead?.name}`,
        },
      },
      {
        onSuccess: (res) => {
          setShowConvertDialog(false);
          const admissionId = res?.data?.admission?.id;
          navigate(`${basePath}/admissions/all`, { state: { admissionId } });
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
          navigate(`${basePath}/admissions/applications`, { state: { applicationId } });
        },
      }
    );
  };

  const handleStageChange = (newStage: string) => {
    if (!id || !lead || newStage === lead.stage) return;
    if (newStage === "CONVERTED") {
      if (canAct) openConvert();
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

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-[#1769AA] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/leads`)} className="gap-2 mb-4">
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
      <Button variant="ghost" onClick={() => navigate(`${basePath}/leads`)} className="gap-2 -ml-2">
        <ArrowLeft size={16} /> Back to Leads
      </Button>

      <div className="bg-gradient-to-r from-[#1769AA] to-[#2088d8] rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {lead.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{lead.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-blue-100">
                <span className="flex items-center gap-1"><Phone size={14} /> {lead.phoneNumber}</span>
                {lead.email && <span>• {lead.email}</span>}
              </div>
              <p className="text-sm text-blue-200 mt-1">
                Interested in: <span className="font-semibold text-white">{lead.interestedIn || lead.course?.name}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
              onClick={() => id && triggerCallMutation.mutate(id)}
              disabled={triggerCallMutation.isPending}
            >
              <PhoneCall size={14} />
              {triggerCallMutation.isPending ? "Calling..." : "Trigger AI Call"}
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
              onClick={() => setShowAssignDialog(true)}
              disabled={!canAssign}
              title={!aiReady ? "Wait for the AI call to finish before assigning" : undefined}
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
            {canAct && (
              <Button
                variant="outline"
                className="bg-red-500/20 border-red-300/40 text-red-100 hover:bg-red-500/30 gap-1 text-xs"
                onClick={() => setShowLostDialog(true)}
              >
                <XCircle size={14} /> Mark Lost
              </Button>
            )}
            {lead.stage === "CONVERTED" ? (
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 font-semibold"
                onClick={() => navigate(`${basePath}/admissions/all`, { state: { admissionId: lead.convertedAdmissionId } })}
              >
                <CheckCircle2 size={14} /> View Admission
              </Button>
            ) : canAct ? (
              <div className="flex items-center gap-2">
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
                  onClick={openApplication}
                >
                  <FileText size={14} /> Create Application
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 text-xs"
                  onClick={openConvert}
                >
                  <CheckCircle2 size={14} /> Direct Admission
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {!aiReady && (
          <p className="mt-4 text-sm bg-white/15 rounded-md px-3 py-2">
            AI call is in progress. Assign a counsellor after the call completes, no-answers, is busy, or fails.
          </p>
        )}
        {aiReady && !isAssigned && !isClosed && (
          <p className="mt-4 text-sm bg-white/15 rounded-md px-3 py-2">
            AI call finished ({latestCall?.status || "attempted"}). Assign a counsellor to continue follow-up.
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
                  disabled={changeStageMutation.isPending || isClosed}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-white text-[#1769AA] shadow-md"
                      : isCompleted
                        ? "bg-white/30 text-white"
                        : "bg-white/10 text-white/50"
                  }`}
                >
                  {masterOpt?.label || stage.replace(/_/g, " ")}
                </button>
                {idx < stagePipeline.length - 1 && (
                  <div className={`w-6 h-0.5 ${isCompleted ? "bg-white/50" : "bg-white/15"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Tabs defaultValue="ai-calling" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="ai-calling" className="gap-1.5"><Bot size={14} /> AI Voice Call</TabsTrigger>
          <TabsTrigger value="follow-ups" className="gap-1.5"><Calendar size={14} /> Follow-Ups ({followUps.length})</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><Clock size={14} /> Activity History</TabsTrigger>
          <TabsTrigger value="info" className="gap-1.5"><FileText size={14} /> Lead Info</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-calling">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Latest AI call
                <LeadStageBadge stage={lead.stage} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {latestCall ? (
                <>
                  <p><strong>Status:</strong> {latestCall.status}</p>
                  <p><strong>Duration:</strong> {latestCall.duration || 0}s</p>
                  <p><strong>When:</strong> {new Date(latestCall.createdAt).toLocaleString("en-IN")}</p>
                  {latestCall.transcript && (
                    <pre className="whitespace-pre-wrap text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-md max-h-64 overflow-y-auto">
                      {latestCall.transcript}
                    </pre>
                  )}
                </>
              ) : (
                <p className="text-text-secondary">No AI call logged yet. A call is queued when the lead is created.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="follow-ups">
          <Card>
            <CardContent className="p-4 space-y-3">
              {followUps.length === 0 ? (
                <p className="text-sm text-text-secondary py-8 text-center">No follow-ups scheduled.</p>
              ) : followUps.map((fu) => (
                <div key={fu.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="font-medium text-sm">{fu.type} · {fu.status}</p>
                    <p className="text-xs text-text-secondary">{new Date(fu.scheduledAt).toLocaleString("en-IN")}</p>
                    {fu.notes && <p className="text-xs mt-1">{fu.notes}</p>}
                  </div>
                  {fu.status === "PENDING" && canAct && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => id && updateFollowUpMutation.mutate({
                        leadId: id,
                        followUpId: fu.id,
                        data: { status: "COMPLETED", outcome: "Completed from lead details" },
                      })}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4 space-y-3">
              {activities.length === 0 ? (
                <p className="text-sm text-text-secondary py-8 text-center">No activity yet.</p>
              ) : activities.map((act) => (
                <div key={act.id} className="border-b last:border-0 pb-3">
                  <p className="text-sm font-medium">{act.title}</p>
                  <p className="text-xs text-text-secondary">{act.type} · {new Date(act.createdAt).toLocaleString("en-IN")}</p>
                  {act.description && <p className="text-xs mt-1">{act.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Lead information</CardTitle>
              {!isClosed && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setIsEditing((v) => !v)}>
                  <Pencil size={14} /> {isEditing ? "Cancel" : "Edit"}
                </Button>
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
                      { onSuccess: () => setIsEditing(false) }
                    );
                  }}
                >
                  <div><Label>Name</Label><Input name="name" defaultValue={lead.name} className="mt-1" required /></div>
                  <div><Label>Phone</Label><Input name="phoneNumber" defaultValue={lead.phoneNumber} className="mt-1" required /></div>
                  <div><Label>Email</Label><Input name="email" defaultValue={lead.email || ""} className="mt-1" /></div>
                  <div><Label>Interested in</Label><Input name="interestedIn" defaultValue={lead.interestedIn} className="mt-1" required /></div>
                  <div>
                    <Label>Course</Label>
                    <select name="courseId" defaultValue={lead.courseId || ""} className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background">
                      <option value="">None</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <select name="priority" defaultValue={lead.priority} className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div className="md:col-span-2"><Label>Notes</Label><Textarea name="notes" defaultValue={lead.notes || ""} className="mt-1" /></div>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={updateLeadMutation.isPending} className="bg-[#1769AA] text-white">
                      {updateLeadMutation.isPending ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </form>
              ) : (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><dt className="text-text-muted">Source</dt><dd className="font-medium">{lead.source}</dd></div>
                  <div><dt className="text-text-muted">Priority</dt><dd className="font-medium">{lead.priority}</dd></div>
                  <div><dt className="text-text-muted">Branch</dt><dd className="font-medium">{lead.branch?.name || "—"}</dd></div>
                  <div><dt className="text-text-muted">Counsellor</dt><dd className="font-medium">{lead.assignedCounsellor?.name || "Unassigned"}</dd></div>
                  <div><dt className="text-text-muted">Course</dt><dd className="font-medium">{lead.course?.name || lead.interestedIn}</dd></div>
                  <div><dt className="text-text-muted">Status</dt><dd className="font-medium">{lead.status}</dd></div>
                  {lead.notes && <div className="md:col-span-2"><dt className="text-text-muted">Notes</dt><dd>{lead.notes}</dd></div>}
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Direct Admission</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-text-secondary">Creates a student and confirmed admission for {lead.name}.</p>
            <div>
              <Label>Course *</Label>
              <select
                value={convertCourseId}
                onChange={(e) => { setConvertCourseId(e.target.value); setConvertBatchId(""); }}
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Batch (optional)</Label>
              <select
                value={convertBatchId}
                onChange={(e) => setConvertBatchId(e.target.value)}
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="">No batch yet</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Fee plan</Label>
              <select
                value={convertFeePlan}
                onChange={(e) => setConvertFeePlan(e.target.value as "INSTALLMENT" | "FULL_PAYMENT")}
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="INSTALLMENT">Installment</option>
                <option value="FULL_PAYMENT">Full payment</option>
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={convertNotes} onChange={(e) => setConvertNotes(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>Cancel</Button>
            <Button
              className="bg-green-600 text-white"
              onClick={handleConvert}
              disabled={!convertCourseId || convertMutation.isPending}
            >
              {convertMutation.isPending ? "Converting..." : "Confirm & Create Admission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-text-secondary">Creates an application for paperwork and fees. The lead stays open.</p>
            <div>
              <Label>Course *</Label>
              <select
                value={appCourseId}
                onChange={(e) => setAppCourseId(e.target.value)}
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={appNotes} onChange={(e) => setAppNotes(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplicationDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateApplication}
              disabled={!appCourseId || createAppMutation.isPending}
              className="bg-[#1769AA] text-white"
            >
              {createAppMutation.isPending ? "Creating..." : "Create Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Follow-Up</DialogTitle></DialogHeader>
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
                  },
                },
                { onSuccess: () => setShowFollowUpDialog(false) }
              );
            }}
            className="space-y-4 py-2"
          >
            <div>
              <Label>Follow-Up Type</Label>
              <select name="type" className="w-full mt-1 h-9 px-3 rounded-md border text-sm bg-background">
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
              <Label>Notes</Label>
              <Input name="notes" className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFollowUpDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#1769AA] text-white" disabled={createFollowUpMutation.isPending}>
                {createFollowUpMutation.isPending ? "Scheduling..." : "Schedule Follow-Up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Lead to Counsellor</DialogTitle></DialogHeader>
          {!canAssign ? (
            <p className="text-sm text-text-secondary py-2">Wait for the AI call to finish before assigning.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const counsellorId = formData.get("counsellorId") as string;
                if (!id || !counsellorId) return;
                assignMutation.mutate(
                  { id, data: { counsellorId, notes: (formData.get("notes") as string) || undefined } },
                  { onSuccess: () => setShowAssignDialog(false) }
                );
              }}
              className="space-y-4 py-2"
            >
              <div>
                <Label>Counsellor</Label>
                <select name="counsellorId" className="w-full mt-1 h-10 px-3 rounded-md border text-sm bg-background" required defaultValue={lead.assignedCounsellorId || ""}>
                  <option value="">Select counsellor</option>
                  {counsellors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Assignment Notes</Label>
                <Input name="notes" className="mt-1" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1769AA] text-white" disabled={assignMutation.isPending}>
                  {assignMutation.isPending ? "Assigning..." : "Assign Counsellor"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Lead as Lost</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (!id) return;
              markLostMutation.mutate(
                { id, data: { reason: formData.get("reason") as string, notes: (formData.get("notes") as string) || undefined } },
                { onSuccess: () => setShowLostDialog(false) }
              );
            }}
            className="space-y-4 py-2"
          >
            <div>
              <Label>Reason for Loss</Label>
              <select name="reason" className="w-full mt-1 h-9 px-3 rounded-md border text-sm bg-background" required>
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
              <Button type="button" variant="outline" onClick={() => setShowLostDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 text-white" disabled={markLostMutation.isPending}>
                {markLostMutation.isPending ? "Marking..." : "Confirm Mark Lost"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
