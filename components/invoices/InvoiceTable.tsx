"use client";

import React, { useState } from "react";
import { Invoice } from "@/types";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { FileText, Download, CreditCard, ChevronRight, Edit, Trash2, Mail, CheckCircle2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";
import { buildInvoiceWhatsAppMessage } from "@/lib/whatsapp";
import { InvoiceReminderButton } from "@/components/invoices/InvoiceReminderButton";

interface InvoiceTableProps {
  data: Invoice[];
  loading: boolean;
  onDelete?: (invoice: Invoice) => void;
}

export function InvoiceTable({ data = [], loading, onDelete }: InvoiceTableProps) {
  const router = useRouter();
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deletingInvoice) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${deletingInvoice.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || `Bill ${deletingInvoice.invoiceNo} deleted successfully.`);
        if (onDelete) {
          onDelete(deletingInvoice);
        } else {
          router.refresh();
        }
      } else {
        toast.error(json.error || "Failed to delete bill");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete bill");
    } finally {
      setIsDeleting(false);
      setDeletingInvoice(null);
    }
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      header: "Invoice No",
      accessorKey: "invoiceNo",
      sortable: true,
      cell: (row) => (
        <Link href={`/invoices/${row.id}`} className="font-semibold text-brand hover:underline">
          {row.invoiceNo}
        </Link>
      ),
    },
    {
      header: "Customer",
      accessorKey: "clientName",
      sortable: true,
      cell: (row) => (
        <span className="font-medium text-ink-primary">
          {row.clientName}
        </span>
      ),
    },
    {
      header: "Date",
      accessorKey: "date",
      sortable: true,
      cell: (row) => (
        <span className="text-ink-secondary text-xs">
          {row.date ? new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
        </span>
      ),
    },
    {
      header: "Total",
      accessorKey: "total",
      sortable: true,
      cell: (row) => (
        <span className="font-bold text-ink-primary">
          ₹{Number(row.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: "Balance Due",
      accessorKey: "balance",
      sortable: true,
      cell: (row) => {
        const bal = row.balance ?? (row.total - (row.paidAmount || 0));
        return (
          <span className={bal > 0 ? "font-bold text-amber-600" : "text-green-600 font-medium"}>
            {bal > 0 ? `₹${Number(bal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "Settled"}
          </span>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      sortable: true,
      cell: (row) => <StatusBadge status={row.status || (row as any).paymentStatus} />,
    },
    {
      header: "Email",
      accessorKey: "sentAt",
      sortable: true,
      cell: (row) => {
        if (row.sentAt) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Sent
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <Mail className="w-3 h-3 text-slate-400" />
            Not Sent
          </span>
        );
      },
    },
    {
      header: "Actions",
      accessorKey: "id",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Link href={`/invoices/${row.id}`}>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-ink-secondary hover:text-brand">
              View
            </Button>
          </Link>
          <Link href={`/invoices/${row.id}/edit`}>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-brand hover:text-brand-dark hover:bg-brand/5 gap-1 font-medium">
              <Edit className="w-3 h-3" />
              Edit
            </Button>
          </Link>
          <WhatsAppShareButton
            customerPhone={row.clientPhone || (row as any).client?.phone}
            customerName={row.clientName || (row as any).client?.name}
            clientId={row.clientId}
            entityType="INVOICE"
            entityId={row.id}
            documentNo={row.invoiceNo}
            messageText={buildInvoiceWhatsAppMessage({
              customerName: row.clientName || (row as any).client?.name || "Valued Customer",
              invoiceNo: row.invoiceNo,
              invoiceDate: row.date || row.createdAt,
              total: row.total,
              paidAmount: row.paidAmount || 0,
              balance: row.balance ?? (row.total - (row.paidAmount || 0)),
            })}
            variant="ghost"
            size="sm"
            iconOnly={true}
            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            label="Send via WhatsApp"
          />
          {((row.balance ?? (row.total - (row.paidAmount || 0))) > 0) && row.status !== "CANCELLED" && (
            <InvoiceReminderButton
              invoiceId={row.id}
              invoiceNo={row.invoiceNo}
              customerName={row.clientName || (row as any).client?.name}
              customerEmail={(row as any).clientEmail || (row as any).client?.email}
              balance={row.balance ?? (row.total - (row.paidAmount || 0))}
              dueDate={row.dueDate}
              status={row.status}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            />
          )}
          <a href={`/api/invoices/${row.id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-8 px-2 text-xs gap-1">
              <Download className="w-3 h-3 text-ink-secondary" />
              PDF
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingInvoice(row)}
            className="h-8 px-2 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 gap-1 font-medium"
            title="Delete Bill"
          >
            <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-600" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Mobile App Card (< 768px)
  const renderMobileCard = (inv: Invoice) => {
    const bal = inv.balance ?? (inv.total - (inv.paidAmount || 0));

    return (
      <div
        onClick={() => router.push(`/invoices/${inv.id}`)}
        className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3 active:bg-surface transition-colors cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-bold text-brand text-sm tracking-tight">{inv.invoiceNo}</span>
            <h4 className="font-bold text-ink-primary text-base leading-snug mt-0.5">{inv.clientName}</h4>
            <p className="text-xs text-ink-secondary mt-0.5">
              {inv.date ? new Date(inv.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
            </p>
          </div>
          <StatusBadge status={inv.status || (inv as any).paymentStatus} />
        </div>

        <div className="bg-surface rounded-lg p-2.5 flex items-center justify-between border border-border/50 text-xs">
          <div>
            <span className="text-[10px] uppercase text-ink-secondary block">Total</span>
            <span className="font-bold text-ink-primary text-sm">
              ₹{Number(inv.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase text-ink-secondary block">Outstanding</span>
            <span className={`font-bold text-sm ${bal > 0 ? "text-amber-600" : "text-green-600"}`}>
              ₹{Number(bal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="pt-1 flex flex-wrap items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
          <WhatsAppShareButton
            customerPhone={inv.clientPhone || (inv as any).client?.phone}
            customerName={inv.clientName || (inv as any).client?.name}
            clientId={inv.clientId}
            entityType="INVOICE"
            entityId={inv.id}
            documentNo={inv.invoiceNo}
            messageText={buildInvoiceWhatsAppMessage({
              customerName: inv.clientName || (inv as any).client?.name || "Valued Customer",
              invoiceNo: inv.invoiceNo,
              invoiceDate: inv.date || inv.createdAt,
              total: inv.total,
              paidAmount: inv.paidAmount || 0,
              balance: bal,
            })}
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold"
            label="WhatsApp"
          />

          {bal > 0 && inv.status !== "CANCELLED" && (
            <InvoiceReminderButton
              invoiceId={inv.id}
              invoiceNo={inv.invoiceNo}
              customerName={inv.clientName || (inv as any).client?.name}
              customerEmail={(inv as any).clientEmail || (inv as any).client?.email}
              balance={bal}
              dueDate={inv.dueDate}
              status={inv.status}
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold"
            />
          )}

          <Link href={`/invoices/${inv.id}/edit`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-9 text-xs gap-1.5 text-brand border-brand/30 hover:bg-brand/5 font-semibold">
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Button>
          </Link>

          <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-9 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </Button>
          </a>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeletingInvoice(inv)}
            className="flex-1 h-9 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </Button>

          {bal > 0 && (
            <Link href={`/payments/new?invoiceId=${inv.id}`} className="w-full">
              <Button size="sm" className="w-full h-9 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        searchKey="invoiceNo,clientName"
        searchPlaceholder="Search invoices by number or customer..."
        loading={loading}
        emptyTitle="No invoices yet"
        emptyDesc="Create your first invoice for robotics equipment or services."
        emptyActionLabel="Create Invoice"
        emptyAction={() => router.push("/invoices/new")}
        renderMobileCard={renderMobileCard}
      />

      <ConfirmDialog
        open={!!deletingInvoice}
        onOpenChange={(open) => !open && setDeletingInvoice(null)}
        title={`Delete Bill ${deletingInvoice?.invoiceNo}?`}
        description={`Are you sure you want to permanently delete bill ${deletingInvoice?.invoiceNo}? This action is irreversible. If stock was deducted, it will be automatically restored to your inventory.`}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </>
  );
}
