"use client";

import { Payment } from "@/types";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface PaymentTableProps {
  data: Payment[];
  loading: boolean;
  onDelete: (payment: Payment) => void;
}

export function PaymentTable({ data, loading, onDelete }: PaymentTableProps) {

  const columns: ColumnDef<Payment>[] = [
    {
      header: "Receipt No",
      accessorKey: "paymentId",
      cell: (row) => <span className="font-medium text-navy">{row.paymentId}</span>
    },
    {
      header: "Invoice No",
      accessorKey: "invoiceNo",
      cell: (row) => (
         <Link href={`/invoices/${row.invoiceId}`} className="font-medium text-brand hover:underline">
            {row.invoiceNo}
         </Link>
      )
    },
    {
      header: "Date",
      accessorKey: "date",
      cell: (row) => <span className="text-gray-500">{formatDate(row.date)}</span>
    },
    {
      header: "Mode",
      accessorKey: "mode",
      cell: (row) => <StatusBadge status={row.mode} />
    },
    {
      header: "Reference",
      accessorKey: "referenceNo",
      cell: (row) => <span className="text-gray-500 font-mono text-xs">{row.referenceNo || '-'}</span>
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: (row) => <span className="font-bold text-green-700">+{formatCurrency(row.amount)}</span>
    }
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      searchKey="paymentId,invoiceNo,referenceNo" 
      searchPlaceholder="Search receipt, invoice, or reference no..."
      onDelete={onDelete}
      emptyTitle="No Payments Recorded"
      emptyDesc="Log payments received against generated invoices."
    />
  );
}
