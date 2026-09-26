"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { FileText, CheckCircle2, AlertTriangle, Search, Filter, RefreshCw } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InvoicesClientViewProps {
  initialFilters?: {
    search?: string;
    status?: string;
    clientId?: string;
  };
}

export function InvoicesClientView({ initialFilters }: InvoicesClientViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const urlSearch = searchParams.get("search") || initialFilters?.search || "";
  const urlStatus = searchParams.get("status") || initialFilters?.status || "ALL";
  const urlClient = searchParams.get("client") || initialFilters?.clientId || "";

  const [searchTerm, setSearchTerm] = useState(urlSearch);

  // Active query filters passed to TanStack Query
  const filters = useMemo(
    () => ({
      search: urlSearch,
      status: urlStatus,
      clientId: urlClient,
      limit: 50,
    }),
    [urlSearch, urlStatus, urlClient]
  );

  // TanStack Query hook with server hydration
  const { data: rawInvoices = [], isLoading, isFetching, refetch } = useInvoices(filters);

  // Ensure invoices is an array
  const invoices = useMemo(() => {
    if (Array.isArray(rawInvoices)) return rawInvoices;
    return [];
  }, [rawInvoices]);

  // URL state synchronization helper (Rule 26)
  const updateUrlParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  // Debounced search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParam("search", searchTerm.trim());
  };

  // Real-time authoritative financial summaries calculated from data
  const totalBilled = useMemo(
    () => invoices.reduce((acc: number, inv: any) => acc + (inv.total || 0), 0),
    [invoices]
  );

  const totalPaid = useMemo(
    () =>
      invoices.reduce(
        (acc: number, inv: any) => acc + (inv.amountPaid || inv.paidAmount || 0),
        0
      ),
    [invoices]
  );

  const totalOutstanding = useMemo(
    () =>
      invoices.reduce((acc: number, inv: any) => {
        const bal =
          inv.balanceDue ??
          inv.balance ??
          (inv.total || 0) - (inv.amountPaid || inv.paidAmount || 0);
        return acc + Math.max(0, bal);
      }, 0),
    [invoices]
  );

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Invoices"
        description="Track customer billing, payment status, and outstanding receivables with TanStack Query caching."
        actionLabel="Create Invoice"
        actionHref="/invoices/new"
      />

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Total Invoiced"
          value={`₹${Number(totalBilled).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtitle={`${invoices.length} invoices returned`}
          icon={FileText}
        />

        <StatCard
          title="Total Collected"
          value={`₹${Number(totalPaid).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtitle="Settled in payment ledger"
          icon={CheckCircle2}
          badgeVariant="success"
        />

        <StatCard
          title="Outstanding Balance"
          value={`₹${Number(totalOutstanding).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtitle="Pending collections"
          icon={AlertTriangle}
          badge={totalOutstanding > 0 ? "Receivables" : "All Clear"}
          badgeVariant={totalOutstanding > 0 ? "warning" : "success"}
        />
      </div>

      {/* 3. Search & Status Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-border shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice number, client name..."
            className="pl-9 h-10 text-sm"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"].map((status) => (
            <button
              key={status}
              onClick={() => updateUrlParam("status", status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                urlStatus === status
                  ? "bg-brand text-white shadow-sm"
                  : "bg-ink-faint/30 text-ink-muted hover:bg-ink-faint"
              }`}
            >
              {status.replace(/_/g, " ")}
            </button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2.5 text-xs text-ink-secondary ml-auto"
            title="Refresh Invoices cache"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-brand" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 4. Invoices Table & Mobile Cards */}
      <InvoiceTable
        data={invoices as any}
        loading={isLoading}
        onDelete={() => refetch()}
      />
    </div>
  );
}
