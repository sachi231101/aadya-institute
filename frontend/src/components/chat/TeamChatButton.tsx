import React from "react";
import { MessageSquare } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useChatStore } from "../../store/chat.store";
import { useTotalUnreadChatCount } from "../../hooks/useChat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ALLOWED_STAFF_ROLES = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STAFF"];

export const TeamChatButton: React.FC = () => {
  const { user } = useAuthStore();
  const { toggleChat } = useChatStore();
  const unreadCount = useTotalUnreadChatCount();

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isAllowed = userRoles.some((r) => ALLOWED_STAFF_ROLES.includes(r)) && !userRoles.includes("STUDENT");

  if (!isAllowed) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleChat}
      className="relative gap-2 h-9 px-3 border-border/80 bg-background/80 hover:bg-accent/80 hover:text-foreground text-foreground font-medium text-xs transition-colors shadow-2xs cursor-pointer"
      title="Open Team Chat"
      aria-label={`Open Team Chat${unreadCount > 0 ? `, ${unreadCount} unread messages` : ""}`}
    >
      <MessageSquare className="h-4 w-4 text-[#1769AA] dark:text-sky-400 shrink-0" />
      <span className="hidden sm:inline font-semibold">Team Chat</span>
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center text-[10px] font-bold bg-[#EF4444] text-white rounded-full leading-none"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
};
