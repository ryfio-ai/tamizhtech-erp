"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type PaymentFormValues, paymentSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { Invoice } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface PaymentFormProps {
  invoices: Invoice[];
  onSubmit: (data: PaymentFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  preselectedInvoiceId?: string;
}

export function PaymentForm({ invoices, onSubmit, onCancel, isLoading, preselectedInvoiceId }: PaymentFormProps) {
  
  // Only show unpaid or partially paid invoices for dropdown selection
  const eligibleInvoices = invoices.filter(inv => inv.paymentStatus !== 'Paid' && inv.balance > 0);

  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: preselectedInvoiceId || "",
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      mode: "Bank Transfer",
      referenceNo: "",
      notes: ""
    }
  });

  const selectedInvoiceId = watch("invoiceId");
  const selectedInvoice = useMemo(() => {
    return eligibleInvoices.find(inv => inv.id === selectedInvoiceId);
  }, [selectedInvoiceId, eligibleInvoices]);

  // Handle invoice selection change -> auto fill max balance
  const handleInvoiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue("invoiceId", val);
    const inv = eligibleInvoices.find(i => i.id === val);
    if (inv) {
      setValue("amount", inv.balance);
    } else {
      setValue("amount", 0);
    }
  };

  // Pre-fill amount if loaded with preselected invoice
  useEffect(() => {
    if (preselectedInvoiceId) {
      const inv = eligibleInvoices.find(i => i.id === preselectedInvoiceId);
      if (inv) setValue("amount", inv.balance);
    }
  }, [preselectedInvoiceId, eligibleInvoices, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-8">
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
        
        {/* Left Side - Invoice Selection & Amount */}
        <div className="flex-1 space-y-5">
           <h3 className="text-base font-semibold text-navy">Payment Details</h3>
           
           <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700">Select Invoice *</label>
             <select 
               className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
               value={selectedInvoiceId}
               onChange={handleInvoiceSelect}
             >
               <option value="">-- Choose an unpaid invoice --</option>
               {eligibleInvoices.map(inv => (
                 <option key={inv.id} value={inv.id}>
                   {inv.invoiceNo} - {inv.clientName} (Bal: {formatCurrency(inv.balance)})
                 </option>
               ))}
             </select>
             {errors.invoiceId && <p className="text-xs text-red-500">{errors.invoiceId.message}</p>}
           </div>

           <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700">Payment Amount *</label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
               <Input 
                 type="number" 
                 step="0.01"
                 {...register("amount", { valueAsNumber: true })} 
                 className="pl-7"
               />
             </div>
             {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
             {selectedInvoice && (
               <p className="text-xs text-gray-500">Max suggested balance: {formatCurrency(selectedInvoice.balance)}</p>
             )}
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Payment Date *</label>
               <Input type="date" {...register("date")} />
               {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
             </div>
             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Payment Mode *</label>
               <select 
                 {...register("mode")}
                 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
               >
                 <option value="Cash">Cash</option>
                 <option value="Bank Transfer">Bank Transfer</option>
                 <option value="UPI">UPI</option>
                 <option value="Cheque">Cheque</option>
               </select>
             </div>
           </div>

           <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700">Reference No (Optional)</label>
             <Input {...register("referenceNo")} placeholder="e.g. UTR / Cheque No" />
           </div>

           <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
             <textarea 
               {...register("notes")}
               rows={2}
               className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
             />
           </div>
        </div>

        {/* Right Side - Selected Invoice Summary */}
        <div className="md:w-1/3 shrink-0">
           <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 h-full flex flex-col">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Invoice Summary</h3>
              
              {selectedInvoice ? (
                <div className="space-y-4 text-sm mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Client:</span>
                    <span className="font-medium text-navy text-right pl-4">{selectedInvoice.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Original Total:</span>
                    <span className="font-medium">{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Already Paid:</span>
                    <span className="font-medium text-green-600">{formatCurrency(parseFloat(selectedInvoice.paidAmount as any))}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <span className="font-semibold text-gray-800">Current Balance:</span>
                    <span className="font-bold text-red-600">{formatCurrency(selectedInvoice.balance)}</span>
                  </div>

                  <div className="mt-8 p-3 bg-brand/5 border border-brand/10 rounded-md text-xs text-brand font-medium flex gap-2">
                    <Search className="w-4 h-4 shrink-0" />
                    Verify the amount entered matches the exact bank receipt before saving.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                   <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                     <Search className="w-5 h-5 text-gray-300" />
                   </div>
                   <p className="text-xs text-center">Select an invoice to view its current balance state.</p>
                </div>
              )}
           </div>
        </div>

      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="bg-white">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !selectedInvoiceId} className="bg-green-600 hover:bg-green-700 min-w-[150px] shadow-sm text-white border-green-700">
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {isLoading ? "Recording..." : "Record Payment"}
        </Button>
      </div>

    </form>
  );
}
