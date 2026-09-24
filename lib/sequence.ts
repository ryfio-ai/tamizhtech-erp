import prisma from "./prisma";
import { getDeterministicSkuPrefix } from "./skuConfig";

/**
 * Concurrency-safe atomic sequence generator using Prisma BusinessSequence collection.
 * Uses atomic $inc / increment on the primary database inside transactions.
 */
export async function allocateSequentialNumberTx(
  tx: any,
  sequenceName: string,
  prefix: string,
  year?: number
): Promise<number> {
  const currentYear = year ?? new Date().getFullYear();

  const seq = await tx.businessSequence.upsert({
    where: { name: sequenceName },
    create: {
      name: sequenceName,
      prefix,
      year: currentYear,
      lastNumber: 1,
    },
    update: {
      prefix,
      year: currentYear,
      lastNumber: { increment: 1 },
    },
  });

  return seq.lastNumber;
}

export async function getNextSequenceNumber(
  sequenceName: string,
  prefix: string,
  year?: number
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    return allocateSequentialNumberTx(tx, sequenceName, prefix, year);
  });
}

/**
 * Generates provisional draft reference that does NOT consume official sequential numbers.
 */
export function generateDraftInvoiceNo(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DRAFT-BILL-${year}-${rand}`;
}

export function generateDraftQuotationNo(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DRAFT-QTN-${year}-${rand}`;
}

/**
 * Transaction-safe official Bill/Invoice Number allocation.
 * Format: TTRC-BILL-YYYY-XXXX (0001 to 9999)
 * Used ONLY when an invoice is ISSUED.
 */
export async function allocateInvoiceNoTx(tx: any, year?: number): Promise<string> {
  const docYear = year ?? new Date().getFullYear();
  const prefix = `TTRC-BILL-${docYear}`;
  const seqName = `INVOICE_${docYear}`;
  const number = await allocateSequentialNumberTx(tx, seqName, prefix, docYear);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

export async function allocateInvoiceNo(year?: number): Promise<string> {
  return prisma.$transaction(async (tx) => {
    return allocateInvoiceNoTx(tx, year);
  });
}

/**
 * Transaction-safe official Quotation Number allocation.
 * Format: TTRC-QTN-YYYY-XXXX (0001 to 9999)
 * Used ONLY when a quotation is SENT / FINALIZED.
 */
export async function allocateQuotationNoTx(tx: any, year?: number): Promise<string> {
  const docYear = year ?? new Date().getFullYear();
  const prefix = `TTRC-QTN-${docYear}`;
  const seqName = `QUOTATION_${docYear}`;
  const number = await allocateSequentialNumberTx(tx, seqName, prefix, docYear);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

export async function allocateQuotationNo(year?: number): Promise<string> {
  return prisma.$transaction(async (tx) => {
    return allocateQuotationNoTx(tx, year);
  });
}

/**
 * Transaction-safe official Customer/Client Code.
 * Format: TT-CL-XXXX (e.g. TT-CL-0001)
 */
export async function allocateClientCodeTx(tx: any): Promise<string> {
  const prefix = "TT-CL";
  const seqName = "CLIENT";
  const number = await allocateSequentialNumberTx(tx, seqName, prefix);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

export async function allocateClientCode(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    return allocateClientCodeTx(tx);
  });
}

/**
 * Generates official Payment Receipt Number.
 * Format: TTRC-PAY-YYYY-XXXX
 */
export async function allocatePaymentNoTx(tx: any, year?: number): Promise<string> {
  const docYear = year ?? new Date().getFullYear();
  const prefix = `TTRC-PAY-${docYear}`;
  const seqName = `PAYMENT_${docYear}`;
  const number = await allocateSequentialNumberTx(tx, seqName, prefix, docYear);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

export async function generatePaymentNo(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    return allocatePaymentNoTx(tx);
  });
}

/**
 * Resets year sequences cleanly for pre-launch initialization.
 * Only resets if explicitly requested prior to live commercial use.
 */
export async function resetYearSequences(year: number, clientInstance?: any): Promise<void> {
  const db = clientInstance || prisma;
  const currentYear = year || new Date().getFullYear();

  await db.businessSequence.upsert({
    where: { name: `INVOICE_${currentYear}` },
    create: {
      name: `INVOICE_${currentYear}`,
      prefix: `TTRC-BILL-${currentYear}`,
      year: currentYear,
      lastNumber: 0,
    },
    update: {
      prefix: `TTRC-BILL-${currentYear}`,
      year: currentYear,
      lastNumber: 0,
    },
  });

  await db.businessSequence.upsert({
    where: { name: `QUOTATION_${currentYear}` },
    create: {
      name: `QUOTATION_${currentYear}`,
      prefix: `TTRC-QTN-${currentYear}`,
      year: currentYear,
      lastNumber: 0,
    },
    update: {
      prefix: `TTRC-QTN-${currentYear}`,
      year: currentYear,
      lastNumber: 0,
    },
  });

  await db.businessSequence.upsert({
    where: { name: "CLIENT" },
    create: {
      name: "CLIENT",
      prefix: "TT-CL",
      lastNumber: 0,
    },
    update: {
      prefix: "TT-CL",
      lastNumber: 0,
    },
  });
}

// ─── Legacy aliases for backward compatibility ─────────────────────
export const generateInvoiceNo = allocateInvoiceNo;
export const generateQuotationNo = allocateQuotationNo;
export const generateClientCode = allocateClientCode;

export async function generateSku(category: string): Promise<string> {
  const prefix = getDeterministicSkuPrefix(category);
  const seqName = `SKU_${prefix}`;
  const number = await getNextSequenceNumber(seqName, prefix);
  return `${prefix}-${String(number).padStart(3, "0")}`;
}

export async function generateLeadCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TT-LD-${year}`;
  const seqName = `LEAD_${year}`;
  const number = await getNextSequenceNumber(seqName, prefix, year);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

export async function generateEmployeeId(): Promise<string> {
  const prefix = "TT-EMP";
  const seqName = "EMPLOYEE";
  const number = await getNextSequenceNumber(seqName, prefix);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

export async function generateExpenseNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TTRC-EXP-${year}`;
  const seqName = `EXPENSE_${year}`;
  const number = await getNextSequenceNumber(seqName, prefix, year);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

export async function generateSourcingNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TTRC-SRC-${year}`;
  const seqName = `SOURCING_${year}`;
  const number = await getNextSequenceNumber(seqName, prefix, year);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

export async function generateProductionNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TTRC-PRD-${year}`;
  const seqName = `PRODUCTION_${year}`;
  const number = await getNextSequenceNumber(seqName, prefix, year);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

/**
 * Transaction-safe official Inbound Website Submission Number allocation.
 * Concurrency-safe atomic generation backed by BusinessSequence.
 * Formats:
 * - RFQ: TTRC-RFQ-YYYY-XXXX
 * - CONTACT: TTRC-CON-YYYY-XXXX
 * - CAREER: TTRC-CAR-YYYY-XXXX
 * - CLUB_REGISTRATION: TTRC-CLUB-YYYY-XXXX
 */
export async function allocateSubmissionNoTx(
  tx: any,
  type: "RFQ" | "CONTACT" | "CAREER" | "CLUB_REGISTRATION",
  year?: number
): Promise<string> {
  const currentYear = year ?? new Date().getFullYear();
  let typeCode = "REQ";
  if (type === "RFQ") typeCode = "RFQ";
  else if (type === "CONTACT") typeCode = "CON";
  else if (type === "CAREER") typeCode = "CAR";
  else if (type === "CLUB_REGISTRATION") typeCode = "CLUB";

  const prefix = `TTRC-${typeCode}-${currentYear}`;
  const seqName = `SUBMISSION_${typeCode}_${currentYear}`;
  const number = await allocateSequentialNumberTx(tx, seqName, prefix, currentYear);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

export async function allocateSubmissionNo(
  type: "RFQ" | "CONTACT" | "CAREER" | "CLUB_REGISTRATION",
  year?: number
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    return allocateSubmissionNoTx(tx, type, year);
  });
}

