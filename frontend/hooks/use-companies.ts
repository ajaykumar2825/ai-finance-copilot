import { useQuery } from "@tanstack/react-query";
import { companyService } from "../services/company.service";

export function useCompanySearch(query: string) {
  const { data: results, isLoading: isSearching } = useQuery({
    queryKey: ["companies", "search", query],
    queryFn: async () => {
      const response = await companyService.searchCompanies(query);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: query.length >= 1,
    staleTime: 30 * 1000,
  });

  return {
    results: results || [],
    isSearching,
  };
}

export function useCompanyOverview(ticker: string | null) {
  const { data: overview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ["company", "overview", ticker],
    queryFn: async () => {
      if (!ticker) return null;
      const response = await companyService.getOverview(ticker);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });

  return {
    overview,
    isLoadingOverview,
  };
}

export function useCompanyFinancials(
  ticker: string | null,
  period = "annual"
) {
  const { data: financials, isLoading: isLoadingFinancials } = useQuery({
    queryKey: ["company", "financials", ticker, period],
    queryFn: async () => {
      if (!ticker) return [];
      const response = await companyService.getFinancials(ticker, period);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });

  return {
    financials: financials || [],
    isLoadingFinancials,
  };
}

export function useCompanyEarnings(ticker: string | null) {
  const { data: earnings, isLoading: isLoadingEarnings } = useQuery({
    queryKey: ["company", "earnings", ticker],
    queryFn: async () => {
      if (!ticker) return [];
      const response = await companyService.getEarnings(ticker);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });

  return {
    earnings: earnings || [],
    isLoadingEarnings,
  };
}

export function useCompanyPeers(ticker: string | null) {
  const { data: peers, isLoading: isLoadingPeers } = useQuery({
    queryKey: ["company", "peers", ticker],
    queryFn: async () => {
      if (!ticker) return [];
      const response = await companyService.getPeers(ticker);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });

  return {
    peers: peers || [],
    isLoadingPeers,
  };
}