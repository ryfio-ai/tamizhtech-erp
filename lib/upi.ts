/**
 * TamizhTech ERP 2.0 - Dynamic UPI QR Service
 * 
 * Generates dynamic UPI payment URIs and QR code Data URLs strictly based on
 * current outstanding invoice balances and authoritative system settings.
 * 
 * Strict Financial Integrity:
 * - Read-only operation. NEVER mutates ledger, balances, or invoice records.
 * - Always uses real outstanding balance, never stale invoice totals.
 * - Suppresses active payment QR when balance is zero or invoice is non-payable.
 */

import QRCode from "qrcode";
import { getSystemSetting } from "@/lib/settings";

export interface UpiValidationResult {
  isConfigured: boolean;
  isPayable: boolean;
  isPaidInFull?: boolean;
  vpa?: string;
  payeeName?: string;
  amount?: number;
  amountFormatted?: string;
  upiUri?: string;
  qrDataUri?: string;
  reason?: string;
}

/**
 * Validates whether a VPA string matches the standard UPI VPA specification.
 * Minimum format: username@bank (e.g. ta9387643@okicici, company@hdfcbank)
 */
export function isValidUpiVpa(vpa?: string | null): boolean {
  if (!vpa || typeof vpa !== "string") return false;
  const trimmed = vpa.trim();
  // Valid UPI VPA: alphanumeric with optional dots, hyphens, underscores followed by @ and bank handle
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9]{2,}$/.test(trimmed);
}

/**
 * Builds standard National Payments Corporation of India (NPCI) UPI Intent URI.
 * Format:
 * upi://pay?pa=<VPA>&pn=<PAYEE_NAME>&am=<AMOUNT>&tr=<TXN_REF>&cu=INR
 */
export function buildUpiPaymentUri(params: {
  vpa: string;
  payeeName: string;
  amount: number;
  invoiceNo: string;
}): string {
  const { vpa, payeeName, amount, invoiceNo } = params;
  const formattedAmount = amount.toFixed(2);
  const cleanRef = invoiceNo.replace(/[^a-zA-Z0-9_-]/g, "");

  const queryParams = new URLSearchParams({
    pa: vpa.trim(),
    pn: payeeName.trim(),
    am: formattedAmount,
    tr: cleanRef,
    cu: "INR",
  });

  return `upi://pay?${queryParams.toString()}`;
}

export interface DynamicInvoiceUpiParams {
  invoiceNo: string;
  status: string; // DRAFT, ISSUED, PARTIALLY_PAID, PAID, CANCELLED, etc.
  balanceAmount: number; // Real outstanding balance in decimal INR (e.g. 640.00)
  configuredVpa?: string | null;
  configuredPayeeName?: string | null;
}

/**
 * Evaluates the payment eligibility of an invoice and generates the dynamic UPI QR code.
 */
export async function generateInvoiceDynamicUpi(
  params: DynamicInvoiceUpiParams
): Promise<UpiValidationResult> {
  const { invoiceNo, status, balanceAmount } = params;

  // 1. Check Invoice State Machine: Cancelled, Voided, or Draft invoices cannot be paid
  const normalizedStatus = (status || "").toUpperCase();
  if (normalizedStatus === "CANCELLED" || normalizedStatus === "VOIDED") {
    return {
      isConfigured: true,
      isPayable: false,
      reason: "This invoice is cancelled. Payment cannot be collected.",
    };
  }

  if (normalizedStatus === "DRAFT") {
    return {
      isConfigured: true,
      isPayable: false,
      reason: "This invoice is in Draft status. Please issue the invoice before payment.",
    };
  }

  // 2. Check Zero Balance Condition (Paid in Full)
  if (balanceAmount <= 0.001) {
    return {
      isConfigured: true,
      isPayable: false,
      isPaidInFull: true,
      amount: 0,
      amountFormatted: "0.00",
      reason: "Paid in Full. No outstanding amount remains on this invoice.",
    };
  }

  // 3. Resolve and Validate Merchant VPA
  let vpa = params.configuredVpa?.trim();
  if (!vpa) {
    // Check environment variable first, then system settings
    vpa = process.env.UPI_VPA?.trim();
    if (!vpa) {
      const dbVpa = await getSystemSetting("UPI_ID");
      vpa = typeof dbVpa === "string" ? dbVpa.trim() : "";
    }
  }

  if (!isValidUpiVpa(vpa)) {
    return {
      isConfigured: false,
      isPayable: false,
      reason: "UPI payment details have not been configured.",
    };
  }

  // 4. Resolve Payee Name
  let payeeName = params.configuredPayeeName?.trim();
  if (!payeeName) {
    payeeName = process.env.UPI_PAYEE_NAME?.trim();
    if (!payeeName) {
      const dbName = await getSystemSetting("COMPANY_NAME");
      payeeName = typeof dbName === "string" ? dbName.trim() : "Tamizh Tech Robotics Company";
    }
  }

  // 5. Generate Dynamic UPI URI using the EXACT outstanding balance
  const upiUri = buildUpiPaymentUri({
    vpa,
    payeeName,
    amount: balanceAmount,
    invoiceNo,
  });

  // 6. Generate QR Data URI
  try {
    const qrDataUri = await QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return {
      isConfigured: true,
      isPayable: true,
      isPaidInFull: false,
      vpa,
      payeeName,
      amount: balanceAmount,
      amountFormatted: balanceAmount.toFixed(2),
      upiUri,
      qrDataUri,
    };
  } catch (qrErr: any) {
    console.error("[generateInvoiceDynamicUpi] QR generation failed:", qrErr);
    return {
      isConfigured: true,
      isPayable: false,
      reason: "Unable to generate payment QR code.",
    };
  }
}
