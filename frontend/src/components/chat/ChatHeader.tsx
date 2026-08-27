import React from "react";
import { ArrowLeft, X, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Conversation } from "../../types/chat.types";
import { useAuthStore } from "../../store/auth.store";

interface ChatHeaderProps {
  activeConversation?: Conversation | null;
  onBack?: () => void;
  onClose: () => void;
  showBack?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeConversation,
  onBack,
  onClose,
  showBack = false,
}) => {
  const { user: currentUser } = useAuthStore();

  let title = "Team Chat";
  let subtitle = "Internal Employee Communication";
  let isTeam = true;
  let initials = "TC";

  if (activeConversation) {
    if (activeConversation.type === "TEAM") {
      title = activeConversation.title || (activeConversation.branch?.name ? `${activeConversation.branch.name} Team` : "All Team");
      subtitle = "Branch Channel";
      isTeam = true;
      initials = "TC";
    } else {
      isTeam = false;
      const otherMember = activeConversation.members.find((m) => m.userId !== currentUser?.id);
      title = otherMember?.user?.name || activeConversation.title || "Direct Message";
      const otherRole = otherMember?.user?.roles?.[0] || "Staff";
      subtitle = `${otherRole.replace(/_/g, " ")}`;
      initials = title
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-bg-secondary shrink-0 select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        {showBack && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg cursor-pointer shrink-0 -ml-1"
            title="Back to conversations"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {activeConversation ? (
          <div className="flex items-center gap-2.5 min-w-0">
            {isTeam ? (
              <div className="h-8 w-8 rounded-lg bg-[#1769AA]/10 dark:bg-sky-950/60 text-[#1769AA] dark:text-sky-400 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
            ) : (
              <Avatar className="h-8 w-8 rounded-lg border border-border/60 bg-slate-100 dark:bg-slate-800 text-xs font-bold shrink-0">
                <AvatarFallback className="bg-[#1769AA] text-white text-[11px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 inline-block" />
                <h2 className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight">
                  {title}
                </h2>
              </div>
              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#1769AA]/10 dark:bg-sky-950/60 text-[#1769AA] dark:text-sky-400 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                Team Chat
              </h2>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Aadya Internal Communication
              </p>
            </div>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg cursor-pointer shrink-0"
        title="Close chat"
        aria-label="Close chat"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
