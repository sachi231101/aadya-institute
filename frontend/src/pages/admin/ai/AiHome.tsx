import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  BarChart2,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardList,
  FileText,
  GraduationCap,
  IndianRupee,
  Loader2,
  MessageSquare,
  MessageSquareQuote,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { useBranch } from "@/hooks/useBranches";
import { resolveAiHomeRole } from "@/hooks/useAiHomeStats";
import {
  aiAgentApi,
  type AIConversation,
  type AIMessage,
} from "@/services/ai-agent.api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils";

type ChatBubble = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  isError?: boolean;
};

type QuickAction = {
  id: string;
  label: string;
  query: string;
  icon: React.ComponentType<{ className?: string }>;
};

const CONVERSATIONS_KEY = ["ai", "conversations"] as const;

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function toBubbles(messages: AIMessage[]): ChatBubble[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      toolsUsed: m.toolName ? [m.toolName] : undefined,
    }));
}

export const AiHome: React.FC = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: branchResponse } = useBranch(user?.branchId || undefined);
  const branchName = branchResponse?.data?.name || "Aadya Central Branch";

  const roleKey = useMemo(
    () => resolveAiHomeRole(location.pathname, user),
    [location.pathname, user]
  );

  const roleContext = useMemo(() => {
    const firstName = user?.name?.split(" ")[0];
    const shared = {
      center: {
        greeting: `How can I help you today, ${firstName || "Center Manager"}?`,
        subtitle: `Ask anything about ${branchName} operations.`,
        placeholder: `Ask about ${branchName}...`,
        quickActions: [
          {
            id: "cm-1",
            label: "Today's branch performance",
            query: `View today's performance for ${branchName}`,
            icon: BarChart2,
          },
          {
            id: "cm-2",
            label: "Revenue & fee collection",
            query: `Show ${branchName} revenue and pending fees`,
            icon: IndianRupee,
          },
          {
            id: "cm-3",
            label: "Students needing attention",
            query: `Show students with low attendance in ${branchName}`,
            icon: Users,
          },
          {
            id: "cm-4",
            label: "Pending fees",
            query: `Show pending fee dues in ${branchName}`,
            icon: Wallet,
          },
        ] as QuickAction[],
      },
      faculty: {
        greeting: `How can I help you today, ${firstName ? `Prof. ${firstName}` : "Faculty"}?`,
        subtitle: "Ask about classes, attendance, and module progress.",
        placeholder: "Ask about your classes...",
        quickActions: [
          {
            id: "f-1",
            label: "Today's schedule",
            query: "Show my class schedule for today",
            icon: Calendar,
          },
          {
            id: "f-2",
            label: "Mark attendance",
            query: "Help me mark attendance for today's class",
            icon: CheckCircle,
          },
          {
            id: "f-3",
            label: "Pending submissions",
            query: "Show pending assignment submissions",
            icon: ClipboardList,
          },
          {
            id: "f-4",
            label: "Student doubts",
            query: "Summarize open student doubts",
            icon: MessageSquareQuote,
          },
        ] as QuickAction[],
      },
      counselor: {
        greeting: `How can I help you today, ${firstName || "Counsellor"}?`,
        subtitle: "Ask about leads, follow-ups, and conversions.",
        placeholder: "Ask about leads and admissions...",
        quickActions: [
          {
            id: "c-1",
            label: "Leads to follow up",
            query: "Show leads that need follow-up today",
            icon: Users,
          },
          {
            id: "c-2",
            label: "Conversion summary",
            query: "Show my conversion rate this month",
            icon: TrendingUp,
          },
          {
            id: "c-3",
            label: "AI call results",
            query: "Summarize recent AI calling results",
            icon: Sparkles,
          },
          {
            id: "c-4",
            label: "Pending applications",
            query: "Show pending admission applications",
            icon: FileText,
          },
        ] as QuickAction[],
      },
      student: {
        greeting: `How can I help you today, ${firstName || "Student"}?`,
        subtitle: "Ask about schedule, attendance, and assignments.",
        placeholder: "Ask about your course...",
        quickActions: [
          {
            id: "s-1",
            label: "My schedule",
            query: "Show my class schedule this week",
            icon: Calendar,
          },
          {
            id: "s-2",
            label: "My attendance",
            query: "Show my attendance summary",
            icon: UserCheck,
          },
          {
            id: "s-3",
            label: "Assignments due",
            query: "Show my pending assignments",
            icon: ClipboardList,
          },
          {
            id: "s-4",
            label: "Class recordings",
            query: "Show recent class recordings I can watch",
            icon: Video,
          },
        ] as QuickAction[],
      },
      admin: {
        greeting: `How can I help you today, ${firstName || "Admin"}?`,
        subtitle: "Ask anything about your institute.",
        placeholder: "Ask anything about your institute...",
        quickActions: [
          {
            id: "a-1",
            label: "Institute overview",
            query: "Give me today's institute operations overview",
            icon: Building2,
          },
          {
            id: "a-2",
            label: "Revenue snapshot",
            query: "Show fee collection and pending dues this month",
            icon: IndianRupee,
          },
          {
            id: "a-3",
            label: "Student insights",
            query: "Show students at risk of discontinuation",
            icon: GraduationCap,
          },
          {
            id: "a-4",
            label: "Batch status",
            query: "Summarize active batches across branches",
            icon: BookOpen,
          },
        ] as QuickAction[],
      },
    };
    return shared[roleKey] || shared.admin;
  }, [roleKey, user, branchName]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const conversationsQuery = useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => aiAgentApi.listConversations(),
  });

  const conversations = conversationsQuery.data ?? [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const loadConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    setIsProcessing(false);
    try {
      const detail = await aiAgentApi.getConversation(id);
      setMessages(toBubbles(detail.messages));
    } catch {
      setMessages([
        {
          id: "err-load",
          role: "assistant",
          content: "Could not load this conversation. Please try again.",
          isError: true,
        },
      ]);
    }
  }, []);

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputValue("");
    setIsProcessing(false);
    textareaRef.current?.focus();
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiAgentApi.deleteConversation(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      if (activeConversationId === id) startNewChat();
    },
  });

  const handleSend = async (customQuery?: string) => {
    const query = (customQuery || inputValue).trim();
    if (!query || isProcessing) return;

    const userBubble: ChatBubble = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: query,
    };
    setMessages((prev) => [...prev, userBubble]);
    setInputValue("");
    setIsProcessing(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const response = await aiAgentApi.chat({
        message: query,
        conversationId: activeConversationId || undefined,
      });
      setActiveConversationId(response.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-ai-${Date.now()}`,
          role: "assistant",
          content: response.message,
          toolsUsed: response.toolsUsed,
        },
      ]);
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        "Something went wrong. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: `local-err-${Date.now()}`,
          role: "assistant",
          content: msg,
          isError: true,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const hasMessages = messages.length > 0;

  const groupedHistory = useMemo(() => {
    const today: AIConversation[] = [];
    const earlier: AIConversation[] = [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    for (const c of conversations) {
      if (new Date(c.updatedAt) >= startOfDay) today.push(c);
      else earlier.push(c);
    }
    return { today, earlier };
  }, [conversations]);

  return (
    <div className="flex h-[calc(100vh-2.75rem)] bg-background text-foreground overflow-hidden">
      {/* History sidebar */}
      <aside
        className={cn(
          "shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200",
          sidebarOpen ? "w-[260px]" : "w-0 overflow-hidden border-0"
        )}
      >
        <div className="p-3 border-b border-sidebar-border">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={startNewChat}
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 py-3">
          {conversationsQuery.isLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">
              No conversations yet. Start a new chat.
            </p>
          ) : (
            <div className="space-y-4">
              {groupedHistory.today.length > 0 && (
                <div>
                  <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Today
                  </p>
                  <div className="space-y-0.5">
                    {groupedHistory.today.map((c) => (
                      <HistoryItem
                        key={c.id}
                        conversation={c}
                        active={c.id === activeConversationId}
                        onSelect={() => void loadConversation(c.id)}
                        onDelete={() => deleteMutation.mutate(c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {groupedHistory.earlier.length > 0 && (
                <div>
                  <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Earlier
                  </p>
                  <div className="space-y-0.5">
                    {groupedHistory.earlier.map((c) => (
                      <HistoryItem
                        key={c.id}
                        conversation={c}
                        active={c.id === activeConversationId}
                        onSelect={() => void loadConversation(c.id)}
                        onDelete={() => deleteMutation.mutate(c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="h-12 shrink-0 border-b border-border bg-card/80 backdrop-blur px-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            title={sidebarOpen ? "Hide history" : "Show history"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">Aadya AI</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {activeConversationId
                  ? conversations.find((c) => c.id === activeConversationId)?.title ||
                    "Conversation"
                  : "New conversation"}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="h-full flex flex-col items-center justify-center px-4 py-10 max-w-3xl mx-auto w-full">
              <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg mb-5">
                <Sparkles className="h-7 w-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-center text-foreground tracking-tight">
                {roleContext.greeting}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
                {roleContext.subtitle}
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                {roleContext.quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => void handleSend(action.query)}
                      className="flex items-start gap-3 text-left rounded-2xl border border-border bg-card px-4 py-3.5 hover:border-primary/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center text-primary shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground leading-snug">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-3",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {m.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : m.isError
                          ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-md"
                          : "bg-card text-card-foreground border border-border shadow-xs rounded-bl-md"
                    )}
                  >
                    {m.content}
                    {m.toolsUsed && m.toolsUsed.length > 0 && !m.isError ? (
                      <p className="mt-2 text-[10px] font-medium text-muted-foreground">
                        Used: {m.toolsUsed.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
              {isProcessing ? (
                <div className="flex gap-3 items-center">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking…
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-card px-3 py-3 sm:px-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-muted/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/20 px-3 py-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={onInput}
                onKeyDown={onKeyDown}
                placeholder={roleContext.placeholder}
                disabled={isProcessing}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none max-h-40 py-2.5 leading-5"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!inputValue.trim() || isProcessing}
                className={cn(
                  "mb-0.5 h-9 w-9 rounded-xl flex items-center justify-center transition-colors shrink-0",
                  inputValue.trim() && !isProcessing
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                title="Send"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Aadya AI can make mistakes. Verify important institute data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function HistoryItem({
  conversation,
  active,
  onSelect,
  onDelete,
}: {
  conversation: AIConversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/70 text-sidebar-foreground"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 flex items-start gap-2 text-left"
      >
        <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">
            {conversation.title || "Untitled chat"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatRelativeTime(conversation.updatedAt)}
            {conversation.messageCount
              ? ` · ${conversation.messageCount} msgs`
              : ""}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-opacity"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
