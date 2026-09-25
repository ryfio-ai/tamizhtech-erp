"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  Download,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { formatISTDate } from "@/lib/time";

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);


  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotations");
      const data = await res.json();
      if (data.success) {
        setQuotations(data.quotations || []);
      }
    } catch (err) {
      console.error("Failed to load quotations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleConvertToInvoice = async (quotationId: string) => {
    if (!confirm("Are you sure you want to convert this quotation into an invoice?")) return;

    setConvertingId(quotationId);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully converted to invoice ${data.invoice.invoiceNo}!`);
        router.push(`/invoices/${data.invoice.id}`);
      } else {
        alert(data.error || "Failed to convert quotation");
      }
    } catch (err) {
      console.error("Conversion error:", err);
      alert("An unexpected error occurred during conversion.");
    } finally {
      setConvertingId(null);
    }
  };

  const handleDeleteQuotation = async (id: string, qNo: string) => {
    if (!confirm(`Are you sure you want to permanently delete quotation ${qNo} from the ERP? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setQuotations((prev) => prev.filter((q) => q.id !== id));
      } else {
        alert(data.error || "Failed to delete quotation");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete quotation");
    } finally {
      setDeletingId(null);
    }
  };

  // Metrics
  const totalCount = quotations.length;
  const draftCount = quotations.filter((q) => q.status === "DRAFT").length;
  const sentCount = quotations.filter((q) => q.status === "SENT").length;
  const acceptedCount = quotations.filter((q) => q.status === "ACCEPTED").length;
  const totalValue = quotations.reduce((sum, q) => sum + (q.total || 0), 0);

  // Filtered list
  const filteredQuotations = quotations.filter((q) => {
    const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      q.quotationNo.toLowerCase().includes(query) ||
      q.client?.name?.toLowerCase().includes(query) ||
      q.client?.phone?.includes(query);
    return matchesStatus && matchesQuery;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Draft</span>;
      case "SENT":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Sent</span>;
      case "ACCEPTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Accepted</span>;
      case "REJECTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      case "EXPIRED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Expired</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            Quotations & Estimates
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Create commercial proposals with line-rate freedom and custom requirements. Zero stock impact.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          <button
            onClick={fetchQuotations}
            className="p-2 text-gray-500 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <Link
            href="/quotations/new"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            Create Quotation
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Proposals</span>
          <p className="text-2xl font-bold text-navy mt-1">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Drafts</span>
          <p className="text-2xl font-bold text-gray-700 mt-1">{draftCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Sent to Clients</span>
          <p className="text-2xl font-bold text-blue-700 mt-1">{sentCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Accepted Offers</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{acceptedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-primary uppercase tracking-wider">Total Quoted Pipeline</span>
          <p className="text-2xl font-bold text-navy mt-1">{formatINR(totalValue)}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {["ALL", "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-navy text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {st === "ALL" ? "All Quotations" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search quotation or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Loading quotations...</div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700">No quotations found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery || statusFilter !== "ALL"
                ? "Try clearing your filters or search query."
                : "Create your first corporate quotation for robotics, parts, or custom engineering services."}
            </p>
            <Link
              href="/quotations/new"
              className="mt-4 inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Create Quotation
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile View (< 768px): Touch-Friendly Quotation Cards */}
            <div className="md:hidden divide-y divide-gray-100 p-3 space-y-3">
              {filteredQuotations.map((q) => (
                <div
                  key={q.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/quotations/${q.id}`}
                        className="font-bold text-sm text-navy hover:text-primary transition-colors block"
                      >
                        {q.quotationNo}
                      </Link>
                      <h4 className="font-semibold text-gray-900 text-sm mt-0.5">{q.client?.name || "Client"}</h4>
                    </div>
                    {getStatusBadge(q.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400 block">Date</span>
                      <span>{formatISTDate(q.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400 block">Valid Until</span>
                      <span>{formatISTDate(q.validUntil)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">{q.items?.length || 0} items</span>
                    <div className="text-right">
                      <span className="text-gray-400 text-[10px] uppercase block font-semibold">Total Quoted</span>
                      <span className="font-bold text-navy text-sm">{formatINR(q.total)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                    <a
                      href={`/api/quotations/${q.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 font-medium"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </a>

                    {q.status !== "ACCEPTED" && q.status !== "CANCELLED" && (
                      <button
                        onClick={() => handleConvertToInvoice(q.id)}
                        disabled={convertingId === q.id}
                        className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {convertingId === q.id ? "Converting..." : "Invoice"}
                      </button>
                    )}

                    <Link
                      href={`/quotations/${q.id}`}
                      className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1 text-xs text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg font-semibold"
                    >
                      View &rarr;
                    </Link>

                    <button
                      onClick={() => handleDeleteQuotation(q.id, q.quotationNo)}
                      disabled={deletingId === q.id}
                      className="min-h-[38px] px-3 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg text-xs"
                      title="Delete Quotation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View (>= 768px): Quotations Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Quotation No</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Valid Until</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {filteredQuotations.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-navy">
                        <Link href={`/quotations/${q.id}`} className="hover:text-primary transition-colors">
                          {q.quotationNo}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900">{q.client?.name || "Client"}</div>
                        <div className="text-xs text-gray-500">{q.client?.phone || q.client?.company || "-"}</div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">
                        {formatISTDate(q.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">
                        {formatISTDate(q.validUntil)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">
                        <span className="font-medium text-gray-900">{q.items?.length || 0}</span> items
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-navy">
                        {formatINR(q.total)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(q.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <a
                          href={`/api/quotations/${q.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-navy px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                          title="Download A4 PDF"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>

                        {q.status !== "ACCEPTED" && q.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleConvertToInvoice(q.id)}
                            disabled={convertingId === q.id}
                            className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-medium transition-colors disabled:opacity-50"
                            title="Convert to Invoice"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {convertingId === q.id ? "Converting..." : "Invoice"}
                          </button>
                        )}

                        <Link
                          href={`/quotations/${q.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-1.5 py-1 font-medium"
                        >
                          View &rarr;
                        </Link>

                        <button
                          onClick={() => handleDeleteQuotation(q.id, q.quotationNo)}
                          disabled={deletingId === q.id}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded border border-transparent hover:border-red-200 transition-colors disabled:opacity-50"
                          title="Delete Quotation from ERP"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
