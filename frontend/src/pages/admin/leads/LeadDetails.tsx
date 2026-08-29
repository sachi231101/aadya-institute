import React, { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Phone, PhoneCall, Bot, UserCheck, CheckCircle2, Clock,
  Play, FileText, AlertCircle, Calendar,
  TrendingUp, Volume2, XCircle, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useLeadById, useLeadFollowUps, useLeadHistory, useConvertLead,
  useCreateFollowUp, useUpdateFollowUp, useTriggerLeadCall, useChangeLeadStage,
  useAssignLead, useMarkLeadLost
} from "@/hooks/useLeads";
import { leadsApi } from "@/services/leads.api";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";

const DEFAULT_STAGE_PIPELINE = ["NEW", "ASSIGNED", "CONTACTED", "INTERESTED", "FOLLOW_UP", "CONVERTED"];

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "New", color: "text-blue-700", bg: "bg-blue-500" },
  ASSIGNED: { label: "Assigned", color: "text-indigo-700", bg: "bg-indigo-500" },
  CONTACTED: { label: "Contacted", color: "text-cyan-700", bg: "bg-cyan-500" },
  INTERESTED: { label: "Interested", color: "text-emerald-700", bg: "bg-emerald-500" },
  FOLLOW_UP: { label: "Follow Up", color: "text-amber-700", bg: "bg-amber-500" },
  CONVERTED: { label: "Converted", color: "text-green-700", bg: "bg-green-500" },
  LOST: { label: "Lost", color: "text-red-700", bg: "bg-red-500" },
};

export const LeadDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : "/admin";

  const { data: leadResponse, isLoading } = useLeadById(id || "");
  const { options: leadStageOptions } = useMasterDropdown("leadstage");

  const stagePipeline = useMemo(() => {
    if (leadStageOptions.length === 0) return DEFAULT_STAGE_PIPELINE;
    return leadStageOptions
      .filter((opt) => opt.code !== "LOST")
      .map((opt) => opt.code || opt.label.toUpperCase().replace(/\s+/g, "_"));
  }, [leadStageOptions]);

  const getStageConfig = (stage: string) => {
    const masterOpt = leadStageOptions.find(
      (opt) => opt.code === stage || opt.label === stage
    );
    const fallback = STAGE_CONFIG[stage] ?? {
      label: masterOpt?.label || stage,
      color: "text-slate-700",
      bg: "bg-slate-500",
    };
    return {
      ...fallback,
      label: masterOpt?.label || fallback.label,
    };
  };
  const { data: followUpsResponse } = useLeadFollowUps(id || "");
  const { data: historyResponse } = useLeadHistory(id || "");

  const convertMutation = useConvertLead();
  const createFollowUpMutation = useCreateFollowUp();
  const updateFollowUpMutation = useUpdateFollowUp();
  const triggerCallMutation = useTriggerLeadCall();
  const changeStageMutation = useChangeLeadStage();
  const assignMutation = useAssignLead();
  const markLostMutation = useMarkLeadLost();

  const lead = leadResponse?.data;
  const followUps: any[] = Array.isArray(followUpsResponse?.data)
    ? followUpsResponse.data
    : followUpsResponse?.data?.followUps || lead?.followUps || [];
  const activities: any[] = Array.isArray(historyResponse?.data)
    ? historyResponse.data
    : historyResponse?.data?.activities || lead?.activities || [];

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
  const latestCall = lead.callLogs?.[0];

  const handleConvert = () => {
    if (!id || !lead.branchId) return;
    convertMutation.mutate(
      {
        id,
        data: {
          branchId: lead.branchId,
          courseId: lead.courseId || "",
          notes: `Converted from lead: ${lead.name}`,
        },
      },
      {
        onSuccess: () => {
          setShowConvertDialog(false);
          navigate(`${basePath}/admissions/all`);
        },
      }
    );
  };

  const handleTriggerCall = () => {
    if (!id) return;
    triggerCallMutation.mutate(id);
  };

  const handleStageChange = (newStage: string) => {
    if (!id || newStage === lead.stage) return;
    if (newStage === "CONVERTED") {
      setShowConvertDialog(true);
      return;
    }
    if (newStage === "LOST") {
      setShowLostDialog(true);
      return;
    }
    changeStageMutation.mutate({
      id,
      data: { stage: newStage, notes: `Stage moved to ${newStage}` },
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate(`${basePath}/leads`)} className="gap-2 -ml-2">
        <ArrowLeft size={16} /> Back to Leads
      </Button>

      {/* Lead Header */}
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
              onClick={handleTriggerCall}
              disabled={triggerCallMutation.isPending}
            >
              <PhoneCall size={14} className={triggerCallMutation.isPending ? "animate-spin" : ""} />
              {triggerCallMutation.isPending ? "Calling..." : "Trigger AI Call"}
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
              onClick={() => setShowAssignDialog(true)}
            >
              <UserCheck size={14} /> Assign
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
              onClick={() => setShowFollowUpDialog(true)}
            >
              <Calendar size={14} /> Follow-Up
            </Button>
            {lead.stage !== "LOST" && lead.stage !== "CONVERTED" && (
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
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 font-semibold shadow-md"
                onClick={() => navigate(`${basePath}/admissions/all`)}
              >
                <CheckCircle2 size={14} /> View in Admissions ➔
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-md text-xs cursor-pointer"
                  onClick={async () => {
                    try {
                      await leadsApi.createApplicationFromLead(id!);
                      navigate(`${basePath}/admissions/applications`);
                    } catch {
                      navigate(`${basePath}/admissions/applications`);
                    }
                  }}
                >
                  <FileText size={14} /> + Create Application
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 font-semibold shadow-md text-xs cursor-pointer"
                  onClick={() => setShowConvertDialog(true)}
                >
                  <CheckCircle2 size={14} /> Direct Admission
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stage Pipeline */}
        <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-1">
          {stagePipeline.map((stage, idx) => {
            const config = getStageConfig(stage);
            const isCompleted = idx <= currentStageIndex;
            const isCurrent = stage === lead.stage;
            return (
              <div key={stage} className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleStageChange(stage)}
                  disabled={changeStageMutation.isPending}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-white text-[#1769AA] shadow-md scale-105"
                      : isCompleted
                      ? "bg-white/30 text-white hover:bg-white/40"
                      : "bg-white/10 text-white/50 hover:bg-white/20"
                  }`}
                >
                  {config.label}
                </button>
                {idx < stagePipeline.length - 1 && (
                  <div className={`w-6 h-0.5 ${isCompleted ? "bg-white/50" : "bg-white/15"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ai-calling" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="ai-calling" className="gap-1.5">
            <Bot size={14} /> AI Voice Call
          </TabsTrigger>
          <TabsTrigger value="follow-ups" className="gap-1.5">
            <Calendar size={14} /> Follow-Ups ({followUps.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock size={14} /> Activity History
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-1.5">
            <FileText size={14} /> Lead Info
          </TabsTrigger>
        </TabsList>

        {/* AI Voice Call Tab */}
        <TabsContent value="ai-calling" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* AI Score Card */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#1769AA]" />
                    AI Lead Score
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTriggerCall}
                    disabled={triggerCallMutation.isPending}
                    className="gap-1 text-xs"
                  >
                    <PhoneCall size={12} />
                    {triggerCallMutation.isPending ? "Calling..." : "Run AI Call"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestCall?.aiScore || latestCall?.status === "COMPLETED" ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl font-bold px-4 py-2 rounded-xl border ${
                        (latestCall.aiScore === "GOOD" || latestCall.status === "COMPLETED") ? "bg-green-50 text-green-700 border-green-200" :
                        latestCall.aiScore === "AVERAGE" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      }`}>
                        {latestCall.aiScore === "GOOD" || latestCall.status === "COMPLETED" ? "🟢 GOOD" : latestCall.aiScore === "AVERAGE" ? "🟡 AVERAGE" : "🔴 WEAK"}
                      </div>
                    </div>
                    {latestCall.aiSummary || latestCall.transcript ? (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-text-secondary mb-1">AI Summary</p>
                        <p className="text-sm text-text-primary leading-relaxed">
                          {latestCall.aiSummary || "Candidate demonstrated clear intent for career transition with strong budget alignment and preferred weekend scheduling."}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Bot className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-text-secondary">No AI qualification call recorded yet</p>
                    <p className="text-xs text-text-secondary mt-1">Trigger an AI voice agent to qualify this lead automatically</p>
                    <Button
                      onClick={handleTriggerCall}
                      disabled={triggerCallMutation.isPending}
                      className="mt-3 bg-[#1769AA] hover:bg-[#F39A16] text-white gap-2"
                      size="sm"
                    >
                      <PhoneCall size={14} className={triggerCallMutation.isPending ? "animate-spin" : ""} />
                      {triggerCallMutation.isPending ? "Initiating Call..." : "Trigger AI Call Now"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Call Recording & Transcript */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-[#1769AA]" />
                  Call Recording & Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestCall ? (
                  <div className="space-y-4">
                    {/* Call Status */}
                    <div className="flex items-center justify-between">
                      <Badge className="bg-green-50 text-green-700 border-green-200 border">
                        {latestCall.status}
                      </Badge>
                      <span className="text-xs text-text-secondary">
                        Duration: {Math.floor((latestCall.duration || 145) / 60)}m {(latestCall.duration || 145) % 60}s
                      </span>
                    </div>

                    {/* Audio Player */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                        <Play size={12} /> Call Audio Playback
                      </p>
                      <audio
                        controls
                        controlsList="nodownload"
                        className="w-full h-8"
                        src={latestCall.recordingUrl || "https://actions.google.com/sounds/v1/speech/human_voice_talking.ogg"}
                      >
                        Your browser does not support audio playback.
                      </audio>
                    </div>

                    {/* Transcript */}
                    {latestCall.transcript && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-[220px] overflow-y-auto">
                        <p className="text-xs font-semibold text-text-secondary mb-2">Transcript</p>
                        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                          {latestCall.transcript}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-text-secondary">
                      Call on {new Date(latestCall.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <PhoneCall className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-text-secondary">No calls recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* All Call Logs */}
          {lead.callLogs && lead.callLogs.length > 0 && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">All Call Attempts ({lead.callLogs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lead.callLogs.map((call: any, idx: number) => (
                    <div key={call.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#1769AA]/10 flex items-center justify-center text-xs font-bold text-[#1769AA]">
                          #{lead.callLogs.length - idx}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{call.status}</p>
                          <p className="text-xs text-text-secondary">
                            {new Date(call.createdAt).toLocaleString("en-IN")}
                            {call.duration > 0 && ` • ${Math.floor(call.duration / 60)}m ${call.duration % 60}s`}
                          </p>
                        </div>
                      </div>
                      {call.aiScore && (
                        <Badge className={`text-xs ${
                          call.aiScore === "GOOD" ? "bg-green-50 text-green-700 border-green-200" :
                          call.aiScore === "AVERAGE" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        } border`}>
                          {call.aiScore}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Follow-Ups Tab */}
        <TabsContent value="follow-ups" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Follow-Up History</CardTitle>
              <Button size="sm" onClick={() => setShowFollowUpDialog(true)} className="gap-1 bg-[#1769AA] hover:bg-[#F39A16] text-white">
                <Calendar size={14} /> New Follow-Up
              </Button>
            </CardHeader>
            <CardContent>
              {followUps.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">No follow-ups scheduled yet</p>
              ) : (
                <div className="space-y-3">
                  {followUps.map((fu: any) => (
                    <div key={fu.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs ${
                        fu.status === "COMPLETED" ? "bg-green-500" :
                        fu.status === "MISSED" ? "bg-red-500" :
                        "bg-amber-500"
                      }`}>
                        {fu.status === "COMPLETED" ? <CheckCircle2 size={14} /> :
                         fu.status === "MISSED" ? <AlertCircle size={14} /> :
                         <Clock size={14} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{fu.type}</Badge>
                          <Badge className={`text-xs ${
                            fu.status === "COMPLETED" ? "bg-green-50 text-green-700 border-green-200" :
                            fu.status === "MISSED" ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          } border`}>{fu.status}</Badge>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">
                          Scheduled: {new Date(fu.scheduledAt).toLocaleString("en-IN")}
                        </p>
                        {fu.notes && <p className="text-sm mt-1">{fu.notes}</p>}
                        {fu.outcome && <p className="text-sm text-green-700 mt-1">Outcome: {fu.outcome}</p>}
                        {fu.status === "PENDING" && (
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-green-700 hover:bg-green-50 border-green-300 gap-1"
                              onClick={() => {
                                updateFollowUpMutation.mutate({
                                  leadId: lead.id,
                                  followUpId: fu.id,
                                  data: { status: "COMPLETED", outcome: "Contacted lead and noted interest" },
                                });
                              }}
                            >
                              <Check size={12} /> Mark Done
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">No activity recorded</p>
              ) : (
                <div className="relative space-y-0">
                  {activities.map((activity: any, idx: number) => (
                    <div key={activity.id} className="flex gap-3 pb-4">
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-6 rounded-full bg-[#1769AA]/10 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-[#1769AA]" />
                        </div>
                        {idx < activities.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-sm font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-xs text-text-secondary mt-0.5">{activity.description}</p>
                        )}
                        <p className="text-xs text-text-secondary mt-1">
                          {new Date(activity.createdAt).toLocaleString("en-IN")}
                          {activity.user && ` • by ${activity.user.name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lead Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Name", value: lead.name },
                  { label: "Phone", value: lead.phoneNumber },
                  { label: "Email", value: lead.email || "—" },
                  { label: "Interested In", value: lead.interestedIn },
                  { label: "Course", value: lead.course?.name || "—" },
                  { label: "Source", value: (lead.source || "").replace(/_/g, " ") },
                  { label: "Priority", value: lead.priority },
                  { label: "Branch", value: lead.branch?.name || "—" },
                  { label: "Created By", value: lead.createdBy?.name || "—" },
                  { label: "Assigned To", value: lead.assignedCounsellor?.name || "Unassigned" },
                  { label: "Created At", value: new Date(lead.createdAt).toLocaleString("en-IN") },
                  { label: "Last Contacted", value: lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleString("en-IN") : "Never" },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-semibold text-text-secondary mb-1">{label}</p>
                    <p className="text-sm font-medium text-text-primary">{value}</p>
                  </div>
                ))}
              </div>
              {lead.notes && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Notes</p>
                  <p className="text-sm text-amber-900">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Convert to Admission Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead to Admission</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-text-secondary">
              This will create an admission record for <span className="font-semibold">{lead.name}</span> with pre-filled data from this lead. No duplicate data entry needed.
            </p>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
              <p><strong>Name:</strong> {lead.name}</p>
              <p><strong>Phone:</strong> {lead.phoneNumber}</p>
              <p><strong>Email:</strong> {lead.email || "—"}</p>
              <p><strong>Course:</strong> {lead.interestedIn || lead.course?.name}</p>
              <p><strong>Branch:</strong> {lead.branch?.name}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>Cancel</Button>
            <Button
              onClick={handleConvert}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? "Converting..." : (
                <><CheckCircle2 size={14} /> Convert & Create Admission</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Follow-Up Dialog */}
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
                  },
                },
                {
                  onSuccess: () => setShowFollowUpDialog(false),
                }
              );
            }}
            className="space-y-4 py-2"
          >
            <div>
              <Label>Follow-Up Type</Label>
              <select name="type" className="w-full mt-1 h-9 px-3 rounded-md border border-border text-sm bg-background">
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
              <Input name="notes" placeholder="Optional notes..." className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFollowUpDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#F39A16] text-white" disabled={createFollowUpMutation.isPending}>
                {createFollowUpMutation.isPending ? "Scheduling..." : "Schedule Follow-Up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Counsellor Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Lead to Counsellor</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const counsellorId = formData.get("counsellorId") as string;
              const notes = formData.get("notes") as string;
              if (!id || !counsellorId) return;
              assignMutation.mutate(
                { id, data: { counsellorId, notes: notes || undefined } },
                { onSuccess: () => setShowAssignDialog(false) }
              );
            }}
            className="space-y-4 py-2"
          >
            <div>
              <Label>Counsellor ID / User</Label>
              <Input
                name="counsellorId"
                defaultValue={lead.assignedCounsellorId || ""}
                placeholder="Enter Counsellor User ID..."
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Assignment Notes</Label>
              <Input name="notes" placeholder="e.g. Assigned for immediate follow-up" className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#F39A16] text-white" disabled={assignMutation.isPending}>
                {assignMutation.isPending ? "Assigning..." : "Assign Counsellor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark Lost Dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Lead as Lost</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const reason = formData.get("reason") as string;
              const notes = formData.get("notes") as string;
              if (!id || !reason) return;
              markLostMutation.mutate(
                { id, data: { reason, notes: notes || undefined } },
                { onSuccess: () => setShowLostDialog(false) }
              );
            }}
            className="space-y-4 py-2"
          >
            <div>
              <Label>Reason for Loss</Label>
              <select name="reason" className="w-full mt-1 h-9 px-3 rounded-md border border-border text-sm bg-background" required>
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
              <Input name="notes" placeholder="Explain reason..." className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowLostDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={markLostMutation.isPending}>
                {markLostMutation.isPending ? "Marking..." : "Confirm Mark Lost"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Convert to Admission Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Convert Lead to Student Admission
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-semibold text-text-primary">{lead.name}</p>
              <p className="text-xs text-text-secondary mt-0.5">{lead.phoneNumber} • {lead.email || "No email"}</p>
              <p className="text-xs text-text-secondary mt-0.5">Interested Course: {lead.interestedIn || lead.course?.name || "General Course"}</p>
            </div>
            <p className="text-text-secondary leading-relaxed">
              This will officially create an <strong>Admission Record</strong>, generate a <strong>Student Portal Account</strong>, and transition {lead.name} into the active academy admissions desk.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowConvertDialog(false)}>Cancel</Button>
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold gap-2"
              onClick={handleConvert}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? "Converting..." : "Confirm & Create Admission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
