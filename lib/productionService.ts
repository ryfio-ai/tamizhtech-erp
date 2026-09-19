import prisma from "@/lib/prisma";
import { generateProductionNo } from "@/lib/sequence";
import { getProductRollingWACPaise } from "@/lib/costService";
import {
  roundToPaise,
  toPaise,
  fromPaise,
  toMinorQuantity,
  fromMinorQuantity,
  calculateMinorCostPaise,
  calculateUnitCostFromMinor,
} from "@/lib/money";
import { invalidateStockCache, invalidateProductCache } from "@/lib/cache";

export interface ProductionComponentInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface ExecuteProductionInput {
  finishedProductId: string;
  quantityProduced: number;
  directCost?: number; // In rupees or paise (auto-normalized)
  components: ProductionComponentInput[];
  productionDate?: Date | string;
  idempotencyKey?: string;
  notes?: string;
  userId?: string;
}

export interface CancelProductionInput {
  productionId: string;
  cancelReason: string;
  userId?: string;
}

/**
 * Executes an in-house production batch atomically:
 * 1. Consumes input components at their effective Rolling WAC (PRODUCTION_CONSUMPTION).
 * 2. Creates the finished product stock at unit production cost (PRODUCTION).
 * 3. Enforces zero negative stock with atomic conditional decrements, persistent idempotency,
 *    fixed-scale minor units, and immutable historical ledgers.
 */
export async function executeProductionBatch(input: ExecuteProductionInput) {
  const {
    finishedProductId,
    quantityProduced,
    directCost = 0,
    components,
    productionDate,
    idempotencyKey,
    notes,
    userId,
  } = input;

  const cleanIdempotencyKey = idempotencyKey?.trim();

  // 1. Initial Idempotency Check (Fast Path)
  if (cleanIdempotencyKey && cleanIdempotencyKey.length > 0) {
    const existing = await prisma.productionRecord.findFirst({
      where: { idempotencyKey: cleanIdempotencyKey },
      include: {
        finishedProduct: true,
        items: { include: { inputProduct: true } },
      },
    });
    if (existing) {
      console.log(`[ProductionService] Idempotency hit for key ${cleanIdempotencyKey}`);
      return existing;
    }
  }

  // 2. Validate Finished Product
  const qtyProduced = Number(quantityProduced) || 0;
  if (qtyProduced <= 0) {
    throw new Error("Quantity produced must be a positive number.");
  }

  const finishedProduct = await prisma.product.findUnique({
    where: { id: finishedProductId },
  });
  if (!finishedProduct) {
    throw new Error(`Finished product not found: ${finishedProductId}`);
  }
  if (finishedProduct.type === "SERVICE") {
    throw new Error("Cannot produce a SERVICE. Services do not track physical inventory.");
  }

  const finishedScale = finishedProduct.quantityScale || 1;
  const quantityProducedMinor = toMinorQuantity(qtyProduced, finishedScale);

  // 3. Validate Components & Stock Availability
  if (!components || components.length === 0) {
    throw new Error("At least one component/material is required for production.");
  }

  const componentProductIds = components.map((c) => c.productId);
  const componentProducts = await prisma.product.findMany({
    where: { id: { in: componentProductIds } },
  });

  const productMap = new Map(componentProducts.map((p) => [p.id, p]));

  // Pre-validate stock availability for all components
  for (const comp of components) {
    const prod = productMap.get(comp.productId);
    if (!prod) {
      throw new Error(`Component product not found: ${comp.productId}`);
    }
    if (prod.type === "SERVICE") {
      throw new Error(`Component ${prod.name} is a SERVICE and cannot be consumed in production.`);
    }
    const compScale = prod.quantityScale || 1;
    const reqMinor = toMinorQuantity(comp.quantity, compScale);
    if (reqMinor <= 0) {
      throw new Error(`Invalid consumption quantity for ${prod.name}: ${comp.quantity}`);
    }
    const availableMinor = prod.stockQuantityMinor ?? toMinorQuantity(prod.stockQuantity || 0, compScale);
    if (availableMinor < reqMinor) {
      throw new Error(
        `Insufficient stock for ${prod.name} (${prod.sku || "No SKU"}): required ${comp.quantity}, available ${availableMinor / compScale}.`
      );
    }
  }

  // 4. Calculate Input Consumption Costs using current Rolling WACs
  const effectiveDate = productionDate ? new Date(productionDate) : new Date();
  let totalMaterialCostPaise = 0;
  const processedComponents: Array<{
    productId: string;
    productName: string;
    quantityConsumed: number;
    quantityConsumedMinor: number;
    scale: number;
    unitCostPaise: number;
    totalCostPaise: number;
    notes?: string;
  }> = [];

  for (const comp of components) {
    const prod = productMap.get(comp.productId)!;
    const compScale = prod.quantityScale || 1;
    const compQtyMinor = toMinorQuantity(comp.quantity, compScale);
    const unitWACPaise = await getProductRollingWACPaise(comp.productId, effectiveDate);
    const componentTotalCostPaise = calculateMinorCostPaise(compQtyMinor, compScale, unitWACPaise);

    totalMaterialCostPaise += componentTotalCostPaise;
    processedComponents.push({
      productId: comp.productId,
      productName: prod.name,
      quantityConsumed: Math.round(comp.quantity),
      quantityConsumedMinor: compQtyMinor,
      scale: compScale,
      unitCostPaise: unitWACPaise,
      totalCostPaise: componentTotalCostPaise,
      notes: comp.notes,
    });
  }

  // Direct production costs (labour, fabrication, machine time)
  const directCostPaise = roundToPaise(
    Number(directCost) >= 100 && Number.isInteger(directCost) ? directCost : toPaise(directCost)
  );
  const totalProductionCostPaise = totalMaterialCostPaise + directCostPaise;
  const unitProductionCostPaise = calculateUnitCostFromMinor(
    totalProductionCostPaise,
    quantityProducedMinor,
    finishedScale
  );

  // 5. Atomic Transaction: Create records & execute compensating stock ledgers
  const productionNo = await generateProductionNo();

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // A. Persistent Idempotency Check inside transaction
        if (cleanIdempotencyKey && cleanIdempotencyKey.length > 0) {
          const existingInTx = await tx.productionRecord.findFirst({
            where: { idempotencyKey: cleanIdempotencyKey },
          });
          if (existingInTx) {
            return existingInTx;
          }
        }

        // B. Atomic Conditional Decrement for all components
        for (const comp of processedComponents) {
          const decRes = await tx.product.updateMany({
            where: {
              id: comp.productId,
              stockQuantityMinor: { gte: comp.quantityConsumedMinor },
            },
            data: {
              stockQuantityMinor: { decrement: comp.quantityConsumedMinor },
              stockQuantity: { decrement: comp.quantityConsumed },
            },
          });

          if (decRes.count === 0) {
            throw new Error(
              `Insufficient stock or concurrent conflict for component ${comp.productName}: required ${comp.quantityConsumed} units (${comp.quantityConsumedMinor} minor).`
            );
          }
        }

        // C. Create Production Record
        const production = await tx.productionRecord.create({
          data: {
            productionNo,
            idempotencyKey: cleanIdempotencyKey && cleanIdempotencyKey.length > 0 ? cleanIdempotencyKey : undefined,
            finishedProductId,
            quantityProducedMinor,
            quantityProduced: Math.round(qtyProduced),
            materialCostPaise: totalMaterialCostPaise,
            materialCost: totalMaterialCostPaise,
            directCostPaise,
            directCost: directCostPaise,
            totalProductionCostPaise,
            totalProductionCost: totalProductionCostPaise,
            unitProductionCostPaise,
            unitProductionCost: unitProductionCostPaise,
            productionDate: effectiveDate,
            status: "COMPLETED",
            notes: notes || null,
            createdById: userId || null,
            items: {
              create: processedComponents.map((c) => ({
                inputProductId: c.productId,
                quantityConsumedMinor: c.quantityConsumedMinor,
                quantityConsumed: c.quantityConsumed,
                unitCostPaise: c.unitCostPaise,
                unitCost: c.unitCostPaise,
                totalCostPaise: c.totalCostPaise,
                totalCost: c.totalCostPaise,
                notes: c.notes || null,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // D. Write PRODUCTION_CONSUMPTION stock ledger entries
        for (const comp of processedComponents) {
          await tx.stockLedgerEntry.create({
            data: {
              productId: comp.productId,
              quantitySignedMinor: -comp.quantityConsumedMinor,
              quantitySigned: -comp.quantityConsumed,
              unitCostPaise: comp.unitCostPaise,
              unitCost: comp.unitCostPaise,
              costAmountPaise: comp.totalCostPaise,
              costAmount: comp.totalCostPaise,
              effectiveAt: effectiveDate,
              type: "PRODUCTION_CONSUMPTION",
              referenceType: "PRODUCTION",
              referenceId: production.id,
              notes: `Consumed for Production ${productionNo} (${finishedProduct.name})`,
              createdById: userId || null,
              createdAt: effectiveDate,
            },
          });
        }

        // E. Write PRODUCTION stock ledger entry & increment finished product stock
        await tx.stockLedgerEntry.create({
          data: {
            productId: finishedProductId,
            quantitySignedMinor: quantityProducedMinor,
            quantitySigned: Math.round(qtyProduced),
            unitCostPaise: unitProductionCostPaise,
            unitCost: unitProductionCostPaise,
            costAmountPaise: totalProductionCostPaise,
            costAmount: totalProductionCostPaise,
            effectiveAt: effectiveDate,
            type: "PRODUCTION",
            referenceType: "PRODUCTION",
            referenceId: production.id,
            notes: `Production Output ${productionNo} (${qtyProduced} units)`,
            createdById: userId || null,
            createdAt: effectiveDate,
          },
        });

        await tx.product.update({
          where: { id: finishedProductId },
          data: {
            stockQuantityMinor: { increment: quantityProducedMinor },
            stockQuantity: { increment: Math.round(qtyProduced) },
          },
        });

        return production;
      },
      { maxWait: 15000, timeout: 30000 }
    );

    // 6. Invalidate caches
    for (const comp of processedComponents) {
      await invalidateStockCache(comp.productId);
    }
    await invalidateStockCache(finishedProductId);
    await invalidateProductCache(finishedProductId);

    // Return complete production record with relations
    return prisma.productionRecord.findUnique({
      where: { id: result.id },
      include: {
        finishedProduct: true,
        items: {
          include: {
            inputProduct: true,
          },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });
  } catch (err: any) {
    // If unique constraint collided on idempotencyKey concurrently, return existing record
    if (cleanIdempotencyKey && (err?.code === "P2002" || err?.message?.includes("idempotencyKey"))) {
      const existing = await prisma.productionRecord.findFirst({
        where: { idempotencyKey: cleanIdempotencyKey },
        include: {
          finishedProduct: true,
          items: { include: { inputProduct: true } },
        },
      });
      if (existing) {
        return existing;
      }
    }
    throw err;
  }
}

/**
 * Cancels a completed production batch and executes compensating reversal movements:
 * - Finished Product: PRODUCTION_REVERSAL (-quantityProduced) at cancellation-time effective WAC
 * - Components: PRODUCTION_CONSUMPTION_REVERSAL (+quantityConsumed) at original immutable snapshot WAC
 * - Atomic conditional decrement ensures finished stock is sufficient.
 * - Original ledger records remain completely intact.
 */
export async function cancelProductionBatch(input: CancelProductionInput) {
  const { productionId, cancelReason, userId } = input;

  if (!cancelReason || cancelReason.trim().length < 3) {
    throw new Error("A valid cancellation reason (min 3 chars) is required.");
  }

  const production = await prisma.productionRecord.findUnique({
    where: { id: productionId },
    include: {
      items: true,
      finishedProduct: true,
    },
  });

  if (!production) {
    throw new Error(`Production record not found: ${productionId}`);
  }

  if (production.status === "CANCELLED") {
    throw new Error(`Production ${production.productionNo} is already cancelled.`);
  }

  const finishedScale = production.finishedProduct.quantityScale || 1;
  const finishedMinorQty =
    production.quantityProducedMinor ?? toMinorQuantity(production.quantityProduced, finishedScale);

  const cancelDate = new Date();

  // Determine finished product's effective WAC as of cancellation event
  const cancellationWACPaise = await getProductRollingWACPaise(production.finishedProductId, cancelDate);
  const cancellationCostAmountPaise = calculateMinorCostPaise(
    finishedMinorQty,
    finishedScale,
    cancellationWACPaise
  );

  // Atomic reversal transaction
  const cancelledRecord = await prisma.$transaction(
    async (tx) => {
      // 1. Atomic Conditional Decrement on Finished Product
      const decRes = await tx.product.updateMany({
        where: {
          id: production.finishedProductId,
          stockQuantityMinor: { gte: finishedMinorQty },
        },
        data: {
          stockQuantityMinor: { decrement: finishedMinorQty },
          stockQuantity: { decrement: production.quantityProduced },
        },
      });

      if (decRes.count === 0) {
        const currentProd = await tx.product.findUnique({
          where: { id: production.finishedProductId },
          select: { stockQuantityMinor: true, stockQuantity: true, name: true },
        });
        throw new Error(
          `Cannot cancel production ${production.productionNo}: Finished product ${currentProd?.name || ""} has insufficient stock (${(currentProd?.stockQuantityMinor || 0) / finishedScale} available, ${finishedMinorQty / finishedScale} required for reversal).`
        );
      }

      // 2. Mark production record CANCELLED
      const updatedRecord = await tx.productionRecord.update({
        where: { id: production.id },
        data: {
          status: "CANCELLED",
          cancelledAt: cancelDate,
          cancelReason: cancelReason.trim(),
          cancelledById: userId || null,
        },
      });

      // 3. Finished Product Compensating Reversal Movement (effective cancellation WAC)
      await tx.stockLedgerEntry.create({
        data: {
          productId: production.finishedProductId,
          quantitySignedMinor: -finishedMinorQty,
          quantitySigned: -production.quantityProduced,
          unitCostPaise: cancellationWACPaise,
          unitCost: cancellationWACPaise,
          costAmountPaise: cancellationCostAmountPaise,
          costAmount: cancellationCostAmountPaise,
          effectiveAt: cancelDate,
          type: "PRODUCTION_REVERSAL",
          referenceType: "PRODUCTION_CANCELLATION",
          referenceId: production.id,
          notes: `Production Reversal for cancelled ${production.productionNo}: ${cancelReason}`,
          createdById: userId || null,
          createdAt: cancelDate,
        },
      });

      // 4. Components Compensating Reversal Movements (original snapshot WAC)
      for (const item of production.items) {
        const compProd = await tx.product.findUnique({
          where: { id: item.inputProductId },
          select: { quantityScale: true },
        });
        const compScale = compProd?.quantityScale || 1;
        const compMinorQty = item.quantityConsumedMinor ?? toMinorQuantity(item.quantityConsumed, compScale);
        const itemUnitCostPaise = item.unitCostPaise ?? item.unitCost;
        const itemTotalCostPaise = item.totalCostPaise ?? item.totalCost;

        await tx.stockLedgerEntry.create({
          data: {
            productId: item.inputProductId,
            quantitySignedMinor: compMinorQty,
            quantitySigned: item.quantityConsumed,
            unitCostPaise: itemUnitCostPaise,
            unitCost: itemUnitCostPaise,
            costAmountPaise: itemTotalCostPaise,
            costAmount: itemTotalCostPaise,
            effectiveAt: cancelDate,
            type: "PRODUCTION_CONSUMPTION_REVERSAL",
            referenceType: "PRODUCTION_CANCELLATION",
            referenceId: production.id,
            notes: `Restored component stock from cancelled production ${production.productionNo}`,
            createdById: userId || null,
            createdAt: cancelDate,
          },
        });

        await tx.product.update({
          where: { id: item.inputProductId },
          data: {
            stockQuantityMinor: { increment: compMinorQty },
            stockQuantity: { increment: item.quantityConsumed },
          },
        });
      }

      return updatedRecord;
    },
    { maxWait: 15000, timeout: 30000 }
  );

  // Invalidate caches
  await invalidateStockCache(production.finishedProductId);
  for (const item of production.items) {
    await invalidateStockCache(item.inputProductId);
  }

  return cancelledRecord;
}
