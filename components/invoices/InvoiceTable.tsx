"use client";

import { Invoice } from "@/types";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface InvoiceTableProps {
  data: Invoice[];
  loading: boolean;
  onDelete: (invoice: Invoice) => void;
}

export function InvoiceTable({ data, loading, onDelete }: InvoiceTableProps) {
  const router = useRouter();

  const columns: ColumnDef<Invoice>[] = [
    {
      header: "Invoice No",
      accessorKey: "invoiceNo",
      cell: (row) => (
         <Link href={`/invoices/${row.id}`} className="font-medium text-brand hover:underline">
            {row.invoiceNo}
         </Link>
      )
    },
    {
      header: "Client",
      accessorKey: "clientName",
      cell: (row) => (
         <Link href={`/clients/${row.clientId}`} className="text-navy hover:text-brand transition-colors">
            {row.clientName}
         </Link>
      )
    },
    {
      header: "Date",
      accessorKey: "date",
      cell: (row) => <span className="text-gray-500">{formatDate(row.date)}</span>
    },
    {
      header: "Amount",
      accessorKey: "total",
      cell: (row) => <span className="font-medium">{formatCurrency(row.total)}</span>
    },
    {
      header: "Balance",
      accessorKey: "balance",
      cell: (row) => (
         <span className={row.balance > 0 ? "font-medium text-red-600" : "text-gray-400"}>
            {row.balance > 0 ? formatCurrency(row.balance) : '-'}
         </span>
      )
    },
    {
      header: "Status",
      accessorKey: "paymentStatus",
      cell: (row) => <StatusBadge status={row.paymentStatus} type="payment" />
    }
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      searchKey="invoiceNo,clientName" 
      searchPlaceholder="Search invoice number or client name..."
      onView={(invoice) => router.push(`/invoices/${invoice.id}`)}
      onDelete={onDelete}
      emptyTitle="No Invoices Found"
      emptyDesc="Start billing your clients by creating a new invoice."
      emptyAction={() => router.push("/invoices/new")}
      emptyActionLabel="Create Invoice"
    />
  );
}
