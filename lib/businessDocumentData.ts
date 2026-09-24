import prisma from "@/lib/prisma";
import { getCompanySettings, CompanySettings } from "@/lib/company";
import { getCanonicalInvoiceFinancials } from "@/lib/invoiceService";
import { fromPaise, roundMoney } from "@/lib/money";
import { numberToWords } from "@/lib/numToWords";
import { getServerLogoDataUri, getServerSignatureDataUri } from "@/lib/serverLogo";
import {
  DocumentParty,
  DocumentItem,
  DocumentFinancials,
  BusinessDocumentModel,
} from "@/types/businessDocument";

export type {
  DocumentParty,
  DocumentItem,
  DocumentFinancials,
  BusinessDocumentModel,
};

export const STATE_CODE_MAP: Record<string, string> = {
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  "punjab": "03",
  "chandigarh": "04",
  "uttarakhand": "05",
  "haryana": "06",
  "delhi": "07",
  "rajasthan": "08",
  "uttar pradesh": "09",
  "bihar": "10",
  "sikkim": "11",
  "arunachal pradesh": "12",
  "nagaland": "13",
  "manipur": "14",
  "mizoram": "15",
  "tripura": "16",
  "meghalaya": "17",
  "assam": "18",
  "west bengal": "19",
  "jharkhand": "20",
  "odisha": "21",
  "chhattisgarh": "22",
  "madhya pradesh": "23",
  "gujarat": "24",
  "daman and diu": "25",
  "dadra and nagar haveli": "26",
  "maharashtra": "27",
  "andhra pradesh": "37",
  "karnataka": "29",
  "goa": "30",
  "lakshadweep": "31",
  "kerala": "32",
  "tamil nadu": "33",
  "puducherry": "34",
  "andaman and nicobar islands": "35",
  "telangana": "36",
  "ladakh": "38",
};

export const STATE_NAME_BY_CODE: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

/**
 * Resolves state and 2-digit GST state code.
 */
export function resolvePlaceOfSupply(clientGstin?: string | null, clientState?: string | null): { stateName: string; stateCode: string; label: string } {
  // If valid GSTIN (15 chars), the first 2 characters are the state code
  if (clientGstin && clientGstin.trim().length >= 2) {
    const code = clientGstin.trim().substring(0, 2);
    const name = STATE_NAME_BY_CODE[code] || clientState || "Tamil Nadu";
    return {
      stateName: name,
      stateCode: code,
      label: `${name} (${code})`,
    };
  }

  // Otherwise check client state string
  if (clientState && clientState.trim()) {
    const normalized = clientState.trim().toLowerCase();
    const code = STATE_CODE_MAP[normalized];
    if (code) {
      const name = STATE_NAME_BY_CODE[code] || clientState.trim();
      return {
        stateName: name,
        stateCode: code,
        label: `${name} (${code})`,
      };
    }
    return {
      stateName: clientState.trim(),
      stateCode: "33",
      label: `${clientState.trim()} (33)`,
    };
  }

  // Default to Tamil Nadu (33)
  return {
    stateName: "Tamil Nadu",
    stateCode: "33",
    label: "Tamil Nadu (33)",
  };
}

export function formatDocumentDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDocumentDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${formatted} IST`;
}

function parseTerms(termsStr?: string | null): string[] {
  if (!termsStr || !termsStr.trim()) return [];
  return termsStr
    .split("\n")
    .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Normalizes an Invoice record and its database relations into a unified BusinessDocumentModel.
 */
export async function getNormalizedInvoiceData(invoiceId: string): Promise<BusinessDocumentModel | null> {
  const [invoice, financials, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    }),
    getCanonicalInvoiceFinancials(invoiceId),
    getCompanySettings(),
  ]);

  if (!invoice) return null;

  const logoSrc = getServerLogoDataUri();
  const signatureSrc = getServerSignatureDataUri();
  const placeOfSupply = resolvePlaceOfSupply(invoice.client?.gstin, invoice.client?.state);
  const isIntraState = placeOfSupply.stateCode === "33"; // Tamil Nadu company base

  const gstPercent = typeof invoice.gstPercent === "number" ? invoice.gstPercent : (invoice.gstPercent !== undefined && invoice.gstPercent !== null && invoice.gstPercent !== "" ? Number(invoice.gstPercent) : 18);

  // Items formatting
  const items: DocumentItem[] = (invoice.items || []).map((item, index) => {
    const qty = item.qty;
    const rate = fromPaise(item.unitPrice);
    const taxableAmount = roundMoney(qty * rate);
    const taxAmount = roundMoney(taxableAmount * (gstPercent / 100));
    const amount = roundMoney(taxableAmount + taxAmount);
    const hsnSac = item.product?.sku?.startsWith("HSN")
      ? item.product.sku.replace("HSN-", "")
      : "8479"; // Standard robotics & industrial machines HSN

    return {
      index: index + 1,
      name: item.product?.name || item.description,
      description: item.description,
      configurationNotes: item.configurationNotes || null,
      hsnSac,
      qty,
      rate,
      taxPercent: gstPercent,
      taxAmount,
      amount,
      taxableAmount,
    };
  });

  // Calculate financials from authoritative integer paise
  const subtotal = financials?.subtotal ? financials.subtotal : fromPaise(invoice.subtotal);
  const discountAmount = financials?.discountAmount ? financials.discountAmount : fromPaise(invoice.discountAmount);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const totalTaxAmount = financials?.totalGst ? financials.totalGst : fromPaise(invoice.gstAmount);
  const shippingCharge = 0;
  const grandTotal = financials?.totalAmount ? financials.totalAmount : fromPaise(invoice.total);
  const paidAmount = financials?.netPaidAmount ? financials.netPaidAmount : fromPaise(invoice.paidAmount);
  const balanceAmount = financials?.outstandingBalance ? financials.outstandingBalance : fromPaise(invoice.balance);
  const totalInWords = numberToWords(grandTotal);

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isIntraState) {
    cgstRate = roundMoney(gstPercent / 2);
    sgstRate = roundMoney(gstPercent / 2);
    cgstAmount = roundMoney(totalTaxAmount / 2);
    sgstAmount = roundMoney(totalTaxAmount - cgstAmount);
  } else {
    igstRate = gstPercent;
    igstAmount = totalTaxAmount;
  }

  const documentDate = formatDocumentDateTime(invoice.issuedAt || invoice.date || invoice.createdAt);

  const billTo: DocumentParty = {
    name: invoice.client?.name || invoice.clientName || "Valued Customer",
    company: invoice.client?.company || null,
    address: invoice.client?.address || null,
    city: invoice.client?.city || null,
    state: invoice.client?.state || null,
    pincode: invoice.client?.pincode || null,
    phone: invoice.client?.phone || null,
    email: invoice.client?.email || null,
    gstin: invoice.client?.gstin || null,
  };

  const defaultTerms =
    "1. Payment is due upon receipt of invoice unless credit terms are explicitly agreed.\n" +
    "2. Please mention Invoice Number in bank transfer or UPI payment remarks.\n" +
    "3. Goods once sold are subject to standard warranty and inspection policies.\n" +
    "4. Disputes, if any, shall be subject to Coimbatore jurisdiction.";

  return {
    docType: "INVOICE",
    title: "TAX INVOICE",
    documentNumber: invoice.invoiceNo,
    documentNumberLabel: "Bill No",
    documentDate,
    documentDateLabel: "Date",
    placeOfSupply: placeOfSupply.label,
    company,
    billTo,
    shipTo: billTo, // Default ship to match bill to
    items,
    financials: {
      subtotal,
      discountAmount,
      shippingCharge,
      taxableAmount,
      isIntraState,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTaxAmount,
      grandTotal,
      totalInWords,
      paidAmount,
      balanceAmount,
      paymentStatus: invoice.status,
    },
    notes: invoice.notes,
    terms: parseTerms(invoice.terms || defaultTerms),
    logoSrc,
    signatureSrc,
  };
}

/**
 * Normalizes a Quotation record and its database relations into a unified BusinessDocumentModel.
 */
export async function getNormalizedQuotationData(quotationId: string): Promise<BusinessDocumentModel | null> {
  const [quotation, company] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        client: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    }),
    getCompanySettings(),
  ]);

  if (!quotation) return null;

  const logoSrc = getServerLogoDataUri();
  const signatureSrc = getServerSignatureDataUri();
  const placeOfSupply = resolvePlaceOfSupply(quotation.client?.gstin, quotation.client?.state);
  const isIntraState = placeOfSupply.stateCode === "33";

  // Quotation items
  const items: DocumentItem[] = (quotation.items || []).map((item, index) => {
    const qty = item.qty;
    const rate = fromPaise(item.unitPrice);
    const taxableAmount = roundMoney(qty * rate);
    const taxRate = typeof item.taxRate === "number" ? item.taxRate : (item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== "" ? Number(item.taxRate) : 18);
    const taxAmount = roundMoney(taxableAmount * (taxRate / 100));
    const amount = roundMoney(taxableAmount + taxAmount);
    const hsnSac = item.product?.sku?.startsWith("HSN")
      ? item.product.sku.replace("HSN-", "")
      : item.itemType === "SERVICE"
      ? "9983"
      : "8479";

    return {
      index: index + 1,
      name: item.name || item.product?.name || item.description,
      description: item.description,
      configurationNotes: item.configurationNotes || null,
      hsnSac,
      qty,
      rate,
      taxPercent: taxRate,
      taxAmount,
      amount,
      taxableAmount,
    };
  });

  const subtotal = fromPaise(quotation.subtotal);
  const discountAmount = fromPaise(quotation.discountAmount);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const totalTaxAmount = fromPaise(quotation.taxAmount);
  const shippingCharge = 0;
  const grandTotal = fromPaise(quotation.total);
  const totalInWords = numberToWords(grandTotal);

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  const effectiveTaxRate = quotation.subtotal > 0 ? roundMoney((quotation.taxAmount / quotation.subtotal) * 100) : 18;

  if (isIntraState) {
    cgstRate = roundMoney(effectiveTaxRate / 2);
    sgstRate = roundMoney(effectiveTaxRate / 2);
    cgstAmount = roundMoney(totalTaxAmount / 2);
    sgstAmount = roundMoney(totalTaxAmount - cgstAmount);
  } else {
    igstRate = effectiveTaxRate;
    igstAmount = totalTaxAmount;
  }

  const documentDate = formatDocumentDate(quotation.createdAt);
  const validUntil = formatDocumentDate(quotation.validUntil);

  const billTo: DocumentParty = {
    name: quotation.client?.name || "Valued Client",
    company: quotation.client?.company || null,
    address: quotation.client?.address || null,
    city: quotation.client?.city || null,
    state: quotation.client?.state || null,
    pincode: quotation.client?.pincode || null,
    phone: quotation.client?.phone || null,
    email: quotation.client?.email || null,
    gstin: quotation.client?.gstin || null,
  };

  const defaultTerms =
    "1. All prices are inclusive of GST / taxes as applicable.\n" +
    "2. Work will resume after 100% Advance Payment or approved Purchase Order.\n" +
    "3. In the case of a Purchase Order, payment is due as per agreed terms.\n" +
    "4. HSN/Tax rates are subject to government statutory amendments.\n" +
    "5. Standard delivery time for in-stock items is approximately 3-5 working days.\n" +
    "6. Customized robotics/automation orders require 15-20 working days.\n" +
    "7. Goods once sold are subject to standard manufacturer warranty policies.";

  return {
    docType: "QUOTATION",
    title: "QUOTATION",
    documentNumber: quotation.quotationNo,
    documentNumberLabel: "Quote#",
    documentDate,
    documentDateLabel: "Quote Date",
    validUntil,
    placeOfSupply: placeOfSupply.label,
    company,
    billTo,
    shipTo: billTo,
    items,
    financials: {
      subtotal,
      discountAmount,
      shippingCharge,
      taxableAmount,
      isIntraState,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTaxAmount,
      grandTotal,
      totalInWords,
    },
    notes: quotation.notes,
    terms: parseTerms(quotation.terms || defaultTerms),
    logoSrc,
    signatureSrc,
  };
}
