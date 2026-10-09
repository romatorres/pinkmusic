import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHead({ title, subtitle, className }: SectionHeadProps) {
  return (
    <div className={cn("mb-6 md:mb-8", className)}>
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl font-display">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}
