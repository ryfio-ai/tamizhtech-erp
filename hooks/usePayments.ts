"use client";

import { useState, useCallback } from "react";
import { Payment } from "@/types";
import { toast } from "sonner";
import { PaymentFormValues } from "@/lib/validations";

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments');
      const json = await res.json();
      if (json.success && json.data) {
        setPayments(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch payments");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPayment = async (data: PaymentFormValues) => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setPayments(prev => [json.data, ...prev]);
      toast.success("Payment recorded successfully");
      return json.data as Payment;
    } catch (err: any) {
      toast.error(`Failed to record payment: ${err.message}`);
      throw err;
    }
  };

  const deletePayment = async (id: string) => {
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      setPayments(prev => prev.filter(p => p.id !== id));
      toast.success("Payment removed and invoice balances updated");
      return true;
    } catch (err: any) {
      toast.error(`Error deleting payment: ${err.message}`);
      throw err;
    }
  };

  return {
    payments,
    loading,
    error,
    fetchPayments,
    createPayment,
    deletePayment
  };
}
