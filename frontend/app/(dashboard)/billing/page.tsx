"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  X,
  CreditCard,
  Crown,
  Building2,
  Sparkles,
  ExternalLink,
  Download,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { formatDate, formatCurrency } from "@/lib/utils";

interface PlanFeature {
  label: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  icon: typeof Crown;
  features: PlanFeature[];
  highlighted: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "mo",
    description: "For getting started with AI finance tools",
    icon: Sparkles,
    features: [
      { label: "5 Documents", included: true },
      { label: "50 Messages / month", included: true },
      { label: "1 User", included: true },
      { label: "Basic analytics", included: true },
      { label: "Email support", included: true },
      { label: "Priority support", included: false },
      { label: "Advanced analytics", included: false },
      { label: "Custom integrations", included: false },
      { label: "Dedicated support", included: false },
    ],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    period: "mo",
    description: "For professionals who need more power",
    icon: Crown,
    features: [
      { label: "100 Documents", included: true },
      { label: "Unlimited messages", included: true },
      { label: "1 User", included: true },
      { label: "Advanced analytics", included: true },
      { label: "Priority support", included: true },
      { label: "API access", included: true },
      { label: "Custom integrations", included: false },
      { label: "Dedicated support", included: false },
      { label: "SLA guarantee", included: false },
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    period: "mo",
    description: "For teams and organizations",
    icon: Building2,
    features: [
      { label: "Unlimited documents", included: true },
      { label: "Unlimited messages", included: true },
      { label: "Unlimited users", included: true },
      { label: "Advanced analytics", included: true },
      { label: "Priority support", included: true },
      { label: "API access", included: true },
      { label: "Custom integrations", included: true },
      { label: "Dedicated support", included: true },
      { label: "99.9% SLA guarantee", included: true },
    ],
    highlighted: false,
  },
];

const paymentHistory = [
  { date: "2026-08-15", amount: 29, status: "paid", invoice: "#" },
  { date: "2026-07-15", amount: 29, status: "paid", invoice: "#" },
  { date: "2026-06-15", amount: 29, status: "paid", invoice: "#" },
  { date: "2026-05-15", amount: 29, status: "paid", invoice: "#" },
  { date: "2026-04-15", amount: 29, status: "failed", invoice: "#" },
];

export default function BillingPage() {
  const { user } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);

  const currentTier = user?.subscriptionTier || "free";
  const currentPlan = plans.find((p) => p.id === currentTier) || plans[0];

  const handlePlanChange = async (planId: string) => {
    setIsUpgrading(planId);
    await new Promise((r) => setTimeout(r, 2000));
    setIsUpgrading(null);
    toast.success(
      planId === currentTier
        ? "You're already on this plan"
        : `Successfully ${planId > currentTier ? "upgraded" : "downgraded"} to ${plans.find((p) => p.id === planId)?.name}`
    );
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription plan and billing</p>
      </div>

      {/* Current Plan */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/5" />
        <CardContent className="relative p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <currentPlan.icon className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">{currentPlan.name} Plan</h2>
                  <Badge variant="success">Current</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentPlan.price === 0
                    ? "Free forever"
                    : `${formatCurrency(currentPlan.price)}/month • Renews monthly`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Next billing date</p>
              <p className="font-medium text-foreground">{formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentTier;
            const canUpgrade = plan.id !== currentTier;
            return (
              <Card
                key={plan.id}
                variant={plan.highlighted && !isCurrent ? "elevated" : "default"}
                className={`relative ${
                  isCurrent
                    ? "border-emerald-500/30 ring-1 ring-emerald-500/20"
                    : plan.highlighted
                    ? "border-emerald-500/20"
                    : ""
                }`}
              >
                {plan.highlighted && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="success" className="px-3">Most Popular</Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="info" className="px-3">Current Plan</Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <div className="flex justify-center mb-3">
                    <div className={`rounded-xl p-3 ${
                      isCurrent
                        ? "bg-emerald-500/10"
                        : "bg-white/[0.06]"
                    }`}>
                      <plan.icon className={`h-6 w-6 ${
                        isCurrent ? "text-emerald-400" : "text-muted-foreground"
                      }`} />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price === 0 ? "Free" : formatCurrency(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map(({ label, included }) => (
                      <div key={label} className="flex items-center gap-3">
                        {included ? (
                          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={`text-sm ${included ? "text-foreground" : "text-muted-foreground/50"}`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator className="bg-white/[0.06] mt-4" />
                  <Button
                    className="w-full mt-4"
                    variant={isCurrent ? "outline" : plan.highlighted ? "default" : "outline"}
                    disabled={isCurrent || isUpgrading === plan.id}
                    onClick={() => handlePlanChange(plan.id)}
                  >
                    {isCurrent ? (
                      "Current Plan"
                    ) : isUpgrading === plan.id ? (
                      "Processing..."
                    ) : currentTier === "free" || plan.price > (currentPlan.price || 0) ? (
                      <>
                        Upgrade
                        <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      "Downgrade"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Manage your payment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-white/[0.06] p-2.5">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">Expires 12/2028</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Payments are processed securely through Stripe. We never store your card details.
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Summary</CardTitle>
            <CardDescription>Your current billing period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm text-muted-foreground">Monthly Spend</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {formatCurrency(currentPlan.price)}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm text-muted-foreground">Documents Used</p>
                <p className="text-xl font-bold text-foreground mt-1">24 / {currentPlan.id === "free" ? "5" : currentPlan.id === "pro" ? "100" : "∞"}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm text-muted-foreground">Messages This Month</p>
                <p className="text-xl font-bold text-foreground mt-1">156</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm text-muted-foreground">Total Saved</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(348)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your recent transactions</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentHistory.map((payment) => (
                <TableRow key={payment.date}>
                  <TableCell>{formatDate(payment.date)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={payment.status === "paid" ? "success" : "danger"}
                    >
                      {payment.status === "paid" ? "Paid" : "Failed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
