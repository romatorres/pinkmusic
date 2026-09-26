import * as React from "react";

import { cn } from "@/lib/utils";

export interface ScrollableBadgeItem {
    label: string;
    value: string | number;
    className?: string;
    valueClassName?: string;
}

interface ScrollableBadgeGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    items: ScrollableBadgeItem[];
}

export function ScrollableBadgeGroup({
    items,
    className,
    ...props
}: ScrollableBadgeGroupProps) {
    return (
        <div
            className={cn(
                "w-full min-w-0 overflow-x-auto md:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                className
            )}
            {...props}
        >
            <div className="flex min-w-max items-center gap-2 md:min-w-0 md:flex-wrap md:justify-end">
                {items.map((item) => (
                    <div
                        key={`${item.label}-${item.value}`}
                        className={cn(
                            "flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-sm",
                            item.className
                        )}
                    >
                        <span>{item.label}:</span>
                        <strong className={cn("font-semibold", item.valueClassName)}>{item.value}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

export interface ScrollablePillItem {
    label: string;
    active: boolean;
    onClick: () => void;
    count?: number;
    className?: string;
}

interface ScrollablePillGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    items: ScrollablePillItem[];
}

export function ScrollablePillGroup({
    items,
    className,
    ...props
}: ScrollablePillGroupProps) {
    return (
        <div
            className={cn(
                "w-full min-w-0 overflow-x-auto md:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                className
            )}
            {...props}
        >
            <div className="flex min-w-max items-center gap-2 md:min-w-0 md:flex-wrap">
                {items.map((item) => (
                    <button
                        key={item.label}
                        type="button"
                        onClick={item.onClick}
                        className={cn(
                            "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors md:text-xs",
                            item.active
                                ? "border-transparent bg-primary text-white shadow-sm"
                                : "border-border bg-card text-muted-foreground hover:text-foreground",
                            item.className,
                        )}
                    >
                        {item.label}
                        {typeof item.count === "number" && ` (${item.count})`}
                    </button>
                ))}
            </div>
        </div>
    );
}
