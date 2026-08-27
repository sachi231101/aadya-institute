import React from "react";
import type { Message } from "../../types/chat.types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, CheckCheck } from "lucide-react";

interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isCurrentUser }) => {
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const senderName = isCurrentUser ? "You" : message.sender?.name || "Staff Member";
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className={`flex gap-2.5 max-w-[88%] ${
        isCurrentUser ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
      }`}
    >
      {!isCurrentUser && (
        <Avatar className="h-7 w-7 rounded-lg border border-border/60 bg-slate-200 dark:bg-slate-700 text-[10px] font-bold shrink-0 mt-0.5">
          <AvatarFallback className="bg-slate-300 dark:bg-slate-700 text-foreground font-semibold text-[10px]">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`space-y-1 ${isCurrentUser ? "items-end text-right" : "items-start text-left"}`}>
        {!isCurrentUser && (
          <span className="text-[11px] font-bold text-foreground/90 block px-1">
            {senderName}
          </span>
        )}

        <div
          className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words whitespace-pre-wrap ${
            isCurrentUser
              ? "bg-[#1769AA] text-white rounded-tr-xs shadow-2xs font-normal"
              : "bg-bg-secondary text-foreground border border-border/70 rounded-tl-xs shadow-2xs"
          }`}
        >
          {message.content}
        </div>

        <div
          className={`flex items-center gap-1 text-[10px] text-muted-foreground px-1 ${
            isCurrentUser ? "justify-end" : "justify-start"
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isCurrentUser && (
            <span>
              {message.readAt ? (
                <CheckCheck className="h-3 w-3 text-sky-500 dark:text-sky-400 inline" />
              ) : (
                <Check className="h-3 w-3 text-muted-foreground inline" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
