"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Printer,
  Download,
  ArrowLeft,
  FileCheck,
  Ban,
  Clock,
  Truck,
  MapPin,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { formatDocumentDateTime } from "@/lib/dateFormat";

interface DeliveryChallanViewProps {
  challan: any;
  client?: any;
}

export function DeliveryChallanView({ challan, client }: DeliveryChallanViewProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const docDate = formatDocumentDateTime(challan.issuedAt || challan.date || challan.createdAt);
  const totalQty = (challan.items || []).reduce(
    (sum: number, it: any) => sum + (Number(it.quantity) || 0),
    0
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.open(`/api/challans/${challan.id}/pdf`, "_blank");
  };

  const handleIssue = async () => {
    if (!confirm("Are you sure you want to ISSUE this Delivery Challan? An official sequential number (TTRC-DC-YYYY-XXXX) will be allocated.")) {
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/challans/${challan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ISSUE" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to issue delivery challan");
      }
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to issue delivery challan");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancelling this Delivery Challan.");
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/challans/${challan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL", cancelReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel delivery challan");
      }
      setShowCancelModal(false);
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to cancel delivery challan");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar (Hidden in Print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Link
          href="/challans"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Challans
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {challan.status === "DRAFT" && (
            <button
              onClick={handleIssue}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" /> Issue Document
            </button>
          )}

          {challan.status === "ISSUED" && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Ban className="w-4 h-4" /> Cancel Challan
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Document Container */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-md p-6 sm:p-10 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-300 pb-6 gap-6">
          <div className="flex items-start gap-4">
            <img
              src="/assets/ttrc-logo.png"
              alt="Tamizh Tech Logo"
              className="w-16 h-12 object-contain"
              onError={(e) => {
                // fallback if not loaded
                (e.target as any).style.display = "none";
              }}
            />
            <div>
              <h1 className="text-lg font-bold text-slate-900">TAMIZH TECH ROBOTICS COMPANY</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Sri Vari Garden, 22, 3rd Cross, Kurumbapalayam, SSKulam, Sarcarsamakulam
              </p>
              <p className="text-xs text-slate-500">Coimbatore, Tamil Nadu - 641107, India</p>
              <p className="text-xs text-slate-500">
                Phone: +91 81480 45030 • Email: contact@tamizhtech.in
              </p>
            </div>
          </div>

          <div className="text-right sm:self-start">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-wide">DELIVERY CHALLAN</h2>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-0.5">
              GATE PASS / DISPATCH
            </p>
            <p className="text-[11px] text-slate-500 italic mt-1">Non-Financial Goods Movement</p>
            
            <div className="mt-3 inline-block">
              {challan.status === "ISSUED" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ISSUED
                </span>
              ) : challan.status === "CANCELLED" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                  <Ban className="w-3.5 h-3.5" /> CANCELLED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="w-3.5 h-3.5" /> DRAFT
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border-b border-slate-300 p-4 text-xs">
          <div className="space-y-1">
            <p className="text-slate-600">
              Challan Number:{" "}
              <strong className="text-slate-900 font-semibold">{challan.challanNumber}</strong>
            </p>
            <p className="text-slate-600">
              Issue Date: <strong className="text-slate-900 font-semibold">{docDate}</strong>
            </p>
            <p className="text-slate-600">
              Purpose of Dispatch:{" "}
              <strong className="text-slate-900 font-semibold uppercase">
                {challan.purpose?.replace(/_/g, " ")}
              </strong>
            </p>
          </div>
          <div className="space-y-1 sm:text-right">
            <p className="text-slate-600">
              Reference Document:{" "}
              <strong className="text-slate-900 font-semibold">
                {challan.referenceNo ? `${challan.referenceType}: ${challan.referenceNo}` : "Direct Dispatch"}
              </strong>
            </p>
            <p className="text-slate-600">
              Stock Impact:{" "}
              <strong className="text-slate-900 font-semibold">
                {challan.deductStock ? "Physical Dispatch (Inventory Deducted)" : "Paperwork Only (No Stock Mutation)"}
              </strong>
            </p>
          </div>
        </div>

        {/* Customer & Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-slate-300">
          <div className="p-4 sm:border-r border-slate-300 space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Consignee / Customer
            </p>
            <p className="text-sm font-bold text-slate-900">
              {client?.name || challan.contactPerson || "Valued Client"}
            </p>
            {client?.company && <p className="text-xs text-slate-600">{client.company}</p>}
            <p className="text-xs text-slate-600">Contact: {challan.contactPhone || client?.phone || "—"}</p>
            {client?.email && <p className="text-xs text-slate-600">Email: {client.email}</p>}
            {client?.gstin && <p className="text-xs text-slate-600">GSTIN: {client.gstin}</p>}
          </div>

          <div className="p-4 space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Destination / Delivery Address
            </p>
            <p className="text-xs text-slate-800 leading-relaxed">
              {challan.destination || "Destination address not available."}
            </p>
          </div>
        </div>

        {/* Transport Details Bar */}
        <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-300 p-3 text-xs gap-3">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Mode of Transport</p>
            <p className="text-slate-800 font-medium mt-0.5">
              {challan.transportMode || "Hand Delivery / Road"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Vehicle / Carrier No</p>
            <p className="text-slate-800 font-medium mt-0.5">{challan.vehicleNo || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">LR / Tracking No</p>
            <p className="text-slate-800 font-medium mt-0.5">{challan.lrNumber || "—"}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto border-b border-slate-300">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-300">
              <tr>
                <th className="p-3 w-12 text-center">S.No</th>
                <th className="p-3">Item Description</th>
                <th className="p-3 w-32 text-center">Part / SKU</th>
                <th className="p-3 w-20 text-center">Quantity</th>
                <th className="p-3 w-24 text-center">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(challan.items || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                  <td className="p-3">
                    <p className="font-semibold text-slate-900">{item.description}</p>
                    {item.notes && <p className="text-[11px] text-slate-500 mt-0.5">{item.notes}</p>}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600">{item.sku || "—"}</td>
                  <td className="p-3 text-center font-bold text-slate-900">{item.quantity}</td>
                  <td className="p-3 text-center text-slate-600">{item.unit || "pcs"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Item Summary Bar */}
        <div className="flex justify-between items-center bg-slate-50 p-3 border-b border-slate-300 text-xs font-semibold text-slate-800">
          <span>Total Distinct Items: {(challan.items || []).length}</span>
          <span>Total Dispatched Units: {totalQty}</span>
        </div>

        {/* Non-financial Disclaimer Box */}
        <div className="p-4 bg-amber-50/70 border-b border-slate-300 text-xs text-amber-900 space-y-1">
          <p className="font-bold uppercase tracking-wider text-[11px]">
            IMPORTANT NOTICE — NON-FINANCIAL DISPATCH DOCUMENT
          </p>
          <p className="text-amber-800">
            1. This Delivery Challan / Gate Pass is an internal goods dispatch document and is NOT an invoice, sale deed, or proof of payment.
          </p>
          <p className="text-amber-800">
            2. Goods dispatched under this challan remain the property of Tamizh Tech Robotics Company unless covered by a valid commercial tax invoice.
          </p>
          {challan.notes && (
            <p className="text-amber-900 font-semibold pt-1">
              Challan Remarks: {challan.notes}
            </p>
          )}
          {challan.cancelReason && (
            <p className="text-rose-700 font-semibold pt-1">
              Cancellation Reason: {challan.cancelReason}
            </p>
          )}
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 pt-6 pb-2 text-xs">
          <div className="pr-4 border-r border-slate-300 flex flex-col justify-between min-h-[110px]">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Receiver&apos;s Acknowledgment
            </p>
            <div>
              <div className="border-b border-slate-400 w-4/5 mb-1.5" />
              <p className="text-[11px] text-slate-600">
                Received goods in good condition & verified quantity
              </p>
              <p className="text-[10px] text-slate-400">Name, Date & Company Seal</p>
            </div>
          </div>

          <div className="pl-6 flex flex-col justify-between min-h-[110px]">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              For Tamizh Tech Robotics Company
            </p>
            <div>
              <div className="h-10 flex items-center">
                <img
                  src="/signature.png"
                  alt="Authorized Signatory"
                  className="h-10 object-contain"
                  onError={(e) => {
                    (e.target as any).style.display = "none";
                  }}
                />
              </div>
              <div className="border-b border-slate-400 w-4/5 mb-1.5" />
              <p className="text-[11px] font-bold text-slate-800">Authorized Signatory</p>
              <p className="text-[10px] text-slate-400">Operations / Dispatch Department</p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-6 pt-3 border-t border-slate-200">
          Tamizh Tech ERP 2.0 • Authoritative Dispatch Record • Generated on {docDate}
        </p>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Cancel Delivery Challan</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to cancel Challan <strong>{challan.challanNumber}</strong>?
              {challan.deductStock && (
                <span className="block mt-1 text-amber-700 font-medium">
                  Note: Dispatched stock will be atomically returned to inventory via compensating ledger entries.
                </span>
              )}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Demonstration postponed, shipment rejected at gate, etc."
                rows={3}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isProcessing}
                className="px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isProcessing || !cancelReason.trim()}
                className="px-4 py-2 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-lg font-medium disabled:opacity-50"
              >
                {isProcessing ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
