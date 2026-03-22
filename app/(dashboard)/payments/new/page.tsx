"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePayments } from "@/hooks/usePayments";
import { useInvoices } from "@/hooks/useInvoices";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { ArrowLeft, CreditCard } from "lucide-react";

export default function NewPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInvoiceId = searchParams.get('invoiceId') || undefined;

  const { createPayment } = usePayments();
  const { invoices, fetchInvoices, loading: invoicesLoading } = useInvoices();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSubmit = async (data: any) => {
    setSaving(true);
    try {
      await createPayment(data);
      // Go back to the payments list or the invoice detail page
      if (preselectedInvoiceId) {
         router.push(`/invoices/${preselectedInvoiceId}`);
      } else {
         router.push('/payments');
      }
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy cursor-pointer w-max" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" />
        Back
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Record Payment</h1>
          <p className="text-sm text-gray-500">Log a received payment against an outstanding invoice.</p>
        </div>
      </div>

      {invoicesLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
           <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-sm text-gray-500 mt-4">Loading invoices...</p>
        </div>
      ) : (
        <PaymentForm 
          invoices={invoices} 
          onSubmit={handleSubmit} 
          onCancel={() => router.back()} 
          isLoading={saving}
          preselectedInvoiceId={preselectedInvoiceId}
        />
      )}
    </div>
  );
}
