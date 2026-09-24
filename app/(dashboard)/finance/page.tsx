"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  PieChart as PieIcon,
  Plus,
  Ban,
  CheckCircle2,
  X,
  CreditCard,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatINR } from "@/lib/money";

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6b7280'];

const EXPENSE_CATEGORIES = [
  "RENT",
  "ELECTRICITY",
  "PETROL_FUEL",
  "TRAVEL",
  "INTERNET_PHONE",
  "EXTERNAL_WORK",
  "TECHNICIAN_LABOUR",
  "VENDOR_SERVICE",
  "OFFICE_SUPPLIES",
  "MARKETING",
  "OTHER"
];

function FinanceContent() {
  const [data, setData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<any | null>(null);

  // Add form
  const [category, setCategory] = useState("RENT");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paidTo, setPaidTo] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isPaidNow, setIsPaidNow] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [referenceNo, setReferenceNo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER");
  const [payRef, setPayRef] = useState("");
  const [paying, setPaying] = useState(false);

  const fetchFinanceData = async () => {
    try {
      const [statsRes, expensesRes] = await Promise.all([
        fetch('/api/finance/stats'),
        fetch('/api/finance/expenses')
      ]);
      const statsJson = await statsRes.json();
      const expJson = await expensesRes.json();

      if (statsJson.success) setData(statsJson.data);
      if (expJson.success) setExpenses(expJson.expenses || []);
    } catch (err) {
      console.error("Failed to fetch finance data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
    if (searchParams.get("new") === "true" || searchParams.get("action") === "new") {
      setShowAddModal(true);
      router.replace("/finance", { scroll: false });
    }
  }, [searchParams]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmt = parseFloat(amount);
    if (isNaN(cleanAmt) || cleanAmt <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount: cleanAmt,
          date,
          paidTo,
          description,
          notes,
          referenceNo,
          initialPaidAmount: isPaidNow ? cleanAmt : 0,
          paymentMethod,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setShowAddModal(false);
        setAmount("");
        setDescription("");
        setPaidTo("");
        setReferenceNo("");
        fetchFinanceData();
      } else {
        alert(resData.error || "Failed to create expense");
      }
    } catch (err) {
      console.error("Create expense error:", err);
      alert("Error saving expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    const cleanPay = parseFloat(payAmount);
    if (isNaN(cleanPay) || cleanPay <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    setPaying(true);
    try {
      const res = await fetch(`/api/finance/expenses/${showPaymentModal.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cleanPay,
          paymentDate: payDate,
          paymentMethod: payMethod,
          paymentReference: payRef,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setShowPaymentModal(null);
        setPayAmount("");
        fetchFinanceData();
      } else {
        alert(resData.error || "Failed to record payment");
      }
    } catch (err) {
      console.error("Record payment error:", err);
      alert("Error recording payment");
    } finally {
      setPaying(false);
    }
  };

  const handleVoidExpense = async (id: string) => {
    if (!confirm("Are you sure you want to void this expense? Voided expenses are excluded from totals and preserved in the audit log.")) return;

    try {
      const res = await fetch(`/api/finance/expenses/${id}`, { method: "DELETE" });
      const resData = await res.json();
      if (resData.success) {
        fetchFinanceData();
      } else {
        alert(resData.error || "Failed to void expense");
      }
    } catch (err) {
      console.error("Void error:", err);
    }
  };

  if (loading) return <LoadingSkeleton type="page" />;
  if (!data) return <div className="p-8 text-center text-gray-500">Failed to load financial data.</div>;

  const { summary, monthlyTrend, expenseByCategory } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12 p-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight flex items-center gap-2">
            <Wallet className="w-7 h-7 text-primary" />
            Operating Expenses & Cash Management
          </h1>
          <p className="text-sm text-gray-500">
            Track business operating expenses with decoupled approval and actual cash payment states.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
           <button
             onClick={fetchFinanceData}
             className="p-2 text-gray-500 hover:text-navy hover:bg-gray-100 rounded-lg"
             title="Refresh"
           >
             <RefreshCw className="w-5 h-5" />
           </button>
           <Link href="/invoices/new">
             <Button size="sm" variant="outline" className="gap-2">
                <Receipt className="w-4 h-4" /> New Invoice
             </Button>
           </Link>
           <Button
             size="sm"
             onClick={() => setShowAddModal(true)}
             className="bg-primary text-white hover:bg-primary/90 gap-2 font-medium"
           >
              <Plus className="w-4 h-4" /> Add Expense
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
          description={`₹${Number(summary.totalReceivedThisMonth || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} this month`}
        />
        <StatsCard 
          title="Total Expenses"
          value={formatCurrency(summary.totalExpenses)}
          icon={TrendingDown}
          iconClassName="bg-red-50 text-red-600"
          description={`₹${Number(summary.totalExpensesThisMonth || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} this month`}
        />
        <StatsCard 
          title="Net Cash Profit"
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
          <div className="h-[320px]">
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
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
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

      {/* Authoritative Expense Ledger Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-navy">Operating Expenses Ledger</h3>
            <p className="text-xs text-gray-500">
              Approved unpaid bills are not counted as cash outflow until payment is recorded.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Record Expense
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase">
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Paid To / Description</th>
                <th className="py-3 px-4 text-right">Incurred Amount</th>
                <th className="py-3 px-4 text-right">Paid Amount</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4 text-center">Business Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map((exp) => {
                const isVoided = exp.status === "VOIDED";
                const isPaid = exp.paymentStatus === "PAID";
                return (
                  <tr key={exp.id} className={`hover:bg-gray-50/50 ${isVoided ? "opacity-50 bg-gray-50" : ""}`}>
                    <td className="py-3 px-4 font-mono font-medium text-navy">{exp.expenseNo}</td>
                    <td className="py-3 px-4 capitalize">{exp.category.replace(/_/g, " ").toLowerCase()}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{exp.paidTo || "-"}</div>
                      <div className="text-gray-500 text-[11px] truncate max-w-xs">{exp.description || exp.notes || "-"}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {formatINR(exp.paidAmount || 0)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          exp.paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : exp.paymentStatus === "PARTIAL"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {exp.paymentStatus || "UNPAID"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          exp.status === "APPROVED"
                            ? "bg-gray-100 text-gray-800"
                            : exp.status === "VOIDED"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {!isVoided && !isPaid && (
                        <button
                          onClick={() => {
                            setShowPaymentModal(exp);
                            setPayAmount(String(exp.amount - (exp.paidAmount || 0)));
                          }}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium"
                        >
                          Record Payment
                        </button>
                      )}
                      {!isVoided && (
                        <button
                          onClick={() => handleVoidExpense(exp.id)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-[11px]"
                          title="Void Expense"
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 italic">
                    No expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Expense */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Record Operating Expense
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Incurred Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Expense Amount (₹) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-semibold text-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Paid To / Payee</label>
                  <input
                    type="text"
                    placeholder="Landlord, Vendor, Fuel bunk..."
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description / Bill Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Office electricity bill for Sep 2026"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              {/* Payment Option */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="paidNow"
                    checked={isPaidNow}
                    onChange={(e) => setIsPaidNow(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="paidNow" className="font-semibold text-gray-800">
                    Expense already paid (Counts as Cash Outflow)
                  </label>
                </div>

                {isPaidNow && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs"
                      >
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Debit/Credit Card</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Reference / UTR / Bill No</label>
                      <input
                        type="text"
                        placeholder="Optional receipt reference"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-primary text-white">
                  {submitting ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Payment against Unpaid Expense */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" /> Record Expense Payment
              </h3>
              <button onClick={() => setShowPaymentModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
              <div>Voucher: <span className="font-mono font-semibold text-navy">{showPaymentModal.expenseNo}</span></div>
              <div>Category: <span className="font-semibold">{showPaymentModal.category}</span></div>
              <div>Total Incurred: <span className="font-semibold">{formatINR(showPaymentModal.amount)}</span></div>
              <div>Already Paid: <span className="text-emerald-700 font-semibold">{formatINR(showPaymentModal.paidAmount || 0)}</span></div>
              <div>Remaining Due: <span className="text-red-700 font-semibold">{formatINR(showPaymentModal.amount - (showPaymentModal.paidAmount || 0))}</span></div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg font-semibold text-navy text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Method *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Reference / UTR</label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345678"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPaymentModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={paying} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {paying ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<LoadingSkeleton type="page" />}>
      <FinanceContent />
    </Suspense>
  );
}
