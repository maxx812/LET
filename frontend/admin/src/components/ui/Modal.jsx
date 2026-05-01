import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export const Modal = ({ isOpen, onClose, title, children, className }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className={cn(
        "relative w-full max-w-lg bg-card border border-border shadow-pop rounded-[2rem] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300",
        className
      )}>
        <div className="p-6 border-b border-border bg-secondary/30 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};
