import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;

  const normalized = status.toUpperCase().replace(/\s+/g, "_");

  // Semantic styles for standard business statuses
  const getBadgeStyle = (s: string) => {
    switch (s) {
      // Green: Positive / Completed / Active / Paid
      case "ACTIVE":
      case "PAID":
      case "COMPLETED":
      case "DONE":
      case "WON":
      case "FULFILLED":
      case "ACCEPTED":
      case "ENROLLED":
      case "SUCCESS":
        return "bg-green-50 text-green-700 border-green-200";

      // Amber / Orange: In Progress / Pending / Partial
      case "PENDING":
      case "PARTIAL":
      case "PARTIALLY_PAID":
      case "IN_PROGRESS":
      case "QUALIFIED":
      case "CONTACTED":
      case "PROPOSAL":
      case "PLANNING":
      case "ISSUED":
      case "DRAFT":
        return "bg-amber-50 text-amber-700 border-amber-200";

      // Red: Overdue / Cancelled / Failed / Reversed / Lost
      case "OVERDUE":
      case "UNPAID":
      case "CANCELLED":
      case "FAILED":
      case "REVERSED":
      case "LOST":
      case "REJECTED":
      case "BLOCKED":
        return "bg-red-50 text-red-700 border-red-200";

      // Neutral / Gray: Inactive / On Hold / Default
      case "INACTIVE":
      case "ON_HOLD":
      case "CLOSED":
      case "EXPIRED":
      case "ARCHIVED":
      default:
        return "bg-surface text-ink-secondary border-border";
    }
  };

  // Human-readable display label (e.g. PARTIALLY_PAID -> Partially Paid)
  const displayLabel = status
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border tracking-wide uppercase",
        getBadgeStyle(normalized),
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
