import { api } from "./api";
import { PortfolioAsset, Transaction, PortfolioSummary } from "../types";

export interface AddAssetData {
  ticker: string;
  name: string;
  quantity: number;
  avgCost: number;
  sector: string;
}

export interface UpdateAssetData {
  quantity?: number;
  avgCost?: number;
}

export interface AddTransactionData {
  ticker: string;
  type: "buy" | "sell" | "dividend";
  quantity: number;
  price: number;
  notes?: string;
}

export const portfolioService = {
  async getAssets() {
    return api.get<PortfolioAsset[]>("/portfolio/assets");
  },

  async addAsset(data: AddAssetData) {
    return api.post<PortfolioAsset>("/portfolio/assets", data);
  },

  async updateAsset(id: string, data: UpdateAssetData) {
    return api.put<PortfolioAsset>(`/portfolio/assets/${id}`, data);
  },

  async deleteAsset(id: string) {
    return api.delete(`/portfolio/assets/${id}`);
  },

  async getTransactions(page = 1, pageSize = 50) {
    return api.get<{ items: Transaction[]; total: number; page: number; pageSize: number }>(
      `/portfolio/transactions?page=${page}&page_size=${pageSize}`
    );
  },

  async addTransaction(data: AddTransactionData) {
    return api.post<Transaction>("/portfolio/transactions", data);
  },

  async getSummary() {
    return api.get<PortfolioSummary>("/portfolio/summary");
  },
};