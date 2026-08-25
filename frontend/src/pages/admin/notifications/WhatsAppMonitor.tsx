import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Filter,
  Send,
  Paperclip,
  Smile,
  Mic,
  Phone,
  MoreVertical,
  Sparkles,
  Info,
  User,
  GraduationCap,
  Building2,
  UserCheck,
  Clock,
  Calendar,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  Eye,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  SlidersHorizontal,
  RefreshCw,
  Bot,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ContactType = "Lead" | "Student" | "Parent";
export type LeadStatus =
  | "Follow-up Required"
  | "New Enquiry"
  | "Enrolled"
  | "Contacted"
  | "Active"
  | "Callback Requested"
  | "Discussion";

export interface ChatMessage {
  id: string;
  sender: "user" | "institute";
  senderName?: string;
  text: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  isAutomated?: boolean;
}

export interface WhatsAppConversation {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  avatarBg: string;
  phone: string;
  type: ContactType;
  interestedCourse: string;
  branch: string;
  assignedCounsellor: string;
  leadStatus: LeadStatus;
  leadSource: string;
  firstContact: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageDate: string;
  unreadCount: number;
  isActive: boolean;
  messages: ChatMessage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_CONVERSATIONS: WhatsAppConversation[] = [
  {
    id: "conv-1",
    name: "Rahul Kumar",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    initials: "RK",
    avatarBg: "bg-indigo-500",
    phone: "+91 98765 43210",
    type: "Lead",
    interestedCourse: "Full Stack Development",
    branch: "Bangalore Center",
    assignedCounsellor: "Priya Sharma",
    leadStatus: "Follow-up Required",
    leadSource: "WhatsApp",
    firstContact: "18 Aug 2026 10:15 AM",
    lastMessage: "Yes, please share it.",
    lastMessageTime: "10:42 AM",
    lastMessageDate: "Today",
    unreadCount: 2,
    isActive: true,
    messages: [
      {
        id: "m-101",
        sender: "user",
        senderName: "Rahul Kumar",
        text: "Hi, I would like to know about the Full Stack Development course.",
        timestamp: "10:41 AM",
      },
      {
        id: "m-102",
        sender: "institute",
        senderName: "Aadya Institute",
        text: "Hello Rahul! 👋 Thank you for contacting Aadya Institute. How can we help you?",
        timestamp: "10:41 AM",
        status: "read",
      },
      {
        id: "m-103",
        sender: "user",
        senderName: "Rahul Kumar",
        text: "Can you share the course duration and fee details?",
        timestamp: "10:41 AM",
      },
      {
        id: "m-104",
        sender: "institute",
        senderName: "Aadya Institute",
        text: "Sure! The course duration is 6 months and the total fee is ₹45,000.\nWould you like the detailed syllabus?",
        timestamp: "10:43 AM",
        status: "read",
      },
      {
        id: "m-105",
        sender: "user",
        senderName: "Rahul Kumar",
        text: "Yes, please share it.",
        timestamp: "10:43 AM",
      },
    ],
  },
  {
    id: "conv-2",
    name: "Priya Sharma",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150",
    initials: "PS",
    avatarBg: "bg-emerald-500",
    phone: "+91 98765 12345",
    type: "Student",
    interestedCourse: "Data Science & AI",
    branch: "Bangalore Center",
    assignedCounsellor: "Anita Roy",
    leadStatus: "Enrolled",
    leadSource: "Website",
    firstContact: "10 Aug 2026 02:20 PM",
    lastMessage: "Thank you for the information.",
    lastMessageTime: "10:30 AM",
    lastMessageDate: "Today",
    unreadCount: 0,
    isActive: true,
    messages: [
      {
        id: "m-201",
        sender: "institute",
        senderName: "Aadya Institute",
        text: "Reminder: Your Live Python session starts at 04:00 PM today with Dr. Ramesh Kumar.",
        timestamp: "09:30 AM",
        status: "read",
        isAutomated: true,
      },
      {
        id: "m-202",
        sender: "user",
        senderName: "Priya Sharma",
        text: "Got it! Will the class recording be uploaded after the session?",
        timestamp: "10:15 AM",
      },
      {
        id: "m-203",
        sender: "institute",
        senderName: "Aadya Institute",
        text: "Yes Priya, recordings are automatically published within 1 hour on your student portal.",
        timestamp: "10:28 AM",
        status: "read",
      },
      {
        id: "m-204",
        sender: "user",
        senderName: "Priya Sharma",
        text: "Thank you for the information.",
        timestamp: "10:30 AM",
      },
    ],
  },
  {
    id: "conv-3",
    name: "Arjun R",
    initials: "AR",
    avatarBg: "bg-purple-500",
    phone: "+91 98450 78901",
    type: "Lead",
    interestedCourse: "Java Full Stack",
    branch: "Koramangala Center",
    assignedCounsellor: "Rajesh Nair",
    leadStatus: "New Enquiry",
    leadSource: "Instagram Ad",
    firstContact: "24 Aug 2026 04:10 PM",
    lastMessage: "Is the admission still open?",
    lastMessageTime: "Yesterday",
    lastMessageDate: "Yesterday",
    unreadCount: 1,
    isActive: true,
    messages: [
      {
        id: "m-301",
        sender: "user",
        senderName: "Arjun R",
        text: "Hello, I saw your Java Full Stack poster in Koramangala.",
        timestamp: "Yesterday 04:12 PM",
      },
      {
        id: "m-302",
        sender: "user",
        senderName: "Arjun R",
        text: "Is the admission still open for the upcoming weekend batch?",
        timestamp: "Yesterday 04:15 PM",
      },
    ],
  },
  {
    id: "conv-4",
    name: "Neha Verma",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    initials: "NV",
    avatarBg: "bg-pink-500",
    phone: "+91 99887 65432",
    type: "Parent",
    interestedCourse: "Cloud Computing & AWS",
    branch: "Jayanagar Center",
    assignedCounsellor: "Priya Sharma",
    leadStatus: "Contacted",
    leadSource: "Walk-in",
    firstContact: "22 Aug 2026 11:00 AM",
    lastMessage: "Please share the course details.",
    lastMessageTime: "Yesterday",
    lastMessageDate: "Yesterday",
    unreadCount: 0,
    isActive: false,
    messages: [
      {
        id: "m-401",
        sender: "user",
        senderName: "Neha Verma",
        text: "Hello, my son wants to join the Cloud Computing batch.",
        timestamp: "Yesterday 11:30 AM",
      },
      {
        id: "m-402",
        sender: "institute",
        senderName: "Aadya Institute",
        text: "Hello Mrs. Verma! We have morning and evening batches starting next Monday. Would you like a counsellor to call?",
        timestamp: "Yesterday 11:45 AM",
        status: "read",
      },
      {
        id: "m-403",
        sender: "user",
        senderName: "Neha Verma",
        text: "Please share the course details on this number first.",
        timestamp: "Yesterday 12:10 PM",
      },
    ],
  },
  {
    id: "conv-5",
    name: "Vikram Singh",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    initials: "VS",
    avatarBg: "bg-blue-600",
    phone: "+91 91234 56789",
    type: "Student",
    interestedCourse: "Cyber Security & Ethical Hacking",
    branch: "Indiranagar Center",
    assignedCounsellor: "Sneha Patel",
    leadStatus: "Active",
    leadSource: "Referral",
    firstContact: "15 Aug 2026 09:40 AM",
    lastMessage: "Ok, I will visit the campus.",
    lastMessageTime: "23 Aug",
    lastMessageDate: "23 Aug 2026",
    unreadCount: 0,
    isActive: false,
    messages: [
      {
        id: "m-501",
        sender: "institute",
        senderName: "Aadya Institute",
        text: "Hi Vikram, your lab access badge is ready for collection at the Indiranagar branch front desk.",
        timestamp: "23 Aug 02:00 PM",
        status: "read",
      },
      {
        id: "m-502",
        sender: "user",
        senderName: "Vikram Singh",
        text: "Ok, I will visit the campus tomorrow around 11 AM.",
        timestamp: "23 Aug 02:30 PM",
      },
    ],
  },
  {
    id: "conv-6",
    name: "Sneha Patil",
    initials: "SP",
    avatarBg: "bg-emerald-600",
    phone: "+91 97654 32109",
    type: "Lead",
    interestedCourse: "Data Engineering",
    branch: "Bangalore Center",
    assignedCounsellor: "Rajesh Nair",
    leadStatus: "Callback Requested",
    leadSource: "Google Search",
    firstContact: "23 Aug 2026 01:20 PM",
    lastMessage: "What is the batch schedule?",
    lastMessageTime: "23 Aug",
    lastMessageDate: "23 Aug 2026",
    unreadCount: 0,
    isActive: true,
    messages: [
      {
        id: "m-601",
        sender: "user",
        senderName: "Sneha Patil",
        text: "Hi, I am looking for Data Engineering with Snowflake & Spark.",
        timestamp: "23 Aug 01:22 PM",
      },
      {
        id: "m-602",
        sender: "user",
        senderName: "Sneha Patil",
        text: "What is the batch schedule? Do you have weekend slots?",
        timestamp: "23 Aug 01:25 PM",
      },
    ],
  },
  {
    id: "conv-7",
    name: "Ajay Mehta",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=150",
    initials: "AM",
    avatarBg: "bg-amber-600",
    phone: "+91 96543 21098",
    type: "Student",
    interestedCourse: "Python & DevOps",
    branch: "Whitefield Center",
    assignedCounsellor: "Anita Roy",
    leadStatus: "Enrolled",
    leadSource: "Website",
    firstContact: "12 Aug 2026 10:00 AM",
    lastMessage: "Thanks for your help!",
    lastMessageTime: "22 Aug",
    lastMessageDate: "22 Aug 2026",
    unreadCount: 0,
    isActive: false,
    messages: [
      {
        id: "m-701",
        sender: "institute",
        senderName: "Aadya Institute",
        text: "Hi Ajay, your fee receipt for Installment #2 has been generated.",
        timestamp: "22 Aug 03:00 PM",
        status: "read",
        isAutomated: true,
      },
      {
        id: "m-702",
        sender: "user",
        senderName: "Ajay Mehta",
        text: "Thanks for your help!",
        timestamp: "22 Aug 03:15 PM",
      },
    ],
  },
  {
    id: "conv-8",
    name: "Kavya Reddy",
    initials: "KR",
    avatarBg: "bg-rose-500",
    phone: "+91 95432 10987",
    type: "Parent",
    interestedCourse: "Full Stack Development",
    branch: "Bangalore Center",
    assignedCounsellor: "Priya Sharma",
    leadStatus: "Discussion",
    leadSource: "Phone Enquiry",
    firstContact: "21 Aug 2026 05:10 PM",
    lastMessage: "Can we pay fees in installments?",
    lastMessageTime: "21 Aug",
    lastMessageDate: "21 Aug 2026",
    unreadCount: 0,
    isActive: false,
    messages: [
      {
        id: "m-801",
        sender: "user",
        senderName: "Kavya Reddy",
        text: "Hello, my daughter wants to join the July batch.",
        timestamp: "21 Aug 05:12 PM",
      },
      {
        id: "m-802",
        sender: "user",
        senderName: "Kavya Reddy",
        text: "Can we pay fees in installments? What are the options?",
        timestamp: "21 Aug 05:14 PM",
      },
    ],
  },
];

const COUNSELLOR_LIST = [
  "Priya Sharma",
  "Rajesh Nair",
  "Anita Roy",
  "Sneha Patel",
  "Vikram Aditya",
];

const AI_QUICK_TEMPLATES = [
  {
    title: "Course Syllabus & Brochure",
    text: "Here is the detailed syllabus for the course: https://aadya.institute/curriculum/full-stack-2026.pdf 📚 Let us know if you have any questions!",
  },
  {
    title: "Fee Structure & EMI",
    text: "Our fee is ₹45,000 with a 0% interest 3-installment plan available (₹15,000 x 3). Would you like help booking your seat?",
  },
  {
    title: "Schedule Free Demo Class",
    text: "We have an interactive Live Demo Class this Saturday at 11:00 AM! Would you like me to register your seat?",
  },
  {
    title: "Campus Location & Map",
    text: "Aadya Institute Bangalore Center: 4th Floor, Tech Hub Building, Koramangala 5th Block. Map: https://maps.google.com/aadya-blr",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const WhatsAppMonitor: React.FC = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string>("conv-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Unread" | "Leads" | "Students" | "Parents">("All");
  
  // Message typing
  const [messageInput, setMessageInput] = useState("");
  
  // Modals & Popovers
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [newCounsellor, setNewCounsellor] = useState("Priya Sharma");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAiQuickReplyOpen, setIsAiQuickReplyOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Status Filter State
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterBranch, setFilterBranch] = useState<string>("ALL");

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Selected conversation
  const selectedConv = useMemo(() => {
    return conversations.find((c) => c.id === selectedId) || conversations[0];
  }, [conversations, selectedId]);

  // Summary Metrics calculation
  const metrics = useMemo(() => {
    const total = 1248;
    const unread = 24;
    const active = 18;
    const today = 356;
    const failed = 3;
    return { total, unread, active, today, failed };
  }, []);

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Search matching
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.interestedCourse.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab matching
      if (activeTab === "Unread" && c.unreadCount === 0) return false;
      if (activeTab === "Leads" && c.type !== "Lead") return false;
      if (activeTab === "Students" && c.type !== "Student") return false;
      if (activeTab === "Parents" && c.type !== "Parent") return false;

      // Filter modal matching
      if (filterStatus !== "ALL" && c.leadStatus !== filterStatus) return false;
      if (filterBranch !== "ALL" && c.branch !== filterBranch) return false;

      return true;
    });
  }, [conversations, searchQuery, activeTab, filterStatus, filterBranch]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv?.messages]);

  // Show quick toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Send message action
  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || messageInput.trim();
    if (!text || !selectedConv) return;

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "institute",
      senderName: "Aadya Institute",
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "delivered",
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === selectedConv.id) {
          return {
            ...c,
            lastMessage: text,
            lastMessageTime: newMsg.timestamp,
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    setMessageInput("");
    setIsAiQuickReplyOpen(false);
  };

  // Handle selecting a conversation
  const handleSelectConversation = (conv: WhatsAppConversation) => {
    setSelectedId(conv.id);
    // Mark as read
    if (conv.unreadCount > 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
    }
  };

  // Handle Counsellor Assignment
  const handleAssignCounsellor = () => {
    if (!selectedConv) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConv.id ? { ...c, assignedCounsellor: newCounsellor } : c
      )
    );
    setIsAssignModalOpen(false);
    showToast(`✓ Assigned ${newCounsellor} as counsellor for ${selectedConv.name}`);
  };

  // Simulate receiving a live incoming message
  const handleSimulateIncoming = () => {
    const incoming: ChatMessage = {
      id: `m-live-${Date.now()}`,
      sender: "user",
      senderName: selectedConv?.name || "Rahul Kumar",
      text: "Thank you! I will review and get back to you shortly.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === selectedConv?.id) {
          return {
            ...c,
            lastMessage: incoming.text,
            lastMessageTime: incoming.timestamp,
            unreadCount: c.unreadCount + 1,
            messages: [...c.messages, incoming],
          };
        }
        return c;
      })
    );
    showToast(`🔔 New WhatsApp message received from ${selectedConv?.name}`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1700px] mx-auto animate-in fade-in duration-300">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 animate-in slide-in-from-top-4">
          <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 1. TOP HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            WhatsApp Monitor
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitor, manage and respond to WhatsApp conversations from students, leads and parents.
          </p>
        </div>

        {/* Right Header Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Connection Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 text-emerald-800 text-xs font-bold shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>WhatsApp Connected</span>
          </div>

          {/* Top Search Input */}
          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs bg-white rounded-xl border-slate-200/90 shadow-2xs placeholder:text-slate-400 focus:ring-1 focus:ring-[#1D4ED8]"
            />
          </div>

          {/* Filters Button */}
          <Button
            variant="outline"
            onClick={() => setIsFilterModalOpen(true)}
            className="h-9 px-3.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 rounded-xl gap-1.5 shadow-2xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span>Filters</span>
          </Button>

          {/* Simulate Live Event Button */}
          <Button
            variant="ghost"
            onClick={handleSimulateIncoming}
            title="Simulate incoming message from customer"
            className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── 2. TOP SUMMARY METRIC CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Conversations */}
        <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Total Conversations</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {metrics.total.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("All");
                  setFilterStatus("ALL");
                }}
                className="text-[11px] font-bold text-[#1D4ED8] hover:underline"
              >
                View all
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Unread Messages */}
        <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Unread Messages</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {metrics.unread}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("Unread")}
                className="text-[11px] font-bold text-[#1D4ED8] hover:underline"
              >
                View all
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Active Conversations */}
        <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Active Conversations</span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {metrics.active}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("All");
                  setFilterStatus("ALL");
                }}
                className="text-[11px] font-bold text-[#1D4ED8] hover:underline"
              >
                View all
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Today's Messages */}
        <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Today's Messages</span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {metrics.today}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("All");
                  setFilterStatus("ALL");
                }}
                className="text-[11px] font-bold text-[#1D4ED8] hover:underline"
              >
                View all
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Failed Messages */}
        <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Failed Messages</span>
              <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                0{metrics.failed}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => showToast("Showing 3 failed delivery logs")}
                className="text-[11px] font-bold text-[#1D4ED8] hover:underline"
              >
                View all
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. MAIN THREE-COLUMN WHATSAPP WORKSPACE ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[780px]">
        {/* ─── COLUMN 1: CONVERSATIONS LIST (4 cols) ─── */}
        <div className="lg:col-span-4 xl:col-span-4 bg-white border border-slate-200/80 rounded-3xl shadow-xs flex flex-col overflow-hidden">
          {/* Top Search & Filter Bar */}
          <div className="p-3.5 border-b border-slate-100 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200/80 rounded-xl outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#1D4ED8] transition-all font-medium"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                title="Filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {(["All", "Unread", "Leads", "Students", "Parents"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === tab
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
                <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">No conversations found</p>
                <p className="text-[11px] text-slate-400 mt-1">Try adjusting your filters or search term</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConv?.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`flex items-start gap-3 p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/70 border-l-4 border-l-[#1D4ED8]"
                        : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {conv.avatar ? (
                        <img
                          src={conv.avatar}
                          alt={conv.name}
                          className="h-10 w-10 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div
                          className={`h-10 w-10 rounded-full ${conv.avatarBg} text-white font-bold text-xs flex items-center justify-center shadow-2xs`}
                        >
                          {conv.initials}
                        </div>
                      )}
                      {conv.isActive && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>

                    {/* Content Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {conv.name}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          {conv.lastMessageTime}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[11px] text-slate-500 truncate font-medium">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="shrink-0 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* List Footer Pagination */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">Showing 1 to {filteredConversations.length} of 1248 conversations</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 hover:bg-white text-slate-600"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <span className="px-1.5 font-bold text-slate-800 text-[10px]">1</span>
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 hover:bg-white text-slate-600"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── COLUMN 2: CENTER CHAT CONVERSATION (5 cols) ─── */}
        <div className="lg:col-span-8 xl:col-span-5 bg-white border border-slate-200/80 rounded-3xl shadow-xs flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 px-5 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedConv.avatar ? (
                    <img
                      src={selectedConv.avatar}
                      alt={selectedConv.name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div
                      className={`h-10 w-10 rounded-full ${selectedConv.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0`}
                    >
                      {selectedConv.initials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-slate-900 truncate">
                        {selectedConv.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span className="truncate">
                        {selectedConv.type} · {selectedConv.interestedCourse}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chat Top Actions */}
                <div className="flex items-center gap-1 text-slate-500">
                  <button
                    type="button"
                    onClick={() => setIsAiQuickReplyOpen(!isAiQuickReplyOpen)}
                    title="AI Suggested Quick Replies"
                    className="p-2 rounded-xl hover:bg-slate-100 text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Search Messages"
                    className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Contact Info"
                    className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* AI Quick Reply Floating Suggestions */}
              {isAiQuickReplyOpen && (
                <div className="bg-indigo-50/80 border-b border-indigo-100 p-3 space-y-2 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      Aadya AI Quick Reply Templates
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAiQuickReplyOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {AI_QUICK_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(tmpl.text)}
                        className="text-left p-2 bg-white hover:bg-indigo-100/60 border border-indigo-200/70 rounded-xl text-[11px] font-semibold text-slate-800 transition-colors"
                      >
                        <span className="font-bold text-indigo-700 block mb-0.5">
                          {tmpl.title}
                        </span>
                        <span className="text-slate-500 line-clamp-1">{tmpl.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Message Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
                {/* Date Badge */}
                <div className="flex justify-center my-1">
                  <span className="px-3 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-bold shadow-2xs">
                    Today
                  </span>
                </div>

                {selectedConv.messages.map((msg) => {
                  const isInstitute = msg.sender === "institute";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isInstitute ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs ${
                          isInstitute
                            ? "bg-[#DCF8C6] text-slate-900 border border-emerald-200/60 rounded-tr-xs"
                            : "bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs"
                        }`}
                      >
                        {msg.isAutomated && (
                          <div className="flex items-center gap-1 mb-1 text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                            <Bot className="h-2.5 w-2.5" /> Automated Notification
                          </div>
                        )}
                        <p className="leading-relaxed whitespace-pre-line font-medium">
                          {msg.text}
                        </p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                            isInstitute ? "text-emerald-700 font-bold" : "text-slate-400 font-semibold"
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {isInstitute && (
                            <span className="text-sky-600 font-black">✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-slate-100">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    title="Insert Emoji"
                    onClick={() => setMessageInput((prev) => prev + " 👋")}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <Smile className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    title="Attach File / Brochure"
                    onClick={() => showToast("Attachment upload dialog opened")}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>

                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 h-10 text-xs bg-slate-50 border-slate-200 rounded-xl px-3.5 focus:bg-white focus:ring-1 focus:ring-[#1D4ED8]"
                  />

                  <button
                    type="button"
                    title="Record Voice Note"
                    onClick={() => showToast("Voice recording simulation started")}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <Mic className="h-5 w-5" />
                  </button>

                  <Button
                    type="submit"
                    className="h-10 px-5 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold rounded-xl gap-1.5 shadow-2xs"
                  >
                    <span>Send</span>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 text-center">
              <MessageSquare className="h-12 w-12 text-slate-200 mb-2" />
              <p className="text-sm font-bold text-slate-600">Select a conversation to start chatting</p>
            </div>
          )}
        </div>

        {/* ─── COLUMN 3: CONTACT DETAILS SIDEBAR (3 cols) ─── */}
        <div className="lg:col-span-12 xl:col-span-3 bg-white border border-slate-200/80 rounded-3xl shadow-xs p-5 flex flex-col justify-between overflow-y-auto">
          {selectedConv ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Contact Details</h3>
                <button
                  type="button"
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Profile Card Header */}
              <div className="flex items-center gap-3.5">
                {selectedConv.avatar ? (
                  <img
                    src={selectedConv.avatar}
                    alt={selectedConv.name}
                    className="h-14 w-14 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                  />
                ) : (
                  <div
                    className={`h-14 w-14 rounded-2xl ${selectedConv.avatarBg} text-white font-black text-base flex items-center justify-center shadow-2xs`}
                  >
                    {selectedConv.initials}
                  </div>
                )}
                <div>
                  <h4 className="text-base font-black text-slate-900 leading-tight">
                    {selectedConv.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-slate-600">
                    <span>{selectedConv.phone}</span>
                    <span className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Phone className="h-2.5 w-2.5 text-emerald-600" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Attributes Table */}
              <div className="space-y-2.5 text-xs">
                {/* Type */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" /> Type
                  </span>
                  <span className="font-bold text-slate-900">{selectedConv.type}</span>
                </div>

                {/* Interested Course */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> Interested Course
                  </span>
                  <span className="font-bold text-slate-900 truncate max-w-[140px] text-right">
                    {selectedConv.interestedCourse}
                  </span>
                </div>

                {/* Branch */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" /> Branch
                  </span>
                  <span className="font-bold text-slate-900">{selectedConv.branch}</span>
                </div>

                {/* Assigned Counsellor */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-slate-400" /> Assigned Counsellor
                  </span>
                  <span className="font-bold text-[#1D4ED8] hover:underline cursor-pointer">
                    {selectedConv.assignedCounsellor}
                  </span>
                </div>

                {/* Lead Status */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-slate-400" /> Lead Status
                  </span>
                  <Badge className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200">
                    {selectedConv.leadStatus}
                  </Badge>
                </div>

                {/* Lead Source */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> Lead Source
                  </span>
                  <span className="font-bold text-slate-900">{selectedConv.leadSource}</span>
                </div>

                {/* First Contact */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" /> First Contact
                  </span>
                  <span className="font-medium text-slate-700 text-[11px]">
                    {selectedConv.firstContact}
                  </span>
                </div>

                {/* Last Message */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Last Message
                  </span>
                  <span className="font-medium text-slate-700 text-[11px]">
                    {selectedConv.lastMessageDate} {selectedConv.lastMessageTime}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => showToast(`Opening profile for ${selectedConv.name}`)}
                    className="h-9 text-xs font-bold text-slate-700 rounded-xl gap-1.5 border-slate-200 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                    <span>View Profile</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => showToast(`Opening lead card for ${selectedConv.name}`)}
                    className="h-9 text-xs font-bold text-slate-700 rounded-xl gap-1.5 border-slate-200 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    <span>Open Lead</span>
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    setNewCounsellor(selectedConv.assignedCounsellor);
                    setIsAssignModalOpen(true);
                  }}
                  className="w-full h-10 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold rounded-xl gap-1.5 shadow-2xs"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Assign Counsellor</span>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── MODAL 1: ASSIGN COUNSELLOR MODAL ────────────────────────────── */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-black text-slate-900">
              Assign Counsellor
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Re-assign this conversation and lead to a dedicated admission counsellor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Selected Contact
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-slate-900">{selectedConv?.name}</span>
                <Badge variant="outline" className="text-[10px]">{selectedConv?.type}</Badge>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Select Counsellor *
              </label>
              <select
                value={newCounsellor}
                onChange={(e) => setNewCounsellor(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#1D4ED8] outline-none"
              >
                {COUNSELLOR_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c} (Active Counsellor)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-3">
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
              className="text-xs font-bold h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignCounsellor}
              className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold h-9 rounded-xl"
            >
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: FILTER CONVERSATIONS MODAL ─────────────────────────── */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-black text-slate-900">
              Filter Conversations
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Filter messages and conversations by branch, status, or date range.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-2 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Branch Location
              </label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
              >
                <option value="ALL">All Branches</option>
                <option value="Bangalore Center">Bangalore Center</option>
                <option value="Koramangala Center">Koramangala Center</option>
                <option value="Jayanagar Center">Jayanagar Center</option>
                <option value="Indiranagar Center">Indiranagar Center</option>
                <option value="Whitefield Center">Whitefield Center</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Lead / Conversation Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Follow-up Required">Follow-up Required</option>
                <option value="New Enquiry">New Enquiry</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Contacted">Contacted</option>
                <option value="Active">Active</option>
                <option value="Callback Requested">Callback Requested</option>
                <option value="Discussion">Discussion</option>
              </select>
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-3">
            <Button
              variant="outline"
              onClick={() => {
                setFilterBranch("ALL");
                setFilterStatus("ALL");
                setIsFilterModalOpen(false);
              }}
              className="text-xs font-bold h-9 rounded-xl"
            >
              Reset Filters
            </Button>
            <Button
              onClick={() => setIsFilterModalOpen(false)}
              className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold h-9 rounded-xl"
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
