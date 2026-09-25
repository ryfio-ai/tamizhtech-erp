"use client";

import React, { useEffect, useState } from "react";
import { Mail, CheckCircle2, XCircle, Clock, RotateCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReminderHistoryItem {
  id: string;
  createdAt: string;
  reminderState: string;
  status: "SUCCESS" | "FAILED";
  recipientEmail: string;
  errorMessage?: string | null;
  requestId?: string | null;
  daysOverdue?: number;
  balanceRupees?: number;
}

interface InvoiceReminderHistoryProps {
  invoiceId: string;
  refreshTrigger?: number;
}

export function InvoiceReminderHistory({
  invoiceId,
  refreshTrigger = 0,
}: InvoiceReminderHistoryProps) {
  const [history, setHistory] = useState<ReminderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${invoiceId}/reminders`);
      const json = await res.json();
      if (json.success) {
        setHistory(json.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch reminder history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [invoiceId, refreshTrigger]);

  const handleRetry = async (item: ReminderHistoryItem) => {
    setRetryingId(item.id);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceManual: true }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Reminder re-sent successfully!");
        fetchHistory();
      } else {
        toast.error(json.error || "Failed to retry reminder");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error retrying reminder");
    } finally {
      setRetryingId(null);
    }
  };

  if (loading && history.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 text-center text-xs text-ink-secondary">
        Loading reminder history...
      </div>
    );
  }

  if (history.length === 0) {
    return null; // Don't clutter UI if no reminders have been sent yet
  }

  return (
    <div className="bg-white border border-border rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <h3 className="font-bold text-sm text-ink-primary flex items-center gap-2">
          <Mail className="w-4 h-4 text-brand" />
          Payment Reminder History
        </h3>
        <span className="text-[11px] font-medium text-ink-secondary">
          {history.length} reminder{history.length === 1 ? "" : "s"} logged
        </span>
      </div>

      <div className="divide-y divide-border/60 space-y-2.5 pt-1">
        {history.map((item) => {
          const isSuccess = item.status === "SUCCESS";
          const formattedDate = new Date(item.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          let badgeText = "Upcoming Reminder";
          let badgeClass = "bg-blue-50 text-blue-700 border-blue-200";

          if (item.reminderState === "DUE_TODAY") {
            badgeText = "Due Today Reminder";
            badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
          } else if (item.reminderState === "OVERDUE") {
            badgeText = item.daysOverdue
              ? `Overdue Reminder (${item.daysOverdue}d)`
              : "Overdue Reminder";
            badgeClass = "bg-red-50 text-red-700 border-red-200";
          }

          return (
            <div
              key={item.id}
              className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeClass}`}
                  >
                    {badgeText}
                  </span>
                  <span className="text-ink-secondary text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-ink-muted" />
                    {formattedDate}
                  </span>
                </div>
                <p className="text-ink-secondary text-[11px]">
                  Sent to: <span className="font-mono text-ink-primary">{item.recipientEmail}</span>
                  {item.balanceRupees !== undefined && (
                    <span className="ml-2">
                      (Balance: ₹{Number(item.balanceRupees).toLocaleString("en-IN", { minimumFractionDigits: 2 })})
                    </span>
                  )}
                </p>
                {!isSuccess && item.errorMessage && (
                  <p className="text-red-600 text-[11px] flex items-center gap-1 font-mono">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {item.errorMessage}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                {isSuccess ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Email Sent
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                      Email Failed
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetry(item)}
                      disabled={retryingId === item.id}
                      className="h-7 px-2 text-xs gap-1 text-ink-primary hover:text-brand"
                    >
                      <RotateCw
                        className={`w-3 h-3 ${retryingId === item.id ? "animate-spin" : ""}`}
                      />
                      <span>Retry</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
