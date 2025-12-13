import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mx-auto w-full container px-4 sm:px-6 lg:px-8",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageContainer.displayName = "PageContainer";

export { PageContainer };
