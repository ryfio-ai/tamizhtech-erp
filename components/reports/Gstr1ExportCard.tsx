"use client";

import React, { useState, useEffect } from "react";
import { FileSpreadsheet, Download, FileText, Calendar, Filter, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatINR } from "@/lib/money";

interface Gstr1Summary {
  invoicesCount: number;
  totalTaxableRupees: number;
  totalCgstRupees: number;
  totalSgstRupees: number;
  totalIgstRupees: number;
  totalInvoiceValueRupees: number;
  b2bCount: number;
  b2cCount: number;
}

export function Gstr1ExportCard() {
  const currentYear = new Date().getFullYear();
  // Financial Year default
  const defaultFy = new Date().getMonth() >= 3 ? `${currentYear}-${(currentYear + 1).toString().slice(2)}` : `${currentYear - 1}-${currentYear.toString().slice(2)}`;

  const [financialYear, setFinancialYear] = useState(defaultFy);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [useCustomDates, setUseCustomDates] = useState(false);

  const [summary, setSummary] = useState<Gstr1Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      let query = "";
      if (useCustomDates && fromDate && toDate) {
        query = `fromDate=${fromDate}&toDate=${toDate}`;
      } else {
        query = `financialYear=${financialYear}`;
      }

      const res = await fetch(`/api/reports/gstr1?${query}`);
      const json = await res.json();
      if (json.success) {
        setSummary(json.summary);
      } else {
        toast.error(json.error || "Failed to load GSTR-1 summary");
      }
    } catch (err: any) {
      console.error("GSTR-1 fetch error:", err);
      toast.error(err.message || "Network error loading GSTR-1 data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [financialYear, fromDate, toDate, useCustomDates]);

  const handleExport = async (format: "csv" | "xlsx") => {
    if (format === "csv") setExportingCsv(true);
    else setExportingXlsx(true);

    try {
      let query = `format=${format}`;
      if (useCustomDates && fromDate && toDate) {
        query += `&fromDate=${fromDate}&toDate=${toDate}`;
      } else {
        query += `&financialYear=${financialYear}`;
      }

      const downloadUrl = `/api/reports/gstr1/export?${query}`;
      
      // Trigger download via temporary link
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`GSTR-1 Sales Report (${format.toUpperCase()}) exported successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setExportingCsv(false);
      setExportingXlsx(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-navy flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            GST Reports — GSTR-1 Sales Export
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Authoritative outward B2B & B2C tax invoice report with Intra-state (CGST+SGST) vs Inter-state (IGST) split.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={exportingCsv || loading || (summary?.invoicesCount === 0)}
            onClick={() => handleExport("csv")}
            className="h-9 px-3 text-xs gap-1.5 border-gray-300 hover:bg-gray-50 font-semibold"
          >
            {exportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-gray-500" />}
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            disabled={exportingXlsx || loading || (summary?.invoicesCount === 0)}
            onClick={() => handleExport("xlsx")}
            className="h-9 px-3.5 text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm"
          >
            {exportingXlsx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-gray-50/80 p-3 sm:p-4 rounded-xl border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Financial Year:</span>
            <select
              value={financialYear}
              disabled={useCustomDates}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[36px]"
            >
              <option value="2026-27">FY 2026-27 (Apr 2026 - Mar 2027)</option>
              <option value="2025-26">FY 2025-26 (Apr 2025 - Mar 2026)</option>
              <option value="2024-25">FY 2024-25 (Apr 2024 - Mar 2025)</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useCustomDates}
              onChange={(e) => setUseCustomDates(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Custom Date Range</span>
          </label>
        </div>

        {useCustomDates && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs min-h-[36px]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs min-h-[36px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Real-time Summary Cards */}
      {loading ? (
        <div className="py-8 text-center text-xs text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
          Calculating GSTR-1 outward tax metrics...
        </div>
      ) : summary && summary.invoicesCount > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">Invoices</span>
              <p className="text-lg sm:text-xl font-bold text-navy mt-1">{summary.invoicesCount}</p>
              <span className="text-[10px] text-gray-500">{summary.b2bCount} B2B | {summary.b2cCount} B2C</span>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">Taxable Value</span>
              <p className="text-base sm:text-lg font-bold text-gray-900 mt-1">{formatINR(summary.totalTaxableRupees)}</p>
              <span className="text-[10px] text-gray-500">Net Sales Value</span>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
              <span className="text-[11px] text-blue-700 font-medium uppercase tracking-wider block">CGST</span>
              <p className="text-base sm:text-lg font-bold text-blue-900 mt-1">{formatINR(summary.totalCgstRupees)}</p>
              <span className="text-[10px] text-blue-600">Central Tax</span>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200">
              <span className="text-[11px] text-indigo-700 font-medium uppercase tracking-wider block">SGST</span>
              <p className="text-base sm:text-lg font-bold text-indigo-900 mt-1">{formatINR(summary.totalSgstRupees)}</p>
              <span className="text-[10px] text-indigo-600">State Tax</span>
            </div>

            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200">
              <span className="text-[11px] text-purple-700 font-medium uppercase tracking-wider block">IGST</span>
              <p className="text-base sm:text-lg font-bold text-purple-900 mt-1">{formatINR(summary.totalIgstRupees)}</p>
              <span className="text-[10px] text-purple-600">Integrated Tax</span>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-medium uppercase tracking-wider block">Invoice Value</span>
              <p className="text-base sm:text-lg font-bold text-emerald-950 mt-1">{formatINR(summary.totalInvoiceValueRupees)}</p>
              <span className="text-[10px] text-emerald-700">Gross Invoiced</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-gray-50/50 border border-dashed border-gray-200 rounded-xl space-y-1">
          <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-1" />
          <p className="text-xs font-bold text-gray-700">No eligible invoices found</p>
          <p className="text-[11px] text-gray-500">
            There are no issued invoices in the selected period ({useCustomDates ? `${fromDate} to ${toDate}` : `FY ${financialYear}`}).
          </p>
        </div>
      )}
    </div>
  );
}
