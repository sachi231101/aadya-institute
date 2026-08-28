import { create } from "zustand";

interface ChatState {
  isOpen: boolean;
  activeConversationId: string | null;
  isSocketConnected: boolean;
  openChat: (conversationId?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setActiveConversationId: (id: string | null) => void;
  setSocketConnected: (connected: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  activeConversationId: null,
  isSocketConnected: false,
  openChat: (conversationId) =>
    set({
      isOpen: true,
      ...(conversationId !== undefined ? { activeConversationId: conversationId } : {}),
    }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setSocketConnected: (connected) => set({ isSocketConnected: connected }),
}));
