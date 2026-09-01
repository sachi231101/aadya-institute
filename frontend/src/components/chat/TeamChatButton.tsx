import React from "react";
import { MessageSquare } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useChatStore } from "../../store/chat.store";
import { useTotalUnreadChatCount } from "../../hooks/useChat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ALLOWED_STAFF_ROLES = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STAFF"];

export const TeamChatButton: React.FC<{ className?: string }> = ({ className = "" }) => {
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
      className={`relative gap-1.5 h-7 px-2.5 border-white/20 bg-white/10 hover:bg-white/20 text-white hover:text-white font-medium text-[11px] transition-all cursor-pointer ${className}`}
      title="Open Team Chat"
      aria-label={`Open Team Chat${unreadCount > 0 ? `, ${unreadCount} unread messages` : ""}`}
    >
      <MessageSquare className="h-3 w-3 text-sky-200 shrink-0" />
      <span className="hidden sm:inline font-semibold">Team Chat</span>
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="h-4 min-w-[1rem] px-1 flex items-center justify-center text-[9px] font-bold bg-[#EF4444] text-white rounded-full leading-none"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
};
