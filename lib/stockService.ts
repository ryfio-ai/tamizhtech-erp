import prisma from "@/lib/prisma";
import { generateSku } from "@/lib/sequence";
import { invalidateProductCache, invalidateStockCache } from "@/lib/cache";
import { getProductRollingWACPaise } from "@/lib/costService";
import {
  toMinorQuantity,
  fromMinorQuantity,
  calculateMinorCostPaise,
  roundToPaise,
} from "@/lib/money";

export type ProductClassificationType =
  | "RAW_MATERIAL"
  | "COMPONENT"
  | "FINISHED_PRODUCT"
  | "CONSUMABLE"
  | "SERVICE"
  | "PHYSICAL_PRODUCT";

export interface CreateProductInput {
  name: string;
  category?: string;
  description?: string;
  type?: ProductClassificationType | string;
  isSaleable?: boolean;
  quantityScale?: number;
  pricingMode?: string;
  basePrice?: number | null;
  taxRate?: number;
  initialStock?: number;
  minStock?: number;
  sourceType?: string;
  sourceUrl?: string;
  sourceSlug?: string;
  sourceProductName?: string;
  configurationNotes?: string;
  status?: string;
}

export type StockMovementType =
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

export interface AdjustStockInput {
  productId: string;
  quantityChange: number; // positive for addition, negative for reduction
  type: StockMovementType | string;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
  isBilling?: boolean;
  effectiveAt?: Date;
}

/**
 * Creates a product with deterministic SKU, type-specific saleability defaults,
 * fixed-scale minor units, and logs an opening balance stock ledger entry if physical stock > 0.
 */
export async function createProductWithStock(input: CreateProductInput, userId?: string) {
  const category = input.category || "General";
  const sku = await generateSku(category);

  // Normalize product type
  const rawType = (input.type || "FINISHED_PRODUCT").toUpperCase();
  const validTypes = ["RAW_MATERIAL", "COMPONENT", "FINISHED_PRODUCT", "CONSUMABLE", "SERVICE", "PHYSICAL_PRODUCT"];
  const productType = validTypes.includes(rawType) ? rawType : "FINISHED_PRODUCT";
  const isPhysical = productType !== "SERVICE";

  // Application Defaults for Saleability:
  // FINISHED_PRODUCT and SERVICE default to isSaleable: true.
  // RAW_MATERIAL, COMPONENT, and CONSUMABLE default to isSaleable: false unless explicitly toggled.
  const isSaleable = input.isSaleable !== undefined
    ? Boolean(input.isSaleable)
    : (productType === "FINISHED_PRODUCT" || productType === "SERVICE");

  const pricingMode = input.pricingMode === "REQUIREMENT_BASED" ? "REQUIREMENT_BASED" : "FIXED";
  const initialStock = isPhysical ? Math.max(0, Math.round(Number(input.initialStock) || 0)) : 0;
  const quantityScale = Math.max(1, Math.round(Number(input.quantityScale) || 1));
  const initialStockMinor = toMinorQuantity(initialStock, quantityScale);

  const normalizedName = input.name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const product = await prisma.product.create({
    data: {
      sku,
      name: input.name.trim(),
      normalizedName,
      category,
      description: input.description?.trim() || null,
      type: productType,
      isSaleable,
      quantityScale,
      pricingMode,
      status: input.status || "ACTIVE",
      basePrice: input.basePrice !== undefined && input.basePrice !== null ? Number(input.basePrice) : null,
      taxRate: Number(input.taxRate) || 18,
      stockQuantityMinor: initialStockMinor,
      stockQuantity: initialStock,
      minStock: Number(input.minStock) || 5,
      sourceType: input.sourceType || "MANUAL",
      sourceUrl: input.sourceUrl || null,
      sourceSlug: input.sourceSlug || null,
      sourceProductName: input.sourceProductName || null,
      configurationNotes: input.configurationNotes?.trim() || null,
    },
  });

  // Record explicit OPENING stock ledger movement if physical and stock > 0
  if (isPhysical && initialStock > 0) {
    await prisma.stockLedgerEntry.create({
      data: {
        productId: product.id,
        quantitySignedMinor: initialStockMinor,
        quantitySigned: initialStock,
        unitCostPaise: 0,
        unitCost: 0,
        costAmountPaise: 0,
        costAmount: 0,
        effectiveAt: new Date(),
        type: "OPENING",
        referenceType: "OPENING_BALANCE",
        referenceId: product.id,
        notes: input.sourceType === "WEBSITE" 
          ? "Initial stock imported from TamizhTech website catalog" 
          : "Opening Stock upon product creation",
        createdById: userId || null,
      },
    });
  }

  await invalidateProductCache(product.id);
  return product;
}

/**
 * Updates a product while strictly enforcing quantityScale immutability once stock transactions exist.
 */
export async function updateProduct(
  productId: string,
  data: Partial<CreateProductInput>,
  userId?: string
) {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, quantityScale: true },
  });

  if (!existing) {
    throw new Error(`Product not found: ${productId}`);
  }

  if (data.quantityScale !== undefined && data.quantityScale !== existing.quantityScale) {
    const movementCount = await prisma.stockLedgerEntry.count({
      where: { productId },
    });
    if (movementCount > 0) {
      throw new Error(
        `Cannot change quantityScale from ${existing.quantityScale} to ${data.quantityScale}: Product already has ${movementCount} historical stock transactions.`
      );
    }
  }

  return prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.type ? { type: data.type } : {}),
      ...(data.isSaleable !== undefined ? { isSaleable: data.isSaleable } : {}),
      ...(data.quantityScale ? { quantityScale: data.quantityScale } : {}),
      ...(data.basePrice !== undefined ? { basePrice: data.basePrice } : {}),
      ...(data.taxRate !== undefined ? { taxRate: data.taxRate } : {}),
      ...(data.minStock !== undefined ? { minStock: data.minStock } : {}),
    },
  });
}

/**
 * Records an adjustment, damage, purchase, or return in the Stock Ledger and updates Product stockQuantity atomically.
 * Manual SALE movements are blocked (SALE is strictly generated by billing).
 * Negative stock is blocked via atomic conditional updates.
 */
export async function adjustStock(input: AdjustStockInput, userId?: string) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.type === "SERVICE") {
    throw new Error("Services do not track physical inventory");
  }

  if (input.type === "SALE" && !input.isBilling) {
    throw new Error("Sales movements can only be generated by issuing bills.");
  }

  const quantitySigned = Number(input.quantityChange);
  if (isNaN(quantitySigned) || quantitySigned === 0) {
    throw new Error("Invalid quantity change");
  }

  const scale = product.quantityScale || 1;
  const absQty = Math.abs(quantitySigned);
  const minorQty = toMinorQuantity(absQty, scale);
  const quantitySignedMinor = quantitySigned >= 0 ? minorQty : -minorQty;
  const effectiveAt = input.effectiveAt || new Date();

  // Snapshot current rolling WAC
  const currentWACPaise = await getProductRollingWACPaise(input.productId, effectiveAt);
  const costAmountPaise = calculateMinorCostPaise(minorQty, scale, currentWACPaise);

  const result = await prisma.$transaction(
    async (tx) => {
      if (quantitySigned < 0) {
        const decRes = await tx.product.updateMany({
          where: {
            id: input.productId,
            stockQuantityMinor: { gte: minorQty },
          },
          data: {
            stockQuantityMinor: { decrement: minorQty },
            stockQuantity: { decrement: Math.round(absQty) },
          },
        });

        if (decRes.count === 0) {
          throw new Error(
            `Insufficient stock for ${product.name}: required ${absQty}, available ${(product.stockQuantityMinor || 0) / scale}.`
          );
        }
      } else {
        await tx.product.update({
          where: { id: input.productId },
          data: {
            stockQuantityMinor: { increment: minorQty },
            stockQuantity: { increment: Math.round(absQty) },
          },
        });
      }

      const ledgerEntry = await tx.stockLedgerEntry.create({
        data: {
          productId: input.productId,
          quantitySignedMinor,
          quantitySigned: Math.round(quantitySigned),
          unitCostPaise: currentWACPaise,
          unitCost: currentWACPaise,
          costAmountPaise,
          costAmount: costAmountPaise,
          effectiveAt,
          type: input.type,
          referenceType: input.referenceType || "MANUAL_ADJUSTMENT",
          referenceId: input.referenceId,
          notes: input.notes,
          createdById: userId || null,
        },
      });

      const updatedProduct = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });
      return { ledgerEntry, updatedProduct, product: updatedProduct };
    },
    { maxWait: 15000, timeout: 30000 }
  );

  await invalidateStockCache(input.productId);
  return result;
}

/**
 * Deducts stock when an invoice transitions to ISSUED status.
 * Atomic conditional decrement strictly prevents concurrent negative stock.
 * Only physical products (RAW_MATERIAL, COMPONENT, FINISHED_PRODUCT, CONSUMABLE) deduct inventory.
 * SERVICES create zero stock movements.
 */
export async function deductStockForIssuedInvoice(invoiceId: string, userId?: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Idempotency: verify stock hasn't already been deducted for this invoice
  const existingEntries = await prisma.stockLedgerEntry.findMany({
    where: {
      referenceType: "INVOICE",
      referenceId: invoiceId,
      type: "SALE",
    },
  });

  if (existingEntries.length > 0) {
    console.log(`[StockService] Stock already deducted for invoice ${invoiceId}`);
    return;
  }

  // Only physical items track inventory (SERVICES create zero stock movement)
  const physicalItems = invoice.items.filter(
    (item) => item.productId && item.product && item.product.type !== "SERVICE"
  );

  const effectiveAt = invoice.issuedAt || invoice.date || new Date();

  // Deduct atomically inside transaction
  await prisma.$transaction(
    async (tx) => {
      for (const item of physicalItems) {
        if (!item.productId || !item.product) continue;

        const scale = item.product.quantityScale || 1;
        const qtyToDeduct = Math.round(item.qty ?? 1);
        const minorQty = toMinorQuantity(qtyToDeduct, scale);

        // Atomic conditional decrement
        const decRes = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQuantityMinor: { gte: minorQty },
          },
          data: {
            stockQuantityMinor: { decrement: minorQty },
            stockQuantity: { decrement: qtyToDeduct },
          },
        });

        if (decRes.count === 0) {
          throw new Error(
            `Insufficient stock to issue invoice for ${item.product.name}: required ${qtyToDeduct}, available ${(item.product.stockQuantityMinor || 0) / scale}.`
          );
        }

        const currentWACPaise = await getProductRollingWACPaise(item.productId, effectiveAt);
        const costAmountPaise = calculateMinorCostPaise(minorQty, scale, currentWACPaise);

        await tx.stockLedgerEntry.create({
          data: {
            productId: item.productId,
            quantitySignedMinor: -minorQty,
            quantitySigned: -qtyToDeduct,
            unitCostPaise: currentWACPaise,
            unitCost: currentWACPaise,
            costAmountPaise,
            costAmount: costAmountPaise,
            effectiveAt,
            type: "SALE",
            referenceType: "INVOICE",
            referenceId: invoiceId,
            notes: `Sale via Invoice ${invoice.invoiceNo} (${item.description})`,
            createdById: userId || null,
            createdAt: effectiveAt,
          },
        });
      }
    },
    { maxWait: 15000, timeout: 30000 }
  );

  for (const item of physicalItems) {
    if (item.productId) {
      await invalidateStockCache(item.productId);
    }
  }
}

/**
 * Reverses stock deductions when an ISSUED invoice is CANCELLED.
 * Restores stock with CUSTOMER_RETURN entries preserving original sale cost.
 */
export async function reverseStockForCancelledInvoice(invoiceId: string, userId?: string) {
  const saleEntries = await prisma.stockLedgerEntry.findMany({
    where: {
      referenceType: "INVOICE",
      referenceId: invoiceId,
      type: "SALE",
    },
  });

  if (saleEntries.length === 0) {
    // Invoice was cancelled while in DRAFT (no stock was ever deducted)
    return;
  }

  // Check if reversal was already performed
  const reversalEntries = await prisma.stockLedgerEntry.findMany({
    where: {
      referenceType: "INVOICE",
      referenceId: invoiceId,
      type: { in: ["RETURN", "CUSTOMER_RETURN"] },
    },
  });

  if (reversalEntries.length > 0) {
    return;
  }

  const cancelDate = new Date();

  await prisma.$transaction(
    async (tx) => {
      for (const entry of saleEntries) {
        const qtyToRestore = Math.abs(entry.quantitySigned);
        const minorToRestore = entry.quantitySignedMinor ? Math.abs(entry.quantitySignedMinor) : qtyToRestore;
        const unitCostPaise = entry.unitCostPaise ?? entry.unitCost ?? 0;
        const costAmountPaise = entry.costAmountPaise ?? entry.costAmount ?? 0;

        await tx.stockLedgerEntry.create({
          data: {
            productId: entry.productId,
            quantitySignedMinor: minorToRestore,
            quantitySigned: qtyToRestore,
            unitCostPaise,
            unitCost: unitCostPaise,
            costAmountPaise,
            costAmount: costAmountPaise,
            effectiveAt: cancelDate,
            type: "CUSTOMER_RETURN",
            referenceType: "INVOICE",
            referenceId: invoiceId,
            notes: `Restored stock from cancelled invoice ${invoiceId}`,
            createdById: userId || null,
            createdAt: cancelDate,
          },
        });

        await tx.product.update({
          where: { id: entry.productId },
          data: {
            stockQuantityMinor: { increment: minorToRestore },
            stockQuantity: { increment: qtyToRestore },
          },
        });
      }
    },
    { maxWait: 15000, timeout: 30000 }
  );

  for (const entry of saleEntries) {
    await invalidateStockCache(entry.productId);
  }
}

/**
 * Reconciles stock deductions when an ISSUED invoice is edited with updated line items:
 * - Restores prior stock decremented by the invoice's old SALE ledger entries.
 * - Removes old SALE entries.
 * - Re-deducts stock for the updated line items.
 */
export async function reconcileStockForUpdatedInvoice(invoiceId: string, userId?: string) {
  const existingSales = await prisma.stockLedgerEntry.findMany({
    where: {
      referenceType: "INVOICE",
      referenceId: invoiceId,
      type: "SALE",
    },
  });

  if (existingSales.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const entry of existingSales) {
        const qtyToRestore = Math.abs(entry.quantitySigned);
        const minorToRestore = entry.quantitySignedMinor ? Math.abs(entry.quantitySignedMinor) : qtyToRestore;
        await tx.product.update({
          where: { id: entry.productId },
          data: {
            stockQuantity: { increment: qtyToRestore },
            stockQuantityMinor: { increment: minorToRestore },
          },
        });
      }

      await tx.stockLedgerEntry.deleteMany({
        where: {
          referenceType: "INVOICE",
          referenceId: invoiceId,
          type: "SALE",
        },
      });
    });

    for (const entry of existingSales) {
      await invalidateStockCache(entry.productId);
    }
  }

  // Deduct stock for the new/updated items
  await deductStockForIssuedInvoice(invoiceId, userId);
}

/**
 * Safely voids an active InventorySourcing record:
 * - Strictly rejects void if remaining available stock < sourced quantity (preventing negative inventory).
 * - Creates PURCHASE_REVERSAL stock movement with atomic conditional decrement.
 * - Reverses ONLY actual valid payment ledger events (derives net paid from events, not parent projection).
 * - Recalculates parent paidAmount and status.
 * - Marks status = "VOIDED".
 * - Preserves immutable audit history.
 */
export async function voidInventorySourcing(sourcingId: string, reason: string, userId?: string) {
  const sourcing = await prisma.inventorySourcing.findUnique({
    where: { id: sourcingId },
    include: { product: true, payments: true },
  });

  if (!sourcing) {
    throw new Error(`Sourcing record not found: ${sourcingId}`);
  }

  if (sourcing.status === "VOIDED") {
    throw new Error(`Sourcing record ${sourcing.sourcingNo} is already voided.`);
  }

  const scale = sourcing.product.quantityScale || 1;
  const sourcedMinorQty = sourcing.quantityMinor ?? toMinorQuantity(sourcing.quantity, scale);
  const availableMinor = sourcing.product.stockQuantityMinor ?? toMinorQuantity(sourcing.product.stockQuantity || 0, scale);

  // Business Rule: Sourcing void requires remaining available stock >= sourced quantity
  if (availableMinor < sourcedMinorQty) {
    throw new Error(
      `Cannot void sourcing ${sourcing.sourcingNo}: Available stock for ${sourcing.product.name} is ${availableMinor / scale}, but ${sourcing.quantity} is required for reversal. Consumed or sold inventory requires supplier return / reconciliation workflow.`
    );
  }

  const voidDate = new Date();
  const unitCostPaise = sourcing.unitCostPaise ?? sourcing.unitCost;
  const totalCostPaise = sourcing.totalCostPaise ?? sourcing.totalCost;

  // Calculate actual net paid amount from append-only payment ledger events
  const netPaidPaise = sourcing.payments.reduce((sum, p) => {
    const amt = p.amountPaise ?? p.amount ?? 0;
    if (p.direction === "DECREASE" || p.type === "REVERSAL") {
      return sum - amt;
    }
    return sum + amt;
  }, 0);

  const voided = await prisma.$transaction(
    async (tx) => {
      // 1. Atomic Conditional Decrement on Product Stock
      const decRes = await tx.product.updateMany({
        where: {
          id: sourcing.productId,
          stockQuantityMinor: { gte: sourcedMinorQty },
        },
        data: {
          stockQuantityMinor: { decrement: sourcedMinorQty },
          stockQuantity: { decrement: sourcing.quantity },
        },
      });

      if (decRes.count === 0) {
        throw new Error(
          `Insufficient stock or concurrent modification while voiding sourcing ${sourcing.sourcingNo}.`
        );
      }

      // 2. Mark sourcing VOIDED and reset parent projection
      const updatedSourcing = await tx.inventorySourcing.update({
        where: { id: sourcing.id },
        data: {
          status: "VOIDED",
          voidedAt: voidDate,
          voidReason: reason.trim(),
          voidedById: userId || null,
          paidAmountPaise: 0,
          paidAmount: 0,
          paymentStatus: "UNPAID",
        },
      });

      // 3. Compensating Stock Reversal Movement
      await tx.stockLedgerEntry.create({
        data: {
          productId: sourcing.productId,
          quantitySignedMinor: -sourcedMinorQty,
          quantitySigned: -sourcing.quantity,
          unitCostPaise,
          unitCost: unitCostPaise,
          costAmountPaise: totalCostPaise,
          costAmount: totalCostPaise,
          effectiveAt: voidDate,
          type: "PURCHASE_REVERSAL",
          referenceType: "INVENTORY_SOURCING_VOID",
          referenceId: sourcing.id,
          notes: `Voided sourcing ${sourcing.sourcingNo}: ${reason}`,
          createdById: userId || null,
          createdAt: voidDate,
        },
      });

      // 4. Compensating Payment Reversal ONLY if net paid from actual ledger events > 0
      if (netPaidPaise > 0) {
        await tx.inventorySourcingPayment.create({
          data: {
            sourcingId: sourcing.id,
            amountPaise: netPaidPaise,
            amount: netPaidPaise,
            direction: "DECREASE",
            type: "REVERSAL",
            paymentDate: voidDate,
            paymentMethod: sourcing.paymentMethod || "BANK_TRANSFER",
            notes: `Compensating payment reversal for voided sourcing ${sourcing.sourcingNo}`,
            createdById: userId || null,
          },
        });
      }

      return updatedSourcing;
    },
    { maxWait: 15000, timeout: 30000 }
  );

  await invalidateStockCache(sourcing.productId);
  return voided;
}

/**
 * Returns complete stock movement history for a product ordered by effectiveAt.
 */
export async function getProductStockHistory(productId: string) {
  return prisma.stockLedgerEntry.findMany({
    where: { productId },
    include: {
      createdBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { effectiveAt: "desc" },
  });
}
