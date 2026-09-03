import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  portfolioService,
  AddAssetData,
  UpdateAssetData,
  AddTransactionData,
} from "../services/portfolio.service";

export function usePortfolio() {
  const queryClient = useQueryClient();

  const { data: assets, isLoading: isLoadingAssets } = useQuery({
    queryKey: ["portfolio", "assets"],
    queryFn: async () => {
      const response = await portfolioService.getAssets();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["portfolio", "summary"],
    queryFn: async () => {
      const response = await portfolioService.getSummary();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });

  const addAssetMutation = useMutation({
    mutationFn: (data: AddAssetData) => portfolioService.addAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetData }) =>
      portfolioService.updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => portfolioService.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  return {
    assets: assets || [],
    summary,
    isLoadingAssets,
    isLoadingSummary,
    addAsset: addAssetMutation.mutate,
    updateAsset: updateAssetMutation.mutate,
    deleteAsset: deleteAssetMutation.mutate,
    isAddingAsset: addAssetMutation.isPending,
    isUpdatingAsset: updateAssetMutation.isPending,
    isDeletingAsset: deleteAssetMutation.isPending,
  };
}

export function useTransactions(page = 1, pageSize = 50) {
  const queryClient = useQueryClient();

  const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["portfolio", "transactions", page, pageSize],
    queryFn: async () => {
      const response = await portfolioService.getTransactions(page, pageSize);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: (data: AddTransactionData) =>
      portfolioService.addTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  return {
    transactions: transactionsData?.items || [],
    total: transactionsData?.total || 0,
    isLoadingTransactions,
    addTransaction: addTransactionMutation.mutate,
    isAddingTransaction: addTransactionMutation.isPending,
  };
}