import React from "react";
import { cn } from "../../lib/utils";
import { ChevronDown } from "lucide-react";

export const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="relative w-full group">
      <select
        className={cn(
          "flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm font-medium appearance-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 cursor-pointer",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none group-focus-within:text-primary transition-colors">
        <ChevronDown size={16} />
      </div>
    </div>
  );
});

Select.displayName = "Select";
