"use client";

import { useState, useCallback } from "react";
import { Invoice } from "@/types";
import { toast } from "sonner";
import { InvoiceFormValues } from "@/lib/validations";

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/invoices');
      const json = await res.json();
      if (json.success && json.data) {
        setInvoices(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch invoices");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createInvoice = async (data: InvoiceFormValues) => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setInvoices(prev => [json.data, ...prev]);
      toast.success(`Invoice created successfully`);
      return json.data as Invoice;
    } catch (err: any) {
      toast.error(`Failed to create invoice: ${err.message}`);
      throw err;
    }
  };

  const updateInvoice = async (id: string, data: InvoiceFormValues) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setInvoices(prev => prev.map(inv => inv.id === id ? json.data : inv));
      toast.success("Invoice updated successfully");
      return json.data as Invoice;
    } catch (err: any) {
      toast.error(`Failed to update invoice: ${err.message}`);
      throw err;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      toast.success("Invoice deleted successfully");
      return true;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const getInvoice = async (id: string) => {
     try {
       const res = await fetch(`/api/invoices/${id}`);
       const json = await res.json();
       if(!json.success) throw new Error(json.error);
       return json.data as Invoice;
     } catch (err: any) {
       toast.error(err.message);
       throw err;
     }
  }

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoice
  };
}
