"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background gradient-mesh-subtle">
      <div className="text-center space-y-8 px-4 max-w-lg">
        <div className="flex justify-center">
          <div className="rounded-2xl bg-red-500/10 p-5 border border-red-500/20">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
        </div>

        {error.message && (
          <Card className="text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full p-4"
            >
              <span className="text-sm font-medium text-muted-foreground">Error Details</span>
              {showDetails ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showDetails && (
              <CardContent className="pt-0 pb-4">
                <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 font-mono text-xs text-red-300 break-all">
                  {error.message}
                  {error.digest && (
                    <span className="block mt-2 text-red-400/60">
                      Digest: {error.digest}
                    </span>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => router.push("/")} className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
