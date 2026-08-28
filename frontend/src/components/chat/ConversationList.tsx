import React from "react";
import { Users, MessageSquare } from "lucide-react";
import type { Conversation } from "../../types/chat.types";
import { useAuthStore } from "../../store/auth.store";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  isLoading,
  selectedId,
  onSelect,
}) => {
  const { user: currentUser } = useAuthStore();

  if (isLoading) {
    return (
      <div className="p-3 space-y-3">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
          Channels
        </div>
        <div className="flex items-center gap-3 p-2 rounded-xl">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 pt-2">
          Direct Messages
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const teamConversations = conversations.filter((c) => c.type === "TEAM");
  const directConversations = conversations.filter((c) => c.type === "DIRECT");

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-64 text-muted-foreground">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-2" />
        <p className="text-sm font-semibold text-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
          Your branch team channel will appear here automatically.
        </p>
      </div>
    );
  }

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
      {/* ─── TEAM SECTION ─────────────────────────────────────────── */}
      <div>
        <div className="px-2.5 pb-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span>Team Channels</span>
          <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {teamConversations.length}
          </span>
        </div>

        <div className="space-y-1">
          {teamConversations.map((conv) => {
            const isSelected = selectedId === conv.id;
            const title = conv.title || (conv.branch?.name ? `${conv.branch.name} Team` : "All Team");
            const unread = conv.unreadCount || 0;

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelect(conv)}
                className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#1769AA]/10 dark:bg-sky-950/50 border border-[#1769AA]/30"
                    : "hover:bg-accent/70 border border-transparent"
                }`}
              >
                <div className="h-10 w-10 rounded-lg bg-[#1769AA]/10 dark:bg-sky-950/60 text-[#1769AA] dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-foreground truncate">
                      {title}
                    </span>
                    {conv.lastMessage?.createdAt && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTimestamp(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {conv.lastMessage ? (
                      <>
                        <span className="font-semibold text-foreground/80">
                          {conv.lastMessage.senderId === currentUser?.id
                            ? "You: "
                            : conv.lastMessage.sender?.name
                            ? `${conv.lastMessage.sender.name.split(" ")[0]}: `
                            : ""}
                        </span>
                        {conv.lastMessage.content}
                      </>
                    ) : (
                      "No messages yet"
                    )}
                  </p>
                </div>

                {unread > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center text-[10px] font-bold bg-[#EF4444] text-white rounded-full leading-none shrink-0"
                  >
                    {unread}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── DIRECT MESSAGES SECTION ──────────────────────────────── */}
      <div>
        <div className="px-2.5 pb-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span>Direct Messages</span>
          <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {directConversations.length}
          </span>
        </div>

        {directConversations.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border/60">
            No direct messages yet.
          </div>
        ) : (
          <div className="space-y-1">
            {directConversations.map((conv) => {
              const isSelected = selectedId === conv.id;
              const otherMember = conv.members.find((m) => m.userId !== currentUser?.id);
              const otherName = otherMember?.user?.name || conv.title || "Direct Message";
              const initials = otherName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();
              const unread = conv.unreadCount || 0;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onSelect(conv)}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#1769AA]/10 dark:bg-sky-950/50 border border-[#1769AA]/30"
                      : "hover:bg-accent/70 border border-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 rounded-lg border border-border/60 bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                      <AvatarFallback className="bg-[#1769AA] text-white text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground truncate">
                        {otherName}
                      </span>
                      {conv.lastMessage?.createdAt && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTimestamp(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {conv.lastMessage ? (
                        <>
                          <span className="font-semibold text-foreground/80">
                            {conv.lastMessage.senderId === currentUser?.id ? "You: " : ""}
                          </span>
                          {conv.lastMessage.content}
                        </>
                      ) : (
                        "Tap to start chatting"
                      )}
                    </p>
                  </div>

                  {unread > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center text-[10px] font-bold bg-[#EF4444] text-white rounded-full leading-none shrink-0"
                    >
                      {unread}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
