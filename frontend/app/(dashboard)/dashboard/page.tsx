"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Eye,
  MessageSquare,
  Upload,
  Plus,
  RefreshCw,
  Newspaper,
  Zap,
  BarChart3,
  Activity,
  DollarSign,
  PieChart,
  ChevronRight,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolio, useTransactions } from "@/hooks/use-portfolio";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useNews } from "@/hooks/use-news";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatPercentChange, formatRelativeDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";
import Link from "next/link";

const cardAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

const PERFORMANCE_DATA = [
  { date: "Jan", value: 42000 },
  { date: "Feb", value: 44500 },
  { date: "Mar", value: 43200 },
  { date: "Apr", value: 48000 },
  { date: "May", value: 51000 },
  { date: "Jun", value: 49500 },
  { date: "Jul", value: 53200 },
  { date: "Aug", value: 56800 },
  { date: "Sep", value: 55400 },
  { date: "Oct", value: 59000 },
  { date: "Nov", value: 62500 },
  { date: "Dec", value: 65200 },
];

const MARKET_INDICES = [
  { symbol: "S&P 500", value: "5,432.10", change: "+1.24%", up: true },
  { symbol: "NASDAQ", value: "17,891.05", change: "+1.56%", up: true },
  { symbol: "DOW", value: "39,872.30", change: "+0.87%", up: true },
  { symbol: "Russell 2000", value: "2,145.67", change: "-0.32%", up: false },
  { symbol: "VIX", value: "13.45", change: "-4.21%", up: false },
];

const TOP_MOVERS = {
  gainers: [
    { ticker: "NVDA", name: "NVIDIA Corp", change: "+8.45%", price: "$892.50" },
    { ticker: "SMCI", name: "Super Micro", change: "+6.23%", price: "$784.12" },
    { ticker: "ARM", name: "ARM Holdings", change: "+5.12%", price: "$162.80" },
  ],
  losers: [
    { ticker: "INTC", name: "Intel Corp", change: "-4.56%", price: "$43.20" },
    { ticker: "TSLA", name: "Tesla Inc", change: "-3.21%", price: "$178.90" },
    { ticker: "PYPL", name: "PayPal", change: "-2.87%", price: "$62.15" },
  ],
};

const SECTOR_ALLOCATION = [
  { name: "Technology", value: 42 },
  { name: "Healthcare", value: 18 },
  { name: "Financial", value: 15 },
  { name: "Consumer", value: 12 },
  { name: "Energy", value: 8 },
  { name: "Other", value: 5 },
];

const RECENT_TRANSACTIONS = [
  {
    id: "1",
    type: "buy" as const,
    ticker: "AAPL",
    quantity: 10,
    price: 182.5,
    total: 1825,
    date: "2 hours ago",
  },
  {
    id: "2",
    type: "sell" as const,
    ticker: "TSLA",
    quantity: 5,
    price: 178.9,
    total: 894.5,
    date: "5 hours ago",
  },
  {
    id: "3",
    type: "buy" as const,
    ticker: "MSFT",
    quantity: 8,
    price: 415.2,
    total: 3321.6,
    date: "1 day ago",
  },
  {
    id: "4",
    type: "dividend" as const,
    ticker: "JNJ",
    quantity: 1,
    price: 125,
    total: 125,
    date: "2 days ago",
  },
];

function PortfolioSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-28" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-16 w-32" />
        <Skeleton className="h-16 w-32" />
      </div>
    </div>
  );
}

function WidgetSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-navy-950/95 px-3 py-2 text-xs shadow-glass backdrop-blur-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-emerald-400">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { summary, isLoadingSummary, assets, isLoadingAssets } = usePortfolio();
  const { transactions, isLoadingTransactions } = useTransactions(1, 4);
  const { watchlist, isLoadingWatchlist } = useWatchlist();
  const { articles, isLoadingNews } = useNews(1, 5);

  const displayName = user?.fullName?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your portfolio today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/chat">
            <Button size="sm" className="bg-emerald-500 text-background hover:bg-emerald-400">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              AI Chat
            </Button>
          </Link>
          <Link href="/documents">
            <Button variant="outline" size="sm" className="border-white/[0.08]">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload
            </Button>
          </Link>
          <Link href="/watchlist">
            <Button variant="outline" size="sm" className="border-white/[0.08]">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Watchlist
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-4">
        <motion.div {...cardAnimation} transition={{ ...cardAnimation.transition, delay: 0 }}>
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/[0.07] blur-2xl" />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                Total Portfolio Value
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <PortfolioSkeleton />
              ) : (
                <>
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {formatCurrency(summary?.totalValue || 65200)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {(summary?.plPercent || 12.4) >= 0 ? (
                      <Badge variant="success" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatPercentChange(summary?.plPercent || 12.4)}
                      </Badge>
                    ) : (
                      <Badge variant="danger" className="gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {formatPercentChange(summary?.plPercent || -3.2)}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">all time</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <p className="text-xs text-muted-foreground">P/L</p>
                      <p className="text-sm font-semibold text-emerald-400">
                        {formatCurrency(summary?.totalPL || 7200)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(summary?.totalCost || 58000)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...cardAnimation} transition={{ ...cardAnimation.transition, delay: 0.05 }}>
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold-500/[0.07] blur-2xl" />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-gold-400" />
                Top Gainers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TOP_MOVERS.gainers.map((stock) => (
                  <div key={stock.ticker} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-400">
                        {stock.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{stock.ticker}</p>
                        <p className="text-xs text-muted-foreground">{stock.price}</p>
                      </div>
                    </div>
                    <Badge variant="success" className="gap-0.5 text-xs">
                      <ArrowUpRight className="h-3 w-3" />
                      {stock.change}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...cardAnimation} transition={{ ...cardAnimation.transition, delay: 0.1 }}>
          <Card variant="elevated" className="relative overflow-hidden">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500/[0.07] blur-2xl" />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-red-400" />
                Top Losers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TOP_MOVERS.losers.map((stock) => (
                  <div key={stock.ticker} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-xs font-bold text-red-400">
                        {stock.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{stock.ticker}</p>
                        <p className="text-xs text-muted-foreground">{stock.price}</p>
                      </div>
                    </div>
                    <Badge variant="danger" className="gap-0.5 text-xs">
                      <ArrowDownRight className="h-3 w-3" />
                      {stock.change}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...cardAnimation} transition={{ ...cardAnimation.transition, delay: 0.15 }}>
          <Card variant="gradient" className="relative overflow-hidden border-emerald-500/20">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/[0.1] blur-2xl" />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                AI Insight
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your tech allocation is overweight by 12% relative to your target.
                Consider rebalancing by trimming NVDA position and adding to
                underweight healthcare sector.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400">
                <Sparkles className="h-3 w-3" />
                <span>Generated 5 min ago</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          {...cardAnimation}
          transition={{ ...cardAnimation.transition, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Portfolio Performance</CardTitle>
                  <CardDescription>Portfolio value over the last 12 months</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={PERFORMANCE_DATA}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.04)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          {...cardAnimation}
          transition={{ ...cardAnimation.transition, delay: 0.25 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Sector Allocation</CardTitle>
                  <CardDescription>Current distribution</CardDescription>
                </div>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <div className="h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={SECTOR_ALLOCATION}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {SECTOR_ALLOCATION.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {SECTOR_ALLOCATION.map((sector, i) => (
                  <div key={sector.name} className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {sector.name} {sector.value}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          {...cardAnimation}
          transition={{ ...cardAnimation.transition, delay: 0.3 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Transactions</CardTitle>
                  <CardDescription>Your latest activity</CardDescription>
                </div>
                <Link href="/portfolio">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-400">
                    View all
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <WidgetSkeleton lines={4} />
              ) : (
                <div className="space-y-3">
                  {RECENT_TRANSACTIONS.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                            tx.type === "buy"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : tx.type === "sell"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-gold-500/10 text-gold-400"
                          }`}
                        >
                          {tx.type === "buy" ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : tx.type === "sell" ? (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          ) : (
                            <DollarSign className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {tx.type === "buy" ? "Bought" : tx.type === "sell" ? "Sold" : "Dividend"} {tx.ticker}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.quantity} {tx.type === "dividend" ? "" : "shares"} @ {formatCurrency(tx.price)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(tx.total)}
                        </p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          {...cardAnimation}
          transition={{ ...cardAnimation.transition, delay: 0.35 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Watchlist</CardTitle>
                  <CardDescription>Tracked securities</CardDescription>
                </div>
                <Link href="/watchlist">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-400">
                    View all
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingWatchlist ? (
                <WidgetSkeleton lines={5} />
              ) : watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Eye className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No watchlist items yet</p>
                  <Link href="/watchlist">
                    <Button variant="ghost" size="sm" className="mt-2 text-emerald-400">
                      <Plus className="mr-1 h-3 w-3" />
                      Add items
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {watchlist.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-bold text-foreground">
                          {item.ticker.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.ticker}</p>
                          <p className="text-xs text-muted-foreground">{item.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {item.currentPrice ? formatCurrency(item.currentPrice) : "—"}
                        </p>
                        {item.changePercent != null && (
                          <p
                            className={`text-xs font-medium ${
                              item.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {formatPercentChange(item.changePercent)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          {...cardAnimation}
          transition={{ ...cardAnimation.transition, delay: 0.4 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">News Feed</CardTitle>
                  <CardDescription>Latest market news</CardDescription>
                </div>
                <Link href="/news">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-400">
                    View all
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingNews ? (
                <WidgetSkeleton lines={5} />
              ) : (
                <div className="space-y-3">
                  {articles.slice(0, 5).map((article) => (
                    <div key={article.id} className="group">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-emerald-400 transition-colors">
                              {article.title}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge
                                variant={
                                  article.sentiment === "positive"
                                    ? "positive"
                                    : article.sentiment === "negative"
                                      ? "negative"
                                      : "neutral"
                                }
                                className="text-[10px]"
                              >
                                {article.sentiment}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {article.source}
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground" />
                        </div>
                      </a>
                    </div>
                  ))}
                  {articles.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Newspaper className="mb-2 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No news available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        {...cardAnimation}
        transition={{ ...cardAnimation.transition, delay: 0.45 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Market Overview</CardTitle>
                <CardDescription>Major indices and market indicators</CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
                Live
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {MARKET_INDICES.map((index) => (
                <div
                  key={index.symbol}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {index.symbol}
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {index.value}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    {index.up ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        index.up ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {index.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
