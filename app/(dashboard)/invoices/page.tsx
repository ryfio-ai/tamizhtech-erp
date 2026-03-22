"use client";

import { useEffect, useState } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExportButton } from "@/components/shared/ExportButton";
import { FilterDropdown } from "@/components/shared/FilterDropdown";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { Invoice } from "@/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function InvoicesPage() {
  const { invoices, loading, error, fetchInvoices, deleteInvoice } = useInvoices();
  const searchParams = useSearchParams();
  const urlClient = searchParams.get('client');

  const [deleteData, setDeleteData] = useState<{ open: boolean; invoice: Invoice | null; loading: boolean }>({
    open: false,
    invoice: null,
    loading: false
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleConfirmDelete = async () => {
    if (!deleteData.invoice) return;
    setDeleteData(prev => ({ ...prev, loading: true }));
    try {
      await deleteInvoice(deleteData.invoice.id);
      setDeleteData({ open: false, invoice: null, loading: false });
    } catch (e) {
      setDeleteData(prev => ({ ...prev, loading: false }));
    }
  };

  // Apply filters
  let filteredInvoices = invoices.filter(inv => {
    if (statusFilter && inv.paymentStatus !== statusFilter) return false;
    return true;
  });

  // If viewing from client profile link via param
  if (urlClient) {
    filteredInvoices = filteredInvoices.filter(inv => inv.clientId === urlClient);
  }

  const exportColumns = [
    { header: "Invoice No", key: "invoiceNo" },
    { header: "Client Name", key: "clientName" },
    { header: "Date", key: "date" },
    { header: "Due Date", key: "dueDate" },
    { header: "Subtotal", key: "subtotal" },
    { header: "GST", key: "gstAmount" },
    { header: "Discount", key: "discountAmount" },
    { header: "Total Amount", key: "total" },
    { header: "Balance", key: "balance" },
    { header: "Status", key: "paymentStatus" }
  ];

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">Invoices</h1>
            <p className="text-sm text-gray-500">Manage billing and collect payments.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton data={filteredInvoices} filename="TamizhTech_Invoices" columns={exportColumns} />
          <Link href={`/invoices/new${urlClient ? `?client=${urlClient}` : ''}`}>
            <Button className="bg-brand hover:bg-brand-dark shadow-sm gap-2">
              <Plus className="w-4 h-4" /> Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4">
         <FilterDropdown 
           placeholder="Payment Status"
           value={statusFilter}
           onChange={setStatusFilter}
           options={[
             { label: 'Paid', value: 'Paid' },
             { label: 'Partial', value: 'Partial' },
             { label: 'Unpaid', value: 'Unpaid' }
           ]}
         />
         
         {(statusFilter || urlClient) && (
           <Button variant="ghost" onClick={() => { setStatusFilter(""); if(urlClient) window.history.replaceState({}, '', '/invoices'); }} className="text-gray-500 text-sm">
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
      <InvoiceTable 
        data={filteredInvoices} 
        loading={loading}
        onDelete={(invoice) => setDeleteData({ open: true, invoice, loading: false })}
      />

      <ConfirmDialog 
        open={deleteData.open}
        onOpenChange={(op) => setDeleteData(prev => ({ ...prev, open: op }))}
        title="Delete Invoice?"
        description={`Are you sure you want to delete ${deleteData.invoice?.invoiceNo}? This action cannot be undone and will mess up accounting if payments exist.`}
        onConfirm={handleConfirmDelete}
        loading={deleteData.loading}
      />

    </div>
  );
}
