import prisma from "@/lib/prisma";
import { roundToPaise, safeMultiplyQuantityByPaise, fromPaise, toPaise } from "@/lib/money";

/**
 * Calculates Rolling Weighted Average Cost (WAC) in exact integer paise.
 * Zero-Stock Rule: If current stock is <= 0, new WAC is strictly the inbound unit cost.
 *
 * Example:
 * Opening: 3 x 10000 paise (₹100) = 30000 paise
 * Purchase: 7 x 10100 paise (₹101) = 70700 paise
 * Total Value: 100700 paise / 10 units = 10070 paise (₹100.70)
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
 * Supports point-in-time calculation as of timestamp T.
 */
export async function getProductRollingWACPaise(productId: string, asOfDate?: Date): Promise<number> {
  const whereClause: any = { productId };
  if (asOfDate) {
    whereClause.createdAt = { lte: asOfDate };
  }

  const entries = await prisma.stockLedgerEntry.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
  });

  let runningQty = 0;
  let runningWACPaise = 0;

  for (const entry of entries) {
    const qty = entry.quantitySigned;

    if (qty > 0) {
      // Inbound movement: purchase, production, opening, positive adjustment, customer return
      const unitCost = entry.unitCost ?? 0;
      runningWACPaise = calculateRollingWACPaise(runningQty, runningWACPaise, qty, unitCost);
      runningQty += qty;
    } else if (qty < 0) {
      // Outbound movement: sale, damage, negative adjustment, supplier return
      // Stock decreases, unit WAC remains unchanged
      runningQty = Math.max(0, runningQty + qty);
    }
  }

  return roundToPaise(runningWACPaise);
}

/**
 * Reconstructs complete inventory position for a product as of timestamp T.
 * Replays stock ledger events sequentially up to asOfDate.
 */
export async function getProductInventoryStateAsOf(productId: string, asOfDate?: Date) {
  const whereClause: any = { productId };
  if (asOfDate) {
    whereClause.createdAt = { lte: asOfDate };
  }

  const entries = await prisma.stockLedgerEntry.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
  });

  let closingQty = 0;
  let rollingWACPaise = 0;
  let totalInboundQty = 0;
  let totalOutboundQty = 0;

  for (const entry of entries) {
    const qty = entry.quantitySigned;

    if (qty > 0) {
      totalInboundQty += qty;
      const unitCost = entry.unitCost ?? 0;
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
 * Records an authoritative stock movement with an exact movement-time cost snapshot in paise.
 */
export async function recordStockMovement(params: {
  productId: string;
  quantitySigned: number;
  type:
    | "OPENING"
    | "PURCHASE"
    | "PRODUCTION"
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
    createdAt,
  } = params;

  // Retrieve current product state
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, stockQuantity: true },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  let effectiveUnitCostPaise: number = 0;

  if (quantitySigned > 0) {
    if (type === "CUSTOMER_RETURN" && inboundUnitCostPaise != null) {
      // Customer return preserves the original sold cost of the units
      effectiveUnitCostPaise = roundToPaise(inboundUnitCostPaise);
    } else {
      // Purchase, Production, Opening, Adjustment: Inbound cost in paise
      effectiveUnitCostPaise = roundToPaise(inboundUnitCostPaise ?? 0);
    }
  } else {
    // Outbound (Sale, Damage, Supplier Return, Adjustment):
    // Snapshot the current rolling WAC in paise at movement time
    effectiveUnitCostPaise = await getProductRollingWACPaise(productId, createdAt);
  }

  // Exact movement cost calculation without float truncation
  const costAmountPaise = safeMultiplyQuantityByPaise(
    Math.abs(quantitySigned),
    effectiveUnitCostPaise
  );

  // Run in transaction: create ledger entry and update product stock quantity
  const [ledgerEntry, updatedProduct] = await prisma.$transaction([
    prisma.stockLedgerEntry.create({
      data: {
        productId,
        quantitySigned: Math.round(quantitySigned),
        unitCost: effectiveUnitCostPaise,
        costAmount: costAmountPaise,
        type,
        referenceType,
        referenceId,
        notes,
        createdById,
        location,
        createdAt: createdAt || new Date(),
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: {
          increment: Math.round(quantitySigned),
        },
      },
    }),
  ]);

  return {
    ledgerEntry,
    updatedProduct,
    effectiveUnitCostPaise,
    costAmountPaise,
  };
}
