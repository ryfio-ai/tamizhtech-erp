"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { BellRing, Loader2, CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface InvoiceReminderButtonProps {
  invoiceId: string;
  invoiceNo: string;
  customerName?: string;
  customerEmail?: string | null;
  balance?: number;
  dueDate?: Date | string | null;
  status?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onReminderSent?: () => void;
}

export function InvoiceReminderButton({
  invoiceId,
  invoiceNo,
  customerName = "Customer",
  customerEmail,
  balance = 0,
  dueDate,
  status,
  variant = "outline",
  size = "sm",
  className,
  onReminderSent,
}: InvoiceReminderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [missingEmailOpen, setMissingEmailOpen] = useState(false);

  // Non-eligible conditions: fully paid, zero balance, cancelled
  const isPaidInFull = status === "PAID" || balance <= 0;
  const isCancelled = status === "CANCELLED" || status === "DRAFT";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPaidInFull) {
      toast.info("This invoice is already fully paid. No reminders are needed.");
      return;
    }
    if (isCancelled) {
      toast.warning(`Cannot send reminders for ${status?.toLowerCase()} invoice.`);
      return;
    }
    if (!customerEmail || !customerEmail.trim()) {
      setMissingEmailOpen(true);
      return;
    }

    setConfirmOpen(true);
  };

  const handleSendReminder = async (forceManual = false) => {
    setLoading(true);
    setConfirmOpen(false);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceManual }),
      });

      const json = await res.json();

      if (json.success) {
        if (json.skipped) {
          toast.info(json.reason || "Reminder already sent today.");
        } else {
          toast.success(`Payment reminder sent to ${customerEmail}!`);
        }
        if (onReminderSent) onReminderSent();
      } else {
        toast.error(json.error || "Failed to send payment reminder");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error sending payment reminder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={loading || isPaidInFull || isCancelled}
        onClick={handleClick}
        className={className}
        title={isPaidInFull ? "Invoice is paid in full" : `Send payment reminder to ${customerEmail || "customer"}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <BellRing className="w-3.5 h-3.5 text-amber-600" />
        )}
        <span className="ml-1.5 font-medium">Send Reminder</span>
      </Button>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink-primary">
              <Mail className="w-5 h-5 text-brand" />
              Send Payment Reminder
            </DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs pt-1">
              Send an official payment reminder email for Invoice <strong>#{invoiceNo}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-surface rounded-xl p-3.5 border border-border text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-ink-secondary">Customer:</span>
              <span className="font-semibold text-ink-primary">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Recipient Email:</span>
              <span className="font-mono text-ink-primary">{customerEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Outstanding Balance:</span>
              <span className="font-bold text-amber-600">
                ₹{Number(balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {dueDate && (
              <div className="flex justify-between">
                <span className="text-ink-secondary">Due Date:</span>
                <span className="font-medium text-ink-primary">
                  {new Date(dueDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="h-10 text-xs w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleSendReminder(true)}
              className="h-10 text-xs bg-brand hover:bg-brand-dark text-white font-semibold w-full sm:w-auto"
            >
              Send Reminder Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing Customer Email Modal */}
      <Dialog open={missingEmailOpen} onOpenChange={setMissingEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Customer Email Unavailable
            </DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs pt-1">
              This customer does not have a registered email address in the ERP database.
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-ink-secondary leading-relaxed">
            Payment reminders are delivered electronically through Resend email. Please edit the customer profile and add a valid email address before sending.
          </p>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMissingEmailOpen(false)}
              className="h-10 text-xs w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
