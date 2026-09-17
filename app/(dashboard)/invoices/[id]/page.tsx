"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer, Send, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";
import Link from "next/link";
import { DEFAULT_COMPANY_SETTINGS } from "@/lib/companyProfile";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${params.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setInvoice(json.data);
        setClient(json.data.client);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/invoices/${params.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          newStatus === "ISSUED"
            ? "Invoice issued & physical stock deducted successfully"
            : newStatus === "CANCELLED"
            ? "Invoice cancelled & physical stock returned to inventory"
            : `Invoice updated to ${newStatus}`
        );
        loadData();
      } else {
        toast.error(json.error || "Failed to update invoice status");
      }
    } catch {
      toast.error("Network error updating status");
    } finally {
      setUpdatingStatus(false);
      setCancelConfirmOpen(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.open(`/api/invoices/${params.id}/pdf`, "_blank");
  };

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);
      const res = await fetch(`/api/invoices/${params.id}/send`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Invoice sent successfully!");
      } else {
        toast.error(data.error || "Failed to dispatch email");
      }
    } catch (err: any) {
      toast.error("Network error while sending invoice");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <LoadingSkeleton type="page" />;
  if (!invoice) return <EmptyState title="Invoice Not Found" description="The requested invoice does not exist." />;

  const subtotal = invoice.subtotal || 0;
  const discountAmount = invoice.discountAmount || 0;
  const gstPercent = invoice.gstPercent || 18;
  const totalGst = invoice.gstAmount || 0;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const grandTotal = invoice.total || 0;
  const paidAmount = invoice.paidAmount || 0;
  const balance = invoice.balance ?? grandTotal - paidAmount;
  const items = invoice.items || [];
  const company = DEFAULT_COMPANY_SETTINGS;

  const invoiceDateStr = invoice.date
    ? new Date(invoice.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "-";

  const dueDateStr = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "-";

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-12">
      {/* Back Button */}
      <button
        onClick={() => router.push("/invoices")}
        className="no-print inline-flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Invoices</span>
      </button>

      {/* Top Action Bar (hidden in print) */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-primary tracking-tight">
              {invoice.invoiceNo}
            </h1>
            <StatusBadge status={invoice.status || "DRAFT"} />
          </div>
          <p className="text-xs text-ink-secondary mt-0.5">
            Issued to {client?.name || invoice.clientName} • Due on {dueDateStr}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {invoice.status === "DRAFT" && (
            <Button
              onClick={() => handleStatusChange("ISSUED")}
              disabled={updatingStatus}
              className="gap-1.5 bg-brand hover:bg-brand-dark text-white shadow-sm font-semibold flex-1 sm:flex-initial"
            >
              Issue Invoice
            </Button>
          )}

          <Button variant="outline" onClick={handleDownload} className="gap-2 flex-1 sm:flex-initial">
            <Download className="w-4 h-4 text-ink-secondary" />
            <span>PDF</span>
          </Button>

          <Button variant="outline" onClick={handlePrint} className="gap-2 flex-1 sm:flex-initial">
            <Printer className="w-4 h-4 text-ink-secondary" />
            <span>Print</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="gap-2 flex-1 sm:flex-initial text-brand hover:text-brand-dark"
          >
            <Send className="w-4 h-4" />
            <span>{sendingEmail ? "Sending..." : "Send Email"}</span>
          </Button>

          {balance > 0 && invoice.status !== "CANCELLED" && invoice.status !== "DRAFT" && (
            <Link href={`/payments/new?invoiceId=${invoice.id}`} className="flex-1 sm:flex-initial">
              <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm font-semibold">
                <CreditCard className="w-4 h-4" />
                <span>Record Payment</span>
              </Button>
            </Link>
          )}

          {invoice.status !== "CANCELLED" && (
            <Button
              variant="outline"
              onClick={() => setCancelConfirmOpen(true)}
              disabled={updatingStatus}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 flex-1 sm:flex-initial text-xs"
            >
              Cancel Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border border-border">
            <h3 className="text-lg font-bold text-ink-primary">Cancel Invoice {invoice.invoiceNo}?</h3>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Cancelling this invoice will mark it as CANCELLED and automatically restore any previously deducted physical stock back to inventory. This action is recorded in the audit log.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                disabled={updatingStatus}
                onClick={() => setCancelConfirmOpen(false)}
              >
                Nevermind
              </Button>
              <Button
                disabled={updatingStatus}
                onClick={() => handleStatusChange("CANCELLED")}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {updatingStatus ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Authoritative Standard Tax Invoice Container */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="printable-invoice bg-white rounded-xl border border-border shadow-sm p-6 sm:p-10 min-w-[700px] text-ink-primary">
          {/* 1. Header */}
          <div className="flex justify-between items-start border-b-2 border-brand pb-6 mb-6">
            <div className="w-48">
              <img
                src="/assets/ttrc-logo.png"
                alt="Tamizh Tech Logo"
                className="h-14 w-auto object-contain"
              />
            </div>
            <div className="text-right max-w-sm">
              <h2 className="text-base font-bold text-navy">{company.companyName}</h2>
              <p className="text-xs text-ink-secondary mt-0.5">{company.addressLine1}</p>
              <p className="text-xs text-ink-secondary">
                {company.addressLine2}, {company.city} – {company.pincode}
              </p>
              <p className="text-xs text-ink-secondary mt-1">
                Phone: {company.phone} | Email: {company.email}
              </p>
              <p className="text-xs text-ink-secondary font-medium">{company.website}</p>
            </div>
          </div>

          {/* 2. Document Title */}
          <div className="text-center bg-navy text-white py-1.5 rounded-sm font-bold text-sm tracking-widest uppercase mb-5">
            TAX INVOICE
          </div>

          {/* 3. Invoice Meta Grid */}
          <div className="grid grid-cols-4 border border-border bg-surface rounded-md text-xs mb-5 divide-x divide-border">
            <div className="p-2.5">
              <span className="text-[10px] uppercase font-bold text-ink-secondary block">Invoice Number</span>
              <span className="font-bold text-ink-primary mt-0.5 block">{invoice.invoiceNo}</span>
            </div>
            <div className="p-2.5">
              <span className="text-[10px] uppercase font-bold text-ink-secondary block">Invoice Date</span>
              <span className="font-bold text-ink-primary mt-0.5 block">{invoiceDateStr}</span>
            </div>
            <div className="p-2.5">
              <span className="text-[10px] uppercase font-bold text-ink-secondary block">Due Date</span>
              <span className="font-bold text-ink-primary mt-0.5 block">{dueDateStr}</span>
            </div>
            <div className="p-2.5">
              <span className="text-[10px] uppercase font-bold text-ink-secondary block">Payment Status</span>
              <span className="mt-0.5 inline-block">
                <StatusBadge status={invoice.status || "UNPAID"} />
              </span>
            </div>
          </div>

          {/* 4. Billed By / Billed To */}
          <div className="grid grid-cols-2 border border-border rounded-md text-xs mb-6 divide-x divide-border">
            <div className="p-4">
              <h4 className="text-[10px] font-bold text-brand uppercase tracking-wider mb-2">Billed By</h4>
              <p className="font-bold text-sm text-navy">{company.companyName}</p>
              <p className="text-ink-secondary mt-0.5">{company.addressLine1}</p>
              <p className="text-ink-secondary">
                {company.addressLine2}, {company.city}, {company.state} – {company.pincode}
              </p>
              <p className="text-ink-secondary mt-1">Phone: {company.phone}</p>
              <p className="text-ink-secondary">Email: {company.email}</p>
              {company.gstin && <p className="text-ink-secondary mt-1">GSTIN: {company.gstin}</p>}
            </div>

            <div className="p-4">
              <h4 className="text-[10px] font-bold text-brand uppercase tracking-wider mb-2">Billed To</h4>
              <p className="font-bold text-sm text-navy">{client?.name || invoice.clientName}</p>
              {client?.company && <p className="text-ink-primary font-medium">{client.company}</p>}
              {client?.address && <p className="text-ink-secondary mt-0.5">{client.address}</p>}
              {(client?.city || client?.state) && (
                <p className="text-ink-secondary">
                  {[client.city, client.state, client.pincode].filter(Boolean).join(", ")}
                </p>
              )}
              {client?.phone && <p className="text-ink-secondary mt-1">Phone: {client.phone}</p>}
              {client?.email && <p className="text-ink-secondary">Email: {client.email}</p>}
              {client?.gstin && <p className="text-ink-secondary mt-1 font-semibold">GSTIN: {client.gstin}</p>}
            </div>
          </div>

          {/* 5. Line Item Table */}
          <div className="border border-border rounded-md overflow-hidden mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-navy text-white text-[11px] font-semibold">
                  <th className="p-2.5 text-center w-12">S.No</th>
                  <th className="p-2.5">Item / Service Description</th>
                  <th className="p-2.5 text-center w-24">HSN/SAC</th>
                  <th className="p-2.5 text-center w-16">GST %</th>
                  <th className="p-2.5 text-center w-16">Qty</th>
                  <th className="p-2.5 text-right w-24">Rate (₹)</th>
                  <th className="p-2.5 text-right w-24">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item: any, idx: number) => {
                  const lineAmt = item.amount || item.qty * item.unitPrice;
                  return (
                    <tr key={idx} className="hover:bg-surface/50">
                      <td className="p-2.5 text-center text-ink-secondary">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-ink-primary">{item.description}</td>
                      <td className="p-2.5 text-center text-ink-secondary">{item.hsnCode || item.sacCode || "-"}</td>
                      <td className="p-2.5 text-center text-ink-secondary">{gstPercent}%</td>
                      <td className="p-2.5 text-center font-medium">{item.qty}</td>
                      <td className="p-2.5 text-right text-ink-secondary">{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-ink-primary">{Number(lineAmt).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 6. Summary & Totals */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Notes & Amount in words */}
            <div className="border border-border rounded-md p-3.5 bg-surface text-xs space-y-3">
              <div>
                <span className="text-[10px] font-bold text-ink-secondary uppercase block mb-1">
                  Total Amount in Words
                </span>
                <p className="font-bold text-navy leading-relaxed">
                  {invoice.totalInWords || "INDIAN RUPEES ONLY"}
                </p>
              </div>

              {invoice.notes && (
                <div>
                  <span className="text-[10px] font-bold text-ink-secondary uppercase block mb-0.5">Notes</span>
                  <p className="text-ink-secondary text-[11px]">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Financial Calculations Table */}
            <div className="border border-border rounded-md overflow-hidden text-xs">
              <div className="flex justify-between p-2.5 border-b border-border">
                <span className="text-ink-secondary">Subtotal</span>
                <span className="font-medium">₹{Number(subtotal).toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between p-2.5 border-b border-border text-green-700">
                  <span>Discount</span>
                  <span>-₹{Number(discountAmount).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between p-2.5 border-b border-border">
                <span className="text-ink-secondary">CGST ({(gstPercent / 2).toFixed(1)}%)</span>
                <span className="font-medium">₹{Number(cgst).toFixed(2)}</span>
              </div>

              <div className="flex justify-between p-2.5 border-b border-border">
                <span className="text-ink-secondary">SGST ({(gstPercent / 2).toFixed(1)}%)</span>
                <span className="font-medium">₹{Number(sgst).toFixed(2)}</span>
              </div>

              <div className="flex justify-between p-3 bg-navy text-white font-bold text-sm">
                <span>GRAND TOTAL</span>
                <span>₹{Number(grandTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 7. Payment Ledger & Signatory */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border text-xs mb-8">
            <div className="border border-border rounded-md p-3.5 bg-surface">
              <span className="text-[10px] font-bold text-ink-secondary uppercase block mb-1">
                Payment Ledger Summary
              </span>
              <p className="text-ink-secondary">Paid Amount: <strong className="text-ink-primary">₹{Number(paidAmount).toFixed(2)}</strong></p>
              <p className="text-ink-secondary mt-0.5">Outstanding Balance: <strong className="text-ink-primary">₹{Number(balance).toFixed(2)}</strong></p>
              <p className="mt-2 text-xs font-semibold" style={{ color: balance <= 0 ? "#16A34A" : "#D97706" }}>
                {balance <= 0 ? "Payment Settled (Full)" : `Status: ${invoice.status || "UNPAID"}`}
              </p>
            </div>

            <div className="text-right flex flex-col justify-end items-end pr-4">
              <p className="font-bold text-navy text-xs mb-10">For {company.companyName}</p>
              <div className="w-40 border-t border-gray-400 pt-1 text-center text-[11px] text-ink-secondary">
                Authorised Signatory
              </div>
            </div>
          </div>

          {/* 8. Compact Footer */}
          <div className="border-t border-border pt-4 text-center text-[11px] text-ink-secondary">
            <p>{company.companyName} • {company.addressLine1}, {company.city} • {company.phone}</p>
            <p className="mt-0.5 text-[10px] text-ink-muted">
              This is a computer-generated tax invoice issued by TamizhTech ERP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
