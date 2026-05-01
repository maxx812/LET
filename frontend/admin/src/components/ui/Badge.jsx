import React from "react";
import { cn } from "../../lib/utils";

export const Badge = ({ className, variant = "default", children, ...props }) => {
  const variants = {
    default: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary text-secondary-foreground border-border",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning-foreground border-warning/20",
    info: "bg-info/10 text-info border-info/20",
    accent: "bg-accent/12 text-accent-foreground border-accent/20",
    outline: "bg-transparent border-border text-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-lg text-[0.625rem] font-bold uppercase tracking-wider border transition-all",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
