import { api } from "./api";
import { NewsArticle, PaginatedResponse } from "../types";

export const newsService = {
  async getNews(page = 1, pageSize = 20, sentiment?: string) {
    let endpoint = `/news?page=${page}&page_size=${pageSize}`;
    if (sentiment) {
      endpoint += `&sentiment=${sentiment}`;
    }
    return api.get<PaginatedResponse<NewsArticle>>(endpoint);
  },

  async getCompanyNews(ticker: string, page = 1, pageSize = 20) {
    return api.get<PaginatedResponse<NewsArticle>>(
      `/news/company/${ticker}?page=${page}&page_size=${pageSize}`
    );
  },
};