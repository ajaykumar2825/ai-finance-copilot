import { api } from "./api";
import { Chat, Message, PaginatedResponse } from "../types";

export interface CreateChatData {
  title: string;
  modelUsed: string;
}

export interface UpdateChatData {
  title?: string;
  pinned?: boolean;
}

export interface SendMessageData {
  content: string;
}

export const chatService = {
  async listChats(page = 1, pageSize = 20) {
    return api.get<PaginatedResponse<Chat>>(
      `/chats?page=${page}&page_size=${pageSize}`
    );
  },

  async createChat(data: CreateChatData) {
    return api.post<Chat>("/chats", data);
  },

  async getChat(id: string) {
    return api.get<Chat>(`/chats/${id}`);
  },

  async updateChat(id: string, data: UpdateChatData) {
    return api.put<Chat>(`/chats/${id}`, data);
  },

  async deleteChat(id: string) {
    return api.delete(`/chats/${id}`);
  },

  async getMessages(chatId: string, page = 1, pageSize = 50) {
    return api.get<PaginatedResponse<Message>>(
      `/chats/${chatId}/messages?page=${page}&page_size=${pageSize}`
    );
  },

  sendMessage(chatId: string, data: SendMessageData) {
    return api.stream(`/chats/${chatId}/messages`, data);
  },
};