/**
 * Authoritative Moving Weighted Average Cost (WAC) & Inventory Valuation Engine
 * TamizhTech ERP 2.0 (Paise precision, Fixed-Scale Minor Quantities, Atomic Decrements & Anti-Backdating)
 */

import prisma from "@/lib/prisma";
import {
  roundToPaise,
  fromPaise,
  safeMultiplyQuantityByPaise,
  toMinorQuantity,
  fromMinorQuantity,
  calculateMinorCostPaise,
} from "@/lib/money";
import { invalidateStockCache } from "@/lib/cache";

/**
 * Calculates rolling Moving Weighted Average Cost (WAC) in paise.
 * Formula:
 * New WAC = ((currentStock * currentWAC) + (inboundQty * inboundUnitCost)) / (currentStock + inboundQty)
 */
export function calculateRollingWACPaise(
  currentStock: number,
  currentWACPaise: number,
  inboundQty: number,
  inboundUnitCostPaise: number
): number {
  const cleanInboundCost = roundToPaise(inboundUnitCostPaise);
  const cleanCurrentWAC = roundToPaise(currentWACPaise);

  if (inboundQty <= 0) return cleanCurrentWAC;

  // Zero-Stock Rule: If stock <= 0, reset baseline to new inbound unit cost
  if (currentStock <= 0) {
    return cleanInboundCost;
  }

  const currentValue = currentStock * cleanCurrentWAC;
  const inboundValue = inboundQty * cleanInboundCost;
  const totalQty = currentStock + inboundQty;

  return roundToPaise((currentValue + inboundValue) / totalQty);
}

/**
 * Computes the chronological rolling WAC in paise for a product from the authoritative StockLedgerEntry ledger.
 * Uses effectiveAt for chronological accuracy.
 */
export async function getProductRollingWACPaise(productId: string, asOfDate?: Date): Promise<number> {
  const whereClause: any = { productId };
  if (asOfDate) {
    whereClause.effectiveAt = { lte: asOfDate };
  }

  const entries = await prisma.stockLedgerEntry.findMany({
    where: whereClause,
    orderBy: { effectiveAt: "asc" },
  });

  let runningQty = 0;
  let runningWACPaise = 0;

  for (const entry of entries) {
    const qty = entry.quantitySigned;

    if (qty > 0) {
      // Inbound movement: purchase, production, opening, positive adjustment, customer return, production consumption reversal
      const unitCost = entry.unitCostPaise ?? entry.unitCost ?? 0;
      runningWACPaise = calculateRollingWACPaise(runningQty, runningWACPaise, qty, unitCost);
      runningQty += qty;
    } else if (qty < 0) {
      // Outbound movement: sale, damage, negative adjustment, supplier return, production consumption, production reversal, purchase reversal
      runningQty = Math.max(0, runningQty + qty);
    }
  }

  return roundToPaise(runningWACPaise);
}

/**
 * Reconstructs complete inventory position for a product as of timestamp T.
 * Replays stock ledger events sequentially up to asOfDate using effectiveAt.
 */
export async function getProductInventoryStateAsOf(productId: string, asOfDate?: Date) {
  const whereClause: any = { productId };
  if (asOfDate) {
    whereClause.effectiveAt = { lte: asOfDate };
  }

  const entries = await prisma.stockLedgerEntry.findMany({
    where: whereClause,
    orderBy: { effectiveAt: "asc" },
  });

  let closingQty = 0;
  let rollingWACPaise = 0;
  let totalInboundQty = 0;
  let totalOutboundQty = 0;

  for (const entry of entries) {
    const qty = entry.quantitySigned;

    if (qty > 0) {
      totalInboundQty += qty;
      const unitCost = entry.unitCostPaise ?? entry.unitCost ?? 0;
      rollingWACPaise = calculateRollingWACPaise(closingQty, rollingWACPaise, qty, unitCost);
      closingQty += qty;
    } else if (qty < 0) {
      totalOutboundQty += Math.abs(qty);
      closingQty = Math.max(0, closingQty + qty);
    }
  }

  const valuationPaise = safeMultiplyQuantityByPaise(closingQty, rollingWACPaise);

  return {
    productId,
    closingQty,
    rollingWACPaise,
    rollingWACRupees: fromPaise(rollingWACPaise),
    valuationPaise,
    valuationRupees: fromPaise(valuationPaise),
    totalInboundQty,
    totalOutboundQty,
  };
}

/**
 * Records an authoritative stock movement with:
 * - Anti-backdating protection (effectiveAt cannot precede latest recorded stock event)
 * - Exact minor quantity tracking
 * - Atomic conditional decrement preventing negative stock under concurrency
 * - Accurate movement-time cost snapshot in paise
 */
export async function recordStockMovement(params: {
  productId: string;
  quantitySigned: number;
  type:
    | "OPENING"
    | "PURCHASE"
    | "PRODUCTION"
    | "PRODUCTION_CONSUMPTION"
    | "PRODUCTION_REVERSAL"
    | "PRODUCTION_CONSUMPTION_REVERSAL"
    | "PURCHASE_REVERSAL"
    | "SALE"
    | "CUSTOMER_RETURN"
    | "SUPPLIER_RETURN"
    | "ADJUSTMENT"
    | "DAMAGE"
    | "RETURN";
  inboundUnitCostPaise?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdById?: string;
  location?: string;
  effectiveAt?: Date;
  createdAt?: Date;
}) {
  const {
    productId,
    quantitySigned,
    type,
    inboundUnitCostPaise,
    referenceType,
    referenceId,
    notes,
    createdById,
    location = "MAIN_WAREHOUSE",
    effectiveAt = new Date(),
    createdAt = new Date(),
  } = params;

  // 1. Retrieve current product state
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, stockQuantity: true, stockQuantityMinor: true, quantityScale: true, name: true },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const scale = product.quantityScale || 1;
  const absQty = Math.abs(quantitySigned);
  const minorQty = toMinorQuantity(absQty, scale);
  const quantitySignedMinor = quantitySigned >= 0 ? minorQty : -minorQty;

  // 2. Anti-Backdating Protection: Event date cannot be earlier than latest recorded stock movement
  const latestMovement = await prisma.stockLedgerEntry.findFirst({
    where: { productId },
    orderBy: { effectiveAt: "desc" },
    select: { effectiveAt: true, type: true, id: true },
  });

  if (latestMovement?.effectiveAt && effectiveAt.getTime() < latestMovement.effectiveAt.getTime()) {
    throw new Error(
      `Backdated stock movement rejected: effective date (${effectiveAt.toISOString()}) is earlier than latest recorded stock event (${latestMovement.effectiveAt.toISOString()}) for ${product.name}.`
    );
  }

  // 3. Determine Effective Unit Cost in Paise
  let effectiveUnitCostPaise: number = 0;

  if (quantitySigned > 0) {
    if ((type === "CUSTOMER_RETURN" || type === "PRODUCTION_CONSUMPTION_REVERSAL") && inboundUnitCostPaise != null) {
      // Reversals preserve the original movement cost of the units
      effectiveUnitCostPaise = roundToPaise(inboundUnitCostPaise);
    } else {
      // Purchase, Production, Opening, Adjustment: Inbound cost in paise
      effectiveUnitCostPaise = roundToPaise(inboundUnitCostPaise ?? 0);
    }
  } else {
    // Outbound: if a specific reversal unit cost was provided, preserve it; otherwise snapshot current rolling WAC
    if (inboundUnitCostPaise != null && (type === "PRODUCTION_REVERSAL" || type === "PURCHASE_REVERSAL")) {
      effectiveUnitCostPaise = roundToPaise(inboundUnitCostPaise);
    } else {
      effectiveUnitCostPaise = await getProductRollingWACPaise(productId, effectiveAt);
    }
  }

  // Exact movement cost calculation using minor units and scale
  const costAmountPaise = calculateMinorCostPaise(minorQty, scale, effectiveUnitCostPaise);

  // 4. Atomic Transaction: Conditional stock decrement and ledger entry
  const result = await prisma.$transaction(
    async (tx: any) => {
      if (quantitySigned < 0) {
        // Atomic conditional decrement: stock must be >= requested quantity
        const updateRes = await tx.product.updateMany({
          where: {
            id: productId,
            stockQuantityMinor: { gte: minorQty },
          },
          data: {
            stockQuantityMinor: { decrement: minorQty },
            stockQuantity: { decrement: Math.round(absQty) },
          },
        });

        if (updateRes.count === 0) {
          throw new Error(
            `Insufficient stock or concurrent modification for ${product.name}: required ${absQty} units (${minorQty} minor), available ${(product.stockQuantityMinor || 0) / scale}.`
          );
        }
      } else {
        // Inbound: increment stock
        await tx.product.update({
          where: { id: productId },
          data: {
            stockQuantityMinor: { increment: minorQty },
            stockQuantity: { increment: Math.round(absQty) },
          },
        });
      }

      // Create immutable ledger entry
      const ledgerEntry = await tx.stockLedgerEntry.create({
        data: {
          productId,
          quantitySigned: Math.round(quantitySigned),
          quantitySignedMinor,
          unitCostPaise: effectiveUnitCostPaise,
          unitCost: effectiveUnitCostPaise,
          costAmountPaise,
          costAmount: costAmountPaise,
          effectiveAt,
          type,
          referenceType,
          referenceId,
          notes,
          createdById,
          location,
          createdAt,
        },
      });

      const updatedProduct = await tx.product.findUnique({ where: { id: productId } });
      return { ledgerEntry, updatedProduct };
    },
    { maxWait: 15000, timeout: 30000 }
  );

  // 5. Invalidate stock cache
  await invalidateStockCache(productId);

  return {
    ledgerEntry: result.ledgerEntry,
    updatedProduct: result.updatedProduct,
    effectiveUnitCostPaise,
    costAmountPaise,
  };
}
