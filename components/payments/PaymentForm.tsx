'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentSchema, PaymentModeEnum } from '@/lib/validations';
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
import { Loader2, CreditCard, User, FileText } from 'lucide-react';
import { Invoice, Client } from '@/types';
import { formatCurrency } from '@/lib/utils';

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  initialData?: any;
  onSubmit: (data: PaymentFormValues) => Promise<void>;
  loading?: boolean;
}

export default function PaymentForm({ initialData, onSubmit, loading }: PaymentFormProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(() => {
    fetch('/api/invoices')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          // Only show Unpaid or Partial invoices
          setInvoices(result.data.filter((inv: Invoice) => inv.paymentStatus !== 'Paid'));
        }
      })
      .finally(() => setInvoicesLoading(false));
  }, []);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: initialData || {
      clientId: '',
      clientName: '',
      invoiceId: '',
      invoiceNo: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      mode: 'UPI',
      reference: '',
      notes: '',
    },
  });

  const handleInvoiceChange = (invoiceId: string) => {
    const selectedInv = invoices.find(inv => inv.id === invoiceId);
    if (selectedInv) {
      form.setValue('clientId', selectedInv.clientId);
      form.setValue('clientName', selectedInv.clientName);
      form.setValue('invoiceNo', selectedInv.invoiceNo);
      // Auto-fill amount with total if not specified
      if (form.getValues('amount') === 0) {
        form.setValue('amount', selectedInv.total);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="invoiceId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="font-bold text-navy">Select Invoice</FormLabel>
                <Select 
                  onValueChange={(val) => {
                    field.onChange(val);
                    handleInvoiceChange(val);
                  }} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-xl h-12 bg-white border-2">
                      <SelectValue placeholder={invoicesLoading ? "Loading invoices..." : "Choose invoice to pay"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl">
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNo} - {inv.clientName} ({formatCurrency(inv.total)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Amount Received (₹)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    className="rounded-xl h-11 border-2 focus:border-green-500 font-bold text-lg" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Payment Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="rounded-xl h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Payment Mode</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl">
                    {PaymentModeEnum.options.map((opt) => (
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
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-navy">Ref / Txn ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. UPI Ref No" {...field} className="rounded-xl h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold text-navy">Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional details..." 
                  className="rounded-xl min-h-[80px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-green-100 transition-all min-w-[200px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              'Record Payment'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
