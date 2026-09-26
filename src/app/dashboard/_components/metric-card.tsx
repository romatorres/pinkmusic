import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardMetricCardProps {
    label: string;
    value: React.ReactNode;
    helperText: string;
    icon: React.ReactNode;
    iconClassName?: string;
    valueClassName?: string;
    className?: string;
}

export function DashboardMetricCard({
    label,
    value,
    helperText,
    icon,
    iconClassName,
    valueClassName,
    className,
}: DashboardMetricCardProps) {
    return (
        <Card
            className={cn(
                "border-border/80 bg-card/80 shadow-sm transition-colors hover:border-primary/30",
                className
            )}
        >
            <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                    </p>
                    <p className={cn("mt-2 text-2xl font-bold tracking-tight text-foreground", valueClassName)}>
                        {value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
                </div>

                <div
                    className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-primary",
                        iconClassName
                    )}
                >
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}
