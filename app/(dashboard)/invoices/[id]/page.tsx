"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInvoices } from "@/hooks/useInvoices";
import { Invoice, Client } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { getInvoice, deleteInvoice } = useInvoices();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const inv = await getInvoice(params.id);
      setInvoice(inv);
      
      if (inv) {
        // Fetch client details
        const res = await fetch(`/api/clients/${inv.clientId}`);
        const cJson = await res.json();
        if (cJson.success) setClient(cJson.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleDelete = async () => {
    try {
      if(!invoice) return;
      await deleteInvoice(invoice.id);
      router.push("/invoices");
    } catch (err) {
       // Handled by hook
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    window.open(`/api/invoices/${params.id}/pdf`, "_blank");
  };

  const handleSendEmail = () => {
    // This is a placeholder for step 15 (Email). Let's mock the toast
    toast.info("Invoice email feature will be available in Step 15");
  }

  if (loading) return <LoadingSkeleton type="page" />;
  if (!invoice) return <EmptyState title="Invoice Not Found" description="The requested invoice does not exist." />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-12">
      <div className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy cursor-pointer w-max" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" />
        Back
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gray-50 rounded-xl">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy tracking-tight">{invoice.invoiceNo}</h1>
            <StatusBadge status={invoice.paymentStatus} type="payment" className="mt-1" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
           <Button variant="outline" className="bg-white text-gray-700 gap-2 hover:bg-gray-50" onClick={handleDownload}>
             <Download className="w-4 h-4 text-gray-400" /> PDF
           </Button>
           <Button variant="outline" className="bg-white text-gray-700 gap-2 hover:bg-gray-50" onClick={handleDownload /* Opens in new tab which can print */}>
             <Printer className="w-4 h-4 text-gray-400" /> Print
           </Button>
           <Button variant="outline" className="bg-white text-blue-700 border-blue-200 hover:bg-blue-50 gap-2" onClick={handleSendEmail}>
             Email
           </Button>
           {invoice.paymentStatus !== 'Paid' && (
             <Link href={`/payments/new?invoiceId=${invoice.id}`}>
               <Button className="bg-green-600 hover:bg-green-700 gap-2 shadow-sm text-white">
                 <CheckCircle2 className="w-4 h-4" /> Record Payment
               </Button>
             </Link>
           )}
           <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setIsDeleting(true)}>
             Delete
           </Button>
        </div>
      </div>

      {/* Invoice Preview Wrapper (HTML representation) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-12 relative overflow-hidden print:shadow-none print:border-none">
        
        {/* Branding */}
        <div className="flex justify-between items-start border-b border-brand border-b-2 pb-8 mb-8">
           <div>
             <h2 className="text-3xl font-black text-brand tracking-tighter mb-1">TamizhTech</h2>
             <p className="text-gray-500 text-sm">Robotics & Tech Company</p>
             <p className="text-gray-500 text-sm">Hosur, Tamil Nadu, India</p>
             <p className="text-gray-500 text-sm">+91 8148045030 | tamizhtechpvtltd@gmail.com</p>
           </div>
           <div className="text-right">
             <h1 className="text-4xl text-navy font-black tracking-widest uppercase opacity-20">Invoice</h1>
             <div className="mt-4 inline-flex">
               <StatusBadge status={invoice.paymentStatus} type="payment" className="text-sm px-3 py-1" />
             </div>
           </div>
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
           <div>
             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</h4>
             {client ? (
                <>
                  <p className="font-bold text-navy text-lg">{client.name}</p>
                  <p className="text-gray-600 text-sm">{client.email}</p>
                  <p className="text-gray-600 text-sm">+91 {client.phone}</p>
                  <p className="text-gray-600 text-sm">{client.city}</p>
                </>
             ) : (
                <p className="font-bold text-navy text-lg">{invoice.clientName}</p>
             )}
           </div>

           <div className="sm:text-right space-y-2">
              <div className="flex justify-between sm:justify-end sm:gap-8 text-sm">
                <span className="text-gray-500">Invoice No:</span>
                <span className="font-semibold text-navy w-24 text-right">{invoice.invoiceNo}</span>
              </div>
              <div className="flex justify-between sm:justify-end sm:gap-8 text-sm">
                <span className="text-gray-500">Issue Date:</span>
                <span className="font-semibold text-navy w-24 text-right">{formatDate(invoice.date)}</span>
              </div>
              <div className="flex justify-between sm:justify-end sm:gap-8 text-sm">
                <span className="text-gray-500">Due Date:</span>
                <span className="font-semibold text-navy w-24 text-right">{formatDate(invoice.dueDate)}</span>
              </div>
           </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
           <table className="w-full text-left text-sm">
             <thead className="bg-gray-50 border-y border-gray-200 text-gray-600 font-semibold uppercase text-xs tracking-wider">
               <tr>
                 <th className="py-3 px-4">Item Description</th>
                 <th className="py-3 px-4 text-center">Qty</th>
                 <th className="py-3 px-4 text-right">Unit Price</th>
                 <th className="py-3 px-4 text-right">Total</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-4 px-4 text-gray-800">{item.description}</td>
                    <td className="py-4 px-4 text-center text-gray-600">{item.qty}</td>
                    <td className="py-4 px-4 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-4 px-4 text-right font-medium text-navy">{formatCurrency(item.qty * item.unitPrice)}</td>
                  </tr>
                ))}
             </tbody>
           </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-12">
           <div className="w-full sm:w-1/2 md:w-1/3 space-y-3">
              <div className="flex justify-between text-sm text-gray-600 px-4">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 px-4">
                  <span>Discount ({invoice.discountPercent}%)</span>
                  <span>-{formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              
              {invoice.gstAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-600 px-4">
                  <span>GST ({invoice.gstPercent}%)</span>
                  <span>+{formatCurrency(invoice.gstAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold text-navy border-t border-gray-200 pt-3 px-4">
                <span>Grand Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>

              <div className="flex justify-between text-sm text-green-600 pt-1 px-4">
                <span>Amount Paid</span>
                <span>{formatCurrency(parseFloat(invoice.paidAmount as any) || 0)}</span>
              </div>

              <div className="flex justify-between text-base font-bold text-red-600 bg-red-50 p-4 rounded-xl mt-2">
                <span>Balance Due</span>
                <span>{formatCurrency(invoice.balance)}</span>
              </div>
           </div>
        </div>

        {/* Footer Notes */}
        {invoice.notes && (
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 mb-8 border border-gray-100 placeholder-lines">
             <strong className="block text-gray-800 mb-1 uppercase text-xs">Notes / Terms</strong>
             <div className="whitespace-pre-wrap">{invoice.notes}</div>
          </div>
        )}

      </div>

      <ConfirmDialog 
        open={isDeleting}
        onOpenChange={setIsDeleting}
        title="Delete Invoice"
        description="Are you sure you want to delete this invoice? Historical accounting records may be affected."
        onConfirm={handleDelete}
        destructive
      />

    </div>
  );
}
