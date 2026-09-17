import prisma from "@/lib/prisma";
import { numberToWords } from "@/lib/numToWords";
import { PaymentStatus, PaymentEntryType, InvoiceStatus } from "@prisma/client";
import { CanonicalInvoiceFinancials } from "@/types";

export type { CanonicalInvoiceFinancials };

/**
 * Authoritative Server-Side Invoice Financial Calculation Service.
 * Reconciles line items and payment transactions directly against the ledger.
 * The UI and PDF components MUST ONLY render values returned by this service!
 */
export async function getCanonicalInvoiceFinancials(
  invoiceId: string
): Promise<CanonicalInvoiceFinancials | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: true,
      payments: true,
    },
  });

  if (!invoice) return null;

  // 1. Calculate Line Item Subtotal
  let subtotal = 0;
  if (invoice.items && invoice.items.length > 0) {
    subtotal = invoice.items.reduce((acc, item) => {
      const lineAmt = item.qty * item.unitPrice;
      return acc + lineAmt;
    }, 0);
  } else {
    subtotal = invoice.subtotal || 0;
  }

  // 2. Exact Discounts
  const discountAmount = Math.max(0, invoice.discountAmount || 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);

  // 3. GST Calculation (Split equally between CGST and SGST for intra-state)
  const gstPercent = invoice.gstPercent || 18;
  const totalGst = Math.round((taxableAmount * (gstPercent / 100)) * 100) / 100;
  const cgstAmount = Math.round((totalGst / 2) * 100) / 100;
  const sgstAmount = Math.round((totalGst - cgstAmount) * 100) / 100;

  // 4. Shipping / Other Charges
  const shippingAmount = 0; // Configurable per order

  // 5. Total Amount
  const totalAmount = Math.round((taxableAmount + totalGst + shippingAmount) * 100) / 100;

  // 6. Payment Ledger Reconciliation (Authoritative source of truth)
  let netPaidAmount = 0;
  if (invoice.payments && invoice.payments.length > 0) {
    for (const p of invoice.payments) {
      if (p.status === PaymentStatus.COMPLETED) {
        if (p.type === PaymentEntryType.PAYMENT || p.type === PaymentEntryType.ADJUSTMENT) {
          netPaidAmount += p.amount;
        } else if (p.type === PaymentEntryType.REVERSAL) {
          netPaidAmount -= p.amount;
        }
      }
    }
  }
  netPaidAmount = Math.max(0, Math.round(netPaidAmount * 100) / 100);

  // 7. Outstanding Balance
  const outstandingBalance = Math.max(0, Math.round((totalAmount - netPaidAmount) * 100) / 100);

  // 8. Payment Status
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date();
  let paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID" | "OVERDUE" = "UNPAID";

  if (outstandingBalance <= 0 && totalAmount > 0) {
    paymentStatus = "PAID";
  } else if (netPaidAmount > 0 && outstandingBalance > 0) {
    paymentStatus = isOverdue ? "OVERDUE" : "PARTIALLY_PAID";
  } else if (isOverdue) {
    paymentStatus = "OVERDUE";
  }

  // 9. Total in Words (Indian numbering convention)
  const totalInWords = numberToWords(totalAmount).toUpperCase();

  // 10. Synchronize derived values to MongoDB cached fields
  try {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal,
        gstAmount: totalGst,
        total: totalAmount,
        paidAmount: netPaidAmount,
        balance: outstandingBalance,
        status:
          paymentStatus === "PAID"
            ? InvoiceStatus.PAID
            : paymentStatus === "PARTIALLY_PAID"
            ? InvoiceStatus.PARTIALLY_PAID
            : InvoiceStatus.ISSUED,
      },
    });
  } catch (syncErr) {
    console.warn("[InvoiceService] Cache sync note:", syncErr);
  }

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    gstPercent,
    cgstAmount,
    sgstAmount,
    totalGst,
    shippingAmount,
    totalAmount,
    totalInWords,
    netPaidAmount,
    outstandingBalance,
    paymentStatus,
  };
}

export const getAuthoritativeInvoiceFinancials = getCanonicalInvoiceFinancials;
