'use client';

import { useEffect, useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Edit, 
  ArrowLeft,
  Calendar,
  User,
  CreditCard,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { Invoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const result = await res.json();
      if (result.success) {
        setInvoice(result.data);
      } else {
        toast.error(result.error);
        router.push('/invoices');
      }
    } catch (error) {
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleUpdate = async (data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Invoice updated successfully");
        setIsEditOpen(false);
        fetchInvoice();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Invoice deleted");
        router.push('/invoices');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  if (loading) return <LoadingSkeleton type="page" />;
  if (!invoice) return <div className="p-8 text-center bg-white rounded-2xl border">Invoice not found.</div>;

  const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-brand bg-white shadow-sm border rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-navy tracking-tight">Invoice {invoice.invoiceNo}</h1>
            <div className="flex items-center space-x-2 mt-1">
               <StatusBadge status={invoice.paymentStatus} type="payment" />
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{formatDate(invoice.date)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={() => generateInvoicePDF(invoice)}
            variant="outline" 
            className="rounded-xl border-gray-200 h-11 px-6 font-bold text-navy hover:bg-gray-50 shadow-sm"
          >
            <Download className="mr-2 h-4 w-4 text-brand" /> Download PDF
          </Button>
          
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand hover:bg-brand-dark text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-brand/20 transition-all">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-navy tracking-tight">Modify Invoice Details</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <InvoiceForm 
                  initialData={{
                    ...invoice,
                    items // Ensure items are parsed
                  }} 
                  onSubmit={handleUpdate} 
                  loading={submitting} 
                />
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="ghost" 
            onClick={() => setDeleteConfirm(true)}
            className="rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 h-11 px-4"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Invoice Preview Card */}
        <Card className="lg:col-span-2 border-0 shadow-xl bg-white rounded-[2rem] overflow-hidden">
           <CardHeader className="bg-navy p-8 flex flex-row justify-between items-center border-0">
             <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-brand rounded-lg flex items-center justify-center text-white font-black text-2xl shadow-lg">T</div>
                <div className="text-white">
                   <h3 className="font-black text-xl tracking-tight leading-none">TamizhTech</h3>
                   <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Robotics & Solutions</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Client Copy</p>
                <p className="text-white font-black text-lg italic uppercase">{invoice.paymentStatus}</p>
             </div>
           </CardHeader>
           
           <CardContent className="p-8 md:p-12 space-y-12">
              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-brand uppercase tracking-widest border-b pb-1 inline-block">Billed To</p>
                    <div className="pl-1">
                       <h4 className="text-2xl font-black text-navy">{invoice.clientName}</h4>
                       <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-tighter">Client ID: {invoice.clientId}</p>
                    </div>
                 </div>
                 <div className="text-right space-y-4">
                    <p className="text-[10px] font-black text-brand uppercase tracking-widest border-b pb-1 inline-block ml-auto">Invoice Details</p>
                    <div className="pr-1">
                       <p className="text-sm text-gray-400 font-bold">Number: <span className="text-navy font-black">{invoice.invoiceNo}</span></p>
                       <p className="text-sm text-gray-400 font-bold">Date: <span className="text-navy font-black">{formatDate(invoice.date)}</span></p>
                       <p className="text-sm text-gray-400 font-bold">Due: <span className="text-navy font-black">{formatDate(invoice.dueDate)}</span></p>
                    </div>
                 </div>
              </div>

              {/* Items Table */}
              <div className="rounded-2xl border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-12">#</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Qty</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Price</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-gray-400 text-center">{i + 1}</td>
                        <td className="px-6 py-4 text-sm font-bold text-navy">{item.description}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500 text-right">{item.qty}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-6 py-4 text-sm font-black text-navy text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-end pt-6">
                <div className="w-full md:w-64 space-y-3">
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                      <span className="text-navy font-black">{formatCurrency(invoice.subtotal)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">GST ({invoice.gstPercent}%)</span>
                      <span className="text-navy font-black text-green-600">+{formatCurrency(invoice.gstAmount)}</span>
                   </div>
                   {invoice.discountAmount > 0 && (
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Discount ({invoice.discountPercent}%)</span>
                        <span className="text-red-500 font-black">-{formatCurrency(invoice.discountAmount)}</span>
                     </div>
                   )}
                   <div className="flex justify-between items-center pt-6 border-t border-navy/10 mt-2">
                      <span className="bg-brand text-white px-3 py-1 rounded-lg text-xs font-black italic tracking-widest">TOTAL</span>
                      <span className="text-3xl font-black text-brand italic underline decoration-navy underline-offset-8">{formatCurrency(invoice.total)}</span>
                   </div>
                </div>
              </div>

              {invoice.notes && (
                <div className="bg-gray-50/80 p-6 rounded-2xl border border-dashed text-gray-500 text-xs leading-relaxed italic border-l-4 border-l-brand">
                   <p className="font-black text-navy uppercase tracking-widest text-[10px] not-italic mb-2">Terms & Conditions</p>
                   {invoice.notes}
                </div>
              )}
           </CardContent>
           
           <div className="bg-gray-100/50 p-6 flex flex-col items-center justify-center border-t text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>This is a computer generated invoice and does not require a signature.</span>
              <span className="mt-1 text-brand">www.tamizhtech.in | +91 8148045030</span>
           </div>
        </Card>

        {/* Info Column */}
        <div className="space-y-6">
           <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-brand/5 border-b border-brand/10">
                 <CardTitle className="text-sm font-black text-navy uppercase tracking-widest flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-brand" /> Payment Info
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</p>
                    <p className="text-sm font-bold text-navy">{invoice.paymentMethod}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Status</p>
                    <div className="mt-1">
                       <StatusBadge status={invoice.paymentStatus} type="payment" />
                    </div>
                 </div>
                 <Link href={`/payments?invoiceId=${invoice.id}`} className="block">
                    <Button className="w-full bg-navy hover:bg-navy/90 text-white rounded-xl h-12 font-bold transition-all shadow-md">
                       Record Payment
                    </Button>
                 </Link>
              </CardContent>
           </Card>

           <Card className="border-0 shadow-sm bg-brand text-white rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex items-center space-x-4">
                 <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <User className="h-6 w-6 text-white" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Client Contact</p>
                    <Link href={`/clients/${invoice.clientId}`} className="text-sm font-black hover:underline underline-offset-4 flex items-center">
                       {invoice.clientName} <ArrowLeft className="ml-1 h-3 w-3 rotate-180" />
                    </Link>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={deleteConfirm} 
        onClose={() => setDeleteConfirm(false)} 
        onConfirm={handleDelete}
        title="Delete this Invoice?"
        description="Are you sure? This will remove the invoice record from the system forever."
      />
    </div>
  );
}
