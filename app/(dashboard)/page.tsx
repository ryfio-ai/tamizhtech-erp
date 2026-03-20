'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  IndianRupee, 
  CreditCard, 
  CalendarClock, 
  AlertCircle, 
  Plus, 
  ArrowRight
} from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import PaymentStatusChart from '@/components/dashboard/PaymentStatusChart';
import UpcomingFollowUps from '@/components/dashboard/UpcomingFollowUps';
import RecentInvoices from '@/components/dashboard/RecentInvoices';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DashboardStats } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        const result = await res.json();
        if (result.success) {
          setStats(result.data);
        } else {
          toast.error("Failed to load dashboard stats");
        }
      } catch (error) {
        toast.error("An error occurred while fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSkeleton type="page" />;
  if (!stats) return <div className="p-8 text-center bg-white rounded-2xl border">Failed to load stats. Please check your connection.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight">System Overview</h1>
          <p className="text-gray-500 font-medium">Welcome back, TamizhTech Admin.</p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Link href="/clients">
            <Button size="sm" variant="outline" className="rounded-xl border-brand/20 text-brand hover:bg-brand/5 h-11 px-4 font-bold shadow-sm">
               <Plus className="mr-2 h-4 w-4" /> New Client
            </Button>
          </Link>
          <Link href="/invoices">
            <Button size="sm" variant="outline" className="rounded-xl border-brand/20 text-brand hover:bg-brand/5 h-11 px-4 font-bold shadow-sm">
               <Plus className="mr-2 h-4 w-4" /> New Invoice
            </Button>
          </Link>
          <Link href="/payments">
            <Button size="sm" className="bg-brand hover:bg-brand-dark rounded-xl h-11 px-6 font-bold shadow-lg shadow-brand/20 transition-all">
               <CreditCard className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {stats.overdueFollowUps > 0 && (
          <div className="flex items-center p-4 bg-red-50 border border-red-100 rounded-2xl text-red-800 shadow-sm animate-pulse">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="font-bold text-sm">
              You have {stats.overdueFollowUps} overdue follow-up{stats.overdueFollowUps > 1 ? 's' : ''}. Action required!
            </span>
            <Link href="/followups" className="ml-auto underline font-black text-xs uppercase tracking-widest">
              Review Now
            </Link>
          </div>
        )}
        {stats.overdueInvoices > 0 && (
          <div className="flex items-center p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 shadow-sm">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="font-bold text-sm">
              {stats.overdueInvoices} invoice{stats.overdueInvoices > 1 ? 's are' : ' is'} past due and remains unpaid.
            </span>
            <Link href="/invoices" className="ml-auto underline font-black text-xs uppercase tracking-widest">
              Check Payments
            </Link>
          </div>
        )}
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Clients" 
          value={stats.totalActiveClients} 
          icon={Users} 
          description="Active clients currently trackable"
          iconClassName="bg-blue-50"
        />
        <StatsCard 
          title="Monthly Revenue" 
          value={formatCurrency(stats.totalRevenueThisMonth)} 
          icon={IndianRupee} 
          description="Revenue collected this month"
          iconClassName="bg-green-50"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard 
          title="Outstanding" 
          value={formatCurrency(stats.totalOutstandingBalance)} 
          icon={CreditCard} 
          description="Total unpaid balance across all clients"
          iconClassName="bg-red-50"
        />
        <StatsCard 
          title="Pending Actions" 
          value={stats.pendingFollowUps} 
          icon={CalendarClock} 
          description="Upcoming client interactions"
          iconClassName="bg-amber-50"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RevenueChart data={stats.monthlyRevenue} />
        <PaymentStatusChart data={stats.paymentStatusBreakdown} />
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2">
          <RecentInvoices invoices={stats.recentInvoices} />
        </div>
        <div>
          <UpcomingFollowUps followUps={stats.upcomingFollowUps} />
        </div>
      </div>
    </div>
  );
}
