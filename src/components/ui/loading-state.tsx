import * as React from "react";
import { cn } from "@/lib/utils";

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullHeight?: boolean;
}

export function LoadingState({
  label = "Carregando...",
  size = "md",
  fullHeight = false,
  className,
  ...props
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-5 w-5 border-[2px]",
    md: "h-8 w-8 border-[2px]",
    lg: "h-12 w-12 border-[3px]",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-3 text-muted-foreground",
        fullHeight ? "min-h-[50vh]" : "min-h-[220px]",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "block animate-spin rounded-full border border-muted-foreground/30 border-t-primary",
          sizeClasses[size]
        )}
      />
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
