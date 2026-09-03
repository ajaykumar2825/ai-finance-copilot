import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  documentService,
  AskDocumentData,
} from "../services/document.service";

export function useDocuments(page = 1, pageSize = 20) {
  const queryClient = useQueryClient();

  const { data: documents, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["documents", page, pageSize],
    queryFn: async () => {
      const response = await documentService.listDocuments(page, pageSize);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentService.uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const askMutation = useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string;
      data: AskDocumentData;
    }) => documentService.askDocument(documentId, data),
  });

  return {
    documents: documents?.items || [],
    total: documents?.total || 0,
    isLoadingDocuments,
    uploadDocument: uploadMutation.mutate,
    deleteDocument: deleteMutation.mutate,
    askDocument: askMutation.mutate,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAsking: askMutation.isPending,
    askResult: askMutation.data?.data,
    askError: askMutation.error,
  };
}