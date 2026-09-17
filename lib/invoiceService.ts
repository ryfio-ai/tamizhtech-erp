import prisma from "@/lib/prisma";
import { numberToWords } from "@/lib/numToWords";
import { PaymentStatus, PaymentEntryType, InvoiceStatus } from "@prisma/client";
import { CanonicalInvoiceFinancials } from "@/types";
import { roundToPaise, fromPaise } from "@/lib/money";

export type { CanonicalInvoiceFinancials };

/**
 * Authoritative Server-Side Invoice Financial Calculation Service.
 * Reconciles line items and payment transactions directly against the ledger in exact paise.
 * The UI and PDF components render clean rupee values returned by this service.
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

  // 1. Calculate Line Item Subtotal in exact paise
  let subtotalPaise = 0;
  if (invoice.items && invoice.items.length > 0) {
    subtotalPaise = invoice.items.reduce((acc, item) => {
      const lineAmt = item.qty * item.unitPrice;
      return acc + lineAmt;
    }, 0);
  } else {
    subtotalPaise = invoice.subtotal || 0;
  }

  // 2. Exact Discounts in paise
  const discountAmountPaise = Math.max(0, invoice.discountAmount || 0);
  const taxableAmountPaise = Math.max(0, subtotalPaise - discountAmountPaise);

  // 3. GST Calculation in paise (Split equally between CGST and SGST for intra-state)
  const gstPercent = invoice.gstPercent || 18;
  const totalGstPaise = roundToPaise(taxableAmountPaise * (gstPercent / 100));
  const cgstAmountPaise = roundToPaise(totalGstPaise / 2);
  const sgstAmountPaise = totalGstPaise - cgstAmountPaise;

  // 4. Shipping / Other Charges
  const shippingAmountPaise = 0;

  // 5. Total Amount in paise
  const totalAmountPaise = taxableAmountPaise + totalGstPaise + shippingAmountPaise;

  // 6. Payment Ledger Reconciliation in paise (Authoritative source of truth)
  let netPaidAmountPaise = 0;
  if (invoice.payments && invoice.payments.length > 0) {
    for (const p of invoice.payments) {
      if (p.status === PaymentStatus.COMPLETED) {
        if (p.type === PaymentEntryType.PAYMENT || p.type === PaymentEntryType.ADJUSTMENT) {
          netPaidAmountPaise += p.amount;
        } else if (p.type === PaymentEntryType.REVERSAL) {
          netPaidAmountPaise -= p.amount;
        }
      }
    }
  }
  netPaidAmountPaise = Math.max(0, netPaidAmountPaise);

  // 7. Outstanding Balance in paise
  const outstandingBalancePaise = Math.max(0, totalAmountPaise - netPaidAmountPaise);

  // 8. Payment Status
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date();
  let paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID" | "OVERDUE" = "UNPAID";

  if (outstandingBalancePaise <= 0 && totalAmountPaise > 0) {
    paymentStatus = "PAID";
  } else if (netPaidAmountPaise > 0 && outstandingBalancePaise > 0) {
    paymentStatus = isOverdue ? "OVERDUE" : "PARTIALLY_PAID";
  } else if (isOverdue) {
    paymentStatus = "OVERDUE";
  }

  // 9. Total in Words (Indian numbering convention, from clean rupee amount)
  const totalRupees = fromPaise(totalAmountPaise);
  const totalInWords = numberToWords(totalRupees).toUpperCase();

  // 10. Synchronize derived exact paise values to MongoDB cached fields
  try {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal: subtotalPaise,
        gstAmount: totalGstPaise,
        total: totalAmountPaise,
        paidAmount: netPaidAmountPaise,
        balance: outstandingBalancePaise,
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
    subtotal: fromPaise(subtotalPaise),
    discountAmount: fromPaise(discountAmountPaise),
    taxableAmount: fromPaise(taxableAmountPaise),
    gstPercent,
    cgstAmount: fromPaise(cgstAmountPaise),
    sgstAmount: fromPaise(sgstAmountPaise),
    totalGst: fromPaise(totalGstPaise),
    shippingAmount: fromPaise(shippingAmountPaise),
    totalAmount: totalRupees,
    totalInWords,
    netPaidAmount: fromPaise(netPaidAmountPaise),
    outstandingBalance: fromPaise(outstandingBalancePaise),
    paymentStatus,
  };
}

export const getAuthoritativeInvoiceFinancials = getCanonicalInvoiceFinancials;
