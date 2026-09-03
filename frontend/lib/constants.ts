import {
  LayoutDashboard,
  MessageSquare,
  Briefcase,
  FileText,
  Newspaper,
  Building2,
  Eye,
  CreditCard,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "AI Chat",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    icon: Briefcase,
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
  },
  {
    label: "News",
    href: "/news",
    icon: Newspaper,
  },
  {
    label: "Companies",
    href: "/companies",
    icon: Building2,
  },
  {
    label: "Watchlist",
    href: "/watchlist",
    icon: Eye,
  },
];

export const NAV_BOTTOM_ITEMS: NavItem[] = [
  {
    label: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
  },
];

export const CHART_COLORS = [
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#e11d48",
  "#6366f1",
  "#14b8a6",
  "#eab308",
] as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/json",
] as const;

export const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".csv",
  ".xls",
  ".xlsx",
  ".txt",
  ".json",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const APP_NAME = "AI Finance Copilot";
export const APP_DESCRIPTION =
  "AI-powered financial analysis, portfolio management, and market intelligence platform.";

export const QUERY_KEYS = {
  user: ["user"] as const,
  portfolio: ["portfolio"] as const,
  portfolioSummary: ["portfolio", "summary"] as const,
  holdings: ["holdings"] as const,
  transactions: ["transactions"] as const,
  watchlist: ["watchlist"] as const,
  documents: ["documents"] as const,
  news: ["news"] as const,
  companies: ["companies"] as const,
  chat: ["chat"] as const,
  chatMessages: (conversationId: string) =>
    ["chat", "messages", conversationId] as const,
  analytics: ["analytics"] as const,
} as const;
