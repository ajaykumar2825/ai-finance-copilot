"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Search,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Loader2,
  SortAsc,
  Sparkles,
  Eye,
  BarChart3,
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useCompanySearch } from "@/hooks/use-companies";
import { useDebounce } from "@/hooks/use-debounce";
import {
  formatCurrency,
  formatPercentChange,
  formatDate,
  cn,
} from "@/lib/utils";

type SortOption = "name" | "price" | "change" | "date";

function WatchlistCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Skeleton className="h-5 w-16 mb-1" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-20 mb-4" />
        <div className="h-12 rounded-lg bg-white/[0.02]" />
      </CardContent>
    </Card>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-gold-500/10 p-4 mb-4">
        <Star className="h-8 w-8 text-gold-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Your watchlist is empty
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        Start tracking stocks by adding your first watchlist item.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Your First Stock
      </Button>
    </div>
  );
}

function SparkLine({ isPositive }: { isPositive: boolean }) {
  const points = useMemo(() => {
    const pts: string[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * 100;
      const baseY = 60 - (i / steps) * 20;
      const noise = Math.sin(i * 0.8) * 15 + Math.cos(i * 1.2) * 10;
      const y = isPositive ? baseY - noise * 0.5 : baseY + noise * 0.5;
      pts.push(`${x},${Math.max(5, Math.min(55, y))}`);
    }
    return pts.join(" ");
  }, [isPositive]);

  const color = isPositive ? "#10b981" : "#ef4444";

  return (
    <svg viewBox="0 0 100 60" className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient
          id={`sparkGrad-${isPositive ? "pos" : "neg"}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={`0,60 ${points} 100,60`}
        fill={`url(#sparkGrad-${isPositive ? "pos" : "neg"})`}
      />
    </svg>
  );
}

export default function WatchlistPage() {
  const {
    watchlist,
    isLoadingWatchlist,
    addItem,
    removeItem,
    isAddingItem,
    isRemovingItem,
  } = useWatchlist();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounce(searchValue, 300);
  const { results: searchResults, isSearching } =
    useCompanySearch(debouncedSearch);
  const [selectedCompany, setSelectedCompany] = useState<{
    ticker: string;
    name: string;
  } | null>(null);
  const [notes, setNotes] = useState("");

  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [viewMode, setViewMode] = useState<"grid" | "compare">("grid");

  const sortedWatchlist = useMemo(() => {
    const sorted = [...watchlist];
    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price":
        sorted.sort(
          (a, b) => (b.currentPrice ?? 0) - (a.currentPrice ?? 0)
        );
        break;
      case "change":
        sorted.sort(
          (a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)
        );
        break;
      case "date":
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
    return sorted;
  }, [watchlist, sortBy]);

  const handleAdd = () => {
    if (!selectedCompany) return;
    addItem(
      {
        ticker: selectedCompany.ticker,
        name: selectedCompany.name,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          setSelectedCompany(null);
          setSearchValue("");
          setNotes("");
        },
      }
    );
  };

  const handleRemove = (id: string) => {
    removeItem(id);
  };

  if (isLoadingWatchlist) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <WatchlistCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and monitor your favorite stocks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-40">
              <SortAsc className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date Added</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="change">Change</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={viewMode === "compare" ? "default" : "outline"}
            size="icon"
            onClick={() =>
              setViewMode(viewMode === "grid" ? "compare" : "grid")
            }
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Stock
          </Button>
        </div>
      </motion.div>

      {watchlist.length === 0 ? (
        <EmptyState onAdd={() => setAddDialogOpen(true)} />
      ) : viewMode === "compare" ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {sortedWatchlist.map((item, index) => {
            const isPositive = (item.changePercent ?? 0) >= 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
              >
                <Card className="group relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <Link
                          href={`/companies/${item.ticker}`}
                          className="text-lg font-bold text-foreground hover:text-emerald-400 transition-colors"
                        >
                          {item.ticker}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {item.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemove(item.id)}
                        disabled={isRemovingItem}
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>

                    <div className="mb-4">
                      <p className="text-3xl font-bold text-foreground">
                        {item.currentPrice
                          ? formatCurrency(item.currentPrice)
                          : "—"}
                      </p>
                      {item.changePercent !== undefined && (
                        <div
                          className={cn(
                            "flex items-center gap-1 mt-1",
                            isPositive ? "text-emerald-400" : "text-red-400"
                          )}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            {formatPercentChange(item.changePercent)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-2">
                      <SparkLine isPositive={isPositive} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {sortedWatchlist.map((item, index) => {
            const isPositive = (item.changePercent ?? 0) >= 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
              >
                <Card className="group relative overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <Link
                          href={`/companies/${item.ticker}`}
                          className="text-base font-bold text-foreground hover:text-emerald-400 transition-colors"
                        >
                          {item.ticker}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {item.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemove(item.id)}
                        disabled={isRemovingItem}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>

                    <div className="mb-3">
                      <p className="text-xl font-bold text-foreground">
                        {item.currentPrice
                          ? formatCurrency(item.currentPrice)
                          : "—"}
                      </p>
                      {item.changePercent !== undefined && (
                        <div
                          className={cn(
                            "flex items-center gap-1 mt-0.5",
                            isPositive ? "text-emerald-400" : "text-red-400"
                          )}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          <span className="text-sm font-medium">
                            {formatPercentChange(item.changePercent)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-1.5">
                      <SparkLine isPositive={isPositive} />
                    </div>

                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-2 truncate">
                        {item.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Watchlist</DialogTitle>
            <DialogDescription>
              Search for a stock to add to your watchlist
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Search Stock</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticker or company name..."
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    setSelectedCompany(null);
                  }}
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {searchResults.length > 0 && !selectedCompany && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-white/[0.08] bg-card/95">
                  {searchResults.map((company) => {
                    const alreadyInWatchlist = watchlist.some(
                      (w) => w.ticker === company.ticker
                    );
                    return (
                      <button
                        key={company.ticker}
                        className={cn(
                          "w-full px-3 py-2.5 text-left text-sm transition-colors flex items-center justify-between",
                          alreadyInWatchlist
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-white/[0.06]"
                        )}
                        onClick={() => {
                          if (alreadyInWatchlist) return;
                          setSelectedCompany({
                            ticker: company.ticker,
                            name: company.name,
                          });
                          setSearchValue(
                            `${company.ticker} - ${company.name}`
                          );
                        }}
                        disabled={alreadyInWatchlist}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-400">
                            {company.ticker}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {company.name}
                          </span>
                        </div>
                        {alreadyInWatchlist && (
                          <Badge variant="neutral" className="text-xs">
                            Added
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedCompany && (
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Add notes about this stock..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setSelectedCompany(null);
                setSearchValue("");
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isAddingItem || !selectedCompany}
            >
              {isAddingItem && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Add to Watchlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
