import { ObjectId } from "mongodb";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/mongodb";
import {
  allocateSalesOrderNoTx,
  allocateSalesOrderNo,
  generateDraftSalesOrderNo,
  allocateProjectNoTx,
} from "@/lib/sequence";
import { toMinorQuantity } from "@/lib/money";

export type OrderType = "PRODUCT" | "ENGINEERING" | "MIXED";
export type OrderStatus = "PENDING" | "IN_PROGRESS" | "FULFILLED" | "CANCELLED";
export type FulfillmentStatus = "NOT_REQUIRED" | "PENDING" | "PARTIAL" | "FULFILLED";

export interface SalesOrderItemInput {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number; // In rupees / display units as per schema Float
  totalAmount?: number;
}

export interface CreateSalesOrderInput {
  clientId: string;
  quotationId?: string | null;
  orderType?: OrderType;
  status?: OrderStatus;
  items: SalesOrderItemInput[];
  notes?: string | null;
  deliveryDate?: string | Date | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  userId?: string;
  idempotencyKey?: string;
}

export interface FulfillOrderItemInput {
  itemId: string;
  quantityFulfilled: number;
}

const SALES_ORDER_META_COLLECTION = "SalesOrderMeta";

/**
 * Creates a brand new Sales Order.
 * Allocates authoritative TTRC-SO-YYYY-XXXX order number atomically.
 */
export async function createSalesOrder(input: CreateSalesOrderInput) {
  const {
    clientId,
    quotationId,
    orderType = "PRODUCT",
    status = "PENDING",
    items,
    notes,
    deliveryDate,
    paymentTerms,
    deliveryTerms,
    userId,
    idempotencyKey,
  } = input;

  if (!clientId) {
    throw new Error("Customer (clientId) is required to create a Sales Order.");
  }

  if (!items || items.length === 0) {
    throw new Error("A Sales Order must contain at least one line item.");
  }

  // Verify client existence
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });
  if (!client) {
    throw new Error(`Customer record not found for id ${clientId}.`);
  }

  // Check idempotency if key provided
  if (idempotencyKey) {
    const db = await getMongoDb();
    const existingMeta = await db
      .collection(SALES_ORDER_META_COLLECTION)
      .findOne({ idempotencyKey });
    if (existingMeta) {
      const existing = await getSalesOrderById(existingMeta.salesOrderId);
      if (existing) return existing;
    }
  }

  // Calculate totals
  let subtotal = 0;
  const processedItems = items.map((item) => {
    if (!item.description || item.description.trim().length === 0) {
      throw new Error("Line item description is required.");
    }
    if (item.quantity <= 0) {
      throw new Error(`Quantity for '${item.description}' must be greater than zero.`);
    }
    if (item.unitPrice < 0) {
      throw new Error(`Unit price for '${item.description}' cannot be negative.`);
    }
    const lineTotal = item.totalAmount ?? Number((item.quantity * item.unitPrice).toFixed(2));
    subtotal += lineTotal;
    return {
      productId: item.productId || null,
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalAmount: lineTotal,
    };
  });

  const taxAmount = 0; // Tax calculated authoritatively upon invoice generation
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  // Determine initial fulfillment status
  const fulfillmentStatus: FulfillmentStatus =
    orderType === "PRODUCT" || orderType === "MIXED" ? "PENDING" : "NOT_REQUIRED";

  // Resolve creator user
  const effectiveUserId =
    userId ||
    (await prisma.user.findFirst({ select: { id: true } }))?.id ||
    "000000000000000000000000";

  // Concurrency-safe atomic transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    const orderNo = await allocateSalesOrderNoTx(tx);

    const order = await tx.salesOrder.create({
      data: {
        orderNo,
        clientId,
        quotationId: quotationId || null,
        orderType: orderType as any,
        status: status as any,
        fulfillmentStatus: fulfillmentStatus as any,
        subtotal,
        taxAmount,
        totalAmount,
        notes: notes || null,
        createdById: effectiveUserId,
        items: {
          create: processedItems.map((pi) => ({
            productId: pi.productId,
            description: pi.description,
            quantity: pi.quantity,
            unitPrice: pi.unitPrice,
            totalAmount: pi.totalAmount,
          })),
        },
      },
      include: {
        client: true,
        quotation: true,
        items: true,
      },
    });

    return order;
  });

  // Store metadata (delivery dates, terms, idempotency) in MongoDB
  const db = await getMongoDb();
  await db.collection(SALES_ORDER_META_COLLECTION).insertOne({
    salesOrderId: createdOrder.id,
    orderNo: createdOrder.orderNo,
    deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
    paymentTerms: paymentTerms || null,
    deliveryTerms: deliveryTerms || null,
    idempotencyKey: idempotencyKey || null,
    reservedQuantityMap: {}, // productId -> quantity
    fulfilledQuantityMap: {}, // itemId -> quantity
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Audit Log
  if (effectiveUserId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: "SALES_ORDER_CREATED",
          module: "SALES_ORDER",
          entityId: createdOrder.id,
          newData: JSON.stringify({
            orderNo: createdOrder.orderNo,
            clientId: createdOrder.clientId,
            totalAmount: createdOrder.totalAmount,
            status: createdOrder.status,
            orderType: createdOrder.orderType,
          }),
        },
      });
    } catch (e) {
      console.error("[SalesOrder] Audit log error:", e);
    }
  }

  return getSalesOrderById(createdOrder.id);
}

/**
 * Converts an eligible Quotation into a Sales Order.
 * Captures historical commercial snapshot and prevents duplicate conversion.
 */
export async function createSalesOrderFromQuotation(
  quotationId: string,
  options?: {
    orderType?: OrderType;
    deliveryDate?: string | Date;
    paymentTerms?: string;
    deliveryTerms?: string;
    notes?: string;
    userId?: string;
  }
) {
  if (!quotationId) {
    throw new Error("quotationId is required for conversion.");
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      client: true,
      items: true,
      orders: true,
    },
  });

  if (!quotation) {
    throw new Error(`Quotation not found: ${quotationId}`);
  }

  if (quotation.status === "CANCELLED" || quotation.status === "REJECTED") {
    throw new Error(
      `Cannot convert quotation ${quotation.quotationNo} because its status is ${quotation.status}.`
    );
  }

  // Prevent duplicate conversion: Check if an active SalesOrder already references this quotation
  const existingOrder = await prisma.salesOrder.findFirst({
    where: {
      quotationId: quotation.id,
      status: { not: "CANCELLED" },
    },
    include: {
      client: true,
      items: true,
    },
  });

  if (existingOrder) {
    throw new Error(
      `This quotation has already been converted to Sales Order ${existingOrder.orderNo}.`
    );
  }

  if (!quotation.items || quotation.items.length === 0) {
    throw new Error(`Quotation ${quotation.quotationNo} has no items to order.`);
  }

  // Convert Quotation items (paise) to Sales Order items (rupees)
  const items: SalesOrderItemInput[] = quotation.items.map((item) => ({
    productId: item.productId,
    description: item.description || item.name || "Quoted Item",
    quantity: item.qty,
    unitPrice: item.unitPrice / 100, // QuotationItem stores in paise
    totalAmount: item.amount / 100,
  }));

  // Infer order type if not specified: if any item is SERVICE or custom, can be ENGINEERING or MIXED
  let orderType = options?.orderType;
  if (!orderType) {
    const hasService = quotation.items.some((i) => i.itemType === "SERVICE");
    const hasPhysical = quotation.items.some((i) => i.itemType === "PHYSICAL_PRODUCT");
    if (hasService && hasPhysical) orderType = "MIXED";
    else if (hasService) orderType = "ENGINEERING";
    else orderType = "PRODUCT";
  }

  const createdOrder = await createSalesOrder({
    clientId: quotation.clientId,
    quotationId: quotation.id,
    orderType,
    status: "PENDING",
    items,
    notes: options?.notes || quotation.notes,
    deliveryDate: options?.deliveryDate,
    paymentTerms: options?.paymentTerms || quotation.terms,
    deliveryTerms: options?.deliveryTerms,
    userId: options?.userId,
  });

  // Mark quotation as ACCEPTED without overwriting historical values
  await prisma.quotation.update({
    where: { id: quotation.id },
    data: {
      status: "ACCEPTED",
    },
  });

  return createdOrder;
}

/**
 * Confirms a Sales Order.
 * Transitions from PENDING -> CONFIRMED.
 */
export async function confirmSalesOrder(orderId: string, userId?: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error(`Sales Order not found: ${orderId}`);
  }

  if (order.status === "CANCELLED") {
    throw new Error(`Cannot confirm a cancelled Sales Order (${order.orderNo}).`);
  }

  if (order.status === "FULFILLED") {
    throw new Error(`Sales Order (${order.orderNo}) is already fulfilled.`);
  }

  if (order.status === "IN_PROGRESS" || (order as any).status === "CONFIRMED") {
    return getSalesOrderById(orderId); // Idempotent
  }

  const now = new Date();
  const updated = await prisma.salesOrder.update({
    where: { id: orderId },
    data: {
      status: "IN_PROGRESS", // In existing OrderStatus enum: PENDING, IN_PROGRESS, FULFILLED, CANCELLED
      fulfillmentStatus:
        order.fulfillmentStatus === "NOT_REQUIRED" ? "NOT_REQUIRED" : "PENDING",
    },
  });

  const db = await getMongoDb();
  await db.collection(SALES_ORDER_META_COLLECTION).updateOne(
    { salesOrderId: orderId },
    {
      $set: {
        confirmedAt: now,
        confirmedById: userId || null,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "SALES_ORDER_CONFIRMED",
          module: "SALES_ORDER",
          entityId: orderId,
          newData: JSON.stringify({
            orderNo: order.orderNo,
            status: "IN_PROGRESS",
            confirmedAt: now,
          }),
        },
      });
    } catch (e) {
      console.error("[SalesOrder] Audit log error:", e);
    }
  }

  return getSalesOrderById(orderId);
}

/**
 * Cancels a Sales Order safely.
 * Checks for downstream active invoices or physical dispatches before cancelling.
 */
export async function cancelSalesOrder(orderId: string, reason: string, userId?: string) {
  if (!reason || reason.trim().length === 0) {
    throw new Error("A cancellation reason is required.");
  }

  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      invoices: true,
      projects: true,
    },
  });

  if (!order) {
    throw new Error(`Sales Order not found: ${orderId}`);
  }

  if (order.status === "CANCELLED") {
    return getSalesOrderById(orderId); // Idempotent
  }

  // Safety check: Active issued invoices
  const activeInvoices = order.invoices.filter((inv) => inv.status !== "CANCELLED");
  if (activeInvoices.length > 0) {
    throw new Error(
      `Cannot cancel Sales Order ${order.orderNo}: It has ${activeInvoices.length} active invoice(s). Void or cancel those invoices first.`
    );
  }

  // Safety check: Delivery challans
  const db = await getMongoDb();
  const activeChallans = await db
    .collection("DeliveryChallan")
    .find({
      referenceType: "SALES_ORDER",
      referenceId: orderId,
      status: "ISSUED",
    })
    .toArray();

  if (activeChallans.length > 0) {
    throw new Error(
      `Cannot cancel Sales Order ${order.orderNo}: There are ${activeChallans.length} issued delivery challan(s). Cancel them first.`
    );
  }

  // If there were any reservations, release them automatically
  await releaseStockReservationForOrder(orderId, userId);

  const now = new Date();
  await prisma.salesOrder.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      fulfillmentStatus: "NOT_REQUIRED",
    },
  });

  await db.collection(SALES_ORDER_META_COLLECTION).updateOne(
    { salesOrderId: orderId },
    {
      $set: {
        cancelledAt: now,
        cancelReason: reason.trim(),
        cancelledById: userId || null,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "SALES_ORDER_CANCELLED",
          module: "SALES_ORDER",
          entityId: orderId,
          newData: JSON.stringify({
            orderNo: order.orderNo,
            reason: reason.trim(),
            cancelledAt: now,
          }),
        },
      });
    } catch (e) {
      console.error("[SalesOrder] Audit log error:", e);
    }
  }

  return getSalesOrderById(orderId);
}

/**
 * Reserves stock for physical products on a Sales Order.
 * Concurrency-safe: validates available physical stock without mutating physical inventory.
 * Writes immutable StockLedgerEntry with type "RESERVATION".
 */
export async function reserveStockForOrder(orderId: string, userId?: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error(`Sales Order not found: ${orderId}`);
  }

  if (order.status === "CANCELLED" || order.status === "FULFILLED") {
    throw new Error(`Cannot reserve stock for ${order.status} order ${order.orderNo}.`);
  }

  const db = await getMongoDb();
  const meta = await db.collection(SALES_ORDER_META_COLLECTION).findOne({ salesOrderId: orderId });
  const currentReservations: Record<string, number> = meta?.reservedQuantityMap || {};

  // For each physical product item, check current stock
  const reservationEntries: any[] = [];
  const updatedReservationMap = { ...currentReservations };

  for (const item of order.items) {
    if (!item.productId) continue;

    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product) continue;

    const neededQty = item.quantity;
    const currentlyReserved = currentReservations[item.productId] || 0;
    const additionalToReserve = Math.max(0, neededQty - currentlyReserved);

    if (additionalToReserve <= 0) continue;

    // Check available stock
    const currentStock = product.stockQuantity;
    if (currentStock < additionalToReserve) {
      throw new Error(
        `Insufficient stock for ${product.name}: required ${additionalToReserve}, available in inventory ${currentStock}.`
      );
    }

    // Ledger record for audit & traceability
    reservationEntries.push({
      productId: item.productId,
      quantitySignedMinor: 0, // Does NOT change physical balance
      quantitySigned: 0,
      type: "RESERVATION",
      referenceType: "SALES_ORDER",
      referenceId: order.id,
      notes: `Reserved ${additionalToReserve} units for Sales Order ${order.orderNo}`,
      createdById: userId || null,
      createdAt: new Date(),
    });

    updatedReservationMap[item.productId] = (updatedReservationMap[item.productId] || 0) + additionalToReserve;
  }

  if (reservationEntries.length > 0) {
    await prisma.stockLedgerEntry.createMany({
      data: reservationEntries,
    });
  }

  await db.collection(SALES_ORDER_META_COLLECTION).updateOne(
    { salesOrderId: orderId },
    {
      $set: {
        reservedQuantityMap: updatedReservationMap,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "SALES_ORDER_STOCK_RESERVED",
          module: "SALES_ORDER",
          entityId: orderId,
          newData: JSON.stringify({
            orderNo: order.orderNo,
            reservedQuantities: updatedReservationMap,
          }),
        },
      });
    } catch (e) {
      console.error("[SalesOrder] Audit log error:", e);
    }
  }

  return getSalesOrderById(orderId);
}

/**
 * Releases stock reservation for a Sales Order.
 * Writes StockLedgerEntry with type "RELEASE".
 */
export async function releaseStockReservationForOrder(orderId: string, userId?: string) {
  const db = await getMongoDb();
  const meta = await db.collection(SALES_ORDER_META_COLLECTION).findOne({ salesOrderId: orderId });
  const currentReservations: Record<string, number> = meta?.reservedQuantityMap || {};

  const releaseEntries: any[] = [];
  for (const [productId, qty] of Object.entries(currentReservations)) {
    if (qty > 0) {
      releaseEntries.push({
        productId,
        quantitySignedMinor: 0,
        quantitySigned: 0,
        type: "RELEASE",
        referenceType: "SALES_ORDER",
        referenceId: orderId,
        notes: `Released reservation of ${qty} units for Sales Order`,
        createdById: userId || null,
        createdAt: new Date(),
      });
    }
  }

  if (releaseEntries.length > 0) {
    await prisma.stockLedgerEntry.createMany({
      data: releaseEntries,
    });
  }

  await db.collection(SALES_ORDER_META_COLLECTION).updateOne(
    { salesOrderId: orderId },
    {
      $set: {
        reservedQuantityMap: {},
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return getSalesOrderById(orderId);
}

/**
 * Records fulfillment for Sales Order line items.
 * Updates fulfillment status to PARTIAL or FULFILLED.
 */
export async function fulfillOrder(
  orderId: string,
  fulfillmentItems?: FulfillOrderItemInput[],
  userId?: string
) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error(`Sales Order not found: ${orderId}`);
  }

  if (order.status === "CANCELLED") {
    throw new Error(`Cannot fulfill a cancelled order (${order.orderNo}).`);
  }

  const db = await getMongoDb();
  const meta = await db.collection(SALES_ORDER_META_COLLECTION).findOne({ salesOrderId: orderId });
  const fulfilledMap: Record<string, number> = meta?.fulfilledQuantityMap || {};

  // If no specific items provided, fulfill remaining on all items
  const itemsToFulfill =
    fulfillmentItems && fulfillmentItems.length > 0
      ? fulfillmentItems
      : order.items.map((i) => ({
          itemId: i.id,
          quantityFulfilled: Math.max(0, i.quantity - (fulfilledMap[i.id] || 0)),
        }));

  let anyFulfillChange = false;
  for (const fItem of itemsToFulfill) {
    const item = order.items.find((i) => i.id === fItem.itemId);
    if (!item) continue;

    const currentFulfilled = fulfilledMap[fItem.itemId] || 0;
    const addQty = Math.max(0, fItem.quantityFulfilled);
    const newTotal = currentFulfilled + addQty;

    if (newTotal > item.quantity) {
      throw new Error(
        `Cannot fulfill ${newTotal} units for item '${item.description}'. Ordered quantity is ${item.quantity}.`
      );
    }

    if (addQty > 0) {
      fulfilledMap[fItem.itemId] = newTotal;
      anyFulfillChange = true;
    }
  }

  // Calculate overall completion
  let allCompleted = true;
  let anyCompleted = false;

  for (const item of order.items) {
    const fQty = fulfilledMap[item.id] || 0;
    if (fQty > 0) anyCompleted = true;
    if (fQty < item.quantity) allCompleted = false;
  }

  const newFulfillmentStatus: FulfillmentStatus = allCompleted
    ? "FULFILLED"
    : anyCompleted
    ? "PARTIAL"
    : "PENDING";

  const newOrderStatus: OrderStatus = allCompleted ? "FULFILLED" : "IN_PROGRESS";

  await prisma.salesOrder.update({
    where: { id: orderId },
    data: {
      status: newOrderStatus as any,
      fulfillmentStatus: newFulfillmentStatus as any,
    },
  });

  await db.collection(SALES_ORDER_META_COLLECTION).updateOne(
    { salesOrderId: orderId },
    {
      $set: {
        fulfilledQuantityMap: fulfilledMap,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  if (userId && anyFulfillChange) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: allCompleted
            ? "SALES_ORDER_FULFILLED"
            : "SALES_ORDER_PARTIALLY_FULFILLED",
          module: "SALES_ORDER",
          entityId: orderId,
          newData: JSON.stringify({
            orderNo: order.orderNo,
            fulfillmentStatus: newFulfillmentStatus,
            orderStatus: newOrderStatus,
            fulfilledMap,
          }),
        },
      });
    } catch (e) {
      console.error("[SalesOrder] Audit log error:", e);
    }
  }

  return getSalesOrderById(orderId);
}

/**
 * Creates an Engineering Project directly from a Sales Order.
 * Links order to project, establishes execution workflow, and initializes initial tasks.
 */
export async function createProjectFromOrder(
  orderId: string,
  projectInput: {
    name?: string;
    description?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    budget?: number;
    managerId?: string;
    projectTemplate?: "CUSTOM_ROBOTICS" | "PCB_ENGINEERING" | "AUTOMATION" | "BLANK";
    initialTasks?: Array<{ title: string; description?: string; priority?: string }>;
  },
  userId?: string
) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: { client: true, items: true },
  });

  if (!order) {
    throw new Error(`Sales Order not found: ${orderId}`);
  }

  if (order.status === "CANCELLED") {
    throw new Error(`Cannot create a project from a cancelled order (${order.orderNo}).`);
  }

  const effectiveUserId =
    userId ||
    (await prisma.user.findFirst({ select: { id: true } }))?.id ||
    "000000000000000000000000";

  const projectName =
    projectInput.name ||
    `${order.client.name} — ${order.items[0]?.description || "Engineering Execution"}`;

  // Concurrency-safe atomic project creation
  const createdProject = await prisma.$transaction(async (tx) => {
    const projectCode = await allocateProjectNoTx(tx);

    const project = await tx.project.create({
      data: {
        projectCode,
        name: projectName,
        clientId: order.clientId,
        orderId: order.id,
        status: "ACTIVE",
        startDate: projectInput.startDate ? new Date(projectInput.startDate) : new Date(),
        endDate: projectInput.endDate ? new Date(projectInput.endDate) : null,
        budget: projectInput.budget ?? order.totalAmount,
        createdById: effectiveUserId,
        managerId: projectInput.managerId || null,
      },
    });

    // If order was PENDING, transition to IN_PROGRESS
    if (order.status === "PENDING") {
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: "IN_PROGRESS" },
      });
    }

    return project;
  });

  // Create initial tasks if requested
  const templateTasks: Array<{ title: string; description: string; priority: string }> = [];

  if (projectInput.projectTemplate === "CUSTOM_ROBOTICS") {
    templateTasks.push(
      { title: "Requirement & Spec Freeze", description: "Review customer technical requirements and payload specifications", priority: "HIGH" },
      { title: "Mechanical Design & 3D CAD", description: "Design chassis, actuators, and sensor brackets in CAD", priority: "HIGH" },
      { title: "Electronics & Motor Driver Architecture", description: "Select microcontroller, motor drivers, and battery management system", priority: "MEDIUM" },
      { title: "Embedded Firmware Development", description: "Develop motor control loops, telemetry, and sensor integration", priority: "HIGH" },
      { title: "Assembly & Mechanical Integration", description: "Assemble kit components, wire harness, and mount sensors", priority: "HIGH" },
      { title: "Testing & Validation Run", description: "Full obstacle navigation, battery life, and stress testing", priority: "HIGH" },
      { title: "Customer Demo & Handover", description: "Customer demonstration and sign-off", priority: "MEDIUM" }
    );
  } else if (projectInput.projectTemplate === "PCB_ENGINEERING") {
    templateTasks.push(
      { title: "Schematic Capture", description: "Create component schematics and netlists", priority: "HIGH" },
      { title: "PCB Layout & Routing", description: "Multi-layer board routing and impedance calculations", priority: "HIGH" },
      { title: "Gerber & BOM Generation", description: "Export manufacturing Gerbers, drill files, and BOM", priority: "HIGH" },
      { title: "Fabrication & Stencil Sourcing", description: "Order PCB panels from fabrication house", priority: "MEDIUM" },
      { title: "SMD Assembly & Soldering", description: "Pick-and-place assembly, reflow, and inspection", priority: "HIGH" },
      { title: "Board Bring-up & Testing", description: "Power-up rail verification and signal testing", priority: "HIGH" }
    );
  } else if (projectInput.initialTasks && projectInput.initialTasks.length > 0) {
    projectInput.initialTasks.forEach((t) => {
      templateTasks.push({
        title: t.title,
        description: t.description || "",
        priority: t.priority || "MEDIUM",
      });
    });
  }

  if (templateTasks.length > 0) {
    await prisma.task.createMany({
      data: templateTasks.map((t) => ({
        projectId: createdProject.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: "TODO",
        createdById: effectiveUserId,
      })),
    });
  }

  // Audit Log
  if (effectiveUserId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: "PROJECT_CREATED",
          module: "PROJECT",
          entityId: createdProject.id,
          newData: JSON.stringify({
            projectCode: createdProject.projectCode,
            name: createdProject.name,
            salesOrderId: order.id,
            salesOrderNo: order.orderNo,
          }),
        },
      });
    } catch (e) {
      console.error("[Project] Audit log error:", e);
    }
  }

  return createdProject;
}

/**
 * Retrieves a Sales Order by ID with complete commercial, fulfillment, and execution details.
 */
export async function getSalesOrderById(orderId: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      client: true,
      quotation: true,
      items: {
        include: {
          product: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
      },
      projects: {
        include: {
          tasks: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) return null;

  // Retrieve metadata from MongoDB
  const db = await getMongoDb();
  const meta = await db.collection(SALES_ORDER_META_COLLECTION).findOne({ salesOrderId: orderId });
  const reservedMap: Record<string, number> = meta?.reservedQuantityMap || {};
  const fulfilledMap: Record<string, number> = meta?.fulfilledQuantityMap || {};

  // Retrieve linked Delivery Challans
  const challans = await db
    .collection("DeliveryChallan")
    .find({
      $or: [
        { referenceType: "SALES_ORDER", referenceId: orderId },
        { referenceNo: order.orderNo },
      ],
    })
    .sort({ createdAt: -1 })
    .toArray();

  // Compute item fulfillment metrics
  let totalOrderedQty = 0;
  let totalFulfilledQty = 0;
  let totalReservedQty = 0;

  const itemsWithMetrics = order.items.map((item) => {
    const fulfilled = fulfilledMap[item.id] || 0;
    const reserved = item.productId ? reservedMap[item.productId] || 0 : 0;
    const remaining = Math.max(0, item.quantity - fulfilled);

    totalOrderedQty += item.quantity;
    totalFulfilledQty += fulfilled;
    totalReservedQty += reserved;

    return {
      ...item,
      fulfilledQuantity: fulfilled,
      reservedQuantity: reserved,
      remainingQuantity: remaining,
      isFullyFulfilled: fulfilled >= item.quantity,
    };
  });

  const fulfillmentProgress =
    totalOrderedQty > 0
      ? Math.min(100, Math.round((totalFulfilledQty / totalOrderedQty) * 100))
      : 100;

  return {
    ...order,
    items: itemsWithMetrics,
    deliveryDate: meta?.deliveryDate || null,
    paymentTerms: meta?.paymentTerms || null,
    deliveryTerms: meta?.deliveryTerms || null,
    confirmedAt: meta?.confirmedAt || null,
    cancelledAt: meta?.cancelledAt || null,
    cancelReason: meta?.cancelReason || null,
    challans: challans.map((c) => ({
      id: c._id.toString(),
      challanNumber: c.challanNumber,
      date: c.date,
      purpose: c.purpose,
      status: c.status,
    })),
    metrics: {
      totalOrderedQty,
      totalFulfilledQty,
      totalReservedQty,
      remainingQty: Math.max(0, totalOrderedQty - totalFulfilledQty),
      fulfillmentProgress,
    },
  };
}

/**
 * Lists Sales Orders with filtering, search, and pagination.
 */
export async function listSalesOrders(params?: {
  clientId?: string;
  quotationId?: string;
  status?: OrderStatus;
  orderType?: OrderType;
  search?: string;
  limit?: number;
}) {
  const { clientId, quotationId, status, orderType, search, limit = 50 } = params || {};

  const where: any = {};
  if (clientId) where.clientId = clientId;
  if (quotationId) where.quotationId = quotationId;
  if (status) where.status = status;
  if (orderType) where.orderType = orderType;

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { orderNo: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const orders = await prisma.salesOrder.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, clientCode: true } },
      quotation: { select: { id: true, quotationNo: true } },
      items: true,
      invoices: { select: { id: true, invoiceNo: true, status: true, total: true } },
      projects: { select: { id: true, projectCode: true, name: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Enrich with MongoDB fulfillment metadata
  const db = await getMongoDb();
  const metas = await db
    .collection(SALES_ORDER_META_COLLECTION)
    .find({ salesOrderId: { in: orders.map((o) => o.id) } })
    .toArray();

  const metaMap = new Map(metas.map((m) => [m.salesOrderId, m]));

  return orders.map((o) => {
    const meta = metaMap.get(o.id);
    const fulfilledMap = meta?.fulfilledQuantityMap || {};
    let totalOrdered = 0;
    let totalFulfilled = 0;

    for (const item of o.items) {
      totalOrdered += item.quantity;
      totalFulfilled += fulfilledMap[item.id] || 0;
    }

    const progress =
      totalOrdered > 0 ? Math.min(100, Math.round((totalFulfilled / totalOrdered) * 100)) : 100;

    return {
      ...o,
      deliveryDate: meta?.deliveryDate || null,
      confirmedAt: meta?.confirmedAt || null,
      progress,
    };
  });
}

/**
 * Assembles the authoritative complete business timeline for an order:
 * Lead -> Quotation -> Sales Order -> Project -> Production -> Challan -> Invoice -> Payment
 */
export async function getOrderTraceabilityTimeline(orderId: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      client: true,
      quotation: true,
      invoices: {
        include: {
          payments: true,
        },
      },
      projects: {
        include: {
          tasks: true,
        },
      },
    },
  });

  if (!order) return [];

  const timeline: Array<{
    step: string;
    title: string;
    description: string;
    date: Date;
    status: string;
    referenceNo?: string;
    href?: string;
  }> = [];

  // 1. Quotation
  if (order.quotation) {
    timeline.push({
      step: "QUOTATION",
      title: `Quotation ${order.quotation.quotationNo}`,
      description: `Quotation agreed for ₹${(order.quotation.total / 100).toLocaleString("en-IN")}`,
      date: order.quotation.createdAt,
      status: order.quotation.status,
      referenceNo: order.quotation.quotationNo,
      href: `/quotations/${order.quotation.id}`,
    });
  }

  // 2. Sales Order
  timeline.push({
    step: "SALES_ORDER",
    title: `Sales Order ${order.orderNo}`,
    description: `Confirmed commercial commitment for ₹${order.totalAmount.toLocaleString("en-IN")}`,
    date: order.createdAt,
    status: order.status,
    referenceNo: order.orderNo,
    href: `/orders/${order.id}`,
  });

  // 3. Projects
  for (const prj of order.projects) {
    timeline.push({
      step: "PROJECT",
      title: `Engineering Project ${prj.projectCode || prj.name}`,
      description: `${prj.name} • ${prj.tasks.length} tasks scheduled`,
      date: prj.createdAt,
      status: prj.status,
      referenceNo: prj.projectCode || undefined,
      href: `/projects`,
    });
  }

  // 4. Delivery Challans
  const db = await getMongoDb();
  const challans = await db
    .collection("DeliveryChallan")
    .find({
      $or: [
        { referenceType: "SALES_ORDER", referenceId: orderId },
        { referenceNo: order.orderNo },
      ],
    })
    .toArray();

  for (const ch of challans) {
    timeline.push({
      step: "DELIVERY_CHALLAN",
      title: `Delivery Challan ${ch.challanNumber}`,
      description: `Material dispatch for ${ch.purpose}`,
      date: ch.date || ch.createdAt,
      status: ch.status,
      referenceNo: ch.challanNumber,
      href: `/challans/${ch._id.toString()}`,
    });
  }

  // 5. Invoices & Payments
  for (const inv of order.invoices) {
    timeline.push({
      step: "INVOICE",
      title: `Invoice ${inv.invoiceNo}`,
      description: `Tax invoice billed for ₹${(inv.total / 100).toLocaleString("en-IN")}`,
      date: inv.date || inv.createdAt,
      status: inv.status,
      referenceNo: inv.invoiceNo,
      href: `/invoices/${inv.id}`,
    });

    for (const pay of inv.payments) {
      timeline.push({
        step: "PAYMENT",
        title: `Payment ${pay.paymentNo}`,
        description: `Payment received of ₹${(pay.amount / 100).toLocaleString("en-IN")} via ${pay.mode}`,
        date: pay.date || pay.createdAt,
        status: pay.status,
        referenceNo: pay.paymentNo,
        href: `/payments`,
      });
    }
  }

  // Sort chronologically
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return timeline;
}
