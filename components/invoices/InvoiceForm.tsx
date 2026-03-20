'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceSchema, PaymentMethodEnum } from '@/lib/validations';
import { z } from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Trash2, IndianRupee, Calculator } from 'lucide-react';
import { Client } from '@/types';
import { calculateInvoiceTotals, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  initialData?: any;
  onSubmit: (data: InvoiceFormValues) => Promise<void>;
  loading?: boolean;
}

export default function InvoiceForm({ initialData, onSubmit, loading }: InvoiceFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(result => {
        if (result.success) setClients(result.data);
      })
      .finally(() => setClientsLoading(false));
  }, []);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initialData || {
      clientId: '',
      clientName: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ description: '', qty: 1, unitPrice: 0, amount: 0 }],
      gstPercent: 18,
      discountPercent: 0,
      subtotal: 0,
      gstAmount: 0,
      discountAmount: 0,
      total: 0,
      paymentMethod: 'UPI',
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items"
  });

  const watchedGst = useWatch({
    control: form.control,
    name: "gstPercent"
  });

  const watchedDiscount = useWatch({
    control: form.control,
    name: "discountPercent"
  });

  // Re-calculate totals whenever items, GST, or discount change
  useEffect(() => {
    const { subtotal, gstAmount, discountAmount, total } = calculateInvoiceTotals(
      watchedItems || [],
      watchedGst,
      watchedDiscount
    );
    
    form.setValue('subtotal', subtotal);
    form.setValue('gstAmount', gstAmount);
    form.setValue('discountAmount', discountAmount);
    form.setValue('total', total);

    // Update individual item amounts
    watchedItems?.forEach((item, index) => {
      const amount = (item.qty || 0) * (item.unitPrice || 0);
      if (form.getValues(`items.${index}.amount`) !== amount) {
        form.setValue(`items.${index}.amount`, amount);
      }
    });
  }, [watchedItems, watchedGst, watchedDiscount, form]);

  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      form.setValue('clientName', selectedClient.name);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-8">
        {/* Header Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem className="md:col-span-1">
                <FormLabel className="font-bold text-navy">Select Client</FormLabel>
                <Select 
                  onValueChange={(val) => {
                    field.onChange(val);
                    handleClientChange(val);
                  }} 
                  defaultValue={field.value}
                  disabled={clientsLoading}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-xl h-12 bg-white border-2 focus:border-brand transition-all">
                      <SelectValue placeholder={clientsLoading ? "Loading..." : "Choose client"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl">
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Invoice Date</FormLabel>
                <FormControl>
                   <Input type="date" {...field} className="rounded-xl h-12 bg-white border-2 focus:border-brand" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Due Date</FormLabel>
                <FormControl>
                   <Input type="date" {...field} className="rounded-xl h-12 bg-white border-2 focus:border-brand" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Line Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-navy flex items-center tracking-tight">
               <Calculator className="mr-2 h-5 w-5 text-brand" /> Line Items
            </h3>
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => append({ description: '', qty: 1, unitPrice: 0, amount: 0 })}
                className="rounded-xl border-brand text-brand hover:bg-brand/5 font-bold uppercase tracking-widest text-[10px]"
            >
              <Plus className="mr-1 h-3.3 w-3.3" /> Add Item
            </Button>
          </div>
          
          <div className="space-y-3">
             {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-end group bg-gray-50/50 p-4 rounded-2xl border border-dashed hover:border-brand/30 transition-all">
                    <div className="col-span-12 md:col-span-6">
                        <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Description</FormLabel>
                                <FormControl>
                                <Input placeholder="Service or product" {...field} className="rounded-lg h-10" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                        <FormField
                            control={form.control}
                            name={`items.${index}.qty`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Qty</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} className="rounded-lg h-10" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                        <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Price</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} className="rounded-lg h-10" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <div className="col-span-3 md:col-span-1 flex flex-col items-center justify-center pt-6">
                        <span className="text-[10px] font-black text-navy">{formatCurrency(watchedItems[index]?.amount || 0)}</span>
                    </div>
                    <div className="col-span-1 flex justify-end pb-1">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            className="text-gray-300 hover:text-red-500 rounded-full"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
             ))}
          </div>
        </div>

        {/* Footer Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6 border-t">
          <div className="space-y-6">
             <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="font-bold text-navy">Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl">
                        {PaymentMethodEnum.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="font-bold text-navy">Notes / Terms</FormLabel>
                    <FormControl>
                    <Textarea 
                        placeholder="Invoice notes, banking details, etc." 
                        className="rounded-xl min-h-[120px]" 
                        {...field} 
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>

          <div className="bg-navy rounded-3xl p-8 text-white space-y-4 shadow-2xl">
             <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-sm font-bold opacity-60 uppercase tracking-widest">Subtotal</span>
                <span className="text-xl font-black">{formatCurrency(form.getValues('subtotal'))}</span>
             </div>
             
             <div className="flex items-center space-x-6">
                <div className="flex-1 space-y-2">
                    <FormLabel className="text-[10px] font-black opacity-60 uppercase tracking-widest">GST (%)</FormLabel>
                    <FormField
                        control={form.control}
                        name="gstPercent"
                        render={({ field }) => (
                            <Input 
                                type="number" 
                                {...field} 
                                className="bg-white/10 border-white/20 text-white rounded-xl h-10 font-bold focus:bg-white focus:text-navy transition-all" 
                            />
                        )}
                    />
                </div>
                <div className="flex-1 space-y-2">
                    <FormLabel className="text-[10px] font-black opacity-60 uppercase tracking-widest">Discount (%)</FormLabel>
                    <FormField
                        control={form.control}
                        name="discountPercent"
                        render={({ field }) => (
                            <Input 
                                type="number" 
                                {...field} 
                                className="bg-white/10 border-white/20 text-white rounded-xl h-10 font-bold focus:bg-white focus:text-navy transition-all" 
                            />
                        )}
                    />
                </div>
             </div>

             <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between text-xs opacity-80 decoration-brand">
                    <span>GST Amount</span>
                    <span className="font-bold">+{formatCurrency(form.getValues('gstAmount'))}</span>
                </div>
                <div className="flex justify-between text-xs opacity-80 text-red-400">
                    <span>Discount Amount</span>
                    <span className="font-bold">-{formatCurrency(form.getValues('discountAmount'))}</span>
                </div>
                <div className="flex justify-between items-center pt-6">
                    <span className="text-lg font-black text-white px-3 py-1 bg-brand rounded-lg shadow-inner">TOTAL</span>
                    <span className="text-4xl font-black text-white italic">{formatCurrency(form.getValues('total'))}</span>
                </div>
             </div>
             
             <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-navy rounded-xl h-14 mt-8 font-black uppercase tracking-widest shadow-lg transition-all"
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  initialData ? 'Update Invoice' : 'Create & Save Invoice'
                )}
              </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
