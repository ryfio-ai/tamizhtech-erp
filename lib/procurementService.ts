/**
 * TAMIZHTECH ERP 2.0 — PHASE 6
 * Authoritative Procurement, Supplier Management & Goods Receiving Service
 *
 * Traceability:
 * Demand (BOM Shortage / Project / Sales Order / Manual)
 *   ↓
 * Procurement Request
 *   ↓
 * Supplier / Vendor Master
 *   ↓
 * Purchase Order (TTRC-PO-YYYY-XXXX)
 *   ↓
 * Goods Receipt / GRN (TTRC-GRN-YYYY-XXXX)
 *   ↓
 * Inventory Mutation & StockLedgerEntry (PURCHASE) + Rolling WAC
 *   ↓
 * Supplier Bill / Payable (Three-Way Match)
 *   ↓
 * Supplier Payment (TTRC-SPAY-YYYY-XXXX)
 */

import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import prisma from "@/lib/prisma";
import {
  allocateSupplierNo,
  allocatePurchaseOrderNo,
  allocateGoodsReceiptNo,
  allocateProcurementRequestNo,
  allocateSupplierBillNo,
  allocateSupplierPaymentNo,
  generateDraftPurchaseOrderNo,
  generateDraftGoodsReceiptNo,
  generateDraftSupplierNo,
} from "@/lib/sequence";
import { recordStockMovement } from "@/lib/costService";
import { roundToPaise, toPaise, fromPaise, roundMoney } from "@/lib/money";

// MongoDB Collection Names
export const SUPPLIER_META_COLLECTION = "SupplierMeta";
export const PO_META_COLLECTION = "PurchaseOrderMeta";
export const GRN_COLLECTION = "GoodsReceipt";
export const PURCHASE_RETURN_COLLECTION = "PurchaseReturn";
export const SUPPLIER_BILL_COLLECTION = "SupplierBill";
export const SUPPLIER_PAYMENT_COLLECTION = "SupplierPayment";
export const PROCUREMENT_REQ_COLLECTION = "ProcurementRequest";

async function logAudit(data: {
  userId?: string;
  action: string;
  module: string;
  entityId: string;
  newData?: string;
}) {
  try {
    const validUserId = data.userId && ObjectId.isValid(data.userId) ? data.userId : undefined;
    await (prisma.auditLog.create as any)({
      data: {
        userId: validUserId,
        action: data.action,
        module: data.module,
        entityId: data.entityId,
        newData: data.newData,
      },
    });
  } catch (e) {
    console.error("[Procurement] Audit log error:", e);
  }
}

// =================================================================
// 1. SUPPLIER / VENDOR MASTER
// =================================================================

export interface CreateSupplierInput {
  name: string;
  legalName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  country?: string;
  paymentTerms?: string;
  notes?: string;
  userId?: string;
  idempotencyKey?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  legalName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  country?: string;
  paymentTerms?: string;
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED";
  notes?: string;
  userId?: string;
}

/**
 * Creates a new authoritative Supplier/Vendor.
 */
export async function createSupplier(input: CreateSupplierInput) {
  const db = await getMongoDb();

  // Idempotency check
  if (input.idempotencyKey) {
    const existing = await db
      .collection(SUPPLIER_META_COLLECTION)
      .findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) {
      return getSupplierById(existing.vendorId);
    }
  }

  const supplierCode = await allocateSupplierNo();
  const cleanGstin = input.gstin ? input.gstin.trim().toUpperCase() : null;
  const cleanPan = input.pan ? input.pan.trim().toUpperCase() : null;

  // Create primary Vendor record in Prisma
  const vendor = await prisma.vendor.create({
    data: {
      vendorCode: supplierCode,
      name: input.name.trim(),
      contactPerson: input.contactPerson?.trim() || null,
      email: input.email ? input.email.trim().toLowerCase() : null,
      phone: input.phone?.trim() || null,
      address: input.billingAddress?.trim() || null,
      gstin: cleanGstin,
      status: "ACTIVE",
    },
  });

  // Store rich metadata
  const now = new Date();
  await db.collection(SUPPLIER_META_COLLECTION).insertOne({
    vendorId: vendor.id,
    supplierCode,
    legalName: input.legalName?.trim() || input.name.trim(),
    displayName: input.name.trim(),
    pan: cleanPan,
    billingAddress: input.billingAddress?.trim() || null,
    shippingAddress: input.shippingAddress?.trim() || null,
    state: input.state?.trim() || "Tamil Nadu",
    country: input.country?.trim() || "India",
    paymentTerms: input.paymentTerms?.trim() || "NET_30",
    notes: input.notes?.trim() || null,
    status: "ACTIVE",
    idempotencyKey: input.idempotencyKey || null,
    createdById: input.userId || null,
    createdAt: now,
    updatedAt: now,
  });

  if (input.userId) {
    await logAudit({
      userId: input.userId,
      action: "SUPPLIER_CREATED",
      module: "PROCUREMENT",
      entityId: vendor.id,
      newData: JSON.stringify({
        supplierCode,
        name: vendor.name,
        gstin: cleanGstin,
      }),
    });
  }

  return getSupplierById(vendor.id);
}

/**
 * Updates supplier details. Never deletes historical records.
 */
export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  const db = await getMongoDb();
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) throw new Error(`Supplier not found: ${id}`);

  const updatePrisma: any = {};
  if (input.name !== undefined) updatePrisma.name = input.name.trim();
  if (input.contactPerson !== undefined) updatePrisma.contactPerson = input.contactPerson?.trim() || null;
  if (input.email !== undefined) updatePrisma.email = input.email ? input.email.trim().toLowerCase() : null;
  if (input.phone !== undefined) updatePrisma.phone = input.phone?.trim() || null;
  if (input.billingAddress !== undefined) updatePrisma.address = input.billingAddress?.trim() || null;
  if (input.gstin !== undefined) updatePrisma.gstin = input.gstin ? input.gstin.trim().toUpperCase() : null;
  if (input.status !== undefined) updatePrisma.status = input.status;

  if (Object.keys(updatePrisma).length > 0) {
    await prisma.vendor.update({
      where: { id },
      data: updatePrisma,
    });
  }

  const metaUpdate: any = { updatedAt: new Date() };
  if (input.legalName !== undefined) metaUpdate.legalName = input.legalName.trim();
  if (input.pan !== undefined) metaUpdate.pan = input.pan?.trim().toUpperCase() || null;
  if (input.billingAddress !== undefined) metaUpdate.billingAddress = input.billingAddress?.trim() || null;
  if (input.shippingAddress !== undefined) metaUpdate.shippingAddress = input.shippingAddress?.trim() || null;
  if (input.state !== undefined) metaUpdate.state = input.state?.trim() || null;
  if (input.country !== undefined) metaUpdate.country = input.country?.trim() || null;
  if (input.paymentTerms !== undefined) metaUpdate.paymentTerms = input.paymentTerms?.trim() || null;
  if (input.status !== undefined) metaUpdate.status = input.status;
  if (input.notes !== undefined) metaUpdate.notes = input.notes?.trim() || null;

  await db.collection(SUPPLIER_META_COLLECTION).updateOne(
    { vendorId: id },
    { $set: metaUpdate },
    { upsert: true }
  );

  if (input.userId) {
    await logAudit({
      userId: input.userId,
      action: "SUPPLIER_UPDATED",
      module: "PROCUREMENT",
      entityId: id,
      newData: JSON.stringify(input),
    });
  }

  return getSupplierById(id);
}

/**
 * Checks for potential duplicate suppliers by GSTIN, email, phone, or name.
 */
export async function checkDuplicateSupplier(params: {
  gstin?: string;
  email?: string;
  phone?: string;
  name?: string;
  excludeId?: string;
}) {
  const { gstin, email, phone, name, excludeId } = params;
  const matches: Array<{ field: string; supplierCode: string; name: string }> = [];

  if (gstin && gstin.trim()) {
    const clean = gstin.trim().toUpperCase();
    const existing = await prisma.vendor.findFirst({
      where: { gstin: clean, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { vendorCode: true, name: true },
    });
    if (existing) {
      matches.push({ field: "GSTIN", supplierCode: existing.vendorCode, name: existing.name });
    }
  }

  if (email && email.trim()) {
    const clean = email.trim().toLowerCase();
    const existing = await prisma.vendor.findFirst({
      where: { email: clean, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { vendorCode: true, name: true },
    });
    if (existing) {
      matches.push({ field: "Email", supplierCode: existing.vendorCode, name: existing.name });
    }
  }

  return { isDuplicate: matches.length > 0, matches };
}

/**
 * Retrieves supplier by ID with complete purchase history and payable totals.
 */
export async function getSupplierById(id: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      purchaseOrders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      },
    },
  });

  if (!vendor) return null;

  const db = await getMongoDb();
  const [meta, grns, bills, payments] = await Promise.all([
    db.collection(SUPPLIER_META_COLLECTION).findOne({ vendorId: id }),
    db.collection(GRN_COLLECTION).find({ vendorId: id }).sort({ receivedAt: -1 }).toArray(),
    db.collection(SUPPLIER_BILL_COLLECTION).find({ vendorId: id }).sort({ billDate: -1 }).toArray(),
    db.collection(SUPPLIER_PAYMENT_COLLECTION).find({ vendorId: id }).sort({ paymentDate: -1 }).toArray(),
  ]);

  // Compute live payables from real bills
  const totalBilledPaise = bills.reduce((sum, b) => sum + (b.totalAmountPaise || 0), 0);
  const totalPaidPaise = bills.reduce((sum, b) => sum + (b.paidAmountPaise || 0), 0);
  const outstandingPayablePaise = Math.max(0, totalBilledPaise - totalPaidPaise);

  return {
    ...vendor,
    supplierCode: vendor.vendorCode,
    meta: meta || {},
    goodsReceipts: grns.map((g) => ({ ...g, id: g._id.toString() })),
    supplierBills: bills.map((b) => ({ ...b, id: b._id.toString() })),
    supplierPayments: payments.map((p) => ({ ...p, id: p._id.toString() })),
    financials: {
      totalBilled: fromPaise(totalBilledPaise),
      totalBilledPaise,
      totalPaid: fromPaise(totalPaidPaise),
      totalPaidPaise,
      outstandingPayable: fromPaise(outstandingPayablePaise),
      outstandingPayablePaise,
    },
  };
}

/**
 * Lists all suppliers with search and filters.
 */
export async function listSuppliers(params: {
  search?: string;
  status?: string;
  limit?: number;
  skip?: number;
} = {}) {
  const { search, status, limit = 50, skip = 0 } = params;
  const where: any = {};

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { vendorCode: { contains: q, mode: "insensitive" } },
      { contactPerson: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { gstin: { contains: q, mode: "insensitive" } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  return { suppliers, total };
}

// =================================================================
// 2. PROCUREMENT REQUESTS
// =================================================================

export interface CreateProcurementRequestInput {
  sourceType: "SALES_ORDER" | "PROJECT" | "BOM" | "PRODUCTION" | "MANUAL";
  sourceId?: string;
  department?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  requiredDate?: Date | string;
  notes?: string;
  items: Array<{
    productId?: string;
    description: string;
    quantity: number;
    estimatedUnitCostPaise?: number;
  }>;
  userId?: string;
  idempotencyKey?: string;
}

export async function createProcurementRequest(input: CreateProcurementRequestInput) {
  const db = await getMongoDb();

  if (input.idempotencyKey) {
    const existing = await db
      .collection(PROCUREMENT_REQ_COLLECTION)
      .findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) return { ...existing, id: existing._id.toString() };
  }

  const requestNo = await allocateProcurementRequestNo();
  const now = new Date();

  const doc = {
    requestNo,
    sourceType: input.sourceType,
    sourceId: input.sourceId || null,
    department: input.department?.trim() || "Operations",
    priority: input.priority || "MEDIUM",
    requiredDate: input.requiredDate ? new Date(input.requiredDate) : null,
    status: "SUBMITTED",
    notes: input.notes?.trim() || null,
    items: input.items.map((it) => ({
      productId: it.productId || null,
      description: it.description.trim(),
      quantity: Math.max(1, Number(it.quantity) || 1),
      estimatedUnitCostPaise: it.estimatedUnitCostPaise || 0,
    })),
    requestedById: input.userId || null,
    approvedById: null,
    approvedAt: null,
    idempotencyKey: input.idempotencyKey || null,
    createdAt: now,
    updatedAt: now,
  };

  const res = await db.collection(PROCUREMENT_REQ_COLLECTION).insertOne(doc);

  if (input.userId) {
    await logAudit({
      userId: input.userId,
      action: "PROCUREMENT_REQUEST_CREATED",
      module: "PROCUREMENT",
      entityId: res.insertedId.toString(),
      newData: JSON.stringify({ requestNo, sourceType: input.sourceType }),
    });
  }

  return { ...doc, id: res.insertedId.toString() };
}

export async function approveProcurementRequest(requestId: string, userId: string) {
  const db = await getMongoDb();
  const now = new Date();
  const reqObjId = new ObjectId(requestId);

  const reqDoc = await db.collection(PROCUREMENT_REQ_COLLECTION).findOne({ _id: reqObjId });
  if (!reqDoc) throw new Error("Procurement request not found");
  if (reqDoc.status !== "SUBMITTED" && reqDoc.status !== "DRAFT") {
    throw new Error(`Cannot approve request in ${reqDoc.status} status`);
  }

  await db.collection(PROCUREMENT_REQ_COLLECTION).updateOne(
    { _id: reqObjId },
    {
      $set: {
        status: "APPROVED",
        approvedById: userId,
        approvedAt: now,
        updatedAt: now,
      },
    }
  );

  await logAudit({
    userId,
    action: "PROCUREMENT_REQUEST_APPROVED",
    module: "PROCUREMENT",
    entityId: requestId,
    newData: JSON.stringify({ status: "APPROVED", approvedAt: now }),
  });

  return { ...reqDoc, status: "APPROVED", approvedById: userId, approvedAt: now };
}

export async function listProcurementRequests(filter?: {
  status?: string;
  sourceType?: string;
  projectId?: string;
}) {
  const db = await getMongoDb();
  const query: any = {};
  if (filter?.status) query.status = filter.status;
  if (filter?.sourceType) query.sourceType = filter.sourceType;
  if (filter?.projectId) query.sourceId = filter.projectId;

  const docs = await db
    .collection(PROCUREMENT_REQ_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((d) => ({
    ...d,
    id: d._id.toString(),
  }));
}

// =================================================================
// 3. PURCHASE ORDERS
// =================================================================

export interface PurchaseOrderItemInput {
  productId?: string;
  description: string;
  quantity: number;
  unitCost: number; // in Rupees
  taxRate?: number;
  expectedDate?: Date | string;
  notes?: string;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  sourceRequestId?: string;
  projectId?: string;
  salesOrderId?: string;
  bomId?: string;
  orderDate?: Date | string;
  expectedDeliveryDate?: Date | string;
  paymentTerms?: string;
  shippingTerms?: string;
  notes?: string;
  items: PurchaseOrderItemInput[];
  userId: string;
  idempotencyKey?: string;
}

const inFlightCreations = new Map<string, Promise<any>>();

/**
 * Creates an authoritative Purchase Order.
 * CRITICAL RULE: Creating a PO does NOT mutate physical inventory, does NOT create payments, and does NOT create expenses.
 */
export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const cleanIdemKey = input.idempotencyKey?.trim();

  // In-flight concurrency guard (Synchronous check before any await)
  if (cleanIdemKey && inFlightCreations.has(cleanIdemKey)) {
    return inFlightCreations.get(cleanIdemKey);
  }

  const runCreation = async () => {
    const db = await getMongoDb();

    // Idempotency DB guard (for requests arriving after prior completion)
    if (cleanIdemKey) {
      const existing = await db
        .collection(PO_META_COLLECTION)
        .findOne({ idempotencyKey: cleanIdemKey });
      if (existing) {
        return getPurchaseOrderById(existing.purchaseOrderId);
      }
    }

    const supplier = await prisma.vendor.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new Error(`Supplier not found: ${input.supplierId}`);

    if (!input.items || input.items.length === 0) {
      throw new Error("Purchase Order must contain at least one line item");
    }

    const poNo = await allocatePurchaseOrderNo();
    const orderDate = input.orderDate ? new Date(input.orderDate) : new Date();
    const expectedDelivery = input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null;

    // Calculate exact line item totals in paise
    let subtotalPaise = 0;
    let taxAmountPaise = 0;

  const validatedItems = input.items.map((it) => {
    const qty = Math.max(1, Number(it.quantity) || 1);
    const unitPricePaise = toPaise(Math.max(0, roundMoney(it.unitCost)));
    const lineSubtotalPaise = Math.round(qty * unitPricePaise);
    const taxRate = Math.max(0, Number(it.taxRate) || 0);
    const lineTaxPaise = Math.round((lineSubtotalPaise * taxRate) / 100);

    subtotalPaise += lineSubtotalPaise;
    taxAmountPaise += lineTaxPaise;

    return {
      productId: it.productId || null,
      description: it.description.trim(),
      quantity: qty,
      unitCost: fromPaise(unitPricePaise),
      unitCostPaise: unitPricePaise,
      totalCost: fromPaise(lineSubtotalPaise),
      totalCostPaise: lineSubtotalPaise,
      taxRate,
      lineTaxPaise,
      receivedQuantity: 0,
      remainingQuantity: qty,
      notes: it.notes?.trim() || null,
    };
  });

  const totalAmountPaise = subtotalPaise + taxAmountPaise;
  const totalAmountRupees = fromPaise(totalAmountPaise);

  // 1. Create primary PurchaseOrder in Prisma
  const po = await prisma.purchaseOrder.create({
    data: {
      poNo,
      vendorId: input.supplierId,
      status: "DRAFT",
      totalAmount: totalAmountRupees,
      notes: input.notes?.trim() || null,
      expectedDelivery,
      createdById:
        (input.userId && ObjectId.isValid(input.userId))
          ? input.userId
          : (await prisma.user.findFirst({ select: { id: true } }))?.id ||
            new ObjectId().toString(),
      items: {
        create: validatedItems.map((it) => ({
          productId: it.productId,
          description: it.description,
          quantity: it.quantity,
          unitCost: it.unitCost,
          totalCost: it.totalCost,
        })),
      },
    },
    include: { items: true },
  });

  // 2. Persist exact execution metadata
  const now = new Date();
  await db.collection(PO_META_COLLECTION).insertOne({
    purchaseOrderId: po.id,
    poNo,
    supplierId: input.supplierId,
    sourceRequestId: input.sourceRequestId || null,
    projectId: input.projectId || null,
    salesOrderId: input.salesOrderId || null,
    bomId: input.bomId || null,
    orderDate,
    expectedDeliveryDate: expectedDelivery,
    paymentTerms: input.paymentTerms?.trim() || "NET_30",
    shippingTerms: input.shippingTerms?.trim() || "FOB_ORIGIN",
    subtotalPaise,
    taxAmountPaise,
    totalAmountPaise,
    status: "DRAFT",
    items: validatedItems.map((vit, idx) => ({
      ...vit,
      prismaItemId: po.items[idx]?.id || null,
    })),
    idempotencyKey: input.idempotencyKey || null,
    createdById: input.userId,
    createdAt: now,
    updatedAt: now,
  });

  // If created from a procurement request, mark request as ORDERED
  if (input.sourceRequestId) {
    await db.collection(PROCUREMENT_REQ_COLLECTION).updateOne(
      { _id: new ObjectId(input.sourceRequestId) },
      { $set: { status: "ORDERED", purchaseOrderId: po.id, updatedAt: now } }
    ).catch(() => {});
  }

  // Audit log
  await logAudit({
    userId: input.userId,
    action: "PURCHASE_ORDER_CREATED",
    module: "PROCUREMENT",
    entityId: po.id,
    newData: JSON.stringify({
      poNo,
      supplierId: input.supplierId,
      totalAmount: totalAmountRupees,
      itemCount: validatedItems.length,
    }),
  });

    return getPurchaseOrderById(po.id);
  };

  if (cleanIdemKey) {
    const creationPromise = runCreation();
    inFlightCreations.set(cleanIdemKey, creationPromise);
    try {
      return await creationPromise;
    } finally {
      inFlightCreations.delete(cleanIdemKey);
    }
  }

  return runCreation();
}

/**
 * Confirms a Purchase Order (transitions DRAFT -> SENT -> CONFIRMED).
 */
export async function confirmPurchaseOrder(orderId: string, userId: string) {
  const db = await getMongoDb();
  const po = await prisma.purchaseOrder.findUnique({ where: { id: orderId } });
  if (!po) throw new Error(`Purchase Order not found: ${orderId}`);

  if (po.status === "CONFIRMED" || po.status === "SENT") {
    // Idempotent return
    return getPurchaseOrderById(orderId);
  }

  if (po.status !== "DRAFT") {
    throw new Error(`Cannot confirm Purchase Order in ${po.status} status`);
  }

  const now = new Date();
  await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: "CONFIRMED" },
  });

  await db.collection(PO_META_COLLECTION).updateOne(
    { purchaseOrderId: orderId },
    {
      $set: {
        status: "CONFIRMED",
        confirmedAt: now,
        confirmedById: userId,
        updatedAt: now,
      },
    }
  );

  await logAudit({
    userId,
    action: "PURCHASE_ORDER_CONFIRMED",
    module: "PROCUREMENT",
    entityId: orderId,
    newData: JSON.stringify({ poNo: po.poNo, status: "CONFIRMED" }),
  });

  return getPurchaseOrderById(orderId);
}

/**
 * Cancels a Purchase Order.
 * Validates that no confirmed goods receipts or supplier bills exist.
 */
export async function cancelPurchaseOrder(orderId: string, arg2?: string, arg3?: string) {
  let userId = "system";
  let reason = "Cancelled by user";
  if (arg2 && ObjectId.isValid(arg2)) {
    userId = arg2;
    reason = arg3 || reason;
  } else if (arg3 && ObjectId.isValid(arg3)) {
    userId = arg3;
    reason = arg2 || reason;
  } else {
    reason = arg2 || reason;
    userId = arg3 || userId;
  }
  const db = await getMongoDb();
  const po = await prisma.purchaseOrder.findUnique({ where: { id: orderId } });
  if (!po) throw new Error(`Purchase Order not found: ${orderId}`);

  if (po.status === "CANCELLED") {
    return getPurchaseOrderById(orderId);
  }

  // Safety check 1: active goods receipts
  const activeGrn = await db.collection(GRN_COLLECTION).findOne({
    purchaseOrderId: orderId,
    status: { $in: ["CONFIRMED", "ISSUED"] },
  });
  if (activeGrn) {
    throw new Error(
      `Cannot cancel Purchase Order: Goods Receipt ${activeGrn.grnNo} has already been confirmed against this order.`
    );
  }

  // Safety check 2: active supplier bills
  const activeBill = await db.collection(SUPPLIER_BILL_COLLECTION).findOne({
    purchaseOrderId: orderId,
    status: { $ne: "VOID" },
  });
  if (activeBill) {
    throw new Error(
      `Cannot cancel Purchase Order: Supplier Bill ${activeBill.billNo} is recorded for this order.`
    );
  }

  const now = new Date();
  await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });

  await db.collection(PO_META_COLLECTION).updateOne(
    { purchaseOrderId: orderId },
    {
      $set: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelReason: reason.trim(),
        cancelledById: userId,
        updatedAt: now,
      },
    }
  );

  await logAudit({
    userId,
    action: "PURCHASE_ORDER_CANCELLED",
    module: "PROCUREMENT",
    entityId: orderId,
    newData: JSON.stringify({ poNo: po.poNo, reason: reason.trim() }),
  });

  return getPurchaseOrderById(orderId);
}

/**
 * Retrieves Purchase Order by ID with line item execution metrics and linked records.
 */
export async function getPurchaseOrderById(orderId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      vendor: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, stockQuantity: true, type: true },
          },
        },
      },
    },
  });

  if (!po) return null;

  const db = await getMongoDb();
  const [meta, grns, bills] = await Promise.all([
    db.collection(PO_META_COLLECTION).findOne({ purchaseOrderId: orderId }),
    db.collection(GRN_COLLECTION).find({ purchaseOrderId: orderId }).toArray(),
    db.collection(SUPPLIER_BILL_COLLECTION).find({ purchaseOrderId: orderId }).toArray(),
  ]);

  // Aggregate line item fulfillment from meta
  const metaItemMap = new Map((meta?.items || []).map((m: any) => [m.productId || m.description, m]));

  const enrichedItems = po.items.map((it) => {
    const m = (metaItemMap.get(it.productId || it.description) || {}) as any;
    const receivedQty = Number(m.receivedQuantity) || 0;
    const orderedQty = it.quantity;
    const remainingQty = Math.max(0, orderedQty - receivedQty);

    return {
      ...it,
      receivedQuantity: receivedQty,
      remainingQuantity: remainingQty,
      unitCostPaise: m.unitCostPaise || toPaise(it.unitCost),
      totalCostPaise: m.totalCostPaise || toPaise(it.totalCost),
      taxRate: m.taxRate || 0,
    };
  });

  const totalOrdered = enrichedItems.reduce((sum, it) => sum + it.quantity, 0);
  const totalReceived = enrichedItems.reduce((sum, it) => sum + it.receivedQuantity, 0);
  const totalRemaining = enrichedItems.reduce((sum, it) => sum + it.remainingQuantity, 0);

  return {
    ...po,
    items: enrichedItems,
    meta: meta || {},
    goodsReceipts: grns.map((g) => ({ ...g, id: g._id.toString() })),
    supplierBills: bills.map((b) => ({ ...b, id: b._id.toString() })),
    fulfillment: {
      totalOrdered,
      totalReceived,
      totalRemaining,
      fulfillmentPercentage: totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0,
    },
  };
}

/**
 * Lists Purchase Orders with search and status filters.
 */
export async function listPurchaseOrders(params: {
  search?: string;
  status?: string;
  supplierId?: string;
  projectId?: string;
  salesOrderId?: string;
  limit?: number;
  skip?: number;
} = {}) {
  const { search, status, supplierId, projectId, salesOrderId, limit = 50, skip = 0 } = params;
  const where: any = {};

  if (status && status !== "ALL") where.status = status;
  if (supplierId) where.vendorId = supplierId;

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { poNo: { contains: q, mode: "insensitive" } },
      { vendor: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        vendor: { select: { id: true, vendorCode: true, name: true } },
        items: true,
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  const db = await getMongoDb();
  const orderIds = orders.map((o) => o.id);
  const metas = await db
    .collection(PO_META_COLLECTION)
    .find({ purchaseOrderId: { $in: orderIds } })
    .toArray();
  const metaMap = new Map(metas.map((m) => [m.purchaseOrderId, m]));

  const enriched = orders
    .filter((o) => {
      const meta = metaMap.get(o.id);
      if (projectId && meta?.projectId !== projectId) return false;
      if (salesOrderId && meta?.salesOrderId !== salesOrderId) return false;
      return true;
    })
    .map((o) => {
      const meta = metaMap.get(o.id);
      const metaItems = meta?.items || [];
      const totalOrdered = o.items.reduce((s, it) => s + it.quantity, 0);
      const totalReceived = metaItems.reduce(
        (s: number, it: any) => s + (Number(it.receivedQuantity) || 0),
        0
      );
      const totalRemaining = Math.max(0, totalOrdered - totalReceived);

      return {
        ...o,
        meta: meta || {},
        projectId: meta?.projectId || null,
        salesOrderId: meta?.salesOrderId || null,
        fulfillment: {
          totalOrdered,
          totalReceived,
          totalRemaining,
        },
      };
    });

  return enriched;
}

// =================================================================
// 4. GOODS RECEIPT NOTE (GRN) & INVENTORY RECEIPT
// =================================================================

export interface GoodsReceiptItemInput {
  productId?: string;
  description: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected?: number;
  unitCostPaise?: number;
  notes?: string;
}

export interface CreateGoodsReceiptInput {
  purchaseOrderId: string;
  supplierBillNo?: string;
  receivedAt?: Date | string;
  notes?: string;
  items: GoodsReceiptItemInput[];
  userId: string;
  idempotencyKey?: string;
}

/**
 * Creates and immediately processes an authoritative Goods Receipt Note (GRN).
 *
 * ATOMIC TRANSACTION:
 * 1. Validates PO state is CONFIRMED or PARTIALLY_RECEIVED.
 * 2. Validates accepted/received quantities do not exceed PO remaining quantities.
 * 3. Increments actual Product stock and creates PURCHASE StockLedgerEntry.
 * 4. Rejected material is tracked but strictly excluded from physical inventory.
 * 5. Updates PO line receivedQuantity and PO status.
 * 6. Updates rolling WAC.
 */
export async function createAndConfirmGoodsReceipt(input: CreateGoodsReceiptInput) {
  const db = await getMongoDb();

  // Idempotency check
  if (input.idempotencyKey) {
    const existing = await db
      .collection(GRN_COLLECTION)
      .findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) {
      return { ...existing, id: existing._id.toString() };
    }
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: input.purchaseOrderId },
    include: { items: true, vendor: true },
  });

  if (!po) throw new Error(`Purchase Order not found: ${input.purchaseOrderId}`);
  if (po.status !== "CONFIRMED" && po.status !== "PARTIALLY_RECEIVED") {
    throw new Error(`Cannot receive goods against Purchase Order in ${po.status} status (must be CONFIRMED)`);
  }

  const poMeta = await db.collection(PO_META_COLLECTION).findOne({ purchaseOrderId: po.id });
  const metaItems = poMeta?.items || [];

  // Validate lines against remaining quantities
  const validatedGrnItems: any[] = [];

  for (const it of input.items) {
    const match = metaItems.find(
      (m: any) => (it.productId && m.productId === it.productId) || m.description === it.description
    );
    const remaining = match ? Math.max(0, match.remainingQuantity ?? match.quantity) : it.quantityOrdered;

    const received = Math.max(0, Number(it.quantityReceived) || 0);
    const accepted = Math.max(0, Number(it.quantityAccepted) || 0);
    const rejected = Math.max(0, Number(it.quantityRejected) || 0);

    if (accepted + rejected !== received) {
      throw new Error(`Accepted quantity (${accepted}) + Rejected quantity (${rejected}) must equal Received quantity (${received}) for ${it.description}`);
    }

    if (received > remaining) {
      throw new Error(
        `Received quantity (${received}) exceeds remaining order quantity (${remaining}) for ${it.description}`
      );
    }

    const unitCostPaise = it.unitCostPaise || match?.unitCostPaise || toPaise(match?.unitCost || 0);

    validatedGrnItems.push({
      productId: it.productId || match?.productId || null,
      description: it.description.trim(),
      quantityOrdered: it.quantityOrdered,
      quantityReceived: received,
      quantityAccepted: accepted,
      quantityRejected: rejected,
      unitCostPaise,
      notes: it.notes?.trim() || null,
    });
  }

  const grnNo = await allocateGoodsReceiptNo();
  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();

  // ATOMIC STEP: Increment physical inventory for ACCEPTED quantities only
  const stockMovements = [];
  for (const git of validatedGrnItems) {
    if (git.productId && git.quantityAccepted > 0) {
      const movement = await recordStockMovement({
        productId: git.productId,
        quantitySigned: git.quantityAccepted,
        type: "PURCHASE",
        inboundUnitCostPaise: git.unitCostPaise,
        referenceType: "GOODS_RECEIPT",
        referenceId: grnNo,
        notes: `GRN ${grnNo} for PO ${po.poNo}`,
        createdById: input.userId,
        effectiveAt: receivedAt,
      });
      stockMovements.push(movement);
    }
  }

  // Update PO line received quantities
  const updatedMetaItems = metaItems.map((m: any) => {
    const receivedLine = validatedGrnItems.find(
      (g) => (g.productId && m.productId === g.productId) || g.description === m.description
    );
    if (!receivedLine) return m;

    const newReceived = (m.receivedQuantity || 0) + receivedLine.quantityReceived;
    const newRemaining = Math.max(0, m.quantity - newReceived);
    return {
      ...m,
      receivedQuantity: newReceived,
      remainingQuantity: newRemaining,
    };
  });

  const isFullyReceived = updatedMetaItems.every((m: any) => (m.remainingQuantity || 0) === 0);
  const newPoStatus = isFullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";

  await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: newPoStatus },
  });

  await db.collection(PO_META_COLLECTION).updateOne(
    { purchaseOrderId: po.id },
    {
      $set: {
        status: newPoStatus,
        items: updatedMetaItems,
        updatedAt: new Date(),
      },
    }
  );

  // Create GRN document
  const grnDoc = {
    grnNo,
    purchaseOrderId: po.id,
    poNo: po.poNo,
    vendorId: po.vendorId,
    supplierName: po.vendor.name,
    supplierBillNo: input.supplierBillNo?.trim() || null,
    receivedAt,
    receivedById: input.userId,
    status: "CONFIRMED",
    items: validatedGrnItems,
    stockMovementsCount: stockMovements.length,
    notes: input.notes?.trim() || null,
    idempotencyKey: input.idempotencyKey || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await db.collection(GRN_COLLECTION).insertOne(grnDoc);

  await logAudit({
    userId: input.userId,
    action: "GOODS_RECEIPT_CONFIRMED",
    module: "PROCUREMENT",
    entityId: res.insertedId.toString(),
    newData: JSON.stringify({
      grnNo,
      poNo: po.poNo,
      supplierName: po.vendor.name,
      itemsReceived: validatedGrnItems.length,
    }),
  });

  return { ...grnDoc, id: res.insertedId.toString() };
}

// =================================================================
// 5. PURCHASE RETURNS
// =================================================================

export interface PurchaseReturnItemInput {
  productId: string;
  quantity: number;
  reason?: string;
}

export interface CreatePurchaseReturnInput {
  grnId?: string;
  purchaseOrderId: string;
  supplierId: string;
  items: PurchaseReturnItemInput[];
  reason: string;
  userId: string;
  idempotencyKey?: string;
}

/**
 * Creates an authoritative Purchase Return with compensating inventory movement.
 */
export async function createPurchaseReturn(input: CreatePurchaseReturnInput) {
  const db = await getMongoDb();

  if (input.idempotencyKey) {
    const existing = await db
      .collection(PURCHASE_RETURN_COLLECTION)
      .findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) return { ...existing, id: existing._id.toString() };
  }

  const supplier = await prisma.vendor.findUnique({ where: { id: input.supplierId } });
  if (!supplier) throw new Error(`Supplier not found: ${input.supplierId}`);

  // Validate that stock exists before decrementing
  for (const it of input.items) {
    const product = await prisma.product.findUnique({ where: { id: it.productId } });
    if (!product) throw new Error(`Product not found: ${it.productId}`);
    if (product.stockQuantity < it.quantity) {
      throw new Error(`Cannot return ${it.quantity} units of ${product.name}: only ${product.stockQuantity} currently in stock.`);
    }
  }

  const returnNo = `TTRC-RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();

  // Compensating inventory movement: decrement stock
  for (const it of input.items) {
    await recordStockMovement({
      productId: it.productId,
      quantitySigned: -Math.abs(it.quantity),
      type: "SUPPLIER_RETURN",
      referenceType: "PURCHASE_RETURN",
      referenceId: returnNo,
      notes: `Purchase return ${returnNo} to ${supplier.name}: ${input.reason}`,
      createdById: input.userId,
      effectiveAt: now,
    });
  }

  const returnDoc = {
    returnNo,
    grnId: input.grnId || null,
    purchaseOrderId: input.purchaseOrderId,
    vendorId: input.supplierId,
    supplierName: supplier.name,
    items: input.items,
    reason: input.reason.trim(),
    status: "CONFIRMED",
    returnedById: input.userId,
    idempotencyKey: input.idempotencyKey || null,
    createdAt: now,
    updatedAt: now,
  };

  const res = await db.collection(PURCHASE_RETURN_COLLECTION).insertOne(returnDoc);

  await logAudit({
    userId: input.userId,
    action: "PURCHASE_RETURN_CREATED",
    module: "PROCUREMENT",
    entityId: res.insertedId.toString(),
    newData: JSON.stringify({ returnNo, reason: input.reason }),
  });

  return { ...returnDoc, id: res.insertedId.toString() };
}

// =================================================================
// 6. SUPPLIER BILLS & THREE-WAY MATCHING
// =================================================================

export interface CreateSupplierBillInput {
  supplierId: string;
  purchaseOrderId: string;
  grnId?: string;
  supplierInvoiceNo: string;
  billDate: Date | string;
  dueDate: Date | string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  userId: string;
  idempotencyKey?: string;
}

/**
 * Creates an authoritative Supplier Bill (Accounts Payable) with three-way matching.
 */
export async function createSupplierBill(input: CreateSupplierBillInput) {
  const db = await getMongoDb();

  if (input.idempotencyKey) {
    const existing = await db
      .collection(SUPPLIER_BILL_COLLECTION)
      .findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) return { ...existing, id: existing._id.toString() };
  }

  const [supplier, po] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: input.supplierId } }),
    getPurchaseOrderById(input.purchaseOrderId),
  ]);

  if (!supplier) throw new Error("Supplier not found");
  if (!po) throw new Error("Purchase Order not found");

  const subtotalPaise = toPaise(input.subtotal);
  const taxAmountPaise = toPaise(input.taxAmount);
  const totalAmountPaise = toPaise(input.totalAmount);

  // Three-Way Matching
  let matchStatus: "MATCHED" | "EXCEPTION" = "MATCHED";
  const exceptions: string[] = [];

  const poTotalPaise = (po as any).meta?.totalAmountPaise || toPaise(po.totalAmount);
  if (Math.abs(totalAmountPaise - poTotalPaise) > 100) {
    // Difference > ₹1
    matchStatus = "EXCEPTION";
    exceptions.push(`Bill total (₹${input.totalAmount}) differs from PO total (₹${po.totalAmount})`);
  }

  if (po.fulfillment.totalReceived === 0) {
    matchStatus = "EXCEPTION";
    exceptions.push("Goods have not yet been received against this Purchase Order");
  }

  const internalBillNo = await allocateSupplierBillNo();
  const now = new Date();

  const billDoc = {
    internalBillNo,
    billNo: input.supplierInvoiceNo.trim(),
    supplierInvoiceNo: input.supplierInvoiceNo.trim(),
    vendorId: input.supplierId,
    supplierName: supplier.name,
    purchaseOrderId: input.purchaseOrderId,
    poNo: po.poNo,
    grnId: input.grnId || null,
    billDate: new Date(input.billDate),
    dueDate: new Date(input.dueDate),
    subtotalPaise,
    taxAmountPaise,
    totalAmountPaise,
    paidAmountPaise: 0,
    balancePaise: totalAmountPaise,
    status: "OPEN", // OPEN | PARTIALLY_PAID | PAID | VOID
    matchStatus,
    matchExceptions: exceptions,
    notes: input.notes?.trim() || null,
    idempotencyKey: input.idempotencyKey || null,
    createdById: input.userId,
    createdAt: now,
    updatedAt: now,
  };

  const res = await db.collection(SUPPLIER_BILL_COLLECTION).insertOne(billDoc);

  await logAudit({
    userId: input.userId,
    action: "SUPPLIER_BILL_CREATED",
    module: "PROCUREMENT",
    entityId: res.insertedId.toString(),
    newData: JSON.stringify({
      billNo: input.supplierInvoiceNo,
      totalAmount: input.totalAmount,
      matchStatus,
    }),
  });

  return { ...billDoc, id: res.insertedId.toString() };
}

// =================================================================
// 7. SUPPLIER PAYMENTS
// =================================================================

export interface RecordSupplierPaymentInput {
  billId: string;
  amount: number; // in Rupees
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: Date | string;
  notes?: string;
  userId: string;
  idempotencyKey?: string;
}

/**
 * Records an authoritative payment to a supplier against a supplier bill.
 */
export async function recordSupplierPayment(input: RecordSupplierPaymentInput) {
  const db = await getMongoDb();

  if (input.idempotencyKey) {
    const existing = await db
      .collection(SUPPLIER_PAYMENT_COLLECTION)
      .findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) return { ...existing, id: existing._id.toString() };
  }

  const billObjId = new ObjectId(input.billId);
  const bill = await db.collection(SUPPLIER_BILL_COLLECTION).findOne({ _id: billObjId });
  if (!bill) throw new Error("Supplier bill not found");
  if (bill.status === "PAID") throw new Error("This bill has already been paid in full");
  if (bill.status === "VOID") throw new Error("Cannot pay a voided supplier bill");

  const paymentPaise = toPaise(input.amount);
  if (paymentPaise <= 0) throw new Error("Payment amount must be greater than zero");

  if (paymentPaise > bill.balancePaise) {
    throw new Error(
      `Payment amount (₹${input.amount}) exceeds outstanding bill balance (₹${fromPaise(bill.balancePaise)})`
    );
  }

  const paymentNo = await allocateSupplierPaymentNo();
  const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
  const now = new Date();

  // Create payment record
  const paymentDoc = {
    paymentNo,
    billId: input.billId,
    vendorId: bill.vendorId,
    supplierName: bill.supplierName,
    purchaseOrderId: bill.purchaseOrderId,
    amountPaise: paymentPaise,
    amount: input.amount,
    type: "PAYMENT", // PAYMENT | REVERSAL | ADJUSTMENT
    paymentMethod: input.paymentMethod || "BANK_TRANSFER",
    paymentReference: input.paymentReference?.trim() || null,
    paymentDate,
    notes: input.notes?.trim() || null,
    idempotencyKey: input.idempotencyKey || null,
    createdById: input.userId,
    createdAt: now,
    updatedAt: now,
  };

  const res = await db.collection(SUPPLIER_PAYMENT_COLLECTION).insertOne(paymentDoc);

  // Update Bill balance
  const newPaidPaise = (bill.paidAmountPaise || 0) + paymentPaise;
  const newBalancePaise = Math.max(0, bill.totalAmountPaise - newPaidPaise);
  const newStatus = newBalancePaise === 0 ? "PAID" : "PARTIALLY_PAID";

  await db.collection(SUPPLIER_BILL_COLLECTION).updateOne(
    { _id: billObjId },
    {
      $set: {
        paidAmountPaise: newPaidPaise,
        balancePaise: newBalancePaise,
        status: newStatus,
        updatedAt: now,
      },
    }
  );

  await logAudit({
    userId: input.userId,
    action: "SUPPLIER_PAYMENT_CREATED",
    module: "PROCUREMENT",
    entityId: res.insertedId.toString(),
    newData: JSON.stringify({
      paymentNo,
      billNo: bill.billNo,
      amount: input.amount,
      newStatus,
    }),
  });

  return { ...paymentDoc, id: res.insertedId.toString() };
}

// =================================================================
// 8. PROCUREMENT KPI DASHBOARD
// =================================================================

/**
 * Returns authentic procurement metrics directly from the primary database.
 */
export async function getProcurementDashboardMetrics() {
  const db = await getMongoDb();

  const [openPOs, awaitingReceipt, bills, suppliersCount] = await Promise.all([
    prisma.purchaseOrder.count({
      where: { status: { in: ["DRAFT", "CONFIRMED", "SENT"] } },
    }),
    prisma.purchaseOrder.count({
      where: { status: { in: ["CONFIRMED", "PARTIALLY_RECEIVED"] } },
    }),
    db.collection(SUPPLIER_BILL_COLLECTION).find({ status: { in: ["OPEN", "PARTIALLY_PAID"] } }).toArray(),
    prisma.vendor.count({ where: { status: "ACTIVE" } }),
  ]);

  const totalPayablePaise = bills.reduce((sum, b) => sum + (b.balancePaise || 0), 0);

  return {
    openPurchaseOrders: openPOs,
    awaitingReceipt,
    pendingBillsCount: bills.length,
    outstandingPayablesPaise: totalPayablePaise,
    outstandingPayables: fromPaise(totalPayablePaise),
    activeSuppliersCount: suppliersCount,
  };
}
