import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import prisma from "@/lib/prisma";
import { allocateChallanNo, generateDraftChallanNo } from "@/lib/sequence";
import { getProductRollingWACPaise } from "@/lib/costService";
import { toMinorQuantity } from "@/lib/money";

export type ChallanStatus = "DRAFT" | "ISSUED" | "CANCELLED";

export type ChallanPurpose =
  | "DEMONSTRATION"
  | "PROJECT_DELIVERY"
  | "CUSTOMER_SITE"
  | "REPAIR_RETURN"
  | "SAMPLE"
  | "INTERNAL_TRANSFER"
  | "WORKSHOP_EQUIPMENT"
  | "OTHER";

export type ChallanReferenceType =
  | "INVOICE"
  | "SALES_ORDER"
  | "QUOTATION"
  | "PROJECT"
  | "MANUAL";

export interface ChallanItemInput {
  productId?: string | null;
  sku?: string | null;
  description: string;
  quantity: number;
  unit?: string;
  notes?: string | null;
}

export interface DeliveryChallanRecord {
  id: string;
  challanNumber: string;
  date: Date;
  clientId: string;
  purpose: ChallanPurpose;
  referenceType: ChallanReferenceType;
  referenceId?: string | null;
  referenceNo?: string | null;
  destination: string;
  transportMode?: string | null;
  vehicleNo?: string | null;
  lrNumber?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  status: ChallanStatus;
  deductStock: boolean;
  stockDeductedAt?: Date | null;
  items: ChallanItemInput[];
  createdById?: string | null;
  issuedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChallanInput {
  clientId: string;
  date?: Date | string;
  purpose: ChallanPurpose;
  referenceType?: ChallanReferenceType;
  referenceId?: string | null;
  destination?: string;
  transportMode?: string | null;
  vehicleNo?: string | null;
  lrNumber?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  status?: ChallanStatus;
  deductStock?: boolean;
  items: ChallanItemInput[];
  userId?: string;
}

const CHALLAN_COLLECTION = "DeliveryChallan";

/**
 * Creates a new Delivery Challan / Gate Pass.
 * Enforces authoritative client lookups, sequence allocation,
 * and safeguards against duplicate stock deductions.
 */
export async function createDeliveryChallan(
  input: CreateChallanInput
): Promise<DeliveryChallanRecord> {
  const {
    clientId,
    date = new Date(),
    purpose,
    referenceType = "MANUAL",
    referenceId,
    destination,
    transportMode,
    vehicleNo,
    lrNumber,
    contactPerson,
    contactPhone,
    notes,
    status = "DRAFT",
    deductStock = false,
    items,
    userId,
  } = input;

  if (!clientId) {
    throw new Error("Client / Customer is required for Delivery Challan.");
  }
  if (!items || items.length === 0) {
    throw new Error("At least one item is required on the Delivery Challan.");
  }

  // 1. Verify Client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });
  if (!client) {
    throw new Error(`Customer not found: ${clientId}`);
  }

  // Build destination from input or client address
  let finalDestination = destination?.trim();
  if (!finalDestination) {
    const addressParts = [client.address, client.city, client.state, client.pincode].filter(
      Boolean
    );
    finalDestination =
      addressParts.length > 0
        ? addressParts.join(", ")
        : "Destination address not available.";
  }

  // 2. Validate referenced document if provided
  let referenceNo: string | null = null;
  if (referenceId && referenceType !== "MANUAL") {
    if (referenceType === "INVOICE") {
      const inv = await prisma.invoice.findUnique({ where: { id: referenceId } });
      if (!inv) throw new Error(`Referenced Invoice not found: ${referenceId}`);
      referenceNo = inv.invoiceNo;
    } else if (referenceType === "QUOTATION") {
      const qtn = await prisma.quotation.findUnique({ where: { id: referenceId } });
      if (!qtn) throw new Error(`Referenced Quotation not found: ${referenceId}`);
      referenceNo = qtn.quotationNo;
    } else if (referenceType === "SALES_ORDER") {
      const order = await prisma.salesOrder.findUnique({ where: { id: referenceId } });
      if (!order) throw new Error(`Referenced Sales Order not found: ${referenceId}`);
      referenceNo = order.orderNo;
    }
  }

  // 3. Validate items
  for (const it of items) {
    if (!it.description || it.description.trim().length === 0) {
      throw new Error("Each item on the Delivery Challan must have a description.");
    }
    if (Number(it.quantity) <= 0) {
      throw new Error(`Invalid quantity for item '${it.description}': must be greater than zero.`);
    }
  }

  // 4. Generate Challan Number
  let challanNumber: string;
  if (status === "ISSUED") {
    challanNumber = await allocateChallanNo();
  } else {
    challanNumber = generateDraftChallanNo();
  }

  const now = new Date();
  const docDate = new Date(date);

  const newDoc = {
    challanNumber,
    date: docDate,
    clientId,
    purpose,
    referenceType,
    referenceId: referenceId || null,
    referenceNo,
    destination: finalDestination,
    transportMode: transportMode || null,
    vehicleNo: vehicleNo || null,
    lrNumber: lrNumber || null,
    contactPerson: contactPerson || client.name,
    contactPhone: contactPhone || client.phone,
    notes: notes || null,
    status,
    deductStock: Boolean(deductStock),
    stockDeductedAt: status === "ISSUED" && deductStock ? now : null,
    items: items.map((it) => ({
      productId: it.productId || null,
      sku: it.sku || null,
      description: it.description.trim(),
      quantity: Number(it.quantity),
      unit: it.unit || "pcs",
      notes: it.notes || null,
    })),
    createdById: userId || null,
    issuedAt: status === "ISSUED" ? now : null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getMongoDb();
  const insertRes = await db.collection(CHALLAN_COLLECTION).insertOne(newDoc);
  const challanId = insertRes.insertedId.toString();

  // 5. If issued immediately with stock deduction, process stock movement
  if (status === "ISSUED" && deductStock) {
    await processChallanDispatchStock(challanId, challanNumber, newDoc.items, userId);
  }

  // 6. Audit Logging
  try {
    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: status === "ISSUED" ? "DELIVERY_CHALLAN_ISSUED" : "DELIVERY_CHALLAN_CREATED",
          module: "DELIVERY_CHALLAN",
          entityId: challanId,
          newData: JSON.stringify({
            challanNumber,
            clientId,
            purpose,
            status,
            deductStock,
            itemCount: items.length,
          }),
        },
      });
    }
  } catch (err) {
    console.error("[Challan] Audit log error:", err);
  }

  return {
    id: challanId,
    ...newDoc,
  };
}

/**
 * Issues a draft Delivery Challan.
 * Atomically assigns official TTRC-DC-YYYY-XXXX number and applies stock dispatch if configured.
 */
export async function issueDeliveryChallan(
  challanId: string,
  userId?: string
): Promise<DeliveryChallanRecord> {
  const db = await getMongoDb();
  const challan = await db.collection(CHALLAN_COLLECTION).findOne({ _id: new ObjectId(challanId) });
  if (!challan) {
    throw new Error(`Delivery Challan not found: ${challanId}`);
  }

  if (challan.status === "ISSUED") {
    return {
      id: challan._id.toString(),
      challanNumber: challan.challanNumber,
      date: challan.date,
      clientId: challan.clientId,
      purpose: challan.purpose,
      referenceType: challan.referenceType,
      referenceId: challan.referenceId,
      referenceNo: challan.referenceNo,
      destination: challan.destination,
      transportMode: challan.transportMode,
      vehicleNo: challan.vehicleNo,
      lrNumber: challan.lrNumber,
      contactPerson: challan.contactPerson,
      contactPhone: challan.contactPhone,
      notes: challan.notes,
      status: challan.status,
      deductStock: challan.deductStock,
      stockDeductedAt: challan.stockDeductedAt,
      items: challan.items,
      createdById: challan.createdById,
      issuedAt: challan.issuedAt,
      cancelledAt: challan.cancelledAt,
      cancelReason: challan.cancelReason,
      createdAt: challan.createdAt,
      updatedAt: challan.updatedAt,
    };
  }

  if (challan.status === "CANCELLED") {
    throw new Error("Cannot issue a CANCELLED Delivery Challan.");
  }

  // 1. Allocate official Delivery Challan number
  const officialNo = await allocateChallanNo();
  const now = new Date();

  // 2. If deductStock is true, perform stock deduction
  if (challan.deductStock && !challan.stockDeductedAt) {
    await processChallanDispatchStock(challanId, officialNo, challan.items, userId);
  }

  // 3. Update status in database
  await db.collection(CHALLAN_COLLECTION).updateOne(
    { _id: new ObjectId(challanId) },
    {
      $set: {
        challanNumber: officialNo,
        status: "ISSUED",
        issuedAt: now,
        stockDeductedAt: challan.deductStock ? now : null,
        updatedAt: now,
      },
    }
  );

  // 4. Audit Log
  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "DELIVERY_CHALLAN_ISSUED",
          module: "DELIVERY_CHALLAN",
          entityId: challanId,
          newData: JSON.stringify({
            challanNumber: officialNo,
            issuedAt: now,
            deductStock: challan.deductStock,
          }),
        },
      });
    } catch (e) {
      console.error("[Challan] Audit log error:", e);
    }
  }

  return {
    id: challan._id.toString(),
    challanNumber: officialNo,
    date: challan.date,
    clientId: challan.clientId,
    purpose: challan.purpose,
    referenceType: challan.referenceType,
    referenceId: challan.referenceId,
    referenceNo: challan.referenceNo,
    destination: challan.destination,
    transportMode: challan.transportMode,
    vehicleNo: challan.vehicleNo,
    lrNumber: challan.lrNumber,
    contactPerson: challan.contactPerson,
    contactPhone: challan.contactPhone,
    notes: challan.notes,
    status: "ISSUED",
    deductStock: challan.deductStock,
    stockDeductedAt: challan.deductStock ? now : null,
    items: challan.items,
    createdById: challan.createdById,
    issuedAt: now,
    cancelledAt: null,
    cancelReason: null,
    createdAt: challan.createdAt,
    updatedAt: now,
  };
}

/**
 * Cancels a Delivery Challan.
 * If stock was previously deducted, atomically creates DISPATCH_RETURN compensating ledger entries.
 * Retains permanent sequence number and records cancel reason.
 */
export async function cancelDeliveryChallan(
  challanId: string,
  cancelReason: string,
  userId?: string
): Promise<DeliveryChallanRecord> {
  const db = await getMongoDb();
  const challan = await db.collection(CHALLAN_COLLECTION).findOne({ _id: new ObjectId(challanId) });
  if (!challan) {
    throw new Error(`Delivery Challan not found: ${challanId}`);
  }

  if (challan.status === "CANCELLED") {
    return {
      id: challan._id.toString(),
      challanNumber: challan.challanNumber,
      date: challan.date,
      clientId: challan.clientId,
      purpose: challan.purpose,
      referenceType: challan.referenceType,
      referenceId: challan.referenceId,
      referenceNo: challan.referenceNo,
      destination: challan.destination,
      transportMode: challan.transportMode,
      vehicleNo: challan.vehicleNo,
      lrNumber: challan.lrNumber,
      contactPerson: challan.contactPerson,
      contactPhone: challan.contactPhone,
      notes: challan.notes,
      status: challan.status,
      deductStock: challan.deductStock,
      stockDeductedAt: challan.stockDeductedAt,
      items: challan.items,
      createdById: challan.createdById,
      issuedAt: challan.issuedAt,
      cancelledAt: challan.cancelledAt,
      cancelReason: challan.cancelReason,
      createdAt: challan.createdAt,
      updatedAt: challan.updatedAt,
    };
  }

  const now = new Date();

  // If stock was deducted, reverse it atomically via ledger entries
  if (challan.deductStock && challan.stockDeductedAt) {
    await reverseChallanDispatchStock(challanId, challan.challanNumber, challan.items, userId);
  }

  await db.collection(CHALLAN_COLLECTION).updateOne(
    { _id: new ObjectId(challanId) },
    {
      $set: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelReason: cancelReason || "Cancelled by administrator",
        updatedAt: now,
      },
    }
  );

  // Audit Log
  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "DELIVERY_CHALLAN_CANCELLED",
          module: "DELIVERY_CHALLAN",
          entityId: challanId,
          newData: JSON.stringify({
            challanNumber: challan.challanNumber,
            cancelledAt: now,
            cancelReason,
          }),
        },
      });
    } catch (e) {
      console.error("[Challan] Audit log error:", e);
    }
  }

  return {
    id: challan._id.toString(),
    challanNumber: challan.challanNumber,
    date: challan.date,
    clientId: challan.clientId,
    purpose: challan.purpose,
    referenceType: challan.referenceType,
    referenceId: challan.referenceId,
    referenceNo: challan.referenceNo,
    destination: challan.destination,
    transportMode: challan.transportMode,
    vehicleNo: challan.vehicleNo,
    lrNumber: challan.lrNumber,
    contactPerson: challan.contactPerson,
    contactPhone: challan.contactPhone,
    notes: challan.notes,
    status: "CANCELLED",
    deductStock: challan.deductStock,
    stockDeductedAt: challan.stockDeductedAt,
    items: challan.items,
    createdById: challan.createdById,
    issuedAt: challan.issuedAt,
    cancelledAt: now,
    cancelReason,
    createdAt: challan.createdAt,
    updatedAt: now,
  };
}

/**
 * Handles stock dispatch for physical movement challans.
 * Concurrency-safe conditional updates + StockLedgerEntry records.
 */
async function processChallanDispatchStock(
  challanId: string,
  challanNumber: string,
  items: ChallanItemInput[],
  userId?: string
) {
  const stockItems = items.filter((it) => it.productId);
  if (stockItems.length === 0) return;

  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
      for (const item of stockItems) {
        const prod = await tx.product.findUnique({ where: { id: item.productId! } });
        if (!prod) {
          throw new Error(`Product not found for stock dispatch: ${item.productId}`);
        }
        if (prod.type === "SERVICE") continue;

        const scale = prod.quantityScale || 1;
        const qtyMinor = toMinorQuantity(item.quantity, scale);

        // Conditional decrement: prevent negative stock
        const decRes = await tx.product.updateMany({
          where: {
            id: prod.id,
            stockQuantityMinor: { gte: qtyMinor },
          },
          data: {
            stockQuantityMinor: { decrement: qtyMinor },
            stockQuantity: { decrement: Math.round(item.quantity) },
          },
        });

        if (decRes.count === 0) {
          throw new Error(
            `Insufficient stock to dispatch ${prod.name} (${prod.sku || "No SKU"}): required ${item.quantity}, available ${prod.stockQuantity}.`
          );
        }

        const unitCostPaise = await getProductRollingWACPaise(prod.id, now);
        const costAmountPaise = Math.round(item.quantity * unitCostPaise);

        await tx.stockLedgerEntry.create({
          data: {
            productId: prod.id,
            quantitySignedMinor: -qtyMinor,
            quantitySigned: -Math.round(item.quantity),
            unitCostPaise,
            unitCost: unitCostPaise,
            costAmountPaise,
            costAmount: costAmountPaise,
            effectiveAt: now,
            type: "DISPATCH",
            referenceType: "DELIVERY_CHALLAN",
            referenceId: challanId,
            notes: `Dispatch via Delivery Challan ${challanNumber}`,
            createdById: userId || null,
            createdAt: now,
          },
        });
      }
    },
    { maxWait: 10000, timeout: 25000 }
  );
}

/**
 * Reverses stock dispatch when a Delivery Challan is cancelled.
 */
async function reverseChallanDispatchStock(
  challanId: string,
  challanNumber: string,
  items: ChallanItemInput[],
  userId?: string
) {
  const stockItems = items.filter((it) => it.productId);
  if (stockItems.length === 0) return;

  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
      for (const item of stockItems) {
        const prod = await tx.product.findUnique({ where: { id: item.productId! } });
        if (!prod || prod.type === "SERVICE") continue;

        const scale = prod.quantityScale || 1;
        const qtyMinor = toMinorQuantity(item.quantity, scale);
        const unitCostPaise = await getProductRollingWACPaise(prod.id, now);
        const costAmountPaise = Math.round(item.quantity * unitCostPaise);

        await tx.product.update({
          where: { id: prod.id },
          data: {
            stockQuantityMinor: { increment: qtyMinor },
            stockQuantity: { increment: Math.round(item.quantity) },
          },
        });

        await tx.stockLedgerEntry.create({
          data: {
            productId: prod.id,
            quantitySignedMinor: qtyMinor,
            quantitySigned: Math.round(item.quantity),
            unitCostPaise,
            unitCost: unitCostPaise,
            costAmountPaise,
            costAmount: costAmountPaise,
            effectiveAt: now,
            type: "DISPATCH_RETURN",
            referenceType: "DELIVERY_CHALLAN",
            referenceId: challanId,
            notes: `Reversal of dispatch for cancelled Delivery Challan ${challanNumber}`,
            createdById: userId || null,
            createdAt: now,
          },
        });
      }
    },
    { maxWait: 10000, timeout: 25000 }
  );
}

/**
 * Retrieves a single Delivery Challan enriched with Customer and Product metadata.
 */
export async function getDeliveryChallanById(challanId: string) {
  const db = await getMongoDb();
  const challan = await db.collection(CHALLAN_COLLECTION).findOne({ _id: new ObjectId(challanId) });
  if (!challan) return null;

  const client = await prisma.client.findUnique({
    where: { id: challan.clientId },
    select: {
      id: true,
      name: true,
      company: true,
      clientCode: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      gstin: true,
    },
  });

  return {
    id: challan._id.toString(),
    challanNumber: challan.challanNumber,
    date: challan.date,
    clientId: challan.clientId,
    client,
    purpose: challan.purpose,
    referenceType: challan.referenceType,
    referenceId: challan.referenceId,
    referenceNo: challan.referenceNo,
    destination: challan.destination,
    transportMode: challan.transportMode,
    vehicleNo: challan.vehicleNo,
    lrNumber: challan.lrNumber,
    contactPerson: challan.contactPerson,
    contactPhone: challan.contactPhone,
    notes: challan.notes,
    status: challan.status,
    deductStock: challan.deductStock,
    stockDeductedAt: challan.stockDeductedAt,
    items: challan.items,
    createdById: challan.createdById,
    issuedAt: challan.issuedAt,
    cancelledAt: challan.cancelledAt,
    cancelReason: challan.cancelReason,
    createdAt: challan.createdAt,
    updatedAt: challan.updatedAt,
  };
}

/**
 * Lists all Delivery Challans with optional filters.
 */
export async function listDeliveryChallans(filter?: {
  clientId?: string;
  status?: ChallanStatus;
  purpose?: ChallanPurpose;
}) {
  const db = await getMongoDb();
  const query: any = {};
  if (filter?.clientId) query.clientId = filter.clientId;
  if (filter?.status) query.status = filter.status;
  if (filter?.purpose) query.purpose = filter.purpose;

  const challans = await db
    .collection(CHALLAN_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  if (challans.length === 0) return [];

  const clientIds = Array.from(new Set(challans.map((c) => c.clientId)));
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, company: true, clientCode: true },
  });
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return challans.map((c) => ({
    id: c._id.toString(),
    challanNumber: c.challanNumber,
    date: c.date,
    clientId: c.clientId,
    client: clientMap.get(c.clientId) || null,
    purpose: c.purpose,
    referenceType: c.referenceType,
    referenceNo: c.referenceNo,
    destination: c.destination,
    transportMode: c.transportMode,
    vehicleNo: c.vehicleNo,
    lrNumber: c.lrNumber,
    status: c.status,
    deductStock: c.deductStock,
    itemCount: (c.items || []).length,
    totalQuantity: (c.items || []).reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0),
    issuedAt: c.issuedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}
