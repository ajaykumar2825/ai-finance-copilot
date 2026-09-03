"use client";

import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background gradient-mesh-subtle">
      <div className="text-center space-y-8 px-4">
        {/* Floating illustration */}
        <div className="relative mx-auto w-64 h-32">
          <svg
            viewBox="0 0 400 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: "#f59e0b", stopOpacity: 0.1 }} />
              </linearGradient>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 0.6 }} />
                <stop offset="50%" style={{ stopColor: "#34d399", stopOpacity: 0.8 }} />
                <stop offset="100%" style={{ stopColor: "#10b981", stopOpacity: 0.4 }} />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            {/* Candlesticks */}
            <g className="animate-float" style={{ animationDelay: "0s" }}>
              <rect x="40" y="50" width="8" height="30" rx="2" fill="url(#grad1)" />
              <line x1="44" y1="40" x2="44" y2="85" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
            </g>
            <g className="animate-float" style={{ animationDelay: "0.5s" }}>
              <rect x="70" y="70" width="8" height="25" rx="2" fill="rgba(245,158,11,0.3)" />
              <line x1="74" y1="60" x2="74" y2="100" stroke="rgba(245,158,11,0.4)" strokeWidth="1" />
            </g>
            <g className="animate-float" style={{ animationDelay: "1s" }}>
              <rect x="100" y="45" width="8" height="35" rx="2" fill="url(#grad1)" />
              <line x1="104" y1="35" x2="104" y2="85" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
            </g>
            <g className="animate-float" style={{ animationDelay: "1.5s" }}>
              <rect x="130" y="55" width="8" height="20" rx="2" fill="rgba(245,158,11,0.3)" />
              <line x1="134" y1="45" x2="134" y2="80" stroke="rgba(245,158,11,0.4)" strokeWidth="1" />
            </g>
            <g className="animate-float" style={{ animationDelay: "2s" }}>
              <rect x="160" y="40" width="8" height="40" rx="2" fill="url(#grad1)" />
              <line x1="164" y1="30" x2="164" y2="85" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
            </g>
            {/* Chart line */}
            <path
              d="M 30 90 Q 80 50 130 70 T 230 45 T 330 65 T 380 35"
              stroke="url(#grad2)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* Area fill */}
            <path
              d="M 30 90 Q 80 50 130 70 T 230 45 T 330 65 T 380 35 L 380 160 L 30 160 Z"
              fill="url(#grad1)"
              opacity="0.3"
            />
          </svg>
        </div>

        {/* 404 text */}
        <div className="space-y-2">
          <h1 className="text-8xl sm:text-9xl font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-gold-400 bg-clip-text text-transparent animate-fade-in">
            404
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Page Not Found
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button onClick={() => router.push("/")} className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
