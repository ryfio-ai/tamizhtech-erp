import React from "react";
import {
  BusinessDocumentPDFTemplate,
  BusinessDocumentPDFTemplateProps,
} from "@/components/shared/BusinessDocumentPDFTemplate";
import {
  BusinessDocumentModel,
  DocumentItem,
  DocumentParty,
} from "@/types/businessDocument";
import {
  resolvePlaceOfSupply,
  formatDocumentDateTime,
} from "@/lib/dateFormat";
import { DEFAULT_COMPANY_SETTINGS, CompanySettings } from "@/lib/companyProfile";
import { CanonicalInvoiceFinancials } from "@/types";
import { fromPaise, roundMoney } from "@/lib/money";
import { numberToWords } from "@/lib/numToWords";

export interface InvoicePDFTemplateProps {
  data?: BusinessDocumentModel;
  invoice?: any;
  client?: any;
  financials?: CanonicalInvoiceFinancials;
  company?: CompanySettings;
  logoSrc?: string;
}

export function InvoicePDFTemplate({
  data,
  invoice,
  client,
  financials,
  company = DEFAULT_COMPANY_SETTINGS,
  logoSrc = "",
}: InvoicePDFTemplateProps) {
  if (data) {
    return <BusinessDocumentPDFTemplate data={data} />;
  }

  if (!invoice) {
    return null;
  }

  const placeOfSupply = resolvePlaceOfSupply(client?.gstin || invoice.client?.gstin, client?.state || invoice.client?.state);
  const isIntraState = placeOfSupply.stateCode === "33";
  const gstPercent = typeof invoice.gstPercent === "number" ? invoice.gstPercent : (invoice.gstPercent !== undefined && invoice.gstPercent !== null && invoice.gstPercent !== "" ? Number(invoice.gstPercent) : 18);

  const items: DocumentItem[] = (invoice.items || []).map((item: any, index: number) => {
    const qty = item.qty;
    const rate = fromPaise(item.unitPrice);
    const taxableAmount = roundMoney(qty * rate);
    const taxAmount = roundMoney(taxableAmount * (gstPercent / 100));
    const amount = roundMoney(taxableAmount + taxAmount);
    const hsnSac = item.product?.sku?.startsWith("HSN")
      ? item.product.sku.replace("HSN-", "")
      : "8479";

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

  const subtotal = financials?.subtotal ?? fromPaise(invoice.subtotal);
  const discountAmount = financials?.discountAmount ?? fromPaise(invoice.discountAmount);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const totalTaxAmount = financials?.totalGst ?? fromPaise(invoice.gstAmount);
  const grandTotal = financials?.totalAmount ?? fromPaise(invoice.total);
  const paidAmount = financials?.netPaidAmount ?? fromPaise(invoice.paidAmount);
  const balanceAmount = financials?.outstandingBalance ?? fromPaise(invoice.balance);
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
    name: client?.name || invoice.client?.name || invoice.clientName || "Valued Customer",
    company: client?.company || invoice.client?.company || null,
    address: client?.address || invoice.client?.address || null,
    city: client?.city || invoice.client?.city || null,
    state: client?.state || invoice.client?.state || null,
    pincode: client?.pincode || invoice.client?.pincode || null,
    phone: client?.phone || invoice.client?.phone || null,
    email: client?.email || invoice.client?.email || null,
    gstin: client?.gstin || invoice.client?.gstin || null,
  };

  const defaultTerms = [
    "Payment is due upon receipt of invoice unless credit terms are explicitly agreed.",
    "Please mention Invoice Number in bank transfer or UPI payment remarks.",
    "Goods once sold are subject to standard warranty and inspection policies.",
    "Disputes, if any, shall be subject to Coimbatore jurisdiction.",
  ];

  const normalized: BusinessDocumentModel = {
    docType: "INVOICE",
    title: "TAX INVOICE",
    documentNumber: invoice.invoiceNo,
    documentNumberLabel: "Bill No",
    documentDate,
    documentDateLabel: "Date",
    placeOfSupply: placeOfSupply.label,
    company,
    billTo,
    shipTo: billTo,
    items,
    financials: {
      subtotal,
      discountAmount,
      shippingCharge: 0,
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
    terms: invoice.terms
      ? invoice.terms.split("\n").map((t: string) => t.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean)
      : defaultTerms,
    logoSrc,
  };

  return <BusinessDocumentPDFTemplate data={normalized} />;
}
