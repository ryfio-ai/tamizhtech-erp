import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  actionIcon = <Plus className="w-4 h-4 mr-1.5" />,
  secondaryAction,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-ink-secondary mt-1">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {secondaryAction}
        {actionLabel && actionHref && (
          <Link href={actionHref}>
            <Button size="default" className="min-h-[44px] sm:min-h-[48px] px-5 shadow-sm">
              {actionIcon}
              <span>{actionLabel}</span>
            </Button>
          </Link>
        )}
        {actionLabel && onAction && !actionHref && (
          <Button onClick={onAction} size="default" className="min-h-[44px] sm:min-h-[48px] px-5 shadow-sm">
            {actionIcon}
            <span>{actionLabel}</span>
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
