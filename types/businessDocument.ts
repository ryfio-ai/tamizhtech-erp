import { CompanySettings } from "@/lib/companyProfile";

export interface DocumentParty {
  name: string;
  company?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
}

export interface DocumentItem {
  index: number;
  name: string;
  description: string;
  configurationNotes?: string | null;
  hsnSac: string;
  qty: number;
  rate: number;
  taxPercent: number;
  taxAmount: number;
  amount: number; // Rate * Qty + Tax Amt (Total line amount including tax)
  taxableAmount: number; // Rate * Qty
}

export interface DocumentFinancials {
  subtotal: number;
  discountAmount: number;
  shippingCharge: number;
  taxableAmount: number;
  isIntraState: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTaxAmount: number;
  grandTotal: number;
  totalInWords: string;
  paidAmount?: number;
  balanceAmount?: number;
  paymentStatus?: string;
}

export interface BusinessDocumentModel {
  docType: "INVOICE" | "QUOTATION";
  title: string; // "TAX INVOICE" or "QUOTATION"
  documentNumber: string;
  documentNumberLabel: string; // "Bill No" or "Quote#"
  documentDate: string; // e.g. "18/09/2026, 03:30 PM IST" or "18/09/2026"
  documentDateLabel: string; // "Date" or "Quote Date"
  validUntil?: string; // Quotation only
  placeOfSupply: string; // e.g. "Tamil Nadu (33)"
  company: CompanySettings;
  billTo: DocumentParty;
  shipTo: DocumentParty;
  items: DocumentItem[];
  financials: DocumentFinancials;
  notes?: string | null;
  terms: string[];
  logoSrc: string;
  signatureSrc?: string;
  qrSrc?: string;
}
