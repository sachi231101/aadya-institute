import { create } from "zustand";

/** Lead source label from Master Module (leadsource). */
export type LeadSource = string;

/** Pipeline stage code/label from Master Module (leadstage). */
export type PipelineStage = string;

export type AiCallOutcome =
  | "INTERESTED"
  | "CALLBACK_REQUESTED"
  | "NEEDS_COUNSELLOR"
  | "NOT_INTERESTED"
  | "NO_RESPONSE"
  | "PENDING_CALL";

export type AiCallStatus =
  | "COMPLETED"
  | "IN_PROGRESS"
  | "NO_ANSWER"
  | "FAILED"
  | "PENDING";

export interface LeadTranscriptMessage {
  speaker: "AI" | "LEAD" | "AI_AGENT" | "STUDENT";
  speakerName?: string;
  name?: string;
  time: string;
  text: string;
}

export interface LeadAttemptRecord {
  attemptNo: number;
  mode: "PHONE" | "WHATSAPP" | "DEMO" | "EMAIL" | "AI_VOICE";
  timestamp: string;
  response: string;
  notes: string;
  nextFollowUp?: string;
}

export interface UnifiedLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  course: string;
  source: LeadSource;
  sourceType: string;
  stage: PipelineStage;
  pipelineStage?: PipelineStage;
  stageColor: string;
  priority: "Urgent" | "Due Today" | "Upcoming";
  priorityColor: string;
  nextFollowUp: string;
  attemptsCount: number;
  latestResponse: string;
  attemptsHistory: LeadAttemptRecord[];
  assignedCounsellor: string;
  assignedDate: string;
  hotLead: boolean;
  campaign: string;
  callDate: string;

  // AI Voice Calling & Telephony Fields
  callStatus: AiCallStatus;
  attempt: number;
  aiOutcome: AiCallOutcome;
  aiSummaryShort: string;
  aiDetailedSummary?: string;
  aiSummaryDetailed?: string;
  aiCallingResult?: string;
  keyHighlights?: string[];
  keyDiscussionPoints?: string[];
  callDuration: string;
  callTimestamp: string;
  aiScore: number;
  starRating: number;
  nextActionType:
  | "CONTACT_NOW"
  | "CALL_BACK"
  | "ASSIGN_CONTACT"
  | "RETRY_CALL"
  | "MARK_LOST"
  | "FOLLOW_UP";
  nextActionLabel: string;
  nextActionSubtext?: string;
  transcript: LeadTranscriptMessage[];
  lostReason?: string;
}

import { persist } from "zustand/middleware";

export const INITIAL_UNIFIED_LEADS: UnifiedLead[] = [];

export interface AddLeadPayload {
  name: string;
  phone: string;
  email?: string;
  course: string;
  source: LeadSource;
  notes?: string;
  priority?: "Urgent" | "Due Today" | "Upcoming";
  triggerImmediateCall?: boolean;
}

export interface ScheduleFollowUpPayload {
  channel: "PHONE" | "WHATSAPP" | "EMAIL";
  date: string;
  time: string;
  notes?: string;
  setReminder?: boolean;
}

export interface LogAttemptPayload {
  mode: LeadAttemptRecord["mode"];
  response: string;
  notes: string;
  nextFollowUp?: string;
  newStage?: PipelineStage;
}

interface LeadStoreState {
  leads: UnifiedLead[];
  isLoading: boolean;
  addLead: (payload: AddLeadPayload) => UnifiedLead;
  updateLeadStage: (id: string, newStage: PipelineStage) => void;
  scheduleFollowUp: (
    id: string,
    channelOrPayload: "PHONE" | "WHATSAPP" | "EMAIL" | ScheduleFollowUpPayload,
    date?: string,
    time?: string,
    notes?: string
  ) => void;
  markAsLost: (id: string, reason: string, notes?: string) => void;
  assignCounsellor: (id: string, counsellorName: string, notes?: string) => void;
  retryAiCall: (id: string) => void;
  logAttempt: (
    id: string,
    modeOrPayload: LeadAttemptRecord["mode"] | LogAttemptPayload,
    response?: string,
    notes?: string,
    nextFollowUp?: string,
    newStage?: PipelineStage
  ) => void;
}

export const useLeadStore = create<LeadStoreState>()(
  persist(
    (set) => ({
      leads: INITIAL_UNIFIED_LEADS,
      isLoading: false,

      addLead: (payload: AddLeadPayload) => {
        const isImmediateCall = payload.triggerImmediateCall ?? true;
        const newId = `AIC-00${Date.now().toString().slice(-4)}`;
        const effectiveSource = (payload.source || "Website") as LeadSource;
        const effectiveCourse = payload.course || "Digital Marketing";

        const newLead: UnifiedLead = {
          id: newId,
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          course: effectiveCourse,
          source: effectiveSource,
          sourceType: effectiveSource === "Website" ? "Website Form" : `${effectiveSource}`,
          stage: "INTERESTED",
          stageColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
          priority: payload.priority || "Urgent",
          priorityColor: payload.priority === "Urgent" ? "text-red-600 bg-red-500" : "text-emerald-600 bg-emerald-500",
          nextFollowUp: "Today, 03:00 PM",
          attemptsCount: 1,
          latestResponse: isImmediateCall
            ? "AI Voice Bot: Candidate confirmed interest, qualified with 85% intent score."
            : payload.notes || "New enquiry created.",
          assignedCounsellor: "Priya Singh",
          assignedDate: "Today",
          hotLead: true,
          campaign: "August Admission Drive",
          callDate: "Just now",
          callStatus: "COMPLETED",
          attempt: 1,
          aiOutcome: "INTERESTED",
          aiSummaryShort: `${payload.name} enquired for ${effectiveCourse} via ${effectiveSource}.`,
          aiDetailedSummary: `Candidate ${payload.name} was contacted via automated AI voice agent. Candidate confirmed strong interest in ${effectiveCourse} and requested batch timings and fee structure on WhatsApp.`,
          keyHighlights: [
            `Target Course: ${effectiveCourse}`,
            `Lead Source: ${effectiveSource}`,
            "High intent score: 85%",
            "Ready for counsellor demo session"
          ],
          callDuration: "02:15",
          callTimestamp: "Just now",
          aiScore: 85,
          starRating: 4,
          nextActionType: "CONTACT_NOW",
          nextActionLabel: "Schedule Demo / Admission",
          nextActionSubtext: "High Intent Candidate",
          transcript: [
            {
              speaker: "AI_AGENT",
              name: "Aadya AI Voice Agent",
              time: "00:02",
              text: `Namaste ${payload.name} ji! Main Aadya Institute se bol rahi hoon. Kya aap ${effectiveCourse} course ke baare mein baat karne ke liye free hain?`
            },
            {
              speaker: "STUDENT",
              name: payload.name,
              time: "00:08",
              text: `Haan, maine online enquiry fill ki thi. Mujhe course details aur batch timings janne the.`
            },
            {
              speaker: "AI_AGENT",
              name: "Aadya AI Voice Agent",
              time: "00:15",
              text: `Zaroor! Hamare naye batches start ho rahe hain with 100% placement assistance and live capstone projects. Kya aap full-time ya weekend batch prefer karenge?`
            },
            {
              speaker: "STUDENT",
              name: payload.name,
              time: "00:24",
              text: `Weekend batch suit karega. Kya aap mujhe syllabus aur fee structure WhatsApp par bhej sakte hain?`
            },
            {
              speaker: "AI_AGENT",
              name: "Aadya AI Voice Agent",
              time: "00:32",
              text: `Bilkul! Maine brochure WhatsApp par send kar diya hai. Hamari senior counsellor Priya ji aapse connect karengi demo session ke liye. Dhanyawaad!`
            }
          ],
          attemptsHistory: [
            {
              attemptNo: 1,
              mode: isImmediateCall ? "AI_VOICE" : "PHONE",
              timestamp: "Just now",
              response: "AI Voice Bot: Candidate Qualified (85%)",
              notes: payload.notes || `Source: ${effectiveSource}`,
              nextFollowUp: "Today, 03:00 PM"
            }
          ]
        };

        set((state) => ({ leads: [newLead, ...state.leads] }));
        return newLead;
      },

  updateLeadStage: (id: string, newStage: PipelineStage) => {
    set((state) => ({
      leads: state.leads.map((l) => {
        if (l.id !== id) return l;

        let stageColor = "bg-blue-50 text-blue-700 border-blue-200";
        if (newStage === "INTERESTED" || newStage === "CONVERTED")
          stageColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
        else if (newStage === "CONTACTED")
          stageColor = "bg-purple-50 text-purple-700 border-purple-200";
        else if (newStage === "FOLLOW_UP")
          stageColor = "bg-amber-50 text-amber-700 border-amber-200";
        else if (newStage === "LOST")
          stageColor = "bg-rose-50 text-rose-700 border-rose-200";

        return {
          ...l,
          stage: newStage,
          stageColor
        };
      })
    }));
  },

  scheduleFollowUp: (id, channelOrPayload, dateArg, timeArg, notesArg) => {
    const isObj = typeof channelOrPayload === "object";
    const channel = isObj ? channelOrPayload.channel : channelOrPayload;
    const date = isObj ? channelOrPayload.date : dateArg || "2026-08-25";
    const time = isObj ? channelOrPayload.time : timeArg || "11:00 AM";
    const notes = isObj ? channelOrPayload.notes : notesArg;

    const formattedNextDate =
      date === "2026-08-24"
        ? `Today, ${time}`
        : date === "2026-08-25"
          ? `Tomorrow, ${time}`
          : `${date}, ${time}`;

    const modeTag = channel === "PHONE" ? "PHONE" : channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL";

    set((state) => ({
      leads: state.leads.map((l) => {
        if (l.id !== id) return l;
        const newAttempt: LeadAttemptRecord = {
          attemptNo: l.attemptsCount + 1,
          mode: modeTag,
          timestamp: "Just now",
          response: `Follow-up Scheduled (${channel})`,
          notes: notes || `Follow-up set for ${formattedNextDate}`,
          nextFollowUp: formattedNextDate
        };

        return {
          ...l,
          stage: "FOLLOW_UP",
          stageColor: "bg-amber-50 text-amber-700 border-amber-200",
          priority: formattedNextDate.includes("Today") ? "Due Today" : "Upcoming",
          priorityColor: formattedNextDate.includes("Today") ? "text-amber-600 bg-amber-500" : "text-emerald-600 bg-emerald-500",
          nextFollowUp: formattedNextDate,
          attemptsCount: l.attemptsCount + 1,
          latestResponse: notes ? `${channel}: ${notes}` : `Follow-up scheduled for ${formattedNextDate}`,
          attemptsHistory: [newAttempt, ...(l.attemptsHistory || [])]
        };
      })
    }));
  },

  markAsLost: (id, reason, notes) => {
    set((state) => ({
      leads: state.leads.map((l) => {
        if (l.id !== id) return l;
        const lostAttempt: LeadAttemptRecord = {
          attemptNo: l.attemptsCount + 1,
          mode: "PHONE",
          timestamp: "Just now",
          response: `Marked as Lost: ${reason}`,
          notes: notes || `Reason: ${reason}`,
          nextFollowUp: "Closed"
        };
        return {
          ...l,
          stage: "LOST",
          stageColor: "bg-rose-50 text-rose-700 border-rose-200",
          priority: "Upcoming",
          priorityColor: "text-slate-400 bg-slate-200",
          nextFollowUp: "Closed (Lost)",
          latestResponse: `Lost: ${reason}${notes ? ` — ${notes}` : ""}`,
          lostReason: reason,
          attemptsHistory: [lostAttempt, ...(l.attemptsHistory || [])]
        };
      })
    }));
  },

  assignCounsellor: (id, counsellorName, notes) => {
    set((state) => ({
      leads: state.leads.map((l) => {
        if (l.id !== id) return l;
        return {
          ...l,
          assignedCounsellor: counsellorName,
          latestResponse: notes || `Assigned to ${counsellorName}`
        };
      })
    }));
  },

  retryAiCall: (id) => {
    set((state) => ({
      leads: state.leads.map((l) => {
        if (l.id !== id) return l;
        return {
          ...l,
          callStatus: "IN_PROGRESS",
          attempt: l.attempt + 1,
          aiOutcome: "PENDING_CALL",
          aiSummaryShort: "Telephony retry initiated; AI voice bot dialling...",
          callDuration: "Dialing...",
          callTimestamp: "Just now",
          attemptsCount: l.attemptsCount + 1
        };
      })
    }));
  },

  logAttempt: (id, modeOrPayload, responseArg, notesArg, nextFollowUpArg, newStageArg) => {
    const isObj = typeof modeOrPayload === "object";
    const mode = isObj ? modeOrPayload.mode : modeOrPayload;
    const response = isObj ? modeOrPayload.response : responseArg || "Contact Attempt Logged";
    const notes = isObj ? modeOrPayload.notes : notesArg || "";
    const nextFollowUp = isObj ? modeOrPayload.nextFollowUp : nextFollowUpArg;
    const newStage = isObj ? modeOrPayload.newStage : newStageArg;

    set((state) => ({
      leads: state.leads.map((l) => {
        if (l.id !== id) return l;
        const attempt: LeadAttemptRecord = {
          attemptNo: l.attemptsCount + 1,
          mode,
          timestamp: "Just now",
          response,
          notes,
          nextFollowUp: nextFollowUp || l.nextFollowUp
        };
        return {
          ...l,
          stage: newStage || l.stage,
          attemptsCount: l.attemptsCount + 1,
          latestResponse: response,
          nextFollowUp: nextFollowUp || l.nextFollowUp,
          attemptsHistory: [attempt, ...(l.attemptsHistory || [])]
        };
      })
    }));
  }
}),
    {
      name: "aadya-lead-store",
    }
  )
);
