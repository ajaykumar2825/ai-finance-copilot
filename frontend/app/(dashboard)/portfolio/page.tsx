"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Plus,
  Pencil,
  Trash2,
  ArrowUpDown,
  Search,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Filter,
  History,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePortfolio,
  useTransactions,
} from "@/hooks/use-portfolio";
import { useCompanySearch } from "@/hooks/use-companies";
import { useDebounce } from "@/hooks/use-debounce";
import {
  formatCurrency,
  formatPercentChange,
  formatDate,
  cn,
} from "@/lib/utils";
import type { PortfolioAsset, Transaction } from "@/types";

type SortField = "ticker" | "name" | "quantity" | "avgCost" | "currentPrice" | "pl" | "sector";
type SortDirection = "asc" | "desc";

const SECTORS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Energy",
  "Consumer",
  "Industrial",
  "Utilities",
  "Real Estate",
  "Materials",
  "Communication",
];

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-32" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 9 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TransactionTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-emerald-500/10 p-4 mb-4">
        <Briefcase className="h-8 w-8 text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        No assets yet
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        Start building your portfolio by adding your first asset.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Asset
      </Button>
    </div>
  );
}

export default function PortfolioPage() {
  const {
    assets,
    summary,
    isLoadingAssets,
    isLoadingSummary,
    addAsset,
    updateAsset,
    deleteAsset,
    isAddingAsset,
    isUpdatingAsset,
    isDeletingAsset,
  } = usePortfolio();

  const {
    transactions,
    total: totalTransactions,
    isLoadingTransactions,
    addTransaction,
    isAddingTransaction,
  } = useTransactions();

  const [sortField, setSortField] = useState<SortField>("ticker");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");

  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<PortfolioAsset | null>(null);
  const [deleteAssetTarget, setDeleteAssetTarget] =
    useState<PortfolioAsset | null>(null);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);

  const [assetTickerSearch, setAssetTickerSearch] = useState("");
  const debouncedTickerSearch = useDebounce(assetTickerSearch, 300);
  const { results: tickerSearchResults, isSearching: isSearchingTickers } =
    useCompanySearch(debouncedTickerSearch);

  const [addForm, setAddForm] = useState({
    ticker: "",
    name: "",
    quantity: "",
    avgCost: "",
    sector: "",
  });

  const [editForm, setEditForm] = useState({
    quantity: "",
    avgCost: "",
  });

  const [transactionForm, setTransactionForm] = useState({
    ticker: "",
    type: "buy" as "buy" | "sell" | "dividend",
    quantity: "",
    price: "",
    notes: "",
  });

  const [txTickerSearch, setTxTickerSearch] = useState("");
  const debouncedTxTickerSearch = useDebounce(txTickerSearch, 300);
  const { results: txTickerResults, isSearching: isSearchingTxTickers } =
    useCompanySearch(debouncedTxTickerSearch);

  const [txSearchValue, setTxSearchValue] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");

  const filteredAndSortedAssets = useMemo(() => {
    const filtered = assets.filter((asset) => {
      const matchesSearch =
        asset.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector =
        sectorFilter === "all" ||
        asset.sector.toLowerCase() === sectorFilter.toLowerCase();
      return matchesSearch && matchesSector;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "ticker":
          comparison = a.ticker.localeCompare(b.ticker);
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "avgCost":
          comparison = a.avgCost - b.avgCost;
          break;
        case "currentPrice":
          comparison = (a.currentPrice ?? 0) - (b.currentPrice ?? 0);
          break;
        case "pl":
          comparison =
            ((a.currentPrice ?? 0) - a.avgCost) * a.quantity -
            ((b.currentPrice ?? 0) - b.avgCost) * b.quantity;
          break;
        case "sector":
          comparison = a.sector.localeCompare(b.sector);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [assets, searchQuery, sectorFilter, sortField, sortDirection]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.ticker.toLowerCase().includes(txSearchValue.toLowerCase()) ||
        (tx.notes && tx.notes.toLowerCase().includes(txSearchValue.toLowerCase()));
      const matchesType = txTypeFilter === "all" || tx.type === txTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, txSearchValue, txTypeFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleAddAsset = () => {
    if (!addForm.ticker || !addForm.name || !addForm.quantity || !addForm.avgCost || !addForm.sector) return;
    addAsset(
      {
        ticker: addForm.ticker,
        name: addForm.name,
        quantity: parseFloat(addForm.quantity),
        avgCost: parseFloat(addForm.avgCost),
        sector: addForm.sector,
      },
      {
        onSuccess: () => {
          setAddAssetOpen(false);
          setAddForm({ ticker: "", name: "", quantity: "", avgCost: "", sector: "" });
          setAssetTickerSearch("");
        },
      }
    );
  };

  const handleEditAsset = () => {
    if (!editAsset) return;
    updateAsset(
      {
        id: editAsset.id,
        data: {
          quantity: parseFloat(editForm.quantity),
          avgCost: parseFloat(editForm.avgCost),
        },
      },
      {
        onSuccess: () => {
          setEditAsset(null);
          setEditForm({ quantity: "", avgCost: "" });
        },
      }
    );
  };

  const handleDeleteAsset = () => {
    if (!deleteAssetTarget) return;
    deleteAsset(deleteAssetTarget.id, {
      onSuccess: () => setDeleteAssetTarget(null),
    });
  };

  const handleAddTransaction = () => {
    if (!transactionForm.ticker || !transactionForm.quantity || !transactionForm.price) return;
    addTransaction(
      {
        ticker: transactionForm.ticker,
        type: transactionForm.type,
        quantity: parseFloat(transactionForm.quantity),
        price: parseFloat(transactionForm.price),
        notes: transactionForm.notes || undefined,
      },
      {
        onSuccess: () => {
          setAddTransactionOpen(false);
          setTransactionForm({
            ticker: "",
            type: "buy",
            quantity: "",
            price: "",
            notes: "",
          });
          setTxTickerSearch("");
        },
      }
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown
      className={cn(
        "ml-1 h-3 w-3 inline",
        sortField === field ? "text-emerald-400" : "text-muted-foreground/50"
      )}
    />
  );

  if (isLoadingAssets && !assets.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SummaryCardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton />
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
          <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage your investment portfolio
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAddTransactionOpen(true)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            Add Transaction
          </Button>
          <Button onClick={() => setAddAssetOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid gap-4 grid-cols-2 lg:grid-cols-5"
      >
        {[
          {
            label: "Total Value",
            value: summary ? formatCurrency(summary.totalValue) : "$0.00",
            icon: DollarSign,
            color: "text-emerald-400",
          },
          {
            label: "Total Cost",
            value: summary ? formatCurrency(summary.totalCost) : "$0.00",
            icon: Briefcase,
            color: "text-muted-foreground",
          },
          {
            label: "Total P/L",
            value: summary ? formatCurrency(summary.totalPL) : "$0.00",
            icon: summary && summary.totalPL >= 0 ? TrendingUp : TrendingDown,
            color: summary && summary.totalPL >= 0 ? "text-emerald-400" : "text-red-400",
          },
          {
            label: "P/L %",
            value: summary ? formatPercentChange(summary.plPercent) : "0.00%",
            icon: BarChart3,
            color: summary && summary.plPercent >= 0 ? "text-emerald-400" : "text-red-400",
          },
          {
            label: "Assets",
            value: assets.length.toString(),
            icon: PieChart,
            color: "text-gold-400",
          },
        ].map((item, i) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {item.label}
                </span>
                <item.icon className={cn("h-4 w-4", item.color)} />
              </div>
              <p className="text-xl font-bold text-foreground">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <History className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="charts" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Charts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticker or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {SECTORS.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredAndSortedAssets.length === 0 && !isLoadingAssets ? (
            <EmptyState onAdd={() => setAddAssetOpen(true)} />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {(
                          [
                            { key: "ticker", label: "Ticker" },
                            { key: "name", label: "Name" },
                            { key: "quantity", label: "Qty" },
                            { key: "avgCost", label: "Avg Cost" },
                            { key: "currentPrice", label: "Price" },
                            { key: "pl", label: "P/L" },
                            { key: "pl", label: "P/L %" },
                            { key: "sector", label: "Sector" },
                          ] as { key: SortField; label: string }[]
                        ).map(({ key, label }, i) => (
                          <TableHead
                            key={`${label}-${i}`}
                            className="cursor-pointer select-none"
                            onClick={() => handleSort(key)}
                          >
                            {label}
                            <SortIcon field={key} />
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedAssets.map((asset) => {
                        const currentPrice = asset.currentPrice ?? asset.avgCost;
                        const pl = (currentPrice - asset.avgCost) * asset.quantity;
                        const plPercent =
                          asset.avgCost > 0
                            ? ((currentPrice - asset.avgCost) / asset.avgCost) * 100
                            : 0;
                        const isProfit = pl >= 0;

                        return (
                          <TableRow key={asset.id}>
                            <TableCell>
                              <Link
                                href={`/companies/${asset.ticker}`}
                                className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                              >
                                {asset.ticker}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {asset.name}
                            </TableCell>
                            <TableCell>{asset.quantity.toLocaleString()}</TableCell>
                            <TableCell>{formatCurrency(asset.avgCost)}</TableCell>
                            <TableCell>{formatCurrency(currentPrice)}</TableCell>
                            <TableCell
                              className={cn(
                                "font-medium",
                                isProfit ? "text-emerald-400" : "text-red-400"
                              )}
                            >
                              <span className="flex items-center gap-1">
                                {isProfit ? (
                                  <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3" />
                                )}
                                {formatCurrency(pl)}
                              </span>
                            </TableCell>
                            <TableCell
                              className={cn(
                                "font-medium",
                                isProfit ? "text-emerald-400" : "text-red-400"
                              )}
                            >
                              {formatPercentChange(plPercent)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {asset.sector}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditAsset(asset);
                                    setEditForm({
                                      quantity: asset.quantity.toString(),
                                      avgCost: asset.avgCost.toString(),
                                    });
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteAssetTarget(asset)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticker or notes..."
                value={txSearchValue}
                onChange={(e) => setTxSearchValue(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="dividend">Dividend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoadingTransactions ? (
            <TransactionTableSkeleton />
          ) : filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <History className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No transactions found
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(tx.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/companies/${tx.ticker}`}
                              className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                              {tx.ticker}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                tx.type === "buy"
                                  ? "success"
                                  : tx.type === "sell"
                                  ? "danger"
                                  : "warning"
                              }
                            >
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.quantity.toLocaleString()}</TableCell>
                          <TableCell>{formatCurrency(tx.price)}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(tx.total)}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {tx.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Sector Allocation
                </CardTitle>
                <CardDescription>Portfolio distribution by sector</CardDescription>
              </CardHeader>
              <CardContent>
                {summary && summary.sectorAllocation.length > 0 ? (
                  <div className="space-y-3">
                    {summary.sectorAllocation.map((sector) => (
                      <div key={sector.sector} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {sector.sector}
                          </span>
                          <span className="text-foreground font-medium">
                            {sector.percent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${sector.percent}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No sector data available
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Asset Performance
                </CardTitle>
                <CardDescription>P/L by asset</CardDescription>
              </CardHeader>
              <CardContent>
                {assets.length > 0 ? (
                  <div className="space-y-3">
                    {assets.map((asset) => {
                      const currentPrice = asset.currentPrice ?? asset.avgCost;
                      const pl =
                        (currentPrice - asset.avgCost) * asset.quantity;
                      const isProfit = pl >= 0;
                      const maxPl = Math.max(
                        ...assets.map(
                          (a) =>
                            Math.abs(
                              ((a.currentPrice ?? a.avgCost) - a.avgCost) *
                                a.quantity
                            )
                        ),
                        1
                      );
                      const barWidth =
                        (Math.abs(pl) / maxPl) * 100;

                      return (
                        <div key={asset.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-mono">
                              {asset.ticker}
                            </span>
                            <span
                              className={cn(
                                "font-medium",
                                isProfit ? "text-emerald-400" : "text-red-400"
                              )}
                            >
                              {formatCurrency(pl)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={cn(
                                "h-full rounded-full",
                                isProfit
                                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                  : "bg-gradient-to-r from-red-500 to-red-400"
                              )}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No asset data available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={addAssetOpen} onOpenChange={setAddAssetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
            <DialogDescription>
              Add a new asset to your portfolio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Ticker</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ticker..."
                  value={assetTickerSearch}
                  onChange={(e) => {
                    setAssetTickerSearch(e.target.value);
                    setAddForm({ ...addForm, ticker: e.target.value.toUpperCase(), name: "" });
                  }}
                  className="pl-10"
                />
                {isSearchingTickers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {tickerSearchResults.length > 0 && !addForm.name && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-card/95">
                  {tickerSearchResults.map((company) => (
                    <button
                      key={company.ticker}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                      onClick={() => {
                        setAddForm({
                          ...addForm,
                          ticker: company.ticker,
                          name: company.name,
                          sector: company.sector,
                        });
                        setAssetTickerSearch(company.ticker);
                      }}
                    >
                      <span className="font-semibold text-emerald-400">
                        {company.ticker}
                      </span>
                      <span className="text-muted-foreground text-xs truncate ml-2">
                        {company.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="Company name"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm({ ...addForm, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={addForm.quantity}
                  onChange={(e) =>
                    setAddForm({ ...addForm, quantity: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Avg Cost</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={addForm.avgCost}
                  onChange={(e) =>
                    setAddForm({ ...addForm, avgCost: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sector</Label>
              <Select
                value={addForm.sector}
                onValueChange={(val) =>
                  setAddForm({ ...addForm, sector: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddAssetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAsset}
              disabled={
                isAddingAsset ||
                !addForm.ticker ||
                !addForm.name ||
                !addForm.quantity ||
                !addForm.avgCost ||
                !addForm.sector
              }
            >
              {isAddingAsset && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Add Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAsset} onOpenChange={(open) => !open && setEditAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update details for {editAsset?.ticker}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) =>
                    setEditForm({ ...editForm, quantity: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Avg Cost</Label>
                <Input
                  type="number"
                  value={editForm.avgCost}
                  onChange={(e) =>
                    setEditForm({ ...editForm, avgCost: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAsset(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditAsset}
              disabled={
                isUpdatingAsset || !editForm.quantity || !editForm.avgCost
              }
            >
              {isUpdatingAsset && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteAssetTarget}
        onOpenChange={(open) => !open && setDeleteAssetTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">
                {deleteAssetTarget?.ticker}
              </span>{" "}
              from your portfolio? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAsset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingAsset}
            >
              {isDeletingAsset && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addTransactionOpen} onOpenChange={setAddTransactionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Record a new transaction in your portfolio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Ticker</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ticker..."
                  value={txTickerSearch}
                  onChange={(e) => {
                    setTxTickerSearch(e.target.value);
                    setTransactionForm({
                      ...transactionForm,
                      ticker: e.target.value.toUpperCase(),
                    });
                  }}
                  className="pl-10"
                />
                {isSearchingTxTickers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {txTickerResults.length > 0 &&
                !txTickerResults.find(
                  (r) => r.ticker === transactionForm.ticker
                ) && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-card/95">
                    {txTickerResults.map((company) => (
                      <button
                        key={company.ticker}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                        onClick={() => {
                          setTransactionForm({
                            ...transactionForm,
                            ticker: company.ticker,
                          });
                          setTxTickerSearch(company.ticker);
                        }}
                      >
                        <span className="font-semibold text-emerald-400">
                          {company.ticker}
                        </span>
                        <span className="text-muted-foreground text-xs truncate ml-2">
                          {company.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={transactionForm.type}
                onValueChange={(val: "buy" | "sell" | "dividend") =>
                  setTransactionForm({ ...transactionForm, type: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="dividend">Dividend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={transactionForm.quantity}
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      quantity: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price per Share</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={transactionForm.price}
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      price: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Trade notes..."
                value={transactionForm.notes}
                onChange={(e) =>
                  setTransactionForm({
                    ...transactionForm,
                    notes: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddTransactionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTransaction}
              disabled={
                isAddingTransaction ||
                !transactionForm.ticker ||
                !transactionForm.quantity ||
                !transactionForm.price
              }
            >
              {isAddingTransaction && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Add Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
