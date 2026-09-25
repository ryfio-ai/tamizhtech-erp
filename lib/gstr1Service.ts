/**
 * TamizhTech ERP 2.0 — GSTR-1 Sales Export Service
 * 
 * Generates authoritative GSTR-1 sales tax reports for accounting & CA compliance:
 * - Real invoice & customer tax data extraction
 * - Intra-state (CGST + SGST) vs Inter-state (IGST) split based on Place of Supply
 * - Registered B2B (with GSTIN) vs Unregistered B2C handling
 * - Clean CSV and XLSX generation using exact money conversion
 * - Read-only financial integrity
 */

import prisma from "@/lib/prisma";
import { fromPaise } from "@/lib/money";
import * as XLSX from "xlsx";

export interface Gstr1InvoiceRow {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerGstin: string;
  placeOfSupply: string;
  isInterState: boolean;
  reverseCharge: "N" | "Y";
  invoiceType: string;
  ratePercent: number;
  taxableValueRupees: number;
  cgstRupees: number;
  sgstRupees: number;
  igstRupees: number;
  totalValueRupees: number;
  status: string;
}

export interface Gstr1Summary {
  invoicesCount: number;
  totalTaxableRupees: number;
  totalCgstRupees: number;
  totalSgstRupees: number;
  totalIgstRupees: number;
  totalInvoiceValueRupees: number;
  b2bCount: number;
  b2cCount: number;
}

export interface Gstr1FilterOptions {
  fromDate?: string | Date;
  toDate?: string | Date;
  financialYear?: string; // e.g. "2026-27"
  status?: string; // default "ACTIVE" (exclude CANCELLED/DRAFT)
  clientId?: string;
}

// Tamizh Tech Headquarters state details
const COMPANY_STATE_CODE = "33";
const COMPANY_STATE_NAME = "Tamil Nadu";

/**
 * Derives start and end date for a given Indian Financial Year (Apr 1 to Mar 31).
 */
export function getFinancialYearDateRange(fy: string): { fromDate: Date; toDate: Date } {
  // Format expected: "2026-27" or "2026-2027" or "2026"
  const startYear = parseInt(fy.split("-")[0], 10) || new Date().getFullYear();
  const fromDate = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0)); // April 1st
  const toDate = new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999)); // March 31st
  return { fromDate, toDate };
}

/**
 * Normalizes state name / place of supply string.
 */
function normalizeState(stateStr?: string | null): string {
  if (!stateStr) return "33-Tamil Nadu";
  const trimmed = stateStr.trim();
  if (trimmed.startsWith("33") || trimmed.toLowerCase().includes("tamil nadu")) {
    return "33-Tamil Nadu";
  }
  return trimmed;
}

/**
 * Fetches real invoices and builds the GSTR-1 records.
 */
export async function getGstr1SalesData(options: Gstr1FilterOptions): Promise<{
  rows: Gstr1InvoiceRow[];
  summary: Gstr1Summary;
}> {
  let startDate: Date;
  let endDate: Date;

  if (options.financialYear) {
    const range = getFinancialYearDateRange(options.financialYear);
    startDate = options.fromDate ? new Date(options.fromDate) : range.fromDate;
    endDate = options.toDate ? new Date(options.toDate) : range.toDate;
  } else {
    const now = new Date();
    startDate = options.fromDate ? new Date(options.fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = options.toDate ? new Date(options.toDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  // Authoritative invoice query
  const invoices = await prisma.invoice.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        notIn: ["CANCELLED", "DRAFT"],
      },
      ...(options.clientId ? { clientId: options.clientId } : {}),
    },
    include: {
      client: true,
      items: true,
    },
    orderBy: { date: "asc" },
  });

  const rows: Gstr1InvoiceRow[] = [];
  let totalTaxableRupees = 0;
  let totalCgstRupees = 0;
  let totalSgstRupees = 0;
  let totalIgstRupees = 0;
  let totalInvoiceValueRupees = 0;
  let b2bCount = 0;
  let b2cCount = 0;

  for (const inv of invoices) {
    const client = inv.client;
    const gstin = client?.gstin?.trim() || "";
    const isB2B = Boolean(gstin && gstin.length >= 15);

    if (isB2B) b2bCount++;
    else b2cCount++;

    const placeOfSupply = normalizeState(client?.state || inv.notes);
    const isInterState = !placeOfSupply.startsWith(COMPANY_STATE_CODE) &&
      !placeOfSupply.toLowerCase().includes("tamil nadu");

    // Exact money representation
    const subtotalPaise = inv.subtotal || 0;
    const discountPaise = inv.discountAmount || 0;
    const taxablePaise = Math.max(0, subtotalPaise - discountPaise);
    const totalGstPaise = Math.max(0, inv.gstAmount || 0);
    const totalPaise = inv.total || 0;

    const ratePercent = typeof inv.gstPercent === "number" ? inv.gstPercent : 18;

    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;

    if (ratePercent > 0 && totalGstPaise > 0) {
      if (isInterState) {
        igstPaise = totalGstPaise;
      } else {
        cgstPaise = Math.round(totalGstPaise / 2);
        sgstPaise = totalGstPaise - cgstPaise;
      }
    }

    const taxableRupees = fromPaise(taxablePaise);
    const cgstRupees = fromPaise(cgstPaise);
    const sgstRupees = fromPaise(sgstPaise);
    const igstRupees = fromPaise(igstPaise);
    const totalRupees = fromPaise(totalPaise);

    totalTaxableRupees += taxableRupees;
    totalCgstRupees += cgstRupees;
    totalSgstRupees += sgstRupees;
    totalIgstRupees += igstRupees;
    totalInvoiceValueRupees += totalRupees;

    rows.push({
      invoiceNo: inv.invoiceNo,
      invoiceDate: new Date(inv.date).toISOString().split("T")[0],
      customerName: client?.name || inv.clientName,
      customerGstin: isB2B ? gstin : "URP",
      placeOfSupply,
      isInterState,
      reverseCharge: "N",
      invoiceType: "Regular",
      ratePercent,
      taxableValueRupees: taxableRupees,
      cgstRupees,
      sgstRupees,
      igstRupees,
      totalValueRupees: totalRupees,
      status: inv.status,
    });
  }

  const summary: Gstr1Summary = {
    invoicesCount: rows.length,
    totalTaxableRupees: Math.round(totalTaxableRupees * 100) / 100,
    totalCgstRupees: Math.round(totalCgstRupees * 100) / 100,
    totalSgstRupees: Math.round(totalSgstRupees * 100) / 100,
    totalIgstRupees: Math.round(totalIgstRupees * 100) / 100,
    totalInvoiceValueRupees: Math.round(totalInvoiceValueRupees * 100) / 100,
    b2bCount,
    b2cCount,
  };

  return { rows, summary };
}

/**
 * Generates RFC-4180 compliant CSV string from GSTR-1 rows.
 */
export function generateGstr1Csv(rows: Gstr1InvoiceRow[]): string {
  const headers = [
    "Invoice Number",
    "Invoice Date",
    "Customer Name",
    "Customer GSTIN",
    "Place of Supply",
    "Supply Type",
    "Reverse Charge",
    "Invoice Type",
    "Rate (%)",
    "Taxable Value (INR)",
    "Central Tax / CGST (INR)",
    "State Tax / SGST (INR)",
    "Integrated Tax / IGST (INR)",
    "Total Invoice Value (INR)",
    "Status",
  ];

  const escapeCsv = (val: string | number) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvRows: string[] = [];
  csvRows.push(headers.map(escapeCsv).join(","));

  for (const r of rows) {
    const line = [
      r.invoiceNo,
      r.invoiceDate,
      r.customerName,
      r.customerGstin,
      r.placeOfSupply,
      r.isInterState ? "Inter-State" : "Intra-State",
      r.reverseCharge,
      r.invoiceType,
      r.ratePercent.toFixed(2),
      r.taxableValueRupees.toFixed(2),
      r.cgstRupees.toFixed(2),
      r.sgstRupees.toFixed(2),
      r.igstRupees.toFixed(2),
      r.totalValueRupees.toFixed(2),
      r.status,
    ];
    csvRows.push(line.map(escapeCsv).join(","));
  }

  return csvRows.join("\r\n");
}

/**
 * Generates standard XLSX Buffer using SheetJS.
 */
export function generateGstr1Xlsx(rows: Gstr1InvoiceRow[]): Buffer {
  const data = rows.map((r) => ({
    "Invoice Number": r.invoiceNo,
    "Invoice Date": r.invoiceDate,
    "Customer Name": r.customerName,
    "Customer GSTIN": r.customerGstin,
    "Place of Supply": r.placeOfSupply,
    "Supply Type": r.isInterState ? "Inter-State" : "Intra-State",
    "Reverse Charge": r.reverseCharge,
    "Invoice Type": r.invoiceType,
    "Rate (%)": r.ratePercent,
    "Taxable Value (INR)": r.taxableValueRupees,
    "Central Tax / CGST (INR)": r.cgstRupees,
    "State Tax / SGST (INR)": r.sgstRupees,
    "Integrated Tax / IGST (INR)": r.igstRupees,
    "Total Invoice Value (INR)": r.totalValueRupees,
    "Status": r.status,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths for readability
  ws["!cols"] = [
    { wch: 18 }, // Invoice Number
    { wch: 13 }, // Invoice Date
    { wch: 28 }, // Customer Name
    { wch: 18 }, // Customer GSTIN
    { wch: 20 }, // Place of Supply
    { wch: 14 }, // Supply Type
    { wch: 14 }, // Reverse Charge
    { wch: 14 }, // Invoice Type
    { wch: 10 }, // Rate
    { wch: 18 }, // Taxable Value
    { wch: 16 }, // CGST
    { wch: 16 }, // SGST
    { wch: 16 }, // IGST
    { wch: 20 }, // Total Value
    { wch: 12 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, "GSTR-1 Sales");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}
