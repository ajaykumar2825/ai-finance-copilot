import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg bg-white/[0.04] animate-shimmer bg-[length:400%_100%] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.04)_25%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.04)_75%,transparent_100%)]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
