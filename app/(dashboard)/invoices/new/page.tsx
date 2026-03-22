"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { ArrowLeft, Receipt } from "lucide-react";

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClient = searchParams.get('client') || undefined;

  const { createInvoice } = useInvoices();
  const { clients, fetchClients, loading: clientsLoading } = useClients();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSubmit = async (data: any) => {
    setSaving(true);
    try {
      const invoice = await createInvoice(data);
      // Redirect to the newly created invoice detail page
      if (invoice) {
         router.push(`/invoices/${invoice.id}`);
      }
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy cursor-pointer w-max" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" />
        Back
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
          <Receipt className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Create Invoice</h1>
          <p className="text-sm text-gray-500">Generate a new bill for a registered client.</p>
        </div>
      </div>

      {clientsLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
           <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
           <p className="text-sm text-gray-500 mt-4">Loading dependencies...</p>
        </div>
      ) : (
        <InvoiceForm 
          clients={clients} 
          onSubmit={handleSubmit} 
          onCancel={() => router.back()} 
          isLoading={saving}
          preselectedClient={preselectedClient}
        />
      )}
    </div>
  );
}
