"use client";

import React from "react";
import { Payment } from "@/types";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

interface PaymentTableProps {
  data: Payment[];
  loading: boolean;
  onDelete?: (payment: Payment) => void;
}

export function PaymentTable({ data = [], loading }: PaymentTableProps) {
  const columns: ColumnDef<Payment>[] = [
    {
      header: "Payment No",
      accessorKey: "paymentNo",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-ink-primary font-mono text-xs">
          {(row as any).paymentNo || (row as any).paymentId || "PAY"}
        </span>
      ),
    },
    {
      header: "Customer",
      accessorKey: "clientName",
      sortable: true,
      cell: (row) => (
        <span className="font-medium text-ink-primary">
          {(row as any).client?.name || (row as any).clientName || "Customer"}
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
      header: "Mode",
      accessorKey: "mode",
      sortable: true,
      cell: (row) => (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-surface border border-border text-ink-primary uppercase tracking-wide">
          {row.mode || "UPI"}
        </span>
      ),
    },
    {
      header: "Reference / Txn",
      accessorKey: "referenceNo",
      cell: (row) => (
        <span className="text-ink-secondary font-mono text-xs">
          {(row as any).referenceNo || (row as any).transactionId || "-"}
        </span>
      ),
    },
    {
      header: "Amount",
      accessorKey: "amount",
      sortable: true,
      className: "text-right",
      cell: (row) => (
        <span className="font-bold text-green-700 text-sm">
          +₹{Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      sortable: true,
      className: "text-right",
      cell: (row) => <StatusBadge status={row.status || "COMPLETED"} />,
    },
  ];

  // Mobile App Card (< 768px)
  const renderMobileCard = (p: Payment) => {
    const paymentNo = (p as any).paymentNo || (p as any).paymentId || "PAY";
    const customer = (p as any).client?.name || (p as any).clientName || "Customer";
    const ref = (p as any).referenceNo || (p as any).transactionId || "";

    return (
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-bold text-ink-primary text-sm font-mono">{paymentNo}</span>
            <h4 className="font-semibold text-ink-primary text-sm leading-snug mt-0.5">{customer}</h4>
            <p className="text-xs text-ink-secondary mt-0.5">
              {p.date ? new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
            </p>
          </div>

          <div className="text-right">
            <span className="font-bold text-green-700 text-base block">
              +₹{Number(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <div className="mt-1">
              <StatusBadge status={p.status || "COMPLETED"} />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-ink-secondary">
          <span>Mode: <strong className="text-ink-primary uppercase">{p.mode || "UPI"}</strong></span>
          {ref && <span className="font-mono text-[11px] truncate max-w-[160px]">Ref: {ref}</span>}
        </div>
      </div>
    );
  };

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      searchKey="paymentNo,clientName,referenceNo,mode"
      searchPlaceholder="Search payments by receipt no, customer, mode..."
      emptyTitle="No payments recorded"
      emptyDesc="Recorded customer payments will appear here as transaction entries."
      renderMobileCard={renderMobileCard}
    />
  );
}
