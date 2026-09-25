import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger";
  trend?: string;
  trendDirection?: "up" | "down" | "neutral" | string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeVariant = "default",
  trend,
  trendDirection,
  onClick,
  className,
}: StatCardProps) {
  const badgeColors = {
    default: "bg-surface text-ink-secondary border-border",
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
  };

  const effectiveBadge = badge || trend;
  const effectiveVariant = badgeVariant !== "default" ? badgeVariant : (
    trendDirection === "up" ? "success" : trendDirection === "down" ? "danger" : "default"
  );

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl p-3.5 sm:p-5 border border-border transition-all duration-150 relative overflow-hidden",
        onClick && "cursor-pointer hover:border-brand/40 active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1 truncate">
            {title}
          </p>
          <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-ink-primary tracking-tight truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-ink-secondary mt-1 font-normal line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className="p-2 sm:p-2.5 rounded-xl bg-surface border border-border shrink-0 text-brand">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      {effectiveBadge && (
        <div className="mt-3">
          <span
            className={cn(
              "inline-block text-[11px] font-medium px-2 py-0.5 rounded-md border",
              badgeColors[effectiveVariant]
            )}
          >
            {effectiveBadge}
          </span>
        </div>
      )}
    </div>
  );
}
