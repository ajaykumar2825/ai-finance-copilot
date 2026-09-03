"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  MessageSquare,
  FileText,
  Briefcase,
  Building2,
  Newspaper,
  Eye,
  ArrowRight,
  ChevronDown,
  Check,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Globe,
  Menu,
  X,
  Github,
  Twitter,
  Linkedin,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const FEATURES = [
  {
    icon: MessageSquare,
    title: "AI Chat",
    description:
      "Have natural conversations about your finances. Ask questions, get insights, and make informed decisions with our AI assistant.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
  },
  {
    icon: FileText,
    title: "Document Analysis",
    description:
      "Upload financial documents and let AI extract key metrics, summarize findings, and answer your questions about the content.",
    gradient: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-400",
  },
  {
    icon: Briefcase,
    title: "Portfolio Tracking",
    description:
      "Track your investments in real-time. Monitor performance, analyze sector allocation, and optimize your portfolio strategy.",
    gradient: "from-gold-500/20 to-gold-500/5",
    iconColor: "text-gold-400",
  },
  {
    icon: Building2,
    title: "Company Analysis",
    description:
      "Deep dive into any company's financials. Access earnings data, peer comparisons, and AI-generated investment thesis.",
    gradient: "from-purple-500/20 to-purple-500/5",
    iconColor: "text-purple-400",
  },
  {
    icon: Newspaper,
    title: "News Sentiment",
    description:
      "Stay ahead with AI-analyzed news sentiment. Understand market mood and how events impact your holdings.",
    gradient: "from-pink-500/20 to-pink-500/5",
    iconColor: "text-pink-400",
  },
  {
    icon: Eye,
    title: "Smart Watchlist",
    description:
      "Create intelligent watchlists with AI-powered alerts. Get notified about price targets, news, and anomalies.",
    gradient: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-400",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Connect Your Accounts",
    description:
      "Securely link your brokerage accounts and upload financial documents. We support all major platforms.",
    icon: Shield,
  },
  {
    number: "02",
    title: "AI Analyzes Everything",
    description:
      "Our AI processes your financial data, identifies patterns, and generates personalized insights.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Make Smarter Decisions",
    description:
      "Access actionable recommendations, real-time alerts, and comprehensive analytics to optimize your wealth.",
    icon: TrendingUp,
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Portfolio Manager at Meridian Capital",
    avatar: "SC",
    quote:
      "AI Finance Copilot has transformed how I analyze investments. The AI-powered insights save me hours of research every day and have directly contributed to our fund's outperformance.",
  },
  {
    name: "Marcus Thompson",
    role: "Independent Investor",
    avatar: "MT",
    quote:
      "As a retail investor, having institutional-grade AI analysis at my fingertips is a game changer. The document analysis alone has paid for itself many times over.",
  },
  {
    name: "Elena Rodriguez",
    role: "CFO at TechVentures Inc.",
    avatar: "ER",
    quote:
      "We use AI Finance Copilot for our quarterly financial reviews. The automated analysis and portfolio tracking features have streamlined our entire investment process.",
  },
];

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started with AI-powered finance.",
    features: [
      "AI Chat (10 messages/day)",
      "Basic portfolio tracking (10 assets)",
      "Market news feed",
      "Basic watchlist (5 items)",
      "Community support",
    ],
    cta: "Get Started Free",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For serious investors who want the full AI advantage.",
    features: [
      "Unlimited AI Chat",
      "Unlimited portfolio tracking",
      "Document analysis (50/month)",
      "Company deep-dive analysis",
      "News sentiment analysis",
      "Smart watchlist with alerts",
      "Priority support",
      "Advanced analytics dashboard",
    ],
    cta: "Start Pro Trial",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For teams and institutions requiring custom solutions.",
    features: [
      "Everything in Pro",
      "Unlimited document analysis",
      "Custom AI model fine-tuning",
      "Team collaboration (up to 20 seats)",
      "API access",
      "Dedicated account manager",
      "SSO & advanced security",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    variant: "outline" as const,
    popular: false,
  },
];

const FAQ_ITEMS = [
  {
    question: "How does the AI analysis work?",
    answer:
      "Our AI uses advanced large language models and financial data analysis to process your documents, market data, and portfolio information. It generates actionable insights, answers natural language questions, and identifies patterns that traditional analysis might miss.",
  },
  {
    question: "Is my financial data secure?",
    answer:
      "Absolutely. We use bank-grade encryption (AES-256) for all data at rest and TLS 1.3 for data in transit. We are SOC 2 Type II certified and never sell your personal data. Your documents are processed securely and can be deleted at any time.",
  },
  {
    question: "Can I connect my brokerage account?",
    answer:
      "Yes! We support connections to most major brokerages including Fidelity, Charles Schwab, E*TRADE, Interactive Brokers, and more. Your connection is read-only and we never have the ability to execute trades on your behalf.",
  },
  {
    question: "What file types can I upload for document analysis?",
    answer:
      "We support PDF, CSV, Excel (.xls, .xlsx), plain text, and JSON files. Our AI can analyze financial statements, earnings reports, SEC filings, and most other financial documents.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, you can cancel your subscription at any time from your account settings. There are no long-term contracts or cancellation fees. If you cancel, you'll retain access until the end of your current billing period.",
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "Yes! All paid plans come with a 14-day free trial with full access to all features. No credit card required to start. If you decide it's not for you, simply cancel before the trial ends.",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              AI Finance Copilot
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
            </Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                className="bg-emerald-500 text-background hover:bg-emerald-400"
              >
                Get Started
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <button
            className="text-muted-foreground md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-white/[0.06] bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              <Link
                href="#features"
                className="block py-2 text-sm text-muted-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="block py-2 text-sm text-muted-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="#pricing"
                className="block py-2 text-sm text-muted-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="#faq"
                className="block py-2 text-sm text-muted-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <Separator className="my-2" />
              <Link
                href="/login"
                className="block py-2 text-sm text-muted-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button className="mt-2 w-full bg-emerald-500 text-background hover:bg-emerald-400">
                  Get Started
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 gradient-mesh opacity-80" />
        <div className="absolute top-20 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-gold-500/[0.05] blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline"
                className="mb-6 border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
              >
                <Sparkles className="mr-1.5 h-3 w-3" />
                AI-Powered Financial Intelligence
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
            >
              Your AI-Powered{" "}
              <span className="text-gradient-emerald">Financial</span>{" "}
              <span className="text-gradient-gold">Co-pilot</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl"
            >
              Harness the power of artificial intelligence to analyze markets,
              optimize your portfolio, and make data-driven investment decisions
              with confidence.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-emerald-500 text-background hover:bg-emerald-400 shadow-emerald-glow/30 px-8"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="border-white/[0.1]">
                  See How It Works
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                14-day free trial
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <Check className="h-4 w-4 text-emerald-400" />
                Cancel anytime
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mx-auto mt-20 max-w-5xl"
          >
            <div className="glass-card rounded-2xl p-1">
              <div className="rounded-xl bg-navy-950/50 p-4 sm:p-8">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500/80" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                      <div className="h-3 w-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 w-3/4 rounded bg-white/[0.06]" />
                      <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                      <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <div className="h-24 flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20" />
                      <div className="h-24 flex-1 rounded-lg bg-gold-500/10 border border-gold-500/20" />
                      <div className="h-24 flex-1 rounded-lg bg-blue-500/10 border border-blue-500/20" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-20 rounded-lg bg-emerald-500/10 border border-emerald-500/20" />
                    <div className="h-16 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
                    <div className="h-16 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
                    <div className="h-16 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-4 border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            >
              Features
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need for{" "}
              <span className="text-gradient-emerald">smarter investing</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful AI tools designed for modern investors, from beginners to
              institutional professionals.
            </p>
          </AnimatedSection>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 0.1}>
                <Card className="group h-full border-white/[0.06] bg-card/40 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/20 hover:shadow-emerald-glow/10">
                  <CardHeader>
                    <div
                      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient}`}
                    >
                      <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground/80">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-4 border-gold-500/20 bg-gold-500/5 text-gold-400"
            >
              How It Works
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Get started in{" "}
              <span className="text-gradient-gold">three simple steps</span>
            </h2>
          </AnimatedSection>

          <div className="relative mt-20">
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-emerald-500/20 via-gold-500/20 to-transparent sm:block" />

            <div className="space-y-16 sm:space-y-0">
              {STEPS.map((step, i) => (
                <AnimatedSection
                  key={step.number}
                  delay={i * 0.15}
                  className={`relative flex flex-col items-center gap-8 sm:flex-row ${
                    i % 2 === 1 ? "sm:flex-row-reverse" : ""
                  }`}
                >
                  <div className="flex-1 space-y-4 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-4xl font-bold text-emerald-500/20">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-card/60 shadow-emerald-glow/20 backdrop-blur-xl">
                    <step.icon className="h-7 w-7 text-emerald-400" />
                  </div>

                  <div className="flex-1" />
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-4 border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            >
              Testimonials
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Trusted by{" "}
              <span className="text-gradient-mixed">thousands of investors</span>
            </h2>
          </AnimatedSection>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, i) => (
              <AnimatedSection key={testimonial.name} delay={i * 0.1}>
                <Card className="h-full border-white/[0.06] bg-card/40 backdrop-blur-xl">
                  <CardContent className="pt-6">
                    <div className="mb-4 flex gap-1">
                      {[...Array(5)].map((_, j) => (
                        <svg
                          key={j}
                          className="h-4 w-4 text-gold-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                  </CardContent>
                  <CardFooter>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-gold-500/20 text-sm font-semibold text-foreground">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-4 border-gold-500/20 bg-gold-500/5 text-gold-400"
            >
              Pricing
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, transparent{" "}
              <span className="text-gradient-gold">pricing</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free and upgrade as your needs grow.
            </p>
          </AnimatedSection>

          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {PRICING_TIERS.map((tier, i) => (
              <AnimatedSection key={tier.name} delay={i * 0.1}>
                <Card
                  className={`relative h-full border-white/[0.06] bg-card/40 backdrop-blur-xl ${
                    tier.popular
                      ? "border-emerald-500/30 shadow-emerald-glow/10"
                      : ""
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-background">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">
                        {tier.price}
                      </span>
                      <span className="text-muted-foreground">
                        {tier.period}
                      </span>
                    </div>
                    <CardDescription className="mt-2">
                      {tier.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span className="text-sm text-muted-foreground">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Link href="/signup" className="w-full">
                      <Button
                        variant={tier.variant}
                        className={`w-full ${
                          tier.popular
                            ? "bg-emerald-500 text-background hover:bg-emerald-400"
                            : "border-white/[0.1]"
                        }`}
                      >
                        {tier.cta}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <Badge
              variant="outline"
              className="mb-4 border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            >
              FAQ
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Frequently asked{" "}
              <span className="text-gradient-emerald">questions</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection className="mt-12" delay={0.1}>
            <Accordion type="single" collapsible className="space-y-2">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="rounded-xl border border-white/[0.06] bg-card/40 px-5 backdrop-blur-xl"
                >
                  <AccordionTrigger className="text-left text-sm font-medium hover:no-underline hover:text-emerald-400">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground/80">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <AnimatedSection className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card/60 to-gold-500/10 p-12 text-center backdrop-blur-xl sm:p-16">
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-[60px]" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gold-500/10 blur-[60px]" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Start Your Free Trial Today
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Join thousands of investors using AI to make smarter financial
                decisions. No credit card required.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-emerald-500 text-background hover:bg-emerald-400 shadow-emerald-glow/30 px-8"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      <footer className="border-t border-white/[0.06] bg-navy-950/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-lg font-semibold text-foreground">
                  AI Finance Copilot
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                AI-powered financial analysis, portfolio management, and market
                intelligence platform.
              </p>
              <div className="mt-6 flex gap-3">
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Product</h3>
              <ul className="mt-4 space-y-2.5">
                {["Features", "Pricing", "API", "Integrations", "Changelog"].map(
                  (item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Company</h3>
              <ul className="mt-4 space-y-2.5">
                {["About", "Blog", "Careers", "Press Kit", "Contact"].map(
                  (item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Legal</h3>
              <ul className="mt-4 space-y-2.5">
                {["Privacy Policy", "Terms of Service", "Cookie Policy", "Security", "Compliance"].map(
                  (item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} AI Finance Copilot. All rights
              reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Built with intelligence. Powered by AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
