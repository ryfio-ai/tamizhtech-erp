"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { normalizeWhatsAppNumber, generateWhatsAppLink } from "@/lib/whatsapp";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { MessageCircle, AlertTriangle, UserCheck } from "lucide-react";

export interface WhatsAppShareButtonProps {
  customerPhone?: string | null;
  customerName?: string | null;
  clientId?: string | null;
  entityType: "INVOICE" | "PAYMENT";
  entityId: string;
  documentNo: string;
  messageText: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
  iconOnly?: boolean;
}

export function WhatsAppShareButton({
  customerPhone,
  customerName = "Customer",
  clientId,
  entityType,
  entityId,
  documentNo,
  messageText,
  variant = "outline",
  size = "default",
  className = "",
  label = "Send via WhatsApp",
  iconOnly = false,
}: WhatsAppShareButtonProps) {
  const router = useRouter();
  const [unavailableModalOpen, setUnavailableModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Normalize and strictly validate phone number
    const norm = normalizeWhatsAppNumber(customerPhone);
    if (!norm.isValid || !norm.phone) {
      setUnavailableModalOpen(true);
      return;
    }

    // 2. Generate official WhatsApp URL
    const url = generateWhatsAppLink(norm.phone, messageText);

    // 3. Open in a new tab/window for WhatsApp Web / Native App
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      // In case popup blocker intercepted window.open
      window.location.href = url;
    }

    toast.success(`Opening WhatsApp for ${customerName || norm.displayPhone}`);

    // 4. Record non-blocking audit log
    fetch("/api/audit/whatsapp-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        documentNo,
        recipientPhone: norm.phone,
        recipientName: customerName,
      }),
    }).catch((err) => {
      console.warn("[WhatsAppShareButton] Audit log non-fatal error:", err);
    });
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={`gap-1.5 transition-colors ${
          variant === "outline"
            ? "border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            : variant === "default"
            ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            : ""
        } ${className}`}
        title={iconOnly ? label : undefined}
      >
        <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
        {!iconOnly && <span>{label}</span>}
      </Button>

      {/* WhatsApp Unavailable Modal */}
      <Dialog open={unavailableModalOpen} onOpenChange={setUnavailableModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-border">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-ink-primary">
              WhatsApp unavailable
            </DialogTitle>
            <DialogDescription className="text-sm text-ink-secondary leading-relaxed pt-1">
              This customer does not have a valid WhatsApp/mobile number.
              {customerPhone ? (
                <span className="block mt-2 font-mono text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  Current record: &quot;{customerPhone}&quot;
                </span>
              ) : (
                <span className="block mt-2 italic text-xs text-slate-500">
                  No mobile number is stored on this customer profile.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              variant="outline"
              onClick={() => setUnavailableModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            {clientId ? (
              <Button
                onClick={() => {
                  setUnavailableModalOpen(false);
                  router.push(`/clients/${clientId}`);
                }}
                className="bg-brand hover:bg-brand-dark text-white font-semibold text-xs gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Edit Customer</span>
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setUnavailableModalOpen(false);
                  router.push("/clients");
                }}
                className="bg-brand hover:bg-brand-dark text-white font-semibold text-xs"
              >
                View Customers
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
