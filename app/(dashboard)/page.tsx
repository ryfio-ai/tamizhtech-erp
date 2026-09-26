"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
  Users, 
  IndianRupee, 
  Receipt, 
  AlertTriangle, 
  Plus, 
  CreditCard, 
  Package, 
  CalendarClock, 
  ArrowRight,
  Banknote,
  Calendar,
  CalendarRange,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useDashboardStats, DashboardPeriod, DashboardFilterParams } from "@/lib/hooks/useDashboard";

const FILTER_PRESETS: { id: DashboardPeriod; label: string }[] = [
  { id: "today", label: "Daywise" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "6m", label: "Last 6 Months" },
  { id: "1y", label: "Last 1 Year" },
  { id: "custom", label: "Custom Range" },
];

function formatShortDate(isoString?: string) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return isoString;
  }
}

function formatRangeLabel(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return "Live";
  const s = formatShortDate(startDate);
  const e = formatShortDate(endDate);
  if (s === e) return s;
  return `${s} – ${e}`;
}

export default function DashboardPage() {
  const { data: session } = useSession();

  // Date range filter state
  const [selectedRange, setSelectedRange] = useState<DashboardPeriod>("today");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [appliedCustomDates, setAppliedCustomDates] = useState<{ startDate: string; endDate: string } | null>(null);

  // Active query filters passed to TanStack Query
  const filterParams: DashboardFilterParams = useMemo(() => {
    if (selectedRange === "custom" && appliedCustomDates) {
      return {
        range: "custom",
        startDate: appliedCustomDates.startDate,
        endDate: appliedCustomDates.endDate,
      };
    }
    return { range: selectedRange };
  }, [selectedRange, appliedCustomDates]);

  const { data: stats, isLoading: loading, isFetching, refetch } = useDashboardStats(filterParams);

  const handleSelectPreset = (rangeId: DashboardPeriod) => {
    setSelectedRange(rangeId);
    if (rangeId === "custom" && !appliedCustomDates) {
      setAppliedCustomDates({ startDate: customStartDate, endDate: customEndDate });
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      toast.error("Please select both start and end dates.");
      return;
    }
    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast.error("Start date cannot be after end date.");
      return;
    }
    setAppliedCustomDates({ startDate: customStartDate, endDate: customEndDate });
    toast.success("Applied custom date range.");
  };

  const getCardTitle = (metric: "bills" | "collections" | "expenses") => {
    if (selectedRange === "today") {
      if (metric === "bills") return "Day's Bills";
      if (metric === "collections") return "Collections";
      return "Expenses";
    }
    const prefix = 
      selectedRange === "7d" ? "7D" :
      selectedRange === "30d" ? "30D" :
      selectedRange === "6m" ? "6M" :
      selectedRange === "1y" ? "1Y" :
      "Period";

    if (metric === "bills") return `${prefix} Bills`;
    if (metric === "collections") return `${prefix} Collections`;
    return `${prefix} Expenses`;
  };

  if (loading && !stats) {
    return <LoadingSkeleton type="page" />;
  }

  const billsCount = stats?.periodBillsCount ?? stats?.todayBillsCount ?? 0;
  const billsAmount = stats?.periodBillsAmount ?? stats?.todayBillsAmount ?? 0;
  const paymentsAmount = stats?.periodPaymentsAmount ?? stats?.todayPaymentsAmount ?? 0;
  const paymentsCount = stats?.periodPaymentsCount ?? stats?.todayPaymentsCount ?? 0;
  const expensesAmount = stats?.periodExpensesAmount ?? stats?.todayExpensesAmount ?? 0;
  const expensesCount = stats?.periodExpensesCount ?? stats?.todayExpensesCount ?? 0;
  const netCashflow = stats?.netCashflow ?? (paymentsAmount - expensesAmount);

  const totalOutstanding = stats?.totalOutstandingBalance || 0;
  const lowStockCount = stats?.lowStockCount || 0;
  const recentBills = stats?.recentBills || [];
  const lowStockProducts = stats?.lowStockProducts || [];
  const recentCustomers = stats?.recentCustomers || [];
  const upcomingFollowUps = stats?.upcomingFollowUps || [];

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10">
      {/* 1. Operations Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-ink-primary tracking-tight">
            Welcome, {session?.user?.name?.split(" ")[0] || "Team"}
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
            TamizhTech Robotics Operations Workspace
          </p>
        </div>

        {/* Core Quick Actions */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link href="/invoices/new" className="w-full sm:w-auto">
            <Button size="sm" className="w-full gap-1.5 h-11 sm:h-10 text-xs bg-brand hover:bg-brand-dark shadow-sm font-semibold justify-center min-h-[44px]">
              <Plus className="w-3.5 h-3.5" />
              <span>New Bill</span>
            </Button>
          </Link>
          <Link href="/clients?new=true" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full gap-1.5 h-11 sm:h-10 text-xs text-ink-primary hover:text-brand justify-center min-h-[44px]">
              <Users className="w-3.5 h-3.5 text-brand" />
              <span>New Customer</span>
            </Button>
          </Link>
          <Link href="/products" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full gap-1.5 h-11 sm:h-10 text-xs text-ink-primary hover:text-brand justify-center min-h-[44px]">
              <Package className="w-3.5 h-3.5 text-brand" />
              <span>Add Product</span>
            </Button>
          </Link>
          <Link href="/payments/new" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full gap-1.5 h-11 sm:h-10 text-xs text-ink-primary hover:text-green-600 justify-center min-h-[44px]">
              <CreditCard className="w-3.5 h-3.5 text-green-600" />
              <span>Record Payment</span>
            </Button>
          </Link>
          <Link href="/finance?new=true" className="col-span-2 sm:col-span-1 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full gap-1.5 h-11 sm:h-10 text-xs text-ink-primary hover:text-rose-600 justify-center min-h-[44px]">
              <Banknote className="w-3.5 h-3.5 text-rose-600" />
              <span>Record Expense</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Operations Date Filter Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary pr-2 border-r border-border shrink-0">
              <Calendar className="w-3.5 h-3.5 text-brand" />
              <span>Filter:</span>
            </div>

            {FILTER_PRESETS.map((preset) => {
              const isActive = selectedRange === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-brand text-white font-semibold shadow-xs"
                      : "bg-surface hover:bg-gray-100 text-ink-secondary hover:text-ink-primary"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}

            <button
              onClick={() => refetch()}
              title="Refresh metrics"
              type="button"
              className="p-1.5 rounded-lg text-ink-secondary hover:text-brand hover:bg-surface transition-all shrink-0 ml-1"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin text-brand")} />
            </button>
          </div>

          {/* Active Period & Net Cashflow Badge */}
          <div className="flex items-center gap-2 text-xs text-ink-secondary self-start lg:self-auto shrink-0 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-border/80 px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-ink-primary">
                {stats?.rangeLabel || "Today"}:
              </span>
              <span>
                {stats?.startDate && stats?.endDate
                  ? formatRangeLabel(stats.startDate, stats.endDate)
                  : "Live"}
              </span>
            </span>

            {netCashflow !== 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-xs border",
                  netCashflow > 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                )}
              >
                {netCashflow > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>Net: {netCashflow > 0 ? "+" : ""}{formatCurrency(netCashflow)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Custom Range Expandable Controls */}
        {selectedRange === "custom" && (
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand/5 p-3 rounded-xl border-dashed">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <CalendarRange className="w-4 h-4" />
              <span>Select Custom Date Range:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <span>From:</span>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 text-xs w-36 bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <span>To:</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 text-xs w-36 bg-white"
                />
              </div>

              <Button
                size="sm"
                onClick={handleApplyCustomDates}
                className="h-8 text-xs bg-brand hover:bg-brand-dark text-white px-3 font-semibold shadow-xs"
              >
                Apply Range
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Operations Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title={getCardTitle("bills")}
          value={billsCount}
          subtitle={`₹${billsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} invoiced`}
          icon={Receipt}
          trend={billsCount > 0 ? `${billsCount} bill${billsCount === 1 ? "" : "s"}` : "No bills"}
          trendDirection="neutral"
        />

        <StatCard
          title={getCardTitle("collections")}
          value={`₹${paymentsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtitle={`${paymentsCount} payment${paymentsCount === 1 ? "" : "s"} received`}
          icon={IndianRupee}
          badgeVariant="success"
        />

        <StatCard
          title={getCardTitle("expenses")}
          value={`₹${expensesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtitle={`${expensesCount} expense${expensesCount === 1 ? "" : "s"} recorded`}
          icon={Banknote}
          badgeVariant={expensesAmount > 0 ? "warning" : "default"}
        />

        <StatCard
          title="Outstanding Due"
          value={`₹${totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtitle="Pending customer balances"
          icon={IndianRupee}
          badge={totalOutstanding > 0 ? "Collect Due" : "Settled"}
          badgeVariant={totalOutstanding > 0 ? "warning" : "success"}
        />

        <StatCard
          title="Low Stock Alert"
          value={lowStockCount}
          subtitle="Products below threshold"
          icon={AlertTriangle}
          badge={lowStockCount > 0 ? "Replenish" : "Stock Healthy"}
          badgeVariant={lowStockCount > 0 ? "warning" : "default"}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* 4. Primary Operations Tables: Recent Bills & Low Stock Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Bills */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand" />
              <h2 className="text-base font-bold text-ink-primary">
                {selectedRange === "today" ? "Recent Bills" : `Bills (${stats?.rangeLabel || "Filtered"})`}
              </h2>
            </div>
            <Link href="/invoices" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentBills.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-secondary">
              No bills found for this time period.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentBills.map((b: any) => (
                <div key={b.id} className="py-3 flex items-center justify-between text-xs hover:bg-gray-50/50 rounded-lg px-2">
                  <div>
                    <Link href={`/invoices/${b.id}`} className="font-semibold text-brand hover:underline">
                      {b.invoiceNo}
                    </Link>
                    <div className="text-ink-secondary font-medium mt-0.5">{b.clientName}</div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-bold text-ink-primary">
                      {formatCurrency(b.total)}
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Products */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-bold text-ink-primary">Stock Alerts</h2>
            </div>
            <Link href="/products" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
              Manage stock <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-green-700 bg-green-50/50 rounded-lg">
              ✓ All catalog products are at or above safe stock levels.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {lowStockProducts.map((p: any) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs hover:bg-gray-50/50 rounded-lg px-2">
                  <div>
                    <div className="font-semibold text-ink-primary">{p.name}</div>
                    <div className="text-ink-secondary font-mono text-[11px] mt-0.5">{p.sku}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-bold text-red-600 text-sm">{p.stockQuantity} units</span>
                      <span className="text-[10px] text-ink-secondary block">Min: {p.minStock || 5}</span>
                    </div>
                    <Link href="/products">
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs text-brand">
                        Adjust
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 5. Secondary Operations Row: Recent Customers & Upcoming Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Customers */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand" />
              <h2 className="text-base font-bold text-ink-primary">Recent Customers</h2>
            </div>
            <Link href="/clients" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentCustomers.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-secondary">
              No customers registered yet. Click &quot;New Customer&quot; to add.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentCustomers.map((c: any) => (
                <div key={c.id} className="py-3 flex items-center justify-between text-xs hover:bg-gray-50/50 rounded-lg px-2">
                  <div>
                    <Link href={`/clients/${c.id}`} className="font-semibold text-ink-primary hover:text-brand">
                      {c.name}
                    </Link>
                    <div className="text-ink-secondary text-[11px] mt-0.5">
                      {c.company ? `${c.company} • ` : ""}{c.phone ? `+91 ${c.phone}` : c.email}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`font-semibold block ${c.outstandingBalance > 0 ? "text-red-600" : "text-green-700"}`}>
                      {c.outstandingBalance > 0 ? `Due: ${formatCurrency(c.outstandingBalance)}` : "No Due"}
                    </span>
                    <Link href={`/invoices/new?client=${c.id}`} className="text-[11px] text-brand hover:underline">
                      + Create Bill
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Follow-ups */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-brand" />
              <h2 className="text-base font-bold text-ink-primary">Scheduled Follow-ups</h2>
            </div>
            <Link href="/followups" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingFollowUps.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-secondary">
              No pending follow-ups scheduled for today.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {upcomingFollowUps.map((f: any) => (
                <div key={f.id} className="py-3 flex items-center justify-between text-xs hover:bg-gray-50/50 rounded-lg px-2">
                  <div>
                    <div className="font-semibold text-ink-primary">{f.clientName}</div>
                    <div className="text-ink-secondary text-[11px] mt-0.5">{f.notes || "Follow-up discussion"}</div>
                  </div>

                  <div className="text-right">
                    <span className="font-medium text-ink-primary block">{formatDate(f.date)}</span>
                    <span className="text-[10px] uppercase font-bold text-brand">{f.mode}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
