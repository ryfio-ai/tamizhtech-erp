"use client";

import React, { useEffect, Suspense } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { IndianRupee, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

function InvoicesContent() {
  const { invoices = [], loading, fetchInvoices } = useInvoices();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlClient = searchParams.get("client");

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  let filteredInvoices = invoices;
  if (urlClient) {
    filteredInvoices = filteredInvoices.filter((inv) => inv.clientId === urlClient);
  }

  // Calculate high level summaries
  const totalBilled = filteredInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
  const totalPaid = filteredInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  const totalOutstanding = filteredInvoices.reduce(
    (acc, inv) => acc + (inv.balance ?? (inv.total - (inv.paidAmount || 0))),
    0
  );

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* 1. Standard Page Header */}
      <PageHeader
        title="Invoices"
        description="Track customer billing, payment status, and outstanding receivables."
        actionLabel="Create Invoice"
        actionHref="/invoices/new"
      />

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Total Invoiced"
          value={`₹${Number(totalBilled).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtitle={`${filteredInvoices.length} invoices issued`}
          icon={FileText}
        />

        <StatCard
          title="Total Collected"
          value={`₹${Number(totalPaid).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtitle="Settled in payment ledger"
          icon={CheckCircle2}
          badgeVariant="success"
        />

        <StatCard
          title="Outstanding Balance"
          value={`₹${Number(totalOutstanding).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtitle="Pending collections"
          icon={AlertTriangle}
          badge={totalOutstanding > 0 ? "Receivables" : "All Clear"}
          badgeVariant={totalOutstanding > 0 ? "warning" : "success"}
        />
      </div>

      {/* 3. Invoices Table & Mobile Cards */}
      <InvoiceTable data={filteredInvoices} loading={loading} onDelete={fetchInvoices} />
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton type="table" />}>
      <InvoicesContent />
    </Suspense>
  );
}
