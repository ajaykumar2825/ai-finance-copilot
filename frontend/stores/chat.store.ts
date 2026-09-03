import { create } from "zustand";

interface ChatState {
  currentChatId: string | null;
  streamingMessage: string;
  isStreaming: boolean;
  setCurrentChatId: (chatId: string | null) => void;
  setStreaming: (isStreaming: boolean) => void;
  setStreamingMessage: (
    message: string | ((prev: string) => string)
  ) => void;
  clearStreaming: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  currentChatId: null,
  streamingMessage: "",
  isStreaming: false,
  setCurrentChatId: (currentChatId) => set({ currentChatId }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingMessage: (message) =>
    set((state) => ({
      streamingMessage:
        typeof message === "function"
          ? message(state.streamingMessage)
          : message,
    })),
  clearStreaming: () =>
    set({
      streamingMessage: "",
      isStreaming: false,
    }),
}));