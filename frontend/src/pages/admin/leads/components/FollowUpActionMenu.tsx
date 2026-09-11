import React from "react";
import {
  MoreHorizontal,
  CheckCircle2,
  CalendarClock,
  XCircle,
  Phone,
  Bot,
  MessageCircle,
  StickyNote,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/usePermissions";
import type { LeadFollowUp } from "@/services/leads.api";

export type FollowUpMenuAction =
  | "complete"
  | "reschedule"
  | "cancel"
  | "call"
  | "log-call"
  | "ai-call"
  | "whatsapp"
  | "add-note"
  | "view-lead";

interface FollowUpActionMenuProps {
  followUp: LeadFollowUp;
  disabled?: boolean;
  isPending?: boolean;
  onAction: (action: FollowUpMenuAction) => void;
}

export const FollowUpActionMenu: React.FC<FollowUpActionMenuProps> = ({
  followUp,
  disabled = false,
  isPending = false,
  onAction,
}) => {
  const { canEditItem, isAdmin } = usePermissions();
  const canWrite = isAdmin || canEditItem("leads.followups");
  const isOpen = followUp.status === "PENDING";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled || isPending}
          onClick={(e) => e.stopPropagation()}
          aria-label="Follow-up actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        {isOpen && canWrite && (
          <>
            <DropdownMenuItem onClick={() => onAction("complete")} className="cursor-pointer gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Complete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("reschedule")} className="cursor-pointer gap-2">
              <CalendarClock className="h-4 w-4 text-amber-600" />
              Reschedule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("cancel")} className="cursor-pointer gap-2 text-red-600 focus:text-red-600">
              <XCircle className="h-4 w-4" />
              Cancel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {canWrite && (
          <DropdownMenuItem onClick={() => onAction("log-call")} className="cursor-pointer gap-2">
            <Phone className="h-4 w-4" />
            Log Manual Call
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onAction("call")} className="cursor-pointer gap-2">
          <Phone className="h-4 w-4" />
          Dial phone
        </DropdownMenuItem>
        {canWrite && (
          <DropdownMenuItem onClick={() => onAction("ai-call")} className="cursor-pointer gap-2">
            <Bot className="h-4 w-4" />
            AI Call
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onAction("whatsapp")} className="cursor-pointer gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          Open WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("add-note")} className="cursor-pointer gap-2">
          <StickyNote className="h-4 w-4" />
          Add Note
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction("view-lead")} className="cursor-pointer gap-2">
          <ExternalLink className="h-4 w-4" />
          Open Lead 360
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
