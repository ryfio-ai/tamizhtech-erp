'use client';

import { useEffect, useState } from 'react';
import { Plus, CreditCard, Search, Filter, History, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import DataTable from '@/components/shared/DataTable';
import PaymentForm from '@/components/payments/PaymentForm';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ExportButton from '@/components/shared/ExportButton';
import { Payment } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');

  const fetchPayments = async () => {
    try {
      const url = invoiceId ? `/api/payments?invoiceId=${invoiceId}` : '/api/payments';
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setPayments(result.data);
      }
    } catch (error) {
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [invoiceId]);

  const handleCreate = async (data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Payment recorded successfully");
        setIsAddOpen(false);
        fetchPayments();
        router.refresh(); // Refresh to update related invoice status in UI
      } else {
        toast.error(result.error || "Failed to record payment");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/payments/${deleteConfirm}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Payment reversed");
        fetchPayments();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { 
      header: 'ID', 
      accessorKey: 'paymentId',
      cell: (item: Payment) => <span className="font-black text-navy">#{item.paymentId}</span>
    },
    { 
      header: 'Client', 
      accessorKey: 'clientName',
      cell: (item: Payment) => (
        <Link href={`/clients/${item.clientId}`} className="hover:underline font-bold text-navy">
          {item.clientName}
        </Link>
      )
    },
    { 
      header: 'Invoice', 
      accessorKey: 'invoiceNo',
      cell: (item: Payment) => (
        <div className="flex items-center space-x-2">
           <span className="font-bold text-gray-400">{item.invoiceNo}</span>
           <Link href={`/invoices/${item.invoiceId}`}>
              <ArrowRight className="h-3 w-3 text-brand hover:translate-x-1 transition-all" />
           </Link>
        </div>
      )
    },
    { header: 'Date', accessorKey: 'date', cell: (item: Payment) => formatDate(item.date) },
    { 
      header: 'Amount', 
      accessorKey: 'amount',
      cell: (item: Payment) => <span className="font-black text-green-600">{formatCurrency(item.amount)}</span>
    },
    { 
      header: 'Mode', 
      accessorKey: 'mode',
      cell: (item: Payment) => <span className="uppercase text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded border">{item.mode}</span>
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight">Payment Ledger</h1>
          <p className="text-gray-500 font-medium">Tracking income and collections for TamizhTech.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <ExportButton data={payments} filename="TamizhTech_Payments" />
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-green-100 transition-all">
                <Plus className="mr-2 h-5 w-5" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-3xl border-0 shadow-2xl p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-navy tracking-tight">New Payment Entry</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <PaymentForm onSubmit={handleCreate} loading={submitting} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {invoiceId && (
        <div className="bg-brand/5 border border-brand/20 p-4 rounded-2xl flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <History className="h-5 w-5 text-brand" />
              <p className="text-sm font-bold text-navy italic">Showing payment history for Invoice <span className="font-black">#{invoiceId}</span></p>
           </div>
           <Button variant="ghost" size="sm" onClick={() => router.push('/payments')} className="text-brand font-black text-[10px] uppercase tracking-widest hover:bg-white">
              View All Payments
           </Button>
        </div>
      )}

      <DataTable 
        columns={columns} 
        data={payments} 
        loading={loading}
        onDelete={(item) => setDeleteConfirm(item.id)}
        searchPlaceholder="Filter by ID, Client, Invoice, Date..."
      />

      <ConfirmDialog 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={handleDelete}
        title="Reverse Payment?"
        description="Are you sure you want to reverse this payment? This will adjust the linked invoice's status automatically."
      />
    </div>
  );
}
