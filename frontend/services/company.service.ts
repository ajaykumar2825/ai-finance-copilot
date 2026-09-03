import { api } from "./api";
import { CompanyOverview, FinancialData, EarningsData } from "../types";

export const companyService = {
  async searchCompanies(query: string) {
    return api.get<CompanyOverview[]>(`/companies/search?q=${encodeURIComponent(query)}`);
  },

  async getOverview(ticker: string) {
    return api.get<CompanyOverview>(`/companies/${ticker}/overview`);
  },

  async getFinancials(ticker: string, period = "annual") {
    return api.get<FinancialData[]>(`/companies/${ticker}/financials?period=${period}`);
  },

  async getEarnings(ticker: string) {
    return api.get<EarningsData[]>(`/companies/${ticker}/earnings`);
  },

  async getPeers(ticker: string) {
    return api.get<CompanyOverview[]>(`/companies/${ticker}/peers`);
  },
};