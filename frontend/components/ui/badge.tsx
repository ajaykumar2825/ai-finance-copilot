import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-white/[0.08] bg-secondary/50 text-secondary-foreground",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        warning:
          "border-gold-500/20 bg-gold-500/10 text-gold-400",
        danger:
          "border-red-500/20 bg-red-500/10 text-red-400",
        info:
          "border-blue-500/20 bg-blue-500/10 text-blue-400",
        positive:
          "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
        negative:
          "border-red-400/30 bg-red-500/15 text-red-300",
        neutral:
          "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
        outline:
          "border-white/[0.15] bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
