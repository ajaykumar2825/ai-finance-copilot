"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function WatchlistLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-white/[0.06]">
            <div className="grid grid-cols-5 gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-white/[0.03] last:border-0">
              <div className="grid grid-cols-5 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <div className="flex justify-end">
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
