import { api } from "./api";
import { Document, PaginatedResponse } from "../types";

export interface AskDocumentData {
  question: string;
}

export interface AskDocumentResponse {
  answer: string;
  citations: {
    id: string;
    source: string;
    page?: number;
    text: string;
    relevance: number;
  }[];
}

export const documentService = {
  async listDocuments(page = 1, pageSize = 20) {
    return api.get<PaginatedResponse<Document>>(
      `/documents?page=${page}&page_size=${pageSize}`
    );
  },

  async uploadDocument(file: File) {
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null as Document | null,
        error: data.detail || "Upload failed",
        status: response.status,
      };
    }

    return {
      data,
      error: null,
      status: response.status,
    };
  },

  async getDocument(id: string) {
    return api.get<Document>(`/documents/${id}`);
  },

  async deleteDocument(id: string) {
    return api.delete(`/documents/${id}`);
  },

  async askDocument(documentId: string, data: AskDocumentData) {
    return api.post<AskDocumentResponse>(`/documents/${documentId}/ask`, data);
  },
};