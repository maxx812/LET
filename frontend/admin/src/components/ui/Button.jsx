import React from "react";
import { cn } from "../../lib/utils";

export const Button = React.forwardRef(
  ({ className, variant = "primary", size = "md", loading = false, leftIcon, rightIcon, children, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground shadow-soft hover:shadow-pop hover:-translate-y-0.5 active:scale-[0.98]",
      secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80",
      accent: "bg-gradient-accent text-accent-foreground shadow-glow hover:shadow-pop hover:-translate-y-0.5 active:scale-[0.98]",
      outline: "bg-transparent border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40",
      ghost: "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
      destructive: "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 hover:shadow-pop active:scale-[0.98]",
      warning: "bg-warning text-warning-foreground shadow-soft hover:bg-warning/90 hover:shadow-pop active:scale-[0.98]",
      info: "bg-info text-info-foreground shadow-soft hover:bg-info/90 hover:shadow-pop active:scale-[0.98]",
      success: "bg-success text-success-foreground shadow-soft hover:bg-success/90 hover:shadow-pop active:scale-[0.98]",
    };

    const sizes = {
      xs: "h-8 px-3 text-[0.625rem] font-bold rounded-lg",
      sm: "h-9 px-3.5 text-xs font-bold rounded-xl",
      md: "h-11 px-5 text-sm font-bold rounded-xl",
      lg: "h-13 px-7 text-base font-extrabold rounded-2xl",
      icon: "h-10 w-10 p-0 rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none disabled:grayscale-[0.5]",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={loading}
        {...props}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
