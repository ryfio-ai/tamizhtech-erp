"use client";

import { useEffect, useState } from "react";
import { DashboardStats } from "@/types";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { PaymentStatusChart } from "@/components/dashboard/PaymentStatusChart";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { UpcomingFollowUps } from "@/components/dashboard/UpcomingFollowUps";
import { formatCurrency, cn } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Plus, Users, IndianRupee, CreditCard, CalendarClock, AlertTriangle, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      
      if (json.success) {
        setStats(json.data);
      } else {
        setError(json.error || "Failed to load dashboard data");
        toast.error("Error loading dashboard data");
      }
    } catch (err: any) {
       setError(err.message);
       toast.error("Network error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) return <LoadingSkeleton type="page" />;

  if (error && !stats) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center bg-white rounded-xl border border-red-100 p-8 shadow-sm">
         <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
         <h2 className="text-xl font-bold text-navy mb-2">Failed to load Dashboard</h2>
         <p className="text-gray-500 mb-6">{error}</p>
         <Button onClick={fetchStats} variant="outline">Try Again</Button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Page Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500">Welcome back. Here's what's happening today.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
           <Link href="/clients?new=true">
             <Button size="sm" className="bg-white text-navy border border-gray-200 hover:bg-gray-50 shadow-sm gap-2">
                <Plus className="w-4 h-4" /> Client
             </Button>
           </Link>
           <Link href="/invoices/new">
             <Button size="sm" className="bg-brand text-white hover:bg-brand-dark shadow-sm gap-2">
                <FileText className="w-4 h-4" /> Invoice
             </Button>
           </Link>
        </div>
      </div>

      {/* Alerts */}
      {stats.overdueFollowUps > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
               <CalendarClock className="w-5 h-5 text-red-600" />
             </div>
             <div>
               <h3 className="text-sm font-semibold text-red-800">Action Required</h3>
               <p className="text-xs text-red-600">You have {stats.overdueFollowUps} overdue follow-up{stats.overdueFollowUps !== 1 && 's'} pending.</p>
             </div>
           </div>
           <Link href="/followups?filter=overdue">
             <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-100 bg-white">
               View Tasks
             </Button>
           </Link>
        </div>
      )}

      {/* Stat Cards Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Active Clients"
          value={stats.totalActiveClients}
          icon={Users}
          iconClassName="bg-blue-50 text-blue-600"
          description="Clients currently taking services"
        />
        <StatsCard 
          title="Revenue This Month"
          value={formatCurrency(stats.totalRevenueThisMonth)}
          icon={IndianRupee}
          iconClassName="bg-green-50 text-green-600"
          description="Invoiced amount grouped by month"
        />
        <StatsCard 
          title="Outstanding Balances"
          value={formatCurrency(stats.totalOutstandingBalance)}
          icon={CreditCard}
          iconClassName="bg-amber-50 text-amber-600"
          description="Total unpaid amounts across system"
          trend={stats.overdueInvoices > 0 ? "down" : "neutral"}
          trendValue={stats.overdueInvoices > 0 ? `${stats.overdueInvoices} overdue` : undefined}
        />
        <StatsCard 
          title="Pending Follow-ups"
          value={stats.pendingFollowUps}
          icon={CalendarClock}
          iconClassName="bg-purple-50 text-purple-600"
          description="Total tasks waiting to be processed"
        />
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Chart (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-navy">Revenue Overview</h3>
            <p className="text-xs text-gray-500">Gross revenue invoiced over the last 6 months</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <RevenueChart data={stats.monthlyRevenue || []} />
          </div>
        </div>

        {/* Payment Demographics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-navy">Payment Distribution</h3>
            <p className="text-xs text-gray-500">Status of all generated invoices</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <PaymentStatusChart data={stats.paymentStatusBreakdown} />
          </div>
        </div>

      </div>

      {/* Bottom Row Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-navy">Recent Invoices</h3>
              <p className="text-xs text-gray-500">Latest 5 invoices created</p>
            </div>
            <Link href="/invoices">
              <span className="text-sm text-brand font-medium hover:underline">View All</span>
            </Link>
          </div>
          <div className="flex-1 p-0">
             <RecentInvoices data={stats.recentInvoices || []} />
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-navy">Upcoming Follow-ups</h3>
              <p className="text-xs text-gray-500">Scheduled for the next 7 days</p>
            </div>
            <Link href="/followups">
              <span className="text-sm text-brand font-medium hover:underline">View Kanban</span>
            </Link>
          </div>
          <div className="flex-1 p-5 pt-4">
             <UpcomingFollowUps 
               data={stats.upcomingFollowUps || []} 
               onMarkDone={async (id) => {
                 toast.info("Navigate to Follow-ups tab to execute action.");
               }}
             />
          </div>
        </div>

      </div>

    </div>
  );
}
