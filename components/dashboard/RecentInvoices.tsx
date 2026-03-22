"use client";

import { Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";
import { FileSearch } from "lucide-react";

interface RecentInvoicesProps {
  data: Invoice[];
}

export function RecentInvoices({ data }: RecentInvoicesProps) {
  
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 h-full">
        <FileSearch className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm">No recent invoices generated.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 font-medium">Invoice No</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-mediumtext-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((inv, idx) => (
            <tr key={idx} className="hover:bg-gray-50/50 group transition-colors">
              <td className="px-4 py-3">
                <Link href={`/invoices/${inv.invoiceNo}`} className="text-brand font-medium hover:underline">
                  {inv.invoiceNo}
                </Link>
              </td>
              <td className="px-4 py-3 text-navy font-medium truncate max-w-[150px]" title={inv.clientName}>
                {inv.clientName}
              </td>
              <td className="px-4 py-3 font-semibold text-gray-700">
                {formatCurrency(inv.total)}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {formatDate(inv.createdAt || inv.date)}
              </td>
              <td className="px-4 py-3 text-right">
                <StatusBadge status={inv.paymentStatus} type="payment" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
