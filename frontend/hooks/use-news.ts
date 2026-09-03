import { useQuery } from "@tanstack/react-query";
import { newsService } from "../services/news.service";

export function useNews(page = 1, pageSize = 20, sentiment?: string) {
  const { data: newsData, isLoading: isLoadingNews } = useQuery({
    queryKey: ["news", page, pageSize, sentiment],
    queryFn: async () => {
      const response = await newsService.getNews(page, pageSize, sentiment);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    articles: newsData?.items || [],
    total: newsData?.total || 0,
    isLoadingNews,
  };
}

export function useCompanyNews(
  ticker: string | null,
  page = 1,
  pageSize = 20
) {
  const { data: newsData, isLoading: isLoadingCompanyNews } = useQuery({
    queryKey: ["news", "company", ticker, page, pageSize],
    queryFn: async () => {
      if (!ticker) return { items: [], total: 0 };
      const response = await newsService.getCompanyNews(ticker, page, pageSize);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!ticker,
    staleTime: 2 * 60 * 1000,
  });

  return {
    articles: newsData?.items || [],
    total: newsData?.total || 0,
    isLoadingCompanyNews,
  };
}