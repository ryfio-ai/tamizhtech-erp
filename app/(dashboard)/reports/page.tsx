"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  RefreshCw,
  Wallet,
  AlertCircle,
  Building2,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { formatINR } from "@/lib/money";

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Default date filter: current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [asOfDate, setAsOfDate] = useState(lastDay);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const url = `/api/reports?startDate=${startDate}&endDate=${endDate}&asOfDate=${asOfDate}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        alert(json.error || "Failed to load report");
      }
    } catch (err) {
      console.error("Failed to load report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, asOfDate]);

  const setPeriodShortcut = (preset: "THIS_MONTH" | "LAST_MONTH" | "THIS_QUARTER") => {
    const today = new Date();
    if (preset === "THIS_MONTH") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
      setStartDate(start);
      setEndDate(end);
      setAsOfDate(end);
    } else if (preset === "LAST_MONTH") {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0];
      const end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0];
      setStartDate(start);
      setEndDate(end);
      setAsOfDate(end);
    } else if (preset === "THIS_QUARTER") {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1).toISOString().split("T")[0];
      const end = new Date(today.getFullYear(), (q + 1) * 3, 0).toISOString().split("T")[0];
      setStartDate(start);
      setEndDate(end);
      setAsOfDate(end);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-primary" />
            Financial & Operations Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Authoritative 3-Pillar reconciliation: Accrual Sales vs Actual Cash Flow vs Rolling WAC Inventory.
          </p>
        </div>
        <button
          onClick={fetchReport}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-medium shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh Report
        </button>
      </div>

      {/* Date Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setPeriodShortcut("THIS_MONTH")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-100"
          >
            This Month
          </button>
          <button
            onClick={() => setPeriodShortcut("LAST_MONTH")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-100"
          >
            Last Month
          </button>
          <button
            onClick={() => setPeriodShortcut("THIS_QUARTER")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-100"
          >
            This Quarter
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs w-full lg:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setAsOfDate(e.target.value);
              }}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
            <span className="text-navy font-semibold">As-Of Date:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-2.5 py-1.5 border border-primary/40 bg-primary/5 rounded-lg text-xs font-semibold text-navy"
            />
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="p-16 text-center text-gray-500 text-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          Calculating financial metrics across ledgers...
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* ─────────────────────────────────────────────────────────────
              PILLAR 1: SALES PERFORMANCE (ACCRUAL)
             ───────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Pillar 1: Sales Performance (Accrual Basis)
                </h2>
                <p className="text-xs text-gray-500">
                  Recognized from valid issued invoices in period. Separated from actual cash collection.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700">
                {data.sales?.invoicesCount || 0} Invoices Issued
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-500 font-medium">Gross Invoiced Total</span>
                <p className="text-xl font-bold text-navy mt-1">
                  {formatINR(data.sales?.grossInvoicedTotal || 0)}
                </p>
                <span className="text-[11px] text-gray-500">Total billable value</span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-500 font-medium">Physical Product Sales</span>
                <p className="text-xl font-bold text-blue-700 mt-1">
                  {formatINR(data.sales?.productSalesInvoiced || 0)}
                </p>
                <span className="text-[11px] text-gray-500">Hardware & robotics</span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-500 font-medium">Service & Engineering Sales</span>
                <p className="text-xl font-bold text-purple-700 mt-1">
                  {formatINR(data.sales?.serviceSalesInvoiced || 0)}
                </p>
                <span className="text-[11px] text-gray-500">Zero stock impact</span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-amber-700 font-medium">Tax on Issued Invoices</span>
                <p className="text-xl font-bold text-amber-800 mt-1">
                  {formatINR(data.sales?.taxOnIssuedInvoices || 0)}
                </p>
                <span className="text-[11px] text-amber-600">GST invoiced in period</span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PILLAR 2: CASH FLOW (ACTUAL LIQUIDITY)
             ───────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Pillar 2: Cash Flow (Actual Liquidity via Payment Ledgers)
                </h2>
                <p className="text-xs text-gray-500">
                  Strictly tracks money in and money out by payment date. Independent of billing or procurement accruals.
                </p>
              </div>
              <div
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  data.cashFlow?.netCashMovement >= 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                Net Flow: {formatINR(data.cashFlow?.netCashMovement || 0)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-800 font-medium">Customer Cash Received</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-bold text-emerald-900 mt-1">
                  {formatINR(data.cashFlow?.customerPaymentsReceived || 0)}
                </p>
                <span className="text-[11px] text-emerald-700">Actual collections in period</span>
              </div>

              <div className="p-4 rounded-xl bg-red-50/50 border border-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-800 font-medium">Inventory Cash Paid</span>
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-xl font-bold text-red-900 mt-1">
                  {formatINR(data.cashFlow?.inventoryPaymentsPaid || 0)}
                </p>
                <span className="text-[11px] text-red-700">Paid to suppliers</span>
              </div>

              <div className="p-4 rounded-xl bg-red-50/50 border border-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-800 font-medium">Operating Expenses Paid</span>
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-xl font-bold text-red-900 mt-1">
                  {formatINR(data.cashFlow?.operatingExpensesPaid || 0)}
                </p>
                <span className="text-[11px] text-red-700">Rent, EB, fuel, labour</span>
              </div>

              <div className="p-4 rounded-xl bg-navy text-white">
                <span className="text-xs text-gray-300 font-medium">Total Cash Outflow</span>
                <p className="text-xl font-bold text-white mt-1">
                  {formatINR(data.cashFlow?.totalCashOutflow || 0)}
                </p>
                <span className="text-[11px] text-gray-300">Inventory + Operating</span>
              </div>
            </div>

            {/* Operating Expenses Breakdown */}
            {data.cashFlow?.expensesByCategory && Object.keys(data.cashFlow.expensesByCategory).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Operating Expenses Paid by Category
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.cashFlow.expensesByCategory).map(([cat, amt]: any) => (
                    <div
                      key={cat}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    >
                      <span className="text-gray-600 capitalize">{cat.replace(/_/g, " ").toLowerCase()}: </span>
                      <span className="font-semibold text-navy">{formatINR(amt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PILLAR 3: INVENTORY POSITION & VALUATION
             ───────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Pillar 3: Inventory Position & Rolling WAC Valuation
                </h2>
                <p className="text-xs text-gray-500">
                  Physical stock movements and asset valuation. In-house production increases assets without fake supplier payables.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded bg-indigo-50 text-indigo-700">
                Asset Value: {formatINR(data.inventory?.totalInventoryValuation || 0)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-500 font-medium">Total Sourcing Cost (Incurred)</span>
                <p className="text-xl font-bold text-navy mt-1">
                  {formatINR(data.inventory?.totalSourcingCostIncurred || 0)}
                </p>
                <div className="text-[11px] text-gray-500 space-y-0.5 mt-1">
                  <div>Online: {formatINR(data.inventory?.onlineSourcingCost || 0)}</div>
                  <div>Offline: {formatINR(data.inventory?.offlineSourcingCost || 0)}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-500 font-medium">In-House Production Cost</span>
                <p className="text-xl font-bold text-indigo-700 mt-1">
                  {formatINR(data.inventory?.inHouseProductionCost || 0)}
                </p>
                <span className="text-[11px] text-gray-500">Added to inventory, zero supplier debt</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
                <span className="text-xs text-amber-800 font-medium">Supplier Accounts Payable</span>
                <p className="text-xl font-bold text-amber-900 mt-1">
                  {formatINR(data.inventory?.externalSourcingPayable || 0)}
                </p>
                <span className="text-[11px] text-amber-700">Unpaid external procurement</span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-500 font-medium">Physical Stock Movements</span>
                <div className="text-xs text-gray-700 mt-1 space-y-0.5">
                  <div>Inbound: +{(data.inventory?.movements?.purchaseUnits || 0) + (data.inventory?.movements?.productionUnits || 0)} units</div>
                  <div>Outbound: -{(data.inventory?.movements?.saleUnits || 0) + (data.inventory?.movements?.damageUnits || 0)} units</div>
                </div>
              </div>
            </div>

            {/* Inventory Valuation Table Preview */}
            {data.inventory?.valuationList && data.inventory.valuationList.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 overflow-x-auto">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  In-Stock Products Valuation by Rolling WAC
                </h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3 text-center">Closing In-Stock</th>
                      <th className="py-2 px-3 text-right">Rolling WAC</th>
                      <th className="py-2 px-3 text-right">Inventory Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.inventory.valuationList.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono text-gray-600">{item.sku}</td>
                        <td className="py-2 px-3 font-medium text-navy">{item.name}</td>
                        <td className="py-2 px-3 text-center">{item.stockQuantity}</td>
                        <td className="py-2 px-3 text-right text-gray-700">{formatINR(item.rollingWAC)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-navy">{formatINR(item.valuation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              POINT-IN-TIME RECEIVABLES AS OF REPORT DATE
             ───────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Point-in-Time Customer Receivables (As of {new Date(asOfDate).toLocaleDateString("en-IN")})
                </h2>
                <p className="text-xs text-gray-500">
                  Calculated from historical issued invoices and completed payments on or before the selected as-of date.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Outstanding: {formatINR(data.receivables?.customerOutstandingAsOfDate || 0)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-500 font-medium">Cumulative Invoiced to Date</span>
                <p className="text-xl font-bold text-navy mt-1">
                  {formatINR(data.receivables?.cumulativeInvoicedAsOfDate || 0)}
                </p>
                <span className="text-[11px] text-gray-500">Active issued invoices up to date</span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-500 font-medium">Cumulative Customer Payments</span>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {formatINR(data.receivables?.cumulativePaymentsAsOfDate || 0)}
                </p>
                <span className="text-[11px] text-gray-500">Completed receipts up to date</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
                <span className="text-xs text-amber-800 font-medium">Net Customer Outstanding</span>
                <p className="text-xl font-bold text-amber-900 mt-1">
                  {formatINR(data.receivables?.customerOutstandingAsOfDate || 0)}
                </p>
                <span className="text-[11px] text-amber-700">Point-in-time balance due</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
