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

export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
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
  enableVirtualization?: boolean;
  virtualRowHeight?: number;
  maxVirtualHeight?: number;
  pageSize?: number;
  onExportCsv?: () => void;
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
  enableVirtualization = false,
  virtualRowHeight = 48,
  maxVirtualHeight = 540,
  pageSize = 15,
  onExportCsv,
  className,
  tableClassName,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  // Convert legacy ColumnDef to TanStack ColumnDef while preserving 100% API compatibility
  const tanstackColumns = useMemo<TanStackColumnDef<T, any>[]>(() => {
    return columns.map((col) => {
      const key = String(col.accessorKey);
      return {
        id: key,
        accessorKey: key,
        header: col.header,
        enableSorting: col.sortable ?? false,
        cell: (info) => {
          if (col.cell) {
            return col.cell(info.row.original);
          }
          const val = info.getValue();
          return val !== undefined && val !== null ? String(val) : "-";
        },
        meta: {
          className: col.className,
        },
      };
    });
  }, [columns]);

  // Global search filtering across searchKey fields
  const customFilterFn = (row: any, columnId: string, filterValue: string) => {
    if (!filterValue) return true;
    const lower = String(filterValue).toLowerCase();
    const item = row.original;
    if (searchKey) {
      const keys = String(searchKey).split(",");
      return keys.some((k) => {
        const val = item[k.trim()];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(lower);
      });
    }
    return Object.values(item).some((val) =>
      val !== undefined && val !== null && String(val).toLowerCase().includes(lower)
    );
  };

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: customFilterFn,
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

  const exportTableDataToCsv = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }
    // Universal CSV Export fallback
    const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(",");
    const csvRows = rows.map((r) => {
      const item = r.original;
      return columns
        .map((c) => {
          const val = item[c.accessorKey as string];
          const text = val !== undefined && val !== null ? String(val) : "";
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",");
    });
    const blob = new Blob([[headers, ...csvRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `export-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("space-y-4 w-full", className)}>
      {/* Top Controls: Search Bar & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={exportTableDataToCsv}
            className="h-10 text-xs font-medium text-slate-700 hover:text-slate-900 border-border"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Export CSV
          </Button>

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
                      <span className="capitalize">{column.columnDef.header as string || column.id}</span>
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
          })
        )}
      </div>

      {/* DESKTOP VIEW (>= 768px): TanStack Table with optional Virtualization */}
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
                    {headerGroup.headers.map((header) => {
                      const colMeta = (header.column.columnDef.meta as any) || {};
                      return (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "px-4 py-3.5 select-none",
                            header.column.getCanSort() && "cursor-pointer hover:text-ink-primary",
                            colMeta.className
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
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
                      );
                    })}
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
                          {row.getVisibleCells().map((cell) => {
                            const colMeta = (cell.column.columnDef.meta as any) || {};
                            return (
                              <td
                                key={cell.id}
                                className={cn("px-4 py-3 text-ink-primary align-middle", colMeta.className)}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          })}
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
                    {headerGroup.headers.map((header) => {
                      const colMeta = (header.column.columnDef.meta as any) || {};
                      return (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "px-4 py-3.5 select-none",
                            header.column.getCanSort() && "cursor-pointer hover:text-ink-primary",
                            colMeta.className
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
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
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => onView && onView(row.original)}
                      className={cn(
                        "hover:bg-surface/70 transition-colors",
                        onView && "cursor-pointer"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const colMeta = (cell.column.columnDef.meta as any) || {};
                        return (
                          <td
                            key={cell.id}
                            className={cn("px-4 py-3.5 text-ink-primary align-middle", colMeta.className)}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
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
