'use client';

import { useEffect, useState } from 'react';
import { Plus, FileText, Search, Filter, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ExportButton from '@/components/shared/ExportButton';
import { Invoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices');
      const result = await res.json();
      if (result.success) {
        setInvoices(result.data);
      }
    } catch (error) {
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleCreate = async (data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Invoice created successfully");
        setIsAddOpen(false);
        fetchInvoices();
      } else {
        toast.error(result.error || "Failed to create invoice");
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
      const res = await fetch(`/api/invoices/${deleteConfirm}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Invoice deleted successfully");
        fetchInvoices();
      } else {
        toast.error(result.error || "Failed to delete invoice");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const columns = [
    { 
      header: 'Inv No', 
      accessorKey: 'invoiceNo',
      cell: (item: Invoice) => <span className="font-black text-navy">{item.invoiceNo}</span>
    },
    { 
      header: 'Client', 
      accessorKey: 'clientName',
      cell: (item: Invoice) => (
        <div className="flex flex-col">
          <span className="font-bold text-navy truncate max-w-[150px]">{item.clientName}</span>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.clientId}</span>
        </div>
      )
    },
    { header: 'Date', accessorKey: 'date', cell: (item: Invoice) => formatDate(item.date) },
    { 
      header: 'Total Amount', 
      accessorKey: 'total',
      cell: (item: Invoice) => <span className="font-black text-brand">{formatCurrency(item.total)}</span>
    },
    { 
      header: 'Status', 
      accessorKey: 'paymentStatus',
      cell: (item: Invoice) => <StatusBadge status={item.paymentStatus} type="payment" />
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight">Invoice Management</h1>
          <p className="text-gray-500 font-medium">Create and track billing for TamizhTech clients.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <ExportButton data={invoices} filename="TamizhTech_Invoices" />
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand hover:bg-brand-dark text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-brand/20 transition-all">
                <Plus className="mr-2 h-5 w-5" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-navy tracking-tight">Generate New Invoice</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <InvoiceForm onSubmit={handleCreate} loading={submitting} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={invoices} 
        loading={loading}
        onView={(item) => router.push(`/invoices/${item.id}`)}
        onEdit={(item) => router.push(`/invoices/${item.id}`)}
        onDelete={(item) => setDeleteConfirm(item.id)}
        searchPlaceholder="Filter by Invoice No, Client, Date..."
      />

      <ConfirmDialog 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={handleDelete}
        title="Delete Invoice?"
        description="Are you sure you want to delete this invoice? This action cannot be undone."
      />
    </div>
  );
}
