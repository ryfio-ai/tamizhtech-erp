"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchKey?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  emptyTitle?: string;
  emptyDesc?: string;
  emptyAction?: () => void;
  emptyActionLabel?: string;
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  className?: string;
  tableClassName?: string;
}

export function DataTable<T extends Record<string, any>>({
  data = [],
  columns,
  searchKey,
  searchPlaceholder = "Search...",
  loading = false,
  onView,
  onEdit,
  onDelete,
  emptyTitle = "No records found",
  emptyDesc = "There is no information to display yet.",
  emptyAction,
  emptyActionLabel,
  renderMobileCard,
  className,
  tableClassName,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter
  const filteredData = useMemo(() => {
    if (!search || !searchKey) return data;
    const lowerSearch = search.toLowerCase();
    return data.filter((item: any) => {
      const keys = String(searchKey).split(",");
      return keys.some((k) => {
        const val = item[k.trim()];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, search, searchKey]);

  // Sort
  const sortedData = useMemo(() => {
    const sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return <LoadingSkeleton type="table" />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDesc}
        onAction={emptyAction}
        actionLabel={emptyActionLabel}
      />
    );
  }

  return (
    <div className={cn("space-y-4 w-full", className)}>
      {/* Top Controls: Search Bar */}
      {searchKey && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-ink-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
            />
          </div>

          <div className="text-xs text-ink-secondary flex items-center justify-end">
            Showing <strong className="mx-1 text-ink-primary">{filteredData.length}</strong> records
          </div>
        </div>
      )}

      {/* MOBILE VIEW (< 768px): Touch-Friendly Record Cards */}
      <div className="md:hidden space-y-3">
        {paginatedData.map((item, idx) => {
          if (renderMobileCard) {
            return (
              <div key={item.id || idx}>
                {renderMobileCard(item, idx)}
              </div>
            );
          }

          // Default clean mobile card fallback
          return (
            <div
              key={item.id || idx}
              onClick={() => onView && onView(item)}
              className={cn(
                "bg-white border border-border rounded-xl p-4 shadow-sm space-y-2.5 active:bg-surface transition-colors",
                onView && "cursor-pointer"
              )}
            >
              {columns.slice(0, 4).map((col, cIdx) => (
                <div key={cIdx} className="flex justify-between items-center text-sm">
                  <span className="text-xs text-ink-secondary uppercase tracking-wider">
                    {col.header}
                  </span>
                  <span className="font-medium text-ink-primary text-right">
                    {col.cell ? col.cell(item) : String(item[col.accessorKey] ?? "-")}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW (>= 768px): Structured Table with Controlled Internal Scroll */}
      <div className="hidden md:block bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className={cn("w-full text-left border-collapse text-sm", tableClassName || "min-w-[1000px]")}>
            <thead>
              <tr className="bg-surface border-b border-border text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    onClick={() => col.sortable && handleSort(String(col.accessorKey))}
                    className={cn(
                      "px-4 py-3.5 select-none",
                      col.sortable && "cursor-pointer hover:text-ink-primary",
                      col.className
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <div className="flex flex-col">
                          <ChevronUp
                            className={cn(
                              "w-3 h-3 -mb-1",
                              sortConfig?.key === col.accessorKey && sortConfig.direction === "asc"
                                ? "text-brand"
                                : "text-ink-muted"
                            )}
                          />
                          <ChevronDown
                            className={cn(
                              "w-3 h-3",
                              sortConfig?.key === col.accessorKey && sortConfig.direction === "desc"
                                ? "text-brand"
                                : "text-ink-muted"
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((item, rowIdx) => (
                <tr
                  key={item.id || rowIdx}
                  onClick={() => onView && onView(item)}
                  className={cn(
                    "hover:bg-surface/70 transition-colors",
                    onView && "cursor-pointer"
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={cn("px-4 py-3.5 text-ink-primary", col.className)}>
                      {col.cell ? col.cell(item) : String(item[col.accessorKey] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 px-1">
          <p className="text-xs text-ink-secondary">
            Page <strong className="text-ink-primary">{currentPage}</strong> of{" "}
            <strong className="text-ink-primary">{totalPages}</strong>
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9 p-0 min-h-[36px] min-w-[36px]"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-9 w-9 p-0 min-h-[36px] min-w-[36px]"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
