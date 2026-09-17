"use client";

import React from "react";
import { Invoice } from "@/types";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { FileText, Download, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface InvoiceTableProps {
  data: Invoice[];
  loading: boolean;
  onDelete?: (invoice: Invoice) => void;
}

export function InvoiceTable({ data = [], loading }: InvoiceTableProps) {
  const router = useRouter();

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
      header: "Due Date",
      accessorKey: "dueDate",
      cell: (row) => (
        <span className="text-ink-secondary text-xs">
          {row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
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
      header: "Actions",
      accessorKey: "id",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link href={`/invoices/${row.id}`}>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-ink-secondary hover:text-brand">
              View
            </Button>
          </Link>
          <a href={`/api/invoices/${row.id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-8 px-2 text-xs gap-1">
              <Download className="w-3 h-3 text-ink-secondary" />
              PDF
            </Button>
          </a>
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
              Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
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

        <div className="pt-1 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
          <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-10 text-xs gap-1.5 min-h-[44px]">
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </Button>
          </a>

          {bal > 0 ? (
            <Link href={`/payments/new?invoiceId=${inv.id}`} className="flex-1">
              <Button size="sm" className="w-full h-10 text-xs gap-1.5 min-h-[44px] bg-green-600 hover:bg-green-700 text-white">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay</span>
              </Button>
            </Link>
          ) : (
            <Link href={`/invoices/${inv.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full h-10 text-xs min-h-[44px]">
                Details
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
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
  );
}
