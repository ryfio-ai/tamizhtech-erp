"use client";

import React, { useEffect, useState } from "react";
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
  ExternalLink,
  Banknote
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (err: any) {
      console.error("Dashboard load error:", err);
      toast.error("Failed to refresh dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const userName = session?.user?.name || "TamizhTech Team";

  if (loading && !stats) {
    return <LoadingSkeleton type="page" />;
  }

  const todayBillsCount = stats?.todayBillsCount || 0;
  const todayBillsAmount = stats?.todayBillsAmount || 0;
  const todayPaymentsAmount = stats?.todayPaymentsAmount || 0;
  const todayExpensesAmount = stats?.todayExpensesAmount || 0;
  const todayExpensesCount = stats?.todayExpensesCount || 0;

  const totalOutstanding = stats?.totalOutstandingBalance || 0;
  const lowStockCount = stats?.lowStockCount || 0;
  const recentBills = stats?.recentBills || [];
  const lowStockProducts = stats?.lowStockProducts || [];
  const recentCustomers = stats?.recentCustomers || [];
  const upcomingFollowUps = stats?.upcomingFollowUps || [];

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10">
      {/* 1. Operations Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink-primary tracking-tight">
            Hi Team!!!!!!!!
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Tamizh Tech Robotics Company Operations Workspace
          </p>
        </div>

        {/* Core Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/invoices/new">
            <Button size="sm" className="gap-1.5 h-10 text-xs bg-brand hover:bg-brand-dark shadow-sm font-semibold">
              <Plus className="w-3.5 h-3.5" />
              <span>New Bill</span>
            </Button>
          </Link>
          <Link href="/clients?new=true">
            <Button variant="outline" size="sm" className="gap-1.5 h-10 text-xs text-ink-primary hover:text-brand">
              <Users className="w-3.5 h-3.5 text-brand" />
              <span>New Customer</span>
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" size="sm" className="gap-1.5 h-10 text-xs text-ink-primary hover:text-brand">
              <Package className="w-3.5 h-3.5 text-brand" />
              <span>Add Product</span>
            </Button>
          </Link>
          <Link href="/payments/new">
            <Button variant="outline" size="sm" className="gap-1.5 h-10 text-xs text-ink-primary hover:text-green-600">
              <CreditCard className="w-3.5 h-3.5 text-green-600" />
              <span>Record Payment</span>
            </Button>
          </Link>
          <Link href="/finance?new=true">
            <Button variant="outline" size="sm" className="gap-1.5 h-10 text-xs text-ink-primary hover:text-rose-600">
              <Banknote className="w-3.5 h-3.5 text-rose-600" />
              <span>Record Expense</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Operations Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Today's Bills"
          value={todayBillsCount}
          subtitle={`₹${todayBillsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} invoiced`}
          icon={Receipt}
          trend={todayBillsCount > 0 ? "Active today" : "No bills yet"}
          trendDirection="neutral"
        />

        <StatCard
          title="Today's Collections"
          value={`₹${todayPaymentsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtitle="Payments received today"
          icon={IndianRupee}
          badgeVariant="success"
        />

        <StatCard
          title="Today's Expenses"
          value={`₹${todayExpensesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtitle={`${todayExpensesCount} expense${todayExpensesCount === 1 ? "" : "s"} today`}
          icon={Banknote}
          badgeVariant={todayExpensesAmount > 0 ? "warning" : "default"}
        />

        <StatCard
          title="Total Outstanding"
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
        />
      </div>

      {/* 3. Primary Operations Tables: Recent Bills & Low Stock Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Bills */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand" />
              <h2 className="text-base font-bold text-ink-primary">Recent Bills</h2>
            </div>
            <Link href="/invoices" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentBills.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-secondary">
              No bills created yet. Click &quot;New Bill&quot; to generate your first invoice.
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

      {/* 4. Secondary Operations Row: Recent Customers & Upcoming Follow-ups */}
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
