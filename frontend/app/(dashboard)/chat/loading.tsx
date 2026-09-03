"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ChatLoading() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-72 border-r border-white/[0.06] bg-white/[0.01] p-4 space-y-3 flex-col">
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="space-y-2 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Chat area skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-40" />
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className={`space-y-2 ${i % 2 === 0 ? "" : "items-end"}`}>
                <Skeleton className="h-4 w-16" />
                <Card className="max-w-md">
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex gap-3">
            <Skeleton className="flex-1 h-12 rounded-xl" />
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
