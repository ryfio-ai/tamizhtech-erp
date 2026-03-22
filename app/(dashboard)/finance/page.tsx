"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { formatCurrency } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet,
  PieChart as PieIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6b7280'];

export default function FinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const res = await fetch('/api/finance/stats');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch finance data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  if (loading) return <LoadingSkeleton type="page" />;
  if (!data) return <div className="p-8 text-center text-gray-500">Failed to load financial data.</div>;

  const { summary, monthlyTrend, expenseByCategory, recentExpenses } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Finance Dashboard</h1>
          <p className="text-sm text-gray-500">Comprehensive overview of revenue, expenses, and profitability.</p>
        </div>
        
        <div className="flex items-center gap-2">
           <Link href="/invoices/new">
             <Button size="sm" variant="outline" className="gap-2">
                <Receipt className="w-4 h-4" /> New Invoice
             </Button>
           </Link>
           <Button size="sm" className="bg-brand text-white hover:bg-brand-dark gap-2">
              <IndianRupee className="w-4 h-4" /> Add Expense
           </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Invoiced"
          value={formatCurrency(summary.totalInvoiced)}
          icon={IndianRupee}
          iconClassName="bg-blue-50 text-blue-600"
          description="Gross billed amount"
        />
        <StatsCard 
          title="Total Received"
          value={formatCurrency(summary.totalReceived)}
          icon={TrendingUp}
          iconClassName="bg-green-50 text-green-600"
          description={`₹${summary.totalReceivedThisMonth.toLocaleString()} this month`}
        />
        <StatsCard 
          title="Total Expenses"
          value={formatCurrency(summary.totalExpenses)}
          icon={TrendingDown}
          iconClassName="bg-red-50 text-red-600"
          description={`₹${summary.totalExpensesThisMonth.toLocaleString()} this month`}
        />
        <StatsCard 
          title="Net Profit"
          value={formatCurrency(summary.netProfitAllTime)}
          icon={Wallet}
          iconClassName={summary.netProfitAllTime >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}
          description={summary.netProfitThisMonth >= 0 ? "Profitable this month" : "Loss this month"}
          trend={summary.netProfitThisMonth >= 0 ? "up" : "down"}
          trendValue={formatCurrency(Math.abs(summary.netProfitThisMonth))}
        />
      </div>

      {/* Monthly Performance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-navy">Revenue vs Expenses</h3>
              <p className="text-xs text-gray-500">Monthly comparison of incoming and outgoing funds</p>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #eee' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-navy">Expense Breakdown</h3>
            <p className="text-xs text-gray-500">Distribution by category</p>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseByCategory.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend layout="vertical" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Row - Recent Transactions & Charts of Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-base font-semibold text-navy">Recent Expenses</h3>
            <Button variant="ghost" size="sm" className="text-brand text-xs">View All</Button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentExpenses.map((exp: any) => (
              <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{exp.description || exp.category}</p>
                    <p className="text-xs text-gray-500">{new Date(exp.date).toLocaleDateString()} • {exp.category}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-red-600">-{formatCurrency(exp.amount)}</p>
              </div>
            ))}
            {recentExpenses.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm italic">No recent expenses found.</div>
            )}
          </div>
        </div>

        {/* Profitability Margin Cards or Accounts Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-navy mb-6">Profitability Indicators</h3>
          <div className="space-y-4">
             <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PieIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Gross Margin</span>
                </div>
                <span className="text-lg font-bold text-blue-900">
                  {summary.totalInvoiced > 0 ? ((summary.netProfitAllTime / summary.totalInvoiced) * 100).toFixed(1) : 0}%
                </span>
             </div>
             
             <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-900">Collection Rate</span>
                </div>
                <span className="text-lg font-bold text-emerald-900">
                  {summary.totalInvoiced > 0 ? ((summary.totalReceived / summary.totalInvoiced) * 100).toFixed(1) : 0}%
                </span>
             </div>

             <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ArrowDownRight className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">Expense Ratio</span>
                </div>
                <span className="text-lg font-bold text-amber-900">
                  {summary.totalInvoiced > 0 ? ((summary.totalExpenses / summary.totalInvoiced) * 100).toFixed(1) : 0}%
                </span>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
}
