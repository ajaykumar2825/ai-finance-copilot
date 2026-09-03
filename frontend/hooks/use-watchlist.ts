import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  watchlistService,
  AddWatchlistItemData,
} from "../services/watchlist.service";

export function useWatchlist() {
  const queryClient = useQueryClient();

  const { data: watchlist, isLoading: isLoadingWatchlist } = useQuery({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const response = await watchlistService.getWatchlist();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: AddWatchlistItemData) => watchlistService.addItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (id: string) => watchlistService.removeItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  return {
    watchlist: watchlist || [],
    isLoadingWatchlist,
    addItem: addItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
    isAddingItem: addItemMutation.isPending,
    isRemovingItem: removeItemMutation.isPending,
  };
}