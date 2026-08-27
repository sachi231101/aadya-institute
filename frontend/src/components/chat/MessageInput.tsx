import React, { useState, useRef } from "react";
import { SendHorizontal, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  isSending: boolean;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isSending,
  disabled = false,
}) => {
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    if (trimmed.length > 2000) {
      setErrorMsg("Message exceeds 2000 characters limit");
      return;
    }

    setErrorMsg(null);
    try {
      await onSendMessage(trimmed);
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(apiErr?.response?.data?.message || apiErr?.message || "Message could not be sent.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (errorMsg) setErrorMsg(null);

    // Auto-resize textarea height between 36px and 120px
    const target = e.target;
    target.style.height = "auto";
    const nextHeight = Math.min(Math.max(target.scrollHeight, 38), 110);
    target.style.height = `${nextHeight}px`;
  };

  const isSendDisabled = !text.trim() || isSending || disabled;

  return (
    <div className="p-3 border-t border-border/80 bg-bg-secondary shrink-0">
      {errorMsg && (
        <div className="flex items-center gap-1.5 px-2 py-1 mb-2 rounded-lg bg-destructive/10 text-destructive text-[11px] font-medium animate-in fade-in-0 duration-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{errorMsg}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-end gap-2 bg-background border border-border/80 focus-within:border-[#1769AA] dark:focus-within:border-sky-500 rounded-xl p-1.5 transition-colors shadow-2xs"
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled || isSending}
          maxLength={2000}
          rows={1}
          className="flex-1 bg-transparent resize-none border-0 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none max-h-[110px] min-h-[34px] leading-relaxed"
          aria-label="Type a chat message"
        />

        <Button
          type="submit"
          size="icon"
          disabled={isSendDisabled}
          className="h-8 w-8 rounded-lg bg-[#1769AA] hover:bg-[#1769AA]/90 text-white shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          title="Send message"
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <SendHorizontal className="h-4 w-4 text-white" />
          )}
        </Button>
      </form>
      <div className="flex justify-between items-center px-1 pt-1 text-[10px] text-muted-foreground/80 select-none">
        <span>Press Enter to send, Shift + Enter for new line</span>
        {text.length > 1500 && (
          <span className={text.length > 2000 ? "text-destructive font-bold" : ""}>
            {text.length}/2000
          </span>
        )}
      </div>
    </div>
  );
};
