import { create } from "zustand";

export type LeadSource =
  | "Website"
  | "Google Ads"
  | "Meta Ads"
  | "Instagram"
  | "Referral"
  | "Walk-in"
  | "Direct Call"
  | "Campaign";

export type PipelineStage =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "FOLLOW_UP"
  | "CONVERTED"
  | "LOST";

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

export const INITIAL_UNIFIED_LEADS: UnifiedLead[] = [
  {
    id: "AIC-001",
    name: "Rahul Sharma",
    phone: "98765 43210",
    email: "rahul.s@example.com",
    course: "Digital Marketing",
    source: "Website",
    sourceType: "Enquiry • Website",
    stage: "INTERESTED",
    stageColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    priority: "Urgent",
    priorityColor: "text-red-600 bg-red-500",
    nextFollowUp: "Today, 11:00 AM",
    attemptsCount: 1,
    latestResponse: "Interested in weekend batch, asked about fee installment options.",
    assignedCounsellor: "Priya Singh",
    assignedDate: "Today",
    hotLead: true,
    campaign: "August Admission Drive",
    callDate: "24 Aug 2026, 10:30 AM",
    callStatus: "COMPLETED",
    attempt: 1,
    aiOutcome: "INTERESTED",
    aiSummaryShort: "Interested in weekend batch, asked about fees & duration.",
    aiDetailedSummary:
      "Lead is an active working professional looking to upskill in SEO, Meta Ads, and Performance Marketing. Confirmed availability for weekend classes (Sat-Sun 10am-2pm). Asked if syllabus covers live campaigns and requested scholarship/installment options.",
    keyHighlights: [
      "Confirmed weekend batch preference (Saturday & Sunday)",
      "High urgency: planning to enroll by this weekend",
      "Requested curriculum breakdown & fee structure on WhatsApp",
      "Asked if placement assistance is included"
    ],
    callDuration: "3m 42s",
    callTimestamp: "Today, 10:30 AM",
    aiScore: 92,
    starRating: 5,
    nextActionType: "CONTACT_NOW",
    nextActionLabel: "Contact Now",
    nextActionSubtext: "High Urgency",
    transcript: [
      { speaker: "AI", time: "00:03", text: "Namaste Rahul! I am Aadya Voice Assistant calling from Aadya Institute. Am I speaking with Rahul?" },
      { speaker: "LEAD", time: "00:09", text: "Yes, speaking. Tell me." },
      { speaker: "AI", time: "00:15", text: "You enquired about our Advanced Digital Marketing Certification. Are you looking to join our upcoming weekend batch or weekday batch?" },
      { speaker: "LEAD", time: "00:27", text: "Weekend batch will suit me better since I work full-time on weekdays." },
      { speaker: "AI", time: "00:36", text: "Great! Our weekend batch begins this Saturday. It covers SEO, Google Ads, Meta Ads, and AI marketing tools with 100% placement support. Would you like our senior counsellor to share the fee details and reserve your demo seat?" },
      { speaker: "LEAD", time: "00:54", text: "Yes please, share the fees structure and let me know if there is an installment plan available." },
      { speaker: "AI", time: "01:05", text: "Certainly! I have noted your preference for weekend batch with installment options. Our counsellor Priya will connect with you right away." }
    ],
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "AI_VOICE",
        timestamp: "Today, 10:30 AM",
        response: "AI Qualification Completed (High Intent 92%)",
        notes: "Interested in weekend batch, requested fee installment breakdown.",
        nextFollowUp: "Today, 11:00 AM"
      }
    ]
  },
  {
    id: "AIC-002",
    name: "Sneha Patil",
    phone: "98765 43211",
    email: "sneha.p@example.com",
    course: "Graphic Design",
    source: "Instagram",
    sourceType: "Instagram Ads",
    stage: "FOLLOW_UP",
    stageColor: "bg-amber-50 text-amber-700 border-amber-200",
    priority: "Due Today",
    priorityColor: "text-amber-600 bg-amber-500",
    nextFollowUp: "Today, 03:00 PM",
    attemptsCount: 1,
    latestResponse: "Requested to call after 3 PM today.",
    assignedCounsellor: "Priya Singh",
    assignedDate: "Today",
    hotLead: false,
    campaign: "Meta Ads Retargeting",
    callDate: "24 Aug 2026, 09:45 AM",
    callStatus: "COMPLETED",
    attempt: 1,
    aiOutcome: "CALLBACK_REQUESTED",
    aiSummaryShort: "Requested to call after 3 PM today.",
    aiDetailedSummary:
      "Sneha answered during college hours. Expressed genuine interest in Adobe Photoshop, Illustrator, and UI/UX module. Explicitly requested a phone call after 3:00 PM when classes finish.",
    keyHighlights: [
      "Currently in final year college; interested in Graphic Design diploma",
      "Wants weekday evening batch (4:00 PM - 6:00 PM)",
      "Requested callback strictly after 3:00 PM today"
    ],
    callDuration: "2m 15s",
    callTimestamp: "Today, 09:45 AM",
    aiScore: 85,
    starRating: 4,
    nextActionType: "CALL_BACK",
    nextActionLabel: "Call Back",
    nextActionSubtext: "Today, 03:00 PM",
    transcript: [
      { speaker: "AI", time: "00:03", text: "Hello Sneha! This is Aadya Voice Assistant calling regarding your Graphic Design enquiry." },
      { speaker: "LEAD", time: "00:11", text: "Hi, I am in college right now and cannot talk freely. Can you please call me back after 3 PM?" },
      { speaker: "AI", time: "00:20", text: "Sure Sneha! I will schedule a callback for you exactly at 3:00 PM today with our design counsellor. Thank you!" }
    ],
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "AI_VOICE",
        timestamp: "Today, 09:45 AM",
        response: "Callback Requested after 3 PM",
        notes: "Lead is in college; requested callback at 3 PM today.",
        nextFollowUp: "Today, 03:00 PM"
      }
    ]
  },
  {
    id: "AIC-003",
    name: "Amit Kumar",
    phone: "98765 43212",
    email: "amit.k@example.com",
    course: "Web Development",
    source: "Google Ads",
    sourceType: "Google Search Ads",
    stage: "CONTACTED",
    stageColor: "bg-purple-50 text-purple-700 border-purple-200",
    priority: "Due Today",
    priorityColor: "text-amber-600 bg-amber-500",
    nextFollowUp: "Tomorrow, 10:30 AM",
    attemptsCount: 1,
    latestResponse: "Comparing with another institute, wants more details.",
    assignedCounsellor: "Priya Singh",
    assignedDate: "Today",
    hotLead: true,
    campaign: "August Admission Drive",
    callDate: "24 Aug 2026, 09:20 AM",
    callStatus: "COMPLETED",
    attempt: 1,
    aiOutcome: "NEEDS_COUNSELLOR",
    aiSummaryShort: "Comparing with another institute, wants more details.",
    aiDetailedSummary:
      "Amit is comparing Aadya's Full Stack curriculum (React + Node.js) with an online edtech platform. Wants clarity on offline lab access, 1-on-1 mentorship, and mock interview practice.",
    keyHighlights: [
      "Wants MERN stack + Python full stack comparison",
      "Specifically asking for classroom lab infrastructure details",
      "Ready to visit academy for in-person demo session"
    ],
    callDuration: "4m 10s",
    callTimestamp: "Today, 09:20 AM",
    aiScore: 78,
    starRating: 4,
    nextActionType: "ASSIGN_CONTACT",
    nextActionLabel: "Assign & Contact",
    nextActionSubtext: "High Priority",
    transcript: [
      { speaker: "AI", time: "00:04", text: "Hello Amit! Calling from Aadya Institute regarding your Full Stack Web Development enquiry." },
      { speaker: "LEAD", time: "00:12", text: "Yeah, I am looking at two institutes. What makes Aadya better for React and Node?" },
      { speaker: "AI", time: "00:25", text: "At Aadya, you build 8 enterprise-grade production projects with daily mentor guidance and guaranteed interview opportunities in top tech companies." },
      { speaker: "LEAD", time: "00:40", text: "Do you have offline lab access on weekends if I get stuck in code?" },
      { speaker: "AI", time: "00:49", text: "Yes! Our computer labs and faculty mentors are available 6 days a week. Let me connect you with our senior technical counsellor to walk you through the classroom infrastructure." }
    ],
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "AI_VOICE",
        timestamp: "Today, 09:20 AM",
        response: "Technical Questions — Needs Senior Counsellor",
        notes: "Comparing institutes, wants lab & project details.",
        nextFollowUp: "Tomorrow, 10:30 AM"
      }
    ]
  },
  {
    id: "AIC-004",
    name: "Pooja Nair",
    phone: "98765 43213",
    email: "pooja.nair@example.com",
    course: "Data Science",
    source: "Website",
    sourceType: "Website Form",
    stage: "NEW",
    stageColor: "bg-blue-50 text-blue-700 border-blue-200",
    priority: "Upcoming",
    priorityColor: "text-emerald-600 bg-emerald-500",
    nextFollowUp: "Today, 02:00 PM",
    attemptsCount: 1,
    latestResponse: "Call not answered (1st Attempt).",
    assignedCounsellor: "Priya Singh",
    assignedDate: "Today",
    hotLead: false,
    campaign: "August Admission Drive",
    callDate: "24 Aug 2026, 09:05 AM",
    callStatus: "NO_ANSWER",
    attempt: 1,
    aiOutcome: "NO_RESPONSE",
    aiSummaryShort: "Call not answered (1st Attempt).",
    aiDetailedSummary: "AI voice telephony initiated call; rang for 45 seconds without answer.",
    keyHighlights: ["1st telephony attempt unanswered", "Auto-retry scheduled in 4 hours"],
    callDuration: "0m 00s",
    callTimestamp: "Today, 09:05 AM",
    aiScore: 0,
    starRating: 0,
    nextActionType: "RETRY_CALL",
    nextActionLabel: "Retry AI Call",
    nextActionSubtext: "Schedule Now",
    transcript: [],
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "AI_VOICE",
        timestamp: "Today, 09:05 AM",
        response: "No Answer / Ringing",
        notes: "Call not answered; auto-retry queued.",
        nextFollowUp: "Today, 02:00 PM"
      }
    ]
  },
  {
    id: "AIC-005",
    name: "Vikram Singh",
    phone: "98765 43214",
    email: "vikram.s@example.com",
    course: "UI/UX Design",
    source: "Instagram",
    sourceType: "Instagram Campaign",
    stage: "LOST",
    stageColor: "bg-rose-50 text-rose-700 border-rose-200",
    priority: "Upcoming",
    priorityColor: "text-slate-400 bg-slate-200",
    nextFollowUp: "Closed (Lost)",
    attemptsCount: 1,
    latestResponse: "Not looking for a course now.",
    assignedCounsellor: "Priya Singh",
    assignedDate: "Today",
    hotLead: false,
    campaign: "Weekend Fast-Track",
    callDate: "24 Aug 2026, 08:50 AM",
    callStatus: "COMPLETED",
    attempt: 1,
    aiOutcome: "NOT_INTERESTED",
    aiSummaryShort: "Not looking for a course now.",
    aiDetailedSummary: "Lead mentioned they just joined a full-time job and have no bandwidth for weekend classes.",
    keyHighlights: ["No immediate requirement", "Marked as closed"],
    callDuration: "1m 20s",
    callTimestamp: "Today, 08:50 AM",
    aiScore: 62,
    starRating: 3,
    nextActionType: "MARK_LOST",
    nextActionLabel: "Mark as Lost",
    nextActionSubtext: "Close Lead",
    lostReason: "No current requirement / Joined job",
    transcript: [
      { speaker: "AI", time: "00:03", text: "Hello Vikram! Calling from Aadya Institute regarding UI/UX Design." },
      { speaker: "LEAD", time: "00:10", text: "Hi, I just accepted a full-time job offer this week so I won't have time for a course right now." },
      { speaker: "AI", time: "00:18", text: "Congratulations on your new job Vikram! We will close this enquiry for now. Wishing you the best!" }
    ],
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "AI_VOICE",
        timestamp: "Today, 08:50 AM",
        response: "Not Interested / Busy with Job",
        notes: "Lead accepted a job offer; closed enquiry.",
        nextFollowUp: "Closed"
      }
    ]
  },
  {
    id: "AIC-006",
    name: "Arjun Reddy",
    phone: "98765 43215",
    email: "arjun.r@example.com",
    course: "Python / AI",
    source: "Referral",
    sourceType: "Alumni Referral",
    stage: "INTERESTED",
    stageColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    priority: "Urgent",
    priorityColor: "text-red-600 bg-red-500",
    nextFollowUp: "Today, 12:30 PM",
    attemptsCount: 1,
    latestResponse: "Ready for demo class, requested timings.",
    assignedCounsellor: "Priya Singh",
    assignedDate: "Today",
    hotLead: true,
    campaign: "August Admission Drive",
    callDate: "24 Aug 2026, 08:30 AM",
    callStatus: "COMPLETED",
    attempt: 1,
    aiOutcome: "INTERESTED",
    aiSummaryShort: "Ready for demo class, requested timings.",
    aiDetailedSummary:
      "Arjun was referred by an existing Aadya alumni. Very enthusiastic about Machine Learning, LLMs, and Generative AI roadmap. Wants to attend demo class this Wednesday.",
    keyHighlights: [
      "Referred by Alumni (Batch 2025)",
      "Ready to book demo session for Machine Learning module",
      "Immediate admission readiness upon demo completion"
    ],
    callDuration: "3m 05s",
    callTimestamp: "Today, 08:30 AM",
    aiScore: 96,
    starRating: 5,
    nextActionType: "CONTACT_NOW",
    nextActionLabel: "Contact Now",
    nextActionSubtext: "Alumni Referral",
    transcript: [
      { speaker: "AI", time: "00:03", text: "Hello Arjun! I am Aadya AI Voice Assistant calling regarding your Python and AI enquiry." },
      { speaker: "LEAD", time: "00:10", text: "Yes! My friend Rahul recommended Aadya Institute. I want to attend the upcoming AI demo class." },
      { speaker: "AI", time: "00:22", text: "That is wonderful Arjun! We have a live Machine Learning demo session scheduled this Wednesday at 6:00 PM. Would you like me to confirm your booking?" },
      { speaker: "LEAD", time: "00:35", text: "Yes please confirm my seat. Send the meeting link and address to my WhatsApp." },
      { speaker: "AI", time: "00:44", text: "Done! Your demo pass is reserved. Counsellor Priya will message you the details on WhatsApp right now." }
    ],
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "AI_VOICE",
        timestamp: "Today, 08:30 AM",
        response: "Demo Class Booked (High Intent 96%)",
        notes: "Alumni referral; requested demo class link.",
        nextFollowUp: "Today, 12:30 PM"
      }
    ]
  },
  {
    id: "AIC-007",
    name: "Kavya Menon",
    phone: "98765 43216",
    email: "kavya.m@example.com",
    course: "Java Full Stack",
    source: "Walk-in",
    sourceType: "Center Walk-in",
    stage: "FOLLOW_UP",
    stageColor: "bg-amber-50 text-amber-700 border-amber-200",
    priority: "Due Today",
    priorityColor: "text-amber-600 bg-amber-500",
    nextFollowUp: "Today, 04:00 PM",
    attemptsCount: 1,
    latestResponse: "Visited center in person; AI follow-up confirmed interest in Spring Boot.",
    assignedCounsellor: "Priya Singh",
    assignedDate: "Today",
    hotLead: true,
    campaign: "August Admission Drive",
    callDate: "24 Aug 2026, 08:00 AM",
    callStatus: "COMPLETED",
    attempt: 1,
    aiOutcome: "INTERESTED",
    aiSummaryShort: "Confirmed interest in Spring Boot & Microservices.",
    aiDetailedSummary: "Walked into center yesterday. AI voice bot followed up to verify questions regarding Java Microservices architecture syllabus.",
    keyHighlights: ["Center walk-in lead", "Wants Spring Boot + AWS deployment training"],
    callDuration: "2m 50s",
    callTimestamp: "Today, 08:00 AM",
    aiScore: 89,
    starRating: 5,
    nextActionType: "CONTACT_NOW",
    nextActionLabel: "Contact Now",
    nextActionSubtext: "Walk-in Follow-up",
    transcript: [],
    attemptsHistory: [
      {
        attemptNo: 1,
        mode: "AI_VOICE",
        timestamp: "Today, 08:00 AM",
        response: "Walk-in Follow-up Confirmed",
        notes: "Confirmed interest in Spring Boot syllabus.",
        nextFollowUp: "Today, 04:00 PM"
      }
    ]
  }
];

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

export const useLeadStore = create<LeadStoreState>((set) => ({
  leads: INITIAL_UNIFIED_LEADS,
  isLoading: false,

  addLead: (payload: AddLeadPayload) => {
    const isImmediateCall = payload.triggerImmediateCall ?? true;
    const newId = `AIC-00${Date.now().toString().slice(-4)}`;

    const newLead: UnifiedLead = {
      id: newId,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      course: payload.course,
      source: payload.source,
      sourceType: payload.source === "Website" ? "Website Form" : `${payload.source}`,
      stage: "NEW",
      stageColor: "bg-blue-50 text-blue-700 border-blue-200",
      priority: payload.priority || "Urgent",
      priorityColor: payload.priority === "Urgent" ? "text-red-600 bg-red-500" : "text-emerald-600 bg-emerald-500",
      nextFollowUp: "Today, 12:00 PM",
      attemptsCount: isImmediateCall ? 1 : 0,
      latestResponse: isImmediateCall
        ? "AI Telephony voice agent queued for automated qualification."
        : payload.notes || "New enquiry created.",
      assignedCounsellor: "Priya Singh",
      assignedDate: "Today",
      hotLead: true,
      campaign: "August Admission Drive",
      callDate: "Just now",
      callStatus: isImmediateCall ? "IN_PROGRESS" : "PENDING",
      attempt: isImmediateCall ? 1 : 0,
      aiOutcome: "PENDING_CALL",
      aiSummaryShort: isImmediateCall
        ? "AI voice call queued for immediate interest qualification."
        : "Pending AI call.",
      aiDetailedSummary: payload.notes || "Inbound lead awaiting voice qualification.",
      keyHighlights: ["Newly captured omnichannel lead", `Source: ${payload.source}`],
      callDuration: "Queued",
      callTimestamp: "Just now",
      aiScore: 85,
      starRating: 4,
      nextActionType: "CONTACT_NOW",
      nextActionLabel: "Contact Now",
      nextActionSubtext: "New Inbound Lead",
      transcript: [],
      attemptsHistory: [
        {
          attemptNo: 1,
          mode: isImmediateCall ? "AI_VOICE" : "PHONE",
          timestamp: "Just now",
          response: isImmediateCall ? "AI Telephony Queued" : "New Enquiry Logged",
          notes: payload.notes || `Source: ${payload.source}`,
          nextFollowUp: "Today, 12:00 PM"
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
}));
