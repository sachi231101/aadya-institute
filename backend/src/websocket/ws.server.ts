import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import { URL } from "url";
import { verifyAccessToken } from "../utils/jwt";
import { logger } from "../config/logger";
import { prisma } from "../config/database";
import type { AuthenticatedWebSocket, ChatEventType, WsMessagePayload } from "./ws.types";

let wss: WebSocketServer | null = null;
const userSocketsMap = new Map<string, Set<AuthenticatedWebSocket>>();

/**
 * Initializes WebSocket Server on top of the given HTTP server instance
 */
export const initWebSocketServer = (server: HttpServer): WebSocketServer => {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    try {
      const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;

      if (pathname === "/ws/chat" || pathname === "/ws") {
        wss?.handleUpgrade(request, socket, head, (ws) => {
          wss?.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (err) {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: AuthenticatedWebSocket, req) => {
    ws.isAlive = true;

    // Try authenticating from URL query string ?token=xxx
    try {
      const parsedUrl = new URL(req.url || "", `http://${req.headers.host}`);
      const token = parsedUrl.searchParams.get("token");

      if (token) {
        authenticateSocket(ws, token);
      }
    } catch (e) {
      // Handshake without query param token; wait for auth message
    }

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === "auth" && typeof message.token === "string") {
          authenticateSocket(ws, message.token);
        } else if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (err) {
        // Ignore malformed client payload
      }
    });

    ws.on("close", () => {
      if (ws.userId) {
        const set = userSocketsMap.get(ws.userId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) {
            userSocketsMap.delete(ws.userId);
          }
        }
      }
    });

    ws.on("error", (err) => {
      logger.warn({ err: err.message }, "[WebSocket] Socket error");
    });
  });

  // Heartbeat interval to detect and clean up dead sockets
  const interval = setInterval(() => {
    wss?.clients.forEach((client) => {
      const authWs = client as AuthenticatedWebSocket;
      if (authWs.isAlive === false) {
        authWs.terminate();
        return;
      }
      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  logger.info("✅ Chat WebSocket server initialized on path /ws/chat");
  return wss;
};

/**
 * Authenticates a WebSocket connection using JWT access token
 */
const authenticateSocket = (ws: AuthenticatedWebSocket, token: string): void => {
  try {
    const decoded = verifyAccessToken(token) as any;
    if (!decoded || !decoded.userId) {
      ws.send(JSON.stringify({ event: "error", message: "Invalid authentication token" }));
      ws.close(4001, "Authentication failed");
      return;
    }

    const roles: string[] = decoded.roles || [];
    // Reject students from chat WebSocket
    if (roles.includes("STUDENT") && !roles.some((r) => ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STAFF"].includes(r))) {
      ws.send(JSON.stringify({ event: "error", message: "Students are not authorized to access internal chat" }));
      ws.close(4003, "Forbidden");
      return;
    }

    ws.userId = decoded.userId;
    ws.instituteId = decoded.instituteId;
    ws.branchId = decoded.branchId || null;
    ws.roles = roles;

    if (!userSocketsMap.has(ws.userId!)) {
      userSocketsMap.set(ws.userId!, new Set());
    }
    userSocketsMap.get(ws.userId!)!.add(ws);

    ws.send(
      JSON.stringify({
        event: "authenticated",
        data: { userId: ws.userId, instituteId: ws.instituteId },
      })
    );
  } catch (err: any) {
    ws.send(JSON.stringify({ event: "error", message: "Authentication failed" }));
    ws.close(4001, "Authentication failed");
  }
};

/**
 * Broadcasts a real-time event to all active conversation members
 * Non-blocking; fails gracefully if delivery to a socket fails.
 */
export const broadcastToConversation = async (
  conversationId: string,
  event: ChatEventType,
  data: any,
  excludeUserId?: string
): Promise<void> => {
  try {
    const members = await prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    const payload: WsMessagePayload = {
      event,
      data,
      conversationId,
    };
    const payloadStr = JSON.stringify(payload);

    for (const member of members) {
      if (excludeUserId && member.userId === excludeUserId) continue;

      const userSockets = userSocketsMap.get(member.userId);
      if (userSockets) {
        for (const ws of userSockets) {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(payloadStr);
            } catch (err) {
              logger.warn({ err }, "[WebSocket] Failed to deliver message to user socket");
            }
          }
        }
      }
    }
  } catch (err: any) {
    logger.error({ err: err?.message || err, conversationId, event }, "[WebSocket] Error broadcasting to conversation");
  }
};

/**
 * Utility for testing: check if a user is currently connected to WebSocket
 */
export const isUserConnected = (userId: string): boolean => {
  const set = userSocketsMap.get(userId);
  return !!set && set.size > 0;
};
