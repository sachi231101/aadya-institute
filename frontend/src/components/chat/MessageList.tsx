import React, { useEffect, useRef } from "react";
import type { Message } from "../../types/chat.types";
import { MessageItem } from "./MessageItem";
import { useAuthStore } from "../../store/auth.store";
import { Button } from "@/components/ui/button";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  isError,
  onRetry,
}) => {
  const { user: currentUser } = useAuthStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    if (!isLoading && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="flex gap-2 max-w-[70%]">
          <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
          <Skeleton className="h-10 flex-1 rounded-2xl" />
        </div>
        <div className="flex gap-2 max-w-[70%] ml-auto flex-row-reverse">
          <Skeleton className="h-10 flex-1 rounded-2xl" />
        </div>
        <div className="flex gap-2 max-w-[80%]">
          <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
          <Skeleton className="h-14 flex-1 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <p className="text-xs font-semibold text-destructive mb-2">Unable to load messages.</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-1.5 text-xs h-8 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/60 mb-2">
          <MessageSquare className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold text-foreground">No messages yet</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Send a message below to start the conversation.
        </p>
      </div>
    );
  }

  // Group messages by date
  const renderMessagesWithDates = () => {
    let lastDate = "";
    const items: React.ReactNode[] = [];

    messages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt);
      const dateKey = msgDate.toDateString();

      if (dateKey !== lastDate) {
        lastDate = dateKey;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        let label = msgDate.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        if (dateKey === today) label = "Today";
        else if (dateKey === yesterday) label = "Yesterday";

        items.push(
          <div key={`date-${dateKey}`} className="flex items-center justify-center my-3">
            <span className="text-[10px] font-semibold text-muted-foreground bg-bg-secondary border border-border/60 px-2.5 py-0.5 rounded-full shadow-2xs">
              {label}
            </span>
          </div>
        );
      }

      items.push(
        <MessageItem
          key={msg.id}
          message={msg}
          isCurrentUser={msg.senderId === currentUser?.id}
        />
      );
    });

    return items;
  };

  return (
    <div ref={containerRef} className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-bg-primary">
      {renderMessagesWithDates()}
      <div ref={bottomRef} />
    </div>
  );
};
