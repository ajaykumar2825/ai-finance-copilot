"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  DollarSign,
  PieChart,
  Activity,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  useCompanyOverview,
  useCompanyFinancials,
  useCompanyEarnings,
  useCompanyPeers,
} from "@/hooks/use-companies";
import {
  formatCurrency,
  formatCompactNumber,
  formatPercent,
  cn,
} from "@/lib/utils";

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

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = use(params);
  const router = useRouter();
  const tickerUpper = ticker.toUpperCase();

  const { overview, isLoadingOverview } = useCompanyOverview(tickerUpper);
  const { financials, isLoadingFinancials } = useCompanyFinancials(tickerUpper);
  const { earnings, isLoadingEarnings } = useCompanyEarnings(tickerUpper);
  const { peers, isLoadingPeers } = useCompanyPeers(tickerUpper);

  if (isLoadingOverview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <OverviewSkeleton />
        <FinancialsSkeleton />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/companies")}
          className="gap-1 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Company not found
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            No data available for ticker &quot;{tickerUpper}&quot;. Please check the
            ticker symbol and try again.
          </p>
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
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/companies")}
          className="gap-1 text-muted-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    {overview.ticker}
                  </h2>
                  <Badge variant="outline">{overview.sector}</Badge>
                  <Badge variant="neutral">{overview.industry}</Badge>
                </div>
                <p className="text-muted-foreground">{overview.name}</p>
                {overview.description && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-2xl line-clamp-2">
                    {overview.description}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-foreground">
                  Market Cap
                </p>
                <p className="text-lg text-muted-foreground">
                  {formatCompactNumber(overview.marketCap)}
                </p>
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
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
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
                                <span className="text-emerald-400">Actual</span>
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
                                  transition={{ duration: 0.8, ease: "easeOut" }}
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
                                  transition={{ duration: 0.8, ease: "easeOut" }}
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
                              router.push(`/companies/${peer.ticker}`)
                            }
                          >
                            <TableCell>
                              <span className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                                {peer.ticker}
                                <ExternalLink className="h-3 w-3" />
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
    </div>
  );
}
