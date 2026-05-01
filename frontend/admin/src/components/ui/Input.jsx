import React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef(({ className, type, leftIcon, rightIcon, error, ...props }, ref) => {
  return (
    <div className="relative group w-full">
      {leftIcon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
          {leftIcon}
        </div>
      )}
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm font-medium ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          leftIcon && "pl-11",
          rightIcon && "pr-11",
          error && "border-destructive focus-visible:ring-destructive/15",
          className
        )}
        ref={ref}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
          {rightIcon}
        </div>
      )}
      {error && <p className="text-[0.625rem] font-bold text-destructive mt-1.5 ml-1">{error}</p>}
    </div>
  );
});

Input.displayName = "Input";
