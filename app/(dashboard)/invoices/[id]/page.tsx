"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer, Send, CreditCard, AlertCircle, Edit, Trash2 } from "lucide-react";
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
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-primary tracking-tight">
              {invoice.invoiceNo}
            </h1>
            <StatusBadge status={invoice.status || "DRAFT"} />
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

          <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="gap-2 flex-1 sm:flex-initial text-brand hover:text-brand-dark"
          >
            <Send className="w-4 h-4" />
            <span>{sendingEmail ? "Sending..." : "Send Email"}</span>
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
