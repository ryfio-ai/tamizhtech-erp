"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  VisibilityState,
  ColumnDef as TanStackColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type { TanStackColumnDef };

export interface EnterpriseDataTableProps<TData> {
  data: TData[];
  columns: TanStackColumnDef<TData, any>[];
  searchPlaceholder?: string;
  globalFilterColumn?: string;
  loading?: boolean;
  onView?: (item: TData) => void;
  emptyTitle?: string;
  emptyDesc?: string;
  emptyAction?: () => void;
  emptyActionLabel?: string;
  renderMobileCard?: (item: TData, index: number) => React.ReactNode;
  enableVirtualization?: boolean;
  virtualRowHeight?: number;
  maxVirtualHeight?: number;
  pageSize?: number;
  onExportCsv?: () => void;
  className?: string;
  tableClassName?: string;
}

export function EnterpriseDataTable<TData extends Record<string, any>>({
  data = [],
  columns,
  searchPlaceholder = "Search records...",
  loading = false,
  onView,
  emptyTitle = "No records found",
  emptyDesc = "There is no information to display yet.",
  emptyAction,
  emptyActionLabel,
  renderMobileCard,
  enableVirtualization = false,
  virtualRowHeight = 48,
  maxVirtualHeight = 520,
  pageSize = 15,
  onExportCsv,
  className,
  tableClassName,
}: EnterpriseDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enableVirtualization ? undefined : getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => virtualRowHeight,
    overscan: 10,
    enabled: enableVirtualization,
  });

  if (loading) {
    return <LoadingSkeleton type="table" />;
  }

  if (data.length === 0 && !globalFilter) {
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
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 justify-end">
          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              className="h-10 text-xs font-medium text-slate-700 hover:text-slate-900 border-border"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Export
            </Button>
          )}

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
              className="h-10 text-xs font-medium text-slate-700 hover:text-slate-900 border-border"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Columns
            </Button>

            {showVisibilityMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-lg shadow-lg z-20 py-2 p-3 space-y-1.5">
                <div className="text-xs font-semibold text-slate-500 pb-1 border-b border-border">
                  Toggle Columns
                </div>
                {table
                  .getAllLeafColumns()
                  .filter((col) => col.id !== "actions")
                  .map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded border-slate-300 text-brand focus:ring-brand h-3.5 w-3.5"
                      />
                      <span className="capitalize">{column.id}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>

          <div className="text-xs text-ink-secondary pl-2 hidden sm:block">
            Showing <strong className="text-ink-primary">{rows.length}</strong> records
          </div>
        </div>
      </div>

      {/* MOBILE VIEW (< 768px): Touch-Friendly Record Cards */}
      <div className="md:hidden space-y-3">
        {rows.length === 0 ? (
          <div className="bg-white border border-border rounded-xl p-8 text-center text-sm text-slate-500">
            No matching records found.
          </div>
        ) : (
          rows.map((row, idx) => {
            const item = row.original;
            if (renderMobileCard) {
              return <div key={item.id || idx}>{renderMobileCard(item, idx)}</div>;
            }

            return (
              <div
                key={item.id || idx}
                onClick={() => onView && onView(item)}
                className={cn(
                  "bg-white border border-border rounded-xl p-4 shadow-sm space-y-2.5 active:bg-surface transition-colors",
                  onView && "cursor-pointer"
                )}
              >
                {row.getVisibleCells().slice(0, 4).map((cell) => (
                  <div key={cell.id} className="flex justify-between items-center text-sm">
                    <span className="text-xs text-ink-secondary uppercase tracking-wider">
                      {cell.column.id}
                    </span>
                    <span className="font-medium text-ink-primary text-right">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP VIEW (>= 768px): TanStack Table with optional TanStack Virtual */}
      <div className="hidden md:block bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {enableVirtualization ? (
          <div
            ref={parentRef}
            style={{ height: `${maxVirtualHeight}px`, overflow: "auto" }}
            className="w-full relative"
          >
            <table className={cn("w-full text-left border-collapse text-sm", tableClassName || "min-w-[1000px]")}>
              <thead className="sticky top-0 z-10 bg-surface border-b border-border text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "px-4 py-3.5 select-none",
                          header.column.getCanSort() && "cursor-pointer hover:text-ink-primary"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-xs">
                              {header.column.getIsSorted() === "asc" ? (
                                <ChevronUp className="w-3.5 h-3.5 text-brand" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ChevronDown className="w-3.5 h-3.5 text-brand" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0]?.start || 0}px` }}>
                      <td colSpan={columns.length} />
                    </tr>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const row = rows[virtualRow.index];
                      return (
                        <tr
                          key={row.id}
                          onClick={() => onView && onView(row.original)}
                          className={cn(
                            "hover:bg-surface/70 transition-colors border-b border-border/60",
                            onView && "cursor-pointer"
                          )}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3 text-ink-primary align-middle">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    <tr
                      style={{
                        height: `${
                          rowVirtualizer.getTotalSize() -
                          (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0)
                        }px`,
                      }}
                    >
                      <td colSpan={columns.length} />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className={cn("w-full text-left border-collapse text-sm", tableClassName || "min-w-[1000px]")}>
              <thead className="bg-surface border-b border-border text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "px-4 py-3.5 select-none",
                          header.column.getCanSort() && "cursor-pointer hover:text-ink-primary"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-xs">
                              {header.column.getIsSorted() === "asc" ? (
                                <ChevronUp className="w-3.5 h-3.5 text-brand" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ChevronDown className="w-3.5 h-3.5 text-brand" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => onView && onView(row.original)}
                      className={cn(
                        "hover:bg-surface/70 transition-colors",
                        onView && "cursor-pointer"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3.5 text-ink-primary align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer (when not virtualized) */}
      {!enableVirtualization && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between pt-2 px-1">
          <p className="text-xs text-ink-secondary">
            Page{" "}
            <strong className="text-ink-primary">
              {table.getState().pagination.pageIndex + 1}
            </strong>{" "}
            of <strong className="text-ink-primary">{table.getPageCount()}</strong>
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-9 w-9 p-0 min-h-[36px] min-w-[36px]"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
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
