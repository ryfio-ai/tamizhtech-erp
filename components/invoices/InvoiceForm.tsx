"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type InvoiceFormValues, invoiceSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calculator, CheckCircle2 } from "lucide-react";
import { InvoiceLineItems } from "./InvoiceLineItems";
import { Client } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface InvoiceFormProps {
  initialData?: InvoiceFormValues;
  clients: Client[];
  onSubmit: (data: InvoiceFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  preselectedClient?: string;
}

export function InvoiceForm({ initialData, clients, onSubmit, onCancel, isLoading, preselectedClient }: InvoiceFormProps) {
  const [submitMode, setSubmitMode] = useState<"DRAFT" | "ISSUED">("ISSUED");

  const { register, control, watch, setValue, handleSubmit, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initialData || {
      clientId: preselectedClient || "",
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      items: [{ description: "", qty: 1, unitPrice: 0, productId: "" }],
      gstPercent: 18,
      discountPercent: 0,
      paymentMethod: "UPI",
      notes: "Thank you for your business with Tamizh Tech Robotics Company!",
      status: "ISSUED"
    }
  });

  const watchItems = (watch("items") as Array<{ description?: string; qty?: number; unitPrice?: number }>) || [];
  const watchGst = Number(watch("gstPercent")) || 0;
  const watchDiscount = Number(watch("discountPercent")) || 0;

  // Real-time calculation
  const subtotal = watchItems.reduce((acc, item) => acc + ((Number(item?.qty) || 0) * (Number(item?.unitPrice) || 0)), 0);
  const gstAmount = subtotal * (watchGst / 100);
  const discountAmount = subtotal * (watchDiscount / 100);
  const grandTotal = Math.max(0, subtotal + gstAmount - discountAmount);

  const activeClients = clients.filter(c => c.status !== "Blacklisted");

  const handleFormSubmit = async (data: InvoiceFormValues) => {
    // Inject the selected status (DRAFT or ISSUED)
    await onSubmit({
      ...data,
      status: submitMode,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8 pb-12">
      
      {/* 1. Basic Details */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-navy mb-4">Customer & Bill Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Customer *</label>
            <select 
              {...register("clientId")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="">Select a customer...</option>
              {activeClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""} {c.city ? `• ${c.city}` : ""}
                </option>
              ))}
            </select>
            {errors.clientId && <p className="text-xs text-red-500">{errors.clientId.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Bill Date *</label>
            <Input type="date" {...register("date")} />
            {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Due Date *</label>
            <Input type="date" {...register("dueDate")} />
            {errors.dueDate && <p className="text-xs text-red-500">{errors.dueDate.message}</p>}
          </div>
        </div>
      </div>

      {/* 2. Line Items with Product Catalog Selector */}
      <InvoiceLineItems 
        control={control} 
        register={register} 
        watch={watch} 
        setValue={setValue}
        errors={errors} 
      />

      {/* 3. Totals & Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Settings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">
          <h3 className="text-base font-semibold text-navy">Tax & Notes</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* GST Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">GST Rate (%)</label>
                <span className="text-[11px] font-bold text-brand">{watchGst}% Tax</span>
              </div>
              <Input 
                type="number" 
                step="any" 
                min="0"
                {...register("gstPercent", { valueAsNumber: true })} 
                placeholder="18"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  { label: "0% (Exempt)", val: 0 },
                  { label: "5%", val: 5 },
                  { label: "12%", val: 12 },
                  { label: "18%", val: 18 },
                  { label: "28%", val: 28 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setValue("gstPercent", item.val)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                      watchGst === item.val
                        ? "bg-brand text-white border-brand"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Discount (%)</label>
                <span className="text-[11px] font-bold text-emerald-700">
                  {watchDiscount > 0 ? `-${watchDiscount}%` : "No Discount"}
                </span>
              </div>
              <Input 
                type="number" 
                step="any" 
                min="0"
                max="100"
                {...register("discountPercent", { valueAsNumber: true })} 
                placeholder="0"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  { label: "0%", val: 0 },
                  { label: "5%", val: 5 },
                  { label: "10%", val: 10 },
                  { label: "15%", val: 15 },
                  { label: "20%", val: 20 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setValue("discountPercent", item.val)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                      watchDiscount === item.val
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Payment Terms / Notes</label>
            <textarea 
              {...register("notes")}
              rows={3}
              placeholder="Terms and conditions..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
            />
          </div>
        </div>

        {/* Calculation Summary */}
        <div className="bg-brand/5 p-6 rounded-xl border border-brand/10 flex flex-col justify-center space-y-3">
           <div className="flex items-center gap-2 text-brand font-semibold mb-1">
             <Calculator className="w-5 h-5" /> Bill Financial Breakdown
           </div>
           
           <div className="flex justify-between items-center text-sm text-gray-600">
             <span>Gross Subtotal</span>
             <span className="font-semibold text-navy">{formatCurrency(subtotal)}</span>
           </div>
           
           {watchDiscount > 0 ? (
             <div className="flex justify-between items-center text-sm text-emerald-700">
               <span>Discount ({watchDiscount}%)</span>
               <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
             </div>
           ) : null}

           {watchDiscount > 0 ? (
             <div className="flex justify-between items-center text-xs text-gray-500 pt-1 border-t border-brand/10">
               <span>Taxable Base</span>
               <span className="font-medium text-gray-700">{formatCurrency(subtotal - discountAmount)}</span>
             </div>
           ) : null}

           <div className="flex justify-between items-center text-sm text-gray-600">
             <span>GST ({watchGst}%)</span>
             <span className="font-semibold text-navy">
               {watchGst === 0 ? "₹0.00 (Exempt)" : `+${formatCurrency(gstAmount)}`}
             </span>
           </div>

           <div className="pt-3 mt-1 border-t border-brand/20 flex justify-between items-center">
             <span className="text-base font-bold text-navy">Grand Total</span>
             <span className="text-2xl font-bold text-brand">{formatCurrency(grandTotal)}</span>
           </div>
        </div>

      </div>

      {/* Actions: Save Draft vs Issue Bill (Lock 1) */}
      <div className="flex flex-wrap items-center gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="bg-white">
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="outline" 
          disabled={isLoading} 
          onClick={() => setSubmitMode("DRAFT")}
          className="border-border text-ink-primary hover:bg-gray-50"
        >
          {isLoading && submitMode === "DRAFT" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save as Draft
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading} 
          onClick={() => setSubmitMode("ISSUED")}
          className="bg-brand hover:bg-brand-dark min-w-[150px] shadow-sm font-semibold"
        >
          {isLoading && submitMode === "ISSUED" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
          Issue Bill
        </Button>
      </div>

    </form>
  );
}
