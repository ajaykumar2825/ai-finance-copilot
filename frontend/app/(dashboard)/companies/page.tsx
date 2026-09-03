"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Building2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  DollarSign,
  PieChart,
  Activity,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCompanySearch,
  useCompanyOverview,
  useCompanyFinancials,
  useCompanyEarnings,
  useCompanyPeers,
} from "@/hooks/use-companies";
import { useDebounce } from "@/hooks/use-debounce";
import {
  formatCurrency,
  formatCompactNumber,
  formatPercent,
  formatPercentChange,
  cn,
} from "@/lib/utils";
import type { CompanyOverview } from "@/types";

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-12 w-36" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialsSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 7 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
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

function EarningsSkeleton() {
  return (
    <Card>
      <CardContent className="py-8">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PeersSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((_, j) => (
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

export default function CompaniesPage() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounce(searchValue, 300);
  const { results: searchResults, isSearching } =
    useCompanySearch(debouncedSearch);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const { overview, isLoadingOverview } = useCompanyOverview(selectedTicker);
  const { financials, isLoadingFinancials } = useCompanyFinancials(selectedTicker);
  const { earnings, isLoadingEarnings } = useCompanyEarnings(selectedTicker);
  const { peers, isLoadingPeers } = useCompanyPeers(selectedTicker);

  const handleSelectCompany = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
    setSearchValue("");
  }, []);

  const handleSelectSearchResult = useCallback((company: CompanyOverview) => {
    setSelectedTicker(company.ticker);
    setSearchValue(company.ticker);
  }, []);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground">
          Company Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search and analyze companies, financials, and earnings
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative max-w-xl"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company name or ticker..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10 h-11"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {searchResults.length > 0 && searchValue.length > 0 && (
          <div className="absolute z-50 mt-2 w-full max-h-80 overflow-y-auto rounded-xl border border-white/[0.08] bg-card/95 backdrop-blur-xl shadow-glass-lg">
            {searchResults.map((company) => (
              <button
                key={company.ticker}
                className="w-full px-4 py-3 text-left text-sm hover:bg-white/[0.06] transition-colors flex items-center justify-between border-b border-white/[0.05] last:border-0"
                onClick={() => handleSelectSearchResult(company)}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <Building2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {company.ticker}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {company.name}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {company.sector}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {!selectedTicker ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="rounded-full bg-emerald-500/10 p-4 mb-4">
            <Building2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Search for a company
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Enter a company name or ticker symbol above to view detailed
            financial analysis, earnings, and peer comparisons.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key={selectedTicker}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTicker(null)}
            className="gap-1 text-muted-foreground"
          >
            Clear selection
          </Button>

          {isLoadingOverview ? (
            <OverviewSkeleton />
          ) : overview ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-foreground">
                        {overview.ticker}
                      </h2>
                      <Badge variant="outline">{overview.sector}</Badge>
                      <Badge variant="neutral">{overview.industry}</Badge>
                    </div>
                    <p className="text-muted-foreground">{overview.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-foreground">
                      {formatCurrency(overview.marketCap / (overview.eps || 1) * (overview.eps || 1))}
                    </p>
                    <div className="flex items-center justify-end gap-1">
                      {(overview.eps * overview.peRatio || 0) >= 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        Market Cap: {formatCompactNumber(overview.marketCap)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <MetricCard
                    label="P/E Ratio"
                    value={overview.peRatio.toFixed(2)}
                    icon={Activity}
                    color="text-emerald-400"
                  />
                  <MetricCard
                    label="EPS"
                    value={formatCurrency(overview.eps)}
                    icon={DollarSign}
                    color="text-emerald-400"
                  />
                  <MetricCard
                    label="Dividend Yield"
                    value={formatPercent(overview.dividendYield)}
                    icon={PieChart}
                    color="text-gold-400"
                  />
                  <MetricCard
                    label="Market Cap"
                    value={formatCompactNumber(overview.marketCap)}
                    icon={BarChart3}
                    color="text-emerald-400"
                  />
                  <MetricCard
                    label="52W High"
                    value={formatCurrency(overview.fiftyTwoWeekHigh)}
                    icon={TrendingUp}
                    color="text-emerald-400"
                  />
                  <MetricCard
                    label="52W Low"
                    value={formatCurrency(overview.fiftyTwoWeekLow)}
                    icon={TrendingDown}
                    color="text-red-400"
                  />
                  <MetricCard
                    label="Sector"
                    value={overview.sector}
                    icon={Building2}
                    color="text-gold-400"
                  />
                  <MetricCard
                    label="Industry"
                    value={overview.industry}
                    icon={Users}
                    color="text-muted-foreground"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Company data not found
                </p>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="financials" className="space-y-4">
            <TabsList>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="peers">Peers</TabsTrigger>
            </TabsList>

            <TabsContent value="financials" className="space-y-4">
              {isLoadingFinancials ? (
                <FinancialsSkeleton />
              ) : financials.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No financial data available
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
                            <TableHead>Period</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead>Net Income</TableHead>
                            <TableHead>EPS</TableHead>
                            <TableHead>Gross Margin</TableHead>
                            <TableHead>Net Margin</TableHead>
                            <TableHead>ROE</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financials.map((fin) => (
                            <TableRow key={fin.period}>
                              <TableCell className="font-medium text-foreground">
                                {fin.period}
                              </TableCell>
                              <TableCell>
                                {formatCompactNumber(fin.revenue)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  fin.netIncome >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                )}
                              >
                                {formatCompactNumber(fin.netIncome)}
                              </TableCell>
                              <TableCell>{formatCurrency(fin.eps)}</TableCell>
                              <TableCell>
                                {formatPercent(fin.grossMargin)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  fin.netMargin >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                )}
                              >
                                {formatPercent(fin.netMargin)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  fin.roe >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                )}
                              >
                                {formatPercent(fin.roe)}
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

            <TabsContent value="earnings" className="space-y-4">
              {isLoadingEarnings ? (
                <EarningsSkeleton />
              ) : earnings.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No earnings data available
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Quarterly Earnings
                    </CardTitle>
                    <CardDescription>
                      Actual vs estimated earnings per share
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {earnings.map((earning) => {
                        const beat = earning.actual >= earning.estimate;
                        const maxVal = Math.max(
                          earning.actual,
                          earning.estimate,
                          1
                        );
                        return (
                          <div
                            key={`${earning.year}-Q${earning.quarter}`}
                            className="space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">
                                Q{earning.quarter} {earning.year}
                              </span>
                              <Badge
                                variant={beat ? "success" : "danger"}
                                className="text-xs"
                              >
                                {beat ? "Beat" : "Missed"} by{" "}
                                {Math.abs(earning.surprisePercent).toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-emerald-400">
                                    Actual
                                  </span>
                                  <span className="text-foreground font-medium">
                                    {formatCurrency(earning.actual)}
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${(earning.actual / maxVal) * 100}%`,
                                    }}
                                    transition={{
                                      duration: 0.8,
                                      ease: "easeOut",
                                    }}
                                    className="h-full rounded-full bg-emerald-500"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    Estimate
                                  </span>
                                  <span className="text-foreground font-medium">
                                    {formatCurrency(earning.estimate)}
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${(earning.estimate / maxVal) * 100}%`,
                                    }}
                                    transition={{
                                      duration: 0.8,
                                      ease: "easeOut",
                                    }}
                                    className="h-full rounded-full bg-navy-400"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="peers" className="space-y-4">
              {isLoadingPeers ? (
                <PeersSkeleton />
              ) : peers.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No peer data available
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
                            <TableHead>Ticker</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Sector</TableHead>
                            <TableHead>Market Cap</TableHead>
                            <TableHead>P/E</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {peers.map((peer) => (
                            <TableRow
                              key={peer.ticker}
                              className="cursor-pointer"
                              onClick={() =>
                                handleSelectCompany(peer.ticker)
                              }
                            >
                              <TableCell>
                                <span className="font-semibold text-emerald-400">
                                  {peer.ticker}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {peer.name}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {peer.sector}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {formatCompactNumber(peer.marketCap)}
                              </TableCell>
                              <TableCell>{peer.peRatio.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  );
}
