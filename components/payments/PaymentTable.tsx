"use client";

import React from "react";
import { Payment } from "@/types";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";
import { WhatsAppShareButton } from "@/components/shared/WhatsAppShareButton";
import { buildPaymentWhatsAppMessage } from "@/lib/whatsapp";

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
    {
      header: "Action",
      accessorKey: "id",
      className: "text-right",
      cell: (row) => {
        const customerName = (row as any).client?.name || row.clientName || "Customer";
        const customerPhone = (row as any).client?.phone || row.clientPhone || null;
        const clientId = row.clientId || (row as any).client?.id;
        const paymentNo = (row as any).paymentNo || (row as any).paymentId || "PAY";
        const invoiceNo = (row as any).invoice?.invoiceNo || (row as any).invoiceNo || "N/A";
        const remainingBalance = (row as any).remainingBalance ?? 0;

        const message = buildPaymentWhatsAppMessage({
          customerName,
          paymentNo,
          invoiceNo,
          amount: row.amount,
          paymentDate: row.date || row.createdAt,
          remainingBalance,
        });

        return (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <WhatsAppShareButton
              customerPhone={customerPhone}
              customerName={customerName}
              clientId={clientId}
              entityType="PAYMENT"
              entityId={row.id}
              documentNo={paymentNo}
              messageText={message}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              label="Share Receipt"
            />
          </div>
        );
      },
    },
  ];

  // Mobile App Card (< 768px)
  const renderMobileCard = (p: Payment) => {
    const paymentNo = (p as any).paymentNo || (p as any).paymentId || "PAY";
    const customer = (p as any).client?.name || (p as any).clientName || "Customer";
    const customerPhone = (p as any).client?.phone || p.clientPhone || null;
    const clientId = p.clientId || (p as any).client?.id;
    const invoiceNo = (p as any).invoice?.invoiceNo || (p as any).invoiceNo || "N/A";
    const remainingBalance = (p as any).remainingBalance ?? 0;
    const ref = (p as any).referenceNo || (p as any).transactionId || "";

    const message = buildPaymentWhatsAppMessage({
      customerName: customer,
      paymentNo,
      invoiceNo,
      amount: p.amount,
      paymentDate: p.date || p.createdAt,
      remainingBalance,
    });

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

        <div className="pt-1 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <WhatsAppShareButton
            customerPhone={customerPhone}
            customerName={customer}
            clientId={clientId}
            entityType="PAYMENT"
            entityId={p.id}
            documentNo={paymentNo}
            messageText={message}
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold"
            label="Send Receipt via WhatsApp"
          />
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
