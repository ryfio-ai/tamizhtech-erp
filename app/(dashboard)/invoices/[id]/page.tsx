"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer, Send, CreditCard, AlertCircle, Edit, Trash2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import Link from "next/link";
import { DEFAULT_COMPANY_SETTINGS } from "@/lib/companyProfile";
import { formatIssueDateTime } from "@/lib/utils";
import { BusinessDocumentView } from "@/components/shared/BusinessDocumentView";
import type { BusinessDocumentModel } from "@/types/businessDocument";
import { buildInvoiceWhatsAppMessage } from "@/lib/whatsapp";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [documentData, setDocumentData] = useState<BusinessDocumentModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${params.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setInvoice(json.data);
        setClient(json.data.client);
        setDocumentData(json.documentData || json.data.documentData || null);
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

  const handleDeleteInvoice = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/invoices/${params.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Bill permanently deleted from database");
        router.push("/invoices");
      } else {
        toast.error(json.error || "Failed to delete bill");
      }
    } catch {
      toast.error("Network error while deleting bill");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

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
        setInvoice((prev: any) => ({
          ...prev,
          sentAt: data.sentAt || new Date().toISOString(),
        }));
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
  const gstPercent = typeof invoice.gstPercent === "number" ? invoice.gstPercent : (invoice.gstPercent !== undefined && invoice.gstPercent !== null && invoice.gstPercent !== "" ? Number(invoice.gstPercent) : 18);
  const totalGst = invoice.gstAmount || 0;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const grandTotal = invoice.total || 0;
  const paidAmount = invoice.paidAmount || 0;
  const balance = invoice.balance ?? grandTotal - paidAmount;
  const items = invoice.items || [];
  const company = DEFAULT_COMPANY_SETTINGS;

  const issueDateTimeStr = formatIssueDateTime(
    invoice.issuedAt || invoice.date || invoice.createdAt
  );

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
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-primary tracking-tight">
              {invoice.invoiceNo}
            </h1>
            <StatusBadge status={invoice.status || "DRAFT"} />
            {invoice.sentAt ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Email Sent ({new Date(invoice.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Not Sent
              </span>
            )}
          </div>
          <p className="text-xs text-ink-secondary mt-0.5">
            Issued to {client?.name || invoice.clientName} • Issued on {issueDateTimeStr}
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

          {/* Send via WhatsApp */}
          <WhatsAppShareButton
            customerPhone={client?.phone || invoice.clientPhone}
            customerName={client?.name || invoice.clientName}
            clientId={invoice.clientId || client?.id}
            entityType="INVOICE"
            entityId={invoice.id}
            documentNo={invoice.invoiceNo}
            messageText={buildInvoiceWhatsAppMessage({
              customerName: client?.name || invoice.clientName || "Valued Customer",
              invoiceNo: invoice.invoiceNo,
              invoiceDate: invoice.issuedAt || invoice.date || invoice.createdAt,
              total: grandTotal,
              paidAmount: paidAmount,
              balance: balance,
            })}
            variant="outline"
            className="flex-1 sm:flex-initial"
          />

          <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className={`gap-2 flex-1 sm:flex-initial ${
              invoice.sentAt
                ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                : "text-brand hover:text-brand-dark"
            }`}
          >
            {invoice.sentAt ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Send className="w-4 h-4" />}
            <span>{sendingEmail ? "Sending..." : invoice.sentAt ? "Resend Email" : "Send Email"}</span>
          </Button>

          {invoice.status !== "CANCELLED" && (
            <Link href={`/invoices/${invoice.id}/edit`} className="flex-1 sm:flex-initial">
              <Button variant="outline" className="gap-1.5 w-full border-brand/40 text-brand hover:bg-brand/5 hover:text-brand-dark font-semibold">
                <Edit className="w-4 h-4" />
                <span>Edit Bill</span>
              </Button>
            </Link>
          )}

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
              className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 border-amber-200 flex-1 sm:flex-initial text-xs"
            >
              Cancel Invoice
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={isDeleting}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 flex-1 sm:flex-initial text-xs gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Bill</span>
          </Button>
        </div>
      </div>

      {/* Dynamic Payment Status & Live Balance UPI Card */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-xl border border-border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
            Payment Status
          </span>
          <div className="flex flex-wrap items-baseline gap-4 pt-1">
            <div>
              <span className="text-xs text-ink-secondary block">Total</span>
              <span className="text-lg font-bold text-ink-primary">
                ₹{Number(grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-xs text-ink-secondary block">Paid</span>
              <span className="text-lg font-bold text-emerald-600">
                ₹{Number(paidAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-xs text-ink-secondary block">Outstanding Balance</span>
              <span className={`text-lg font-bold ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                ₹{Number(balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Payment QR or Status State */}
        <div className="shrink-0 flex items-center">
          {invoice.status === "CANCELLED" ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
              This invoice is cancelled. Payment cannot be collected.
            </div>
          ) : balance <= 0 && invoice.status !== "DRAFT" ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h5 className="font-bold text-emerald-900 text-xs">Paid in Full</h5>
                <p className="text-[11px] text-emerald-700">No outstanding amount remains on this invoice.</p>
              </div>
            </div>
          ) : invoice.status === "DRAFT" ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              Invoice in Draft status. Issue invoice before collecting payment.
            </div>
          ) : documentData?.dynamicUpi?.isConfigured === false ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <p className="font-bold">UPI payment unavailable</p>
              <p className="text-[11px] text-amber-700">UPI payment details have not been configured.</p>
            </div>
          ) : documentData?.dynamicUpi?.isPayable && documentData.dynamicUpi.qrDataUri ? (
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="w-16 h-16 bg-white p-1 rounded border border-slate-300 shrink-0 flex items-center justify-center shadow-xs">
                <img
                  src={documentData.dynamicUpi.qrDataUri}
                  alt="Dynamic UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-0.5 text-xs">
                <span className="font-bold text-ink-primary block text-xs">
                  Scan to pay ₹{documentData.dynamicUpi.amountFormatted}
                </span>
                <p className="text-slate-600 text-[11px]">
                  UPI ID: <span className="font-mono font-semibold text-ink-primary select-all">{documentData.dynamicUpi.vpa}</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Accepts Google Pay, PhonePe, Paytm, BHIM, or any UPI app.
                </p>
              </div>
            </div>
          ) : null}
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
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {updatingStatus ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Permanently Delete Bill ${invoice.invoiceNo}?`}
        description={`Are you sure you want to permanently delete bill ${invoice.invoiceNo}? This removes it from the database. Any deducted inventory stock will be automatically restored. This action cannot be undone.`}
        onConfirm={handleDeleteInvoice}
        loading={isDeleting}
      />

      {/* Authoritative Standard Tax Invoice Container */}
      <div className="w-full overflow-x-auto pb-4">
        {documentData ? (
          <BusinessDocumentView
            data={documentData}
            showToolbar={false}
          />
        ) : (
          <div className="bg-white rounded-xl border border-border p-8 text-center text-slate-500">
            Loading preview...
          </div>
        )}
      </div>
    </div>
  );
}
