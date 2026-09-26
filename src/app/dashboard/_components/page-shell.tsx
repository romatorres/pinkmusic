import * as React from "react";

import { cn } from "@/lib/utils";

interface DashboardPageShellProps {
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    headerClassName?: string;
}

export function DashboardPageShell({
    title,
    description,
    actions,
    children,
    className,
    headerClassName,
}: DashboardPageShellProps) {
    return (
        <div className={cn("space-y-6 pb-6 pt-2 md:pt-0", className)}>
            {(title || description || actions) && (
                <header
                    className={cn(
                        "flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-end md:justify-between",
                        headerClassName
                    )}
                >
                    <div className="space-y-1">
                        {title && (
                            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                {title}
                            </h1>
                        )}
                        {description && (
                            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                        )}
                    </div>

                    {actions && <div className="flex items-center gap-2 self-start md:self-auto">{actions}</div>}
                </header>
            )}

            <div className="space-y-6">{children}</div>
        </div>
    );
}
