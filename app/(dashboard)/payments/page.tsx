"use client";

import { useEffect, useState } from "react";
import { usePayments } from "@/hooks/usePayments";
import { PaymentTable } from "@/components/payments/PaymentTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterDropdown } from "@/components/shared/FilterDropdown";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard } from "lucide-react";
import { Payment } from "@/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentsPage() {
  const { payments, loading, error, fetchPayments, deletePayment } = usePayments();
  const searchParams = useSearchParams();
  const urlInvoice = searchParams.get('invoiceId');

  const [deleteData, setDeleteData] = useState<{ open: boolean; payment: Payment | null; loading: boolean }>({
    open: false,
    payment: null,
    loading: false
  });

  // Filters
  const [modeFilter, setModeFilter] = useState("");

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleConfirmDelete = async () => {
    if (!deleteData.payment) return;
    setDeleteData(prev => ({ ...prev, loading: true }));
    try {
      await deletePayment(deleteData.payment.id);
      setDeleteData({ open: false, payment: null, loading: false });
    } catch (e) {
      setDeleteData(prev => ({ ...prev, loading: false }));
    }
  };

  // Apply filters
  let filteredPayments = payments.filter(p => {
    if (modeFilter && p.mode !== modeFilter) return false;
    return true;
  });

  if (urlInvoice) {
    filteredPayments = filteredPayments.filter(p => p.invoiceId === urlInvoice);
  }

  const exportColumns = [
    { header: "Receipt No", key: "paymentId" },
    { header: "Invoice No", key: "invoiceNo" },
    { header: "Date", key: "date" },
    { header: "Amount", key: "amount" },
    { header: "Mode", key: "mode" },
    { header: "Reference No", key: "referenceNo" }
  ];

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">Payments</h1>
            <p className="text-sm text-gray-500">Track and manage received funds.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={filteredPayments} filename="TamizhTech_Payments" columns={exportColumns} />
          <Link href="/payments/new">
            <Button className="bg-brand hover:bg-brand-dark shadow-sm gap-2">
              <Plus className="w-4 h-4" /> Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4">
         <FilterDropdown 
           placeholder="Payment Mode"
           value={modeFilter}
           onChange={setModeFilter}
           options={[
             { label: 'Bank Transfer', value: 'Bank Transfer' },
             { label: 'UPI', value: 'UPI' },
             { label: 'Cash', value: 'Cash' },
             { label: 'Cheque', value: 'Cheque' }
           ]}
         />
         
         {(modeFilter || urlInvoice) && (
           <Button variant="ghost" onClick={() => { setModeFilter(""); if(urlInvoice) window.history.replaceState({}, '', '/payments'); }} className="text-gray-500 text-sm">
             Clear Filters
           </Button>
         )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* Main Table */}
      <PaymentTable 
        data={filteredPayments} 
        loading={loading}
        onDelete={(payment) => setDeleteData({ open: true, payment, loading: false })}
      />

      <ConfirmDialog 
        open={deleteData.open}
        onOpenChange={(op) => setDeleteData(prev => ({ ...prev, open: op }))}
        title="Delete Payment Record?"
        description={`Are you sure you want to delete payment receipt ${deleteData.payment?.paymentId}? The attached invoice balance will be reverted.`}
        onConfirm={handleConfirmDelete}
        loading={deleteData.loading}
        destructive
      />

    </div>
  );
}
