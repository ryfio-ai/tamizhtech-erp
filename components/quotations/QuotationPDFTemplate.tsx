import React from "react";
import {
  BusinessDocumentPDFTemplate,
} from "@/components/shared/BusinessDocumentPDFTemplate";
import {
  BusinessDocumentModel,
  DocumentItem,
  DocumentParty,
} from "@/types/businessDocument";
import {
  resolvePlaceOfSupply,
  formatDocumentDate,
} from "@/lib/dateFormat";
import { DEFAULT_COMPANY_SETTINGS, CompanySettings } from "@/lib/companyProfile";
import { fromPaise, roundMoney } from "@/lib/money";
import { numberToWords } from "@/lib/numToWords";

export interface QuotationPDFTemplateProps {
  data?: BusinessDocumentModel;
  quotation?: any;
  client?: any;
  company?: CompanySettings;
  logoSrc?: string | null;
}

export const QuotationPDFTemplate: React.FC<QuotationPDFTemplateProps> = ({
  data,
  quotation,
  client,
  company = DEFAULT_COMPANY_SETTINGS,
  logoSrc = "",
}) => {
  if (data) {
    return <BusinessDocumentPDFTemplate data={data} />;
  }

  if (!quotation) {
    return null;
  }

  const placeOfSupply = resolvePlaceOfSupply(client?.gstin || quotation.client?.gstin, client?.state || quotation.client?.state);
  const isIntraState = placeOfSupply.stateCode === "33";

  const items: DocumentItem[] = (quotation.items || []).map((item: any, index: number) => {
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
  const grandTotal = fromPaise(quotation.total);
  const totalInWords = numberToWords(grandTotal);

  const effectiveTaxRate = quotation.subtotal > 0 ? roundMoney((quotation.taxAmount / quotation.subtotal) * 100) : 18;

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

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
    name: client?.name || quotation.client?.name || "Valued Client",
    company: client?.company || quotation.client?.company || null,
    address: client?.address || quotation.client?.address || null,
    city: client?.city || quotation.client?.city || null,
    state: client?.state || quotation.client?.state || null,
    pincode: client?.pincode || quotation.client?.pincode || null,
    phone: client?.phone || quotation.client?.phone || null,
    email: client?.email || quotation.client?.email || null,
    gstin: client?.gstin || quotation.client?.gstin || null,
  };

  const defaultTerms = [
    "All prices are inclusive of GST / taxes as applicable.",
    "Work will resume after 100% Advance Payment or approved Purchase Order.",
    "In the case of a Purchase Order, payment is due as per agreed terms.",
    "HSN/Tax rates are subject to government statutory amendments.",
    "Standard delivery time for in-stock items is approximately 3-5 working days.",
    "Customized robotics/automation orders require 15-20 working days.",
    "Goods once sold are subject to standard manufacturer warranty policies.",
  ];

  const normalized: BusinessDocumentModel = {
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
    },
    notes: quotation.notes,
    terms: quotation.terms
      ? quotation.terms.split("\n").map((t: string) => t.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean)
      : defaultTerms,
    logoSrc: logoSrc || "",
  };

  return <BusinessDocumentPDFTemplate data={normalized} />;
};
