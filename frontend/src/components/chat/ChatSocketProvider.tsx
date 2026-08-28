import { useChatSocket } from "../../hooks/useChatSocket";
import { useGetConversations } from "../../hooks/useChat";

/**
 * Keeps the team chat WebSocket connected for all authenticated staff,
 * so messages arrive in real time even when the drawer is closed.
 */
export const ChatSocketProvider = () => {
  useChatSocket();
  useGetConversations();
  return null;
};
