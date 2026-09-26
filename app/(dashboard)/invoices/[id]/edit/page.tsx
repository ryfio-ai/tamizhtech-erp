"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { ArrowLeft, Receipt, Edit3 } from "lucide-react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { InvoiceFormValues } from "@/lib/validations";
import { toast } from "sonner";

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const { updateInvoice } = useInvoices();
  const { clients, fetchClients, loading: clientsLoading } = useClients();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true);
        const res = await fetch(`/api/invoices/${invoiceId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setInvoice(json.data);
        } else {
          toast.error(json.error || "Failed to load invoice");
        }
      } catch (err: any) {
        console.error("Error loading invoice:", err);
        toast.error("Failed to load invoice details");
      } finally {
        setLoading(false);
      }
    }
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  if (loading || clientsLoading) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <LoadingSkeleton type="card" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <EmptyState
          title="Invoice Not Found"
          description="The bill you are attempting to edit could not be found."
          actionLabel="Back to Bills"
          onAction={() => router.push("/invoices")}
        />
      </div>
    );
  }

  // Pre-populate form values from existing invoice
  const formattedItems = (invoice.items || []).map((it: any) => ({
    productId: it.productId || "",
    description: it.description || "",
    qty: it.qty || 1,
    unitPrice: it.unitPrice || 0,
    configurationNotes: it.configurationNotes || "",
  }));

  const initialData: InvoiceFormValues = {
    clientId: invoice.clientId,
    date: invoice.date ? invoice.date.split("T")[0] : new Date().toISOString().split("T")[0],
    dueDate: invoice.dueDate ? invoice.dueDate.split("T")[0] : new Date().toISOString().split("T")[0],
    items: formattedItems.length > 0 ? formattedItems : [{ description: "", qty: 1, unitPrice: 0, productId: "" }],
    gstPercent: typeof invoice.gstPercent === "number" ? invoice.gstPercent : 18,
    discountPercent:
      invoice.discountPercent !== undefined && invoice.discountPercent !== null
        ? Number(invoice.discountPercent)
        : invoice.subtotal > 0 && invoice.discountAmount > 0
        ? Math.round((invoice.discountAmount / invoice.subtotal) * 100)
        : 0,
    paymentMethod: invoice.paymentMethod || "UPI",
    shippingCharge:
      invoice.shippingCharge !== undefined && invoice.shippingCharge !== null
        ? Number(invoice.shippingCharge)
        : invoice.financials?.shippingAmount !== undefined
        ? Number(invoice.financials.shippingAmount)
        : 0,
    notes: invoice.notes || "",
    status: invoice.status || "ISSUED",
  };

  const handleUpdate = async (data: InvoiceFormValues) => {
    setSaving(true);
    try {
      const updated = await updateInvoice(invoiceId, data);
      if (updated) {
        toast.success(`Bill ${invoice.invoiceNo} updated successfully!`);
        router.push(`/invoices/${invoiceId}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update bill");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* Top Navigation */}
      <div
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy cursor-pointer w-max"
        onClick={() => router.push(`/invoices/${invoiceId}`)}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Bill Details</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight flex items-center gap-2.5">
              <span>Edit Bill</span>
              <span className="text-brand font-mono font-bold bg-brand/5 px-2.5 py-0.5 rounded-lg border border-brand/20 text-lg">
                {invoice.invoiceNo}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Modify items, pricing, GST, or client. The original bill number{" "}
              <b className="text-navy">{invoice.invoiceNo}</b> is preserved.
            </p>
          </div>
        </div>
      </div>

      {/* Invoice Form in Edit Mode */}
      <InvoiceForm
        initialData={initialData}
        clients={clients}
        onSubmit={handleUpdate}
        onCancel={() => router.push(`/invoices/${invoiceId}`)}
        isLoading={saving}
        isEditing={true}
        invoiceNo={invoice.invoiceNo}
      />
    </div>
  );
}
