import { api } from "./api";
import { WatchlistItem } from "../types";

export interface AddWatchlistItemData {
  ticker: string;
  name: string;
  notes?: string;
}

export const watchlistService = {
  async getWatchlist() {
    return api.get<WatchlistItem[]>("/watchlist");
  },

  async addItem(data: AddWatchlistItemData) {
    return api.post<WatchlistItem>("/watchlist", data);
  },

  async removeItem(id: string) {
    return api.delete(`/watchlist/${id}`);
  },
};