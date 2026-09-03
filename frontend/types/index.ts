// User
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  subscriptionTier: "free" | "pro" | "enterprise";
  createdAt: string;
}

// Chat
export interface Chat {
  id: string;
  userId: string;
  title: string;
  pinned: boolean;
  modelUsed: string;
  createdAt: string;
  updatedAt: string;
}

// Message
export interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Citation[];
  tokenCount: number;
  createdAt: string;
}

// Citation
export interface Citation {
  id: string;
  source: string;
  page?: number;
  text: string;
  relevance: number;
}

// Document
export interface Document {
  id: string;
  userId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: "processing" | "ready" | "error";
  chunkCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// Portfolio Asset
export interface PortfolioAsset {
  id: string;
  userId: string;
  ticker: string;
  name: string;
  quantity: number;
  avgCost: number;
  sector: string;
  currentPrice?: number;
  changePercent?: number;
}

// Transaction
export interface Transaction {
  id: string;
  userId: string;
  ticker: string;
  type: "buy" | "sell" | "dividend";
  quantity: number;
  price: number;
  total: number;
  notes?: string;
  createdAt: string;
}

// Watchlist Item
export interface WatchlistItem {
  id: string;
  userId: string;
  ticker: string;
  name: string;
  notes?: string;
  currentPrice?: number;
  changePercent?: number;
  createdAt: string;
}

// News Article
export interface NewsArticle {
  id: string;
  ticker?: string;
  title: string;
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  source: string;
  url: string;
  publishedAt: string;
}

// User Settings
export interface UserSettings {
  id: string;
  userId: string;
  theme: "light" | "dark" | "system";
  language: string;
  llmProvider: string;
  embeddingProvider: string;
  notifications: {
    email: boolean;
    push: boolean;
    priceAlerts: boolean;
    newsAlerts: boolean;
  };
}

// Company Overview
export interface CompanyOverview {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number;
  eps: number;
  dividendYield: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  description: string;
}

// Financial Data
export interface FinancialData {
  ticker: string;
  period: string;
  revenue: number;
  netIncome: number;
  eps: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roa: number;
  roe: number;
  debtToEquity: number;
}

// Earnings Data
export interface EarningsData {
  ticker: string;
  quarter: number;
  year: number;
  actual: number;
  estimate: number;
  surprise: number;
  surprisePercent: number;
  reportedAt: string;
}

// Portfolio Summary
export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPL: number;
  plPercent: number;
  sectorAllocation: {
    sector: string;
    value: number;
    percent: number;
  }[];
}

// API Response
export interface ApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
}

// Paginated Response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}