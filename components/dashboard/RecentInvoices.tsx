'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Invoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';

interface RecentInvoicesProps {
  invoices: Invoice[];
}

export default function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card className="border-0 shadow-sm bg-white rounded-2xl h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-50">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-brand" />
          <CardTitle className="text-lg font-bold text-navy tracking-tight">Recent Invoices</CardTitle>
        </div>
        <Link href="/invoices">
          <Button variant="ghost" size="sm" className="text-xs font-bold text-brand hover:text-brand-dark transition-all">
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 px-0 pt-0">
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inv No</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-navy">{inv.invoiceNo}</td>
                    <td className="px-6 py-4">
                       <p className="text-sm font-bold text-navy truncate max-w-[120px]">{inv.clientName}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{formatDate(inv.date)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-brand">{formatCurrency(inv.total)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.paymentStatus} type="payment" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <p className="text-sm font-bold uppercase tracking-widest">No recent invoices</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
