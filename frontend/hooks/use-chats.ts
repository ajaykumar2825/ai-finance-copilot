import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService, CreateChatData, UpdateChatData } from "../services/chat.service";
import { useChatStore } from "../stores/chat.store";

export function useChats(page = 1, pageSize = 20) {
  const queryClient = useQueryClient();

  const { data: chats, isLoading: isLoadingChats } = useQuery({
    queryKey: ["chats", page, pageSize],
    queryFn: async () => {
      const response = await chatService.listChats(page, pageSize);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });

  const createChatMutation = useMutation({
    mutationFn: (data: CreateChatData) => chatService.createChat(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const updateChatMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChatData }) =>
      chatService.updateChat(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteChat(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  return {
    chats: chats?.items || [],
    total: chats?.total || 0,
    isLoadingChats,
    createChat: createChatMutation.mutate,
    updateChat: updateChatMutation.mutate,
    deleteChat: deleteChatMutation.mutate,
    isCreatingChat: createChatMutation.isPending,
    isUpdatingChat: updateChatMutation.isPending,
    isDeletingChat: deleteChatMutation.isPending,
  };
}

export function useChat(chatId: string | null) {
  const { data: chat, isLoading: isLoadingChat } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      if (!chatId) return null;
      const response = await chatService.getChat(chatId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!chatId,
  });

  return {
    chat,
    isLoadingChat,
  };
}

export function useMessages(chatId: string | null, page = 1, pageSize = 50) {
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", chatId, page, pageSize],
    queryFn: async () => {
      if (!chatId) return { items: [], total: 0 };
      const response = await chatService.getMessages(chatId, page, pageSize);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!chatId,
  });

  return {
    messages: messages?.items || [],
    total: messages?.total || 0,
    isLoadingMessages,
  };
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { currentChatId, setStreaming, setStreamingMessage } = useChatStore();

  const sendMessage = (chatId: string, content: string) => {
    if (!currentChatId) return;

    setStreaming(true);
    setStreamingMessage("");

    const eventSource = chatService.sendMessage(chatId, { content });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "delta") {
          setStreamingMessage((prev) => prev + data.content);
        } else if (data.type === "done") {
          setStreaming(false);
          setStreamingMessage("");
          eventSource.close();
          queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
          queryClient.invalidateQueries({ queryKey: ["chats"] });
        } else if (data.type === "error") {
          setStreaming(false);
          setStreamingMessage("");
          eventSource.close();
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = () => {
      setStreaming(false);
      setStreamingMessage("");
      eventSource.close();
    };

    return eventSource;
  };

  return { sendMessage };
}