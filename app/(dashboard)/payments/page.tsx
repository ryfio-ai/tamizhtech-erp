"use client";

import React, { useEffect } from "react";
import { usePayments } from "@/hooks/usePayments";
import { PaymentTable } from "@/components/payments/PaymentTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentsPage() {
  const { payments = [], loading, fetchPayments } = usePayments();

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const completedCount = payments.filter((p) => (p.status || "COMPLETED") === "COMPLETED").length;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Payments"
        description="Transaction-based ledger of all customer payments, receipts, and settlements."
        actionLabel="Record Payment"
        actionHref="/payments/new"
      />

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Total Collected"
          value={`₹${Number(totalCollected).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtitle={`${payments.length} transactions recorded`}
          icon={CreditCard}
          badgeVariant="success"
        />

        <StatCard
          title="Settled Payments"
          value={completedCount}
          subtitle="Cleared into payment ledger"
          icon={CheckCircle2}
        />
      </div>

      {/* 3. Payments Table & Mobile Cards */}
      <PaymentTable data={payments} loading={loading} />
    </div>
  );
}
