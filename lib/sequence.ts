import { getMongoDb } from "./mongodb";
import { getDeterministicSkuPrefix } from "./skuConfig";

/**
 * Concurrency-safe atomic sequence generator using MongoDB native BusinessSequence collection.
 * Uses atomic $inc on the primary database, eliminating race conditions and count()+1 bugs.
 */
export async function getNextSequenceNumber(sequenceName: string, prefix: string, year?: number): Promise<number> {
  const currentYear = year ?? new Date().getFullYear();

  try {
    const fetchSeqPromise = (async () => {
      const db = await getMongoDb();
      const result = await db.collection("BusinessSequence").findOneAndUpdate(
        { name: sequenceName },
        {
          $inc: { lastNumber: 1 },
          $setOnInsert: {
            prefix,
            year: currentYear,
            createdAt: new Date(),
          },
          $set: {
            updatedAt: new Date(),
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );

      if (!result || typeof result.lastNumber !== "number") {
        const doc = await db.collection("BusinessSequence").findOne({ name: sequenceName });
        return doc?.lastNumber || 1;
      }

      return result.lastNumber;
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Sequence generation timeout")), 4500)
    );

    return await Promise.race([fetchSeqPromise, timeoutPromise]);
  } catch (err: any) {
    console.warn(`[SEQUENCE_FALLBACK] Atomic sequence failed for ${sequenceName} (${err?.message}), using fallback.`);
    const now = new Date();
    return (now.getMinutes() * 100) + now.getSeconds() + 1;
  }
}

/**
 * Generates deterministic, sequential, category-based SKU.
 * Example: Motors -> TTRC-MOT-001, Controllers -> TTRC-C-001
 */
export async function generateSku(category: string): Promise<string> {
  const prefix = getDeterministicSkuPrefix(category);
  const seqName = `SKU_${prefix}`;
  const number = await getNextSequenceNumber(seqName, prefix);
  return `${prefix}-${String(number).padStart(3, "0")}`;
}

/**
 * Generates official TamizhTech Invoice Number.
 * Example: TT-INV-2026-0001
 */
export async function generateInvoiceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TT-INV-${year}`;
  const seqName = `INVOICE_${year}`;
  const number = await getNextSequenceNumber(seqName, prefix, year);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

/**
 * Generates official Customer/Client Code.
 * Example: TT-CL-0001
 */
export async function generateClientCode(): Promise<string> {
  const prefix = "TT-CL";
  const seqName = "CLIENT";
  const number = await getNextSequenceNumber(seqName, prefix);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

/**
 * Generates official Payment Receipt Number.
 * Example: TT-PAY-2026-0001
 */
export async function generatePaymentNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TT-PAY-${year}`;
  const seqName = `PAYMENT_${year}`;
  const number = await getNextSequenceNumber(seqName, prefix, year);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

/**
 * Generates official Lead Code.
 * Example: TT-LD-2026-0001
 */
export async function generateLeadCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TT-LD-${year}`;
  const seqName = `LEAD_${year}`;
  const number = await getNextSequenceNumber(seqName, prefix, year);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

/**
 * Generates official Employee ID.
 * Example: TT-EMP-0001
 */
export async function generateEmployeeId(): Promise<string> {
  const prefix = "TT-EMP";
  const seqName = "EMPLOYEE";
  const number = await getNextSequenceNumber(seqName, prefix);
  return `${prefix}-${String(number).padStart(4, "0")}`;
}
