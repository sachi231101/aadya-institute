import type { WebSocket } from "ws";

export type ChatEventType = "message:new" | "message:read" | "authenticated" | "error";

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  instituteId?: string;
  branchId?: string | null;
  roles?: string[];
  isAlive?: boolean;
}

export interface WsMessagePayload {
  event: ChatEventType;
  data: any;
  conversationId?: string;
}
