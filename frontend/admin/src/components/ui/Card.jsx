import React from "react";
import { cn } from "../../lib/utils";

export const Card = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-card text-card-foreground border border-border/50 rounded-3xl shadow-soft transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = "Card";
