"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper,
  Search,
  Filter,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Loader2,
  Clock,
  Tag,
  Brain,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNews } from "@/hooks/use-news";
import { formatDate, formatRelativeDate, cn } from "@/lib/utils";
import type { NewsArticle } from "@/types";

const SENTIMENT_OPTIONS = [
  { value: "all", label: "All Sentiment" },
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
  { value: "neutral", label: "Neutral" },
];

const SENTIMENT_CONFIG = {
  positive: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: TrendingUp,
    label: "Positive",
    variant: "success" as const,
  },
  negative: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: TrendingDown,
    label: "Negative",
    variant: "danger" as const,
  },
  neutral: {
    color: "text-muted-foreground",
    bg: "bg-white/[0.05]",
    border: "border-white/[0.08]",
    icon: Minus,
    label: "Neutral",
    variant: "neutral" as const,
  },
};

function NewsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-3/4 mb-3" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3 mb-3" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted/30 p-4 mb-4">
        <Newspaper className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        No news articles found
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Try adjusting your filters or search query to find relevant news.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Error</h3>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}

export default function NewsPage() {
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const {
    articles,
    total,
    isLoadingNews,
  } = useNews(page, pageSize, sentimentFilter === "all" ? undefined : sentimentFilter);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const filteredArticles = useMemo(() => {
    if (!searchQuery) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        (a.ticker && a.ticker.toLowerCase().includes(q))
    );
  }, [articles, searchQuery]);

  const hasMore = articles.length < total;

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingNews) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingNews]);

  const positiveCount = useMemo(
    () => articles.filter((a) => a.sentiment === "positive").length,
    [articles]
  );
  const negativeCount = useMemo(
    () => articles.filter((a) => a.sentiment === "negative").length,
    [articles]
  );
  const neutralCount = useMemo(
    () => articles.filter((a) => a.sentiment === "neutral").length,
    [articles]
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground">News Feed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stay updated with the latest financial news and market sentiment
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="border-emerald-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-sm font-medium">
                AI Market Sentiment
              </CardTitle>
            </div>
            <CardDescription>
              Overall market sentiment based on recent news
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-400">
                  {positiveCount}
                </p>
                <p className="text-xs text-muted-foreground">Positive</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <Minus className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">
                  {neutralCount}
                </p>
                <p className="text-xs text-muted-foreground">Neutral</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-400">
                  {negativeCount}
                </p>
                <p className="text-xs text-muted-foreground">Negative</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            {SENTIMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {isLoadingNews && page === 1 ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article, index) => {
            const sentiment =
              SENTIMENT_CONFIG[article.sentiment] || SENTIMENT_CONFIG.neutral;
            const SentimentIcon = sentiment.icon;

            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
              >
                <Card className="group">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={sentiment.variant} className="text-xs gap-1">
                        <SentimentIcon className="h-3 w-3" />
                        {sentiment.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeDate(article.publishedAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {article.source}
                      </span>
                    </div>

                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group/title"
                    >
                      <h3 className="text-base font-semibold text-foreground group-hover/title:text-emerald-400 transition-colors flex items-start gap-2">
                        <span>{article.title}</span>
                        <ExternalLink className="h-4 w-4 mt-0.5 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0 text-muted-foreground" />
                      </h3>
                    </a>

                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {article.summary}
                    </p>

                    {article.ticker && (
                      <div className="flex items-center gap-1.5 mt-3">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        <Link
                          href={`/companies/${article.ticker}`}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          {article.ticker}
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!hasMore && articles.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              You&apos;ve reached the end of the news feed
            </p>
          )}
        </div>
      )}
    </div>
  );
}
