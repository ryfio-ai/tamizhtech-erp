import { pdf } from "@react-pdf/renderer";
import React from "react";
import { InvoicePDFTemplate } from "@/components/invoices/InvoicePDFTemplate";
import { DEFAULT_COMPANY_SETTINGS } from "@/lib/companyProfile";
import { Invoice } from "@/types";

export const InvoiceDocument = ({ invoice, client }: { invoice: any; client?: any }) => {
  return <InvoicePDFTemplate invoice={invoice} client={client} company={DEFAULT_COMPANY_SETTINGS} />;
};

export const generateInvoicePDF = async (invoice: Invoice | any, client?: any) => {
  const blob = await pdf(<InvoiceDocument invoice={invoice} client={client} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Tax_Invoice_${invoice.invoiceNo || "INV"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
