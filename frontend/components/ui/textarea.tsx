"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-muted-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-lg border bg-white/[0.03] px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none",
            error
              ? "border-destructive/50 focus-visible:ring-destructive/50"
              : "border-white/[0.08] hover:border-white/[0.15]",
            className
          )}
          id={textareaId}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-destructive animate-fade-in">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
