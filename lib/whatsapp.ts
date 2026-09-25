/**
 * TamizhTech ERP 2.0 - WhatsApp Integration Service
 * 
 * Provides phone number normalization, validation, message generation,
 * and official WhatsApp Web / App sharing URLs.
 * 
 * Strict Zero-Mock Policy: All data must come from real customer, invoice, and payment records.
 */

export interface NormalizedPhoneResult {
  isValid: boolean;
  phone?: string; // Formatted digits without '+' or spaces (e.g. 919876543210)
  displayPhone?: string; // Formatted for user display (e.g. +91 98765 43210)
  error?: string;
}

/**
 * Normalizes and validates a phone number for official WhatsApp API sharing.
 * - Strips whitespace, dashes, parentheses, dots.
 * - Handles Indian numbers (10 digits starting with 6-9 -> prefix with '91').
 * - Handles Indian numbers with leading 0 (e.g., 09876543210 -> 919876543210).
 * - Handles international numbers in E.164 standard (11-15 digits).
 * - Never fabricates fake country codes or silently alters malformed input.
 */
export function normalizeWhatsAppNumber(rawPhone?: string | null): NormalizedPhoneResult {
  if (!rawPhone || typeof rawPhone !== "string" || !rawPhone.trim()) {
    return {
      isValid: false,
      error: "This customer does not have a valid WhatsApp/mobile number.",
    };
  }

  // Remove whitespace, dashes, parentheses, dots
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");

  // Remove leading '+' if present
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // Check if remaining string is all digits
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      error: "This customer does not have a valid WhatsApp/mobile number.",
    };
  }

  // Case 1: 10-digit Indian mobile number starting with 6, 7, 8, 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    const formatted = `91${cleaned}`;
    return {
      isValid: true,
      phone: formatted,
      displayPhone: `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`,
    };
  }

  // Case 2: 11-digit Indian number starting with 0
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    const withoutZero = cleaned.substring(1);
    const formatted = `91${withoutZero}`;
    return {
      isValid: true,
      phone: formatted,
      displayPhone: `+91 ${withoutZero.slice(0, 5)} ${withoutZero.slice(5)}`,
    };
  }

  // Case 3: 12-digit Indian number starting with 91
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    const local = cleaned.substring(2);
    return {
      isValid: true,
      phone: cleaned,
      displayPhone: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
    };
  }

  // Case 4: International numbers (between 10 and 15 digits)
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return {
      isValid: true,
      phone: cleaned,
      displayPhone: `+${cleaned}`,
    };
  }

  return {
    isValid: false,
    error: "This customer does not have a valid WhatsApp/mobile number.",
  };
}

export interface InvoiceWhatsAppDetails {
  customerName: string;
  invoiceNo: string;
  invoiceDate: string | Date;
  total: number | string;
  paidAmount: number | string;
  balance: number | string;
}

/**
 * Builds the official standard WhatsApp message for an invoice.
 */
export function buildInvoiceWhatsAppMessage(details: InvoiceWhatsAppDetails): string {
  const formattedDate =
    typeof details.invoiceDate === "string"
      ? details.invoiceDate
      : new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }).format(details.invoiceDate);

  const totalStr =
    typeof details.total === "number"
      ? details.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : details.total;

  const paidStr =
    typeof details.paidAmount === "number"
      ? details.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : details.paidAmount;

  const balanceStr =
    typeof details.balance === "number"
      ? details.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : details.balance;

  return [
    `Hello ${details.customerName.trim()},`,
    ``,
    `Please find the details of your Tamizh Tech invoice.`,
    ``,
    `Invoice No: ${details.invoiceNo}`,
    `Invoice Date: ${formattedDate}`,
    `Invoice Total: ₹${totalStr}`,
    `Paid Amount: ₹${paidStr}`,
    `Balance: ₹${balanceStr}`,
    ``,
    `You can contact Tamizh Tech Robotics Company for any clarification.`,
    ``,
    `Tamizh Tech Robotics Company`,
    `+91 81480 45030`,
    `https://www.tamizhtech.in`,
  ].join("\n");
}

export interface PaymentWhatsAppDetails {
  customerName: string;
  paymentNo: string;
  invoiceNo: string;
  amount: number | string;
  paymentDate: string | Date;
  remainingBalance: number | string;
}

/**
 * Builds the official standard WhatsApp message for a payment receipt.
 */
export function buildPaymentWhatsAppMessage(details: PaymentWhatsAppDetails): string {
  const formattedDate =
    typeof details.paymentDate === "string"
      ? details.paymentDate
      : new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }).format(details.paymentDate);

  const amountStr =
    typeof details.amount === "number"
      ? details.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : details.amount;

  const balanceStr =
    typeof details.remainingBalance === "number"
      ? details.remainingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : details.remainingBalance;

  return [
    `Hello ${details.customerName.trim()},`,
    ``,
    `Payment received successfully.`,
    ``,
    `Payment No: ${details.paymentNo}`,
    `Invoice No: ${details.invoiceNo}`,
    `Amount Received: ₹${amountStr}`,
    `Payment Date: ${formattedDate}`,
    `Remaining Balance: ₹${balanceStr}`,
    ``,
    `Thank you.`,
    ``,
    `Tamizh Tech Robotics Company`,
    `+91 81480 45030`,
    `https://www.tamizhtech.in`,
  ].join("\n");
}

/**
 * Generates the official WhatsApp link supporting both WhatsApp Web (desktop)
 * and WhatsApp Native App (mobile).
 */
export function generateWhatsAppLink(phone: string, text: string): string {
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;
}
