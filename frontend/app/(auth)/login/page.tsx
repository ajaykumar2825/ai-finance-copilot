"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isSigningIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    signIn(data, {
      onSuccess: () => {
        toast.success("Welcome back!", {
          description: "You have been signed in successfully.",
        });
        router.push("/dashboard");
      },
      onError: (error) => {
        toast.error("Sign in failed", {
          description:
            error.message || "Please check your credentials and try again.",
        });
      },
    });
  };

  const handleMagicLink = () => {
    if (!magicLinkEmail) return;
    setSendingMagicLink(true);
    setTimeout(() => {
      setSendingMagicLink(false);
      setMagicLinkSent(true);
      toast.success("Magic link sent!", {
        description: "Check your email for the sign-in link.",
      });
    }, 1500);
  };

  return (
    <div className="relative w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="glass-card rounded-2xl p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <Sparkles className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="h-11 w-full border-white/[0.08] bg-white/[0.02] text-foreground hover:bg-white/[0.05]"
              disabled={isSigningIn}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </Button>

            <Button
              variant="outline"
              className="h-11 w-full border-white/[0.08] bg-white/[0.02] text-foreground hover:bg-white/[0.05]"
              disabled={isSigningIn}
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Sign in with GitHub
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {!magicLinkMode ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  icon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="#"
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  icon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  {...register("password")}
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-emerald-500 text-background hover:bg-emerald-400"
                disabled={isSigningIn}
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setMagicLinkMode(true)}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Sign in with magic link instead
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {magicLinkSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Mail className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Check your email
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We sent a magic link to{" "}
                    <span className="font-medium text-foreground">
                      {magicLinkEmail}
                    </span>
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-4 text-emerald-400 hover:text-emerald-300"
                    onClick={() => {
                      setMagicLinkSent(false);
                      setMagicLinkMode(false);
                    }}
                  >
                    Back to sign in
                  </Button>
                </motion.div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">Email address</Label>
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="name@example.com"
                      icon={<Mail className="h-4 w-4" />}
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                    />
                  </div>
                  <Button
                    className="h-11 w-full bg-emerald-500 text-background hover:bg-emerald-400"
                    onClick={handleMagicLink}
                    disabled={sendingMagicLink || !magicLinkEmail}
                  >
                    {sendingMagicLink ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Magic Link
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <button
                    onClick={() => setMagicLinkMode(false)}
                    className="flex w-full items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to password sign in
                  </button>
                </>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-emerald-400 hover:text-emerald-300"
            >
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
