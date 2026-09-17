"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponsiveDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * ResponsiveDrawer:
 * On Desktop (>= 768px): Renders as a spacious, accessible centered modal.
 * On Mobile (< 768px): Renders as a full-height/slide-up app sheet, avoiding cramped centered dialogs.
 */
export function ResponsiveDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ResponsiveDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content Container */}
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 bg-white shadow-2xl transition-all duration-200 focus:outline-none flex flex-col",
            // Mobile: Full-screen bottom sheet with safe padding
            "inset-x-0 bottom-0 top-12 rounded-t-2xl md:top-auto md:bottom-auto md:inset-x-auto",
            // Desktop: Centered modal with fixed max width
            "md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:w-full md:max-w-xl md:max-h-[90vh] md:rounded-xl",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-white rounded-t-2xl md:rounded-t-xl">
            <div>
              <DialogPrimitive.Title className="text-lg font-bold text-ink-primary tracking-tight">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-xs text-ink-secondary mt-0.5">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="p-2 -mr-2 text-ink-muted hover:text-ink-primary hover:bg-surface rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X className="w-5 h-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 overscroll-contain">
            {children}
          </div>

          {/* Optional Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-border bg-surface shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-safe">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
