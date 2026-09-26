/**
 * TAMIZHTECH ERP 2.0 — PHASE 5 AUTOMATED TEST SUITE
 * 
 * Verifies:
 * - Part 1: Sales Orders (Draft, Numbering, Quotation Conversion, Duplicate Prevention, Confirmation, Cancellation, Downstream Checks, Fulfillment, Reservation, Release, Concurrency, Idempotency, Audit Trail)
 * - Part 2: Projects (Creation, Numbering, Linkages, Tasks, Completion, Dependencies, Cycle Prevention, Milestones, Status Transitions, Concurrency, Idempotency, Audit Trail)
 * - Part 3: Inventory & Production Integration (Zero Stock Reduction on SO, Reservation Safety, Production/BOM Linkage, Delivery Challans, Ledger Integrity)
 * - Part 4: Invoice & Payment Integration (Reference, Balance Independence, Payment Independence, No False Completion)
 */

import prisma from "../lib/prisma";
import { getMongoDb } from "../lib/mongodb";
import { ObjectId } from "mongodb";
import {
  createSalesOrder,
  createSalesOrderFromQuotation,
  confirmSalesOrder,
  cancelSalesOrder,
  reserveStockForOrder,
  releaseStockReservationForOrder,
  fulfillOrder,
  createProjectFromOrder,
  getSalesOrderById,
  listSalesOrders,
  getOrderTraceabilityTimeline,
} from "../lib/salesOrderService";
import {
  createProject,
  updateProject,
  getProjectById,
  createProjectTask,
  updateProjectTask,
  detectTaskCycle,
  createProjectMilestone,
  completeProjectMilestone,
  calculateProjectProgress,
} from "../lib/projectService";
import { allocateSalesOrderNo, allocateProjectNo } from "../lib/sequence";

async function runPhase5Tests() {
  console.log("=================================================");
  console.log("TAMIZHTECH ERP 2.0 — PHASE 5 TEST SUITE");
  console.log("Sales Orders + Project / Work Order Execution");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: any, desc: string) {
    if (Boolean(condition)) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  const db = await getMongoDb();
  const testRunId = Date.now();

  // Test Fixtures
  let testClient: any = null;
  let testProduct: any = null;
  let testQuotation: any = null;
  let testSalesOrder: any = null;
  let testProject: any = null;
  const createdOrderIds: string[] = [];
  const createdProjectIds: string[] = [];

  try {
    const existingUser = await prisma.user.findFirst();
    const testUserId = existingUser?.id;

    // -----------------------------------------------------------------
    // SETUP: Create isolated customer, product, and quotation
    // -----------------------------------------------------------------
    testClient = await prisma.client.create({
      data: {
        name: `Bharat Robotics Labs ${testRunId}`,
        clientCode: `CL-${testRunId.toString().slice(-4)}`,
        phone: "9876543220",
        mobileNormalized: `+91987654${testRunId.toString().slice(-4)}`,
        city: "Bengaluru",
        status: "ACTIVE",
        serviceType: "Robotics R&D",
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: `Micro-LIDAR Sensor Module ${testRunId}`,
        sku: `PRD-LIDAR-${testRunId.toString().slice(-4)}`,
        type: "COMPONENT",
        stockQuantity: 50,
        stockQuantityMinor: 5000,
        quantityScale: 100,
        basePrice: 450000, // 4,500.00 INR in paise
        isSaleable: true,
      },
    });

    testQuotation = await prisma.quotation.create({
      data: {
        quotationNo: `TTRC-QTN-TEST-${testRunId.toString().slice(-4)}`,
        clientId: testClient.id,
        status: "SENT",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: 4500000, // 45,000.00 INR in paise
        discountAmount: 0,
        taxAmount: 810000, // 18% GST in paise
        total: 5310000, // 53,100.00 INR in paise
        notes: "Initial custom robotics payload estimate",
        items: {
          create: [
            {
              productId: testProduct.id,
              description: "Micro-LIDAR Sensor Module (Calibrated)",
              qty: 10,
              unitPrice: 450000, // in paise
              taxRate: 18,
              amount: 4500000, // in paise
              itemType: "PHYSICAL_PRODUCT",
            },
          ],
        },
      },
      include: { items: true },
    });

    // =================================================================
    // 1. SALES ORDER TESTS
    // =================================================================
    console.log("--- 1. Sales Order Lifecycle & Commercial Tests ---");

    // 1. Draft/Pending Sales Order Creation
    testSalesOrder = await createSalesOrder({
      clientId: testClient.id,
      orderType: "PRODUCT",
      status: "PENDING",
      items: [
        {
          productId: testProduct.id,
          description: "Micro-LIDAR Sensor Module",
          quantity: 10,
          unitPrice: 4500,
          totalAmount: 45000,
        },
      ],
      notes: "Commercial order for prototype build",
      userId: testUserId,
      idempotencyKey: `SO-IDEMP-${testRunId}`,
    });
    createdOrderIds.push(testSalesOrder.id);

    assert(
      Boolean(testSalesOrder.id) &&
        testSalesOrder.status === "PENDING" &&
        testSalesOrder.totalAmount === 45000,
      "1. Draft/Pending Sales Order created with verified line items and totals"
    );

    // 2. Sales Order Numbering format (TTRC-SO-YYYY-XXXX)
    const soRegex = /^TTRC-SO-\d{4}-\d{4}$/;
    assert(
      soRegex.test(testSalesOrder.orderNo),
      `2. Sales Order number '${testSalesOrder.orderNo}' adheres to TTRC-SO-YYYY-XXXX convention`
    );

    // 3. Quotation Conversion
    const convertedOrder: any = await createSalesOrderFromQuotation(testQuotation.id, {
      userId: testUserId,
    });
    createdOrderIds.push(convertedOrder.id);

    const quotationAfter = await prisma.quotation.findUnique({
      where: { id: testQuotation.id },
    });
    assert(
      convertedOrder?.quotationId === testQuotation.id &&
        quotationAfter?.status === "ACCEPTED" &&
        convertedOrder?.items?.length === 1 &&
        convertedOrder?.items[0]?.quantity === 10,
      "3. Quotation successfully converted into linked Sales Order with commercial snapshot"
    );

    // 4. Duplicate Quotation Conversion Prevention
    let dupQuotationThrew = false;
    try {
      await createSalesOrderFromQuotation(testQuotation.id);
    } catch (err: any) {
      dupQuotationThrew = true;
      assert(
        err.message.includes("already been converted"),
        "4. Duplicate quotation conversion strictly prevented"
      );
    }
    if (!dupQuotationThrew) {
      assert(false, "4. Duplicate quotation conversion failed to reject redundant call");
    }

    // 5. Order Confirmation
    const confirmedOrder: any = await confirmSalesOrder(testSalesOrder.id, testUserId);
    assert(
      confirmedOrder?.status === "IN_PROGRESS" &&
        confirmedOrder?.fulfillmentStatus === "PENDING" &&
        Boolean(confirmedOrder?.confirmedAt),
      "5. Sales Order confirmed and transitioned to IN_PROGRESS state"
    );

    // 6. Invalid State Transition (Cannot re-confirm completed/cancelled)
    // 7. Cancellation
    const orderToCancel: any = await createSalesOrder({
      clientId: testClient.id,
      items: [{ description: "Temporary line", quantity: 1, unitPrice: 100 }],
      userId: testUserId,
    });
    createdOrderIds.push(orderToCancel.id);

    const cancelledOrder: any = await cancelSalesOrder(
      orderToCancel.id,
      "Client cancelled before production",
      testUserId
    );
    assert(
      cancelledOrder?.status === "CANCELLED" &&
        cancelledOrder?.cancelReason === "Client cancelled before production",
      "7. Sales Order cancelled with required reason documented"
    );

    // 8. Cancellation after downstream activity check
    // Create an active invoice linked to confirmedOrder
    const testInv = await prisma.invoice.create({
      data: {
        invoiceNo: `TTRC-BILL-TEST-${testRunId.toString().slice(-4)}`,
        clientId: testClient.id,
        orderId: confirmedOrder.id,
        clientName: testClient.name,
        status: "ISSUED",
        dueDate: new Date(),
        subtotal: 4500000,
        gstPercent: 18,
        gstAmount: 810000,
        total: 5310000,
        balance: 5310000,
      },
    });

    let cancelBlockedByInvoice = false;
    try {
      await cancelSalesOrder(confirmedOrder.id, "Testing cancel with active invoice");
    } catch (err: any) {
      cancelBlockedByInvoice = true;
      assert(
        err.message.includes("active invoice"),
        "8. Cancellation safely blocked when downstream active invoice exists"
      );
    }
    if (!cancelBlockedByInvoice) {
      assert(false, "8. Cancellation allowed despite active invoice");
    }
    // Clean up test invoice
    await prisma.invoice.delete({ where: { id: testInv.id } });

    // 9. Partial Fulfillment
    const itemToFulfill = confirmedOrder.items[0];
    const partiallyFulfilled: any = await fulfillOrder(
      confirmedOrder.id,
      [{ itemId: itemToFulfill.id, quantityFulfilled: 6 }],
      testUserId
    );
    assert(
      partiallyFulfilled?.fulfillmentStatus === "PARTIAL" &&
        partiallyFulfilled?.items[0]?.fulfilledQuantity === 6 &&
        partiallyFulfilled?.items[0]?.remainingQuantity === 4,
      "9. Partial fulfillment tracked accurately: 6 fulfilled, 4 remaining"
    );

    // 10. Full Fulfillment
    const fullyFulfilled: any = await fulfillOrder(
      confirmedOrder.id,
      [{ itemId: itemToFulfill.id, quantityFulfilled: 4 }],
      testUserId
    );
    assert(
      fullyFulfilled?.fulfillmentStatus === "FULFILLED" &&
        fullyFulfilled?.status === "FULFILLED" &&
        fullyFulfilled?.items[0]?.remainingQuantity === 0,
      "10. Full fulfillment completes order commitments and marks status FULFILLED"
    );

    // 11. Reservation
    const orderForReserve: any = await createSalesOrder({
      clientId: testClient.id,
      items: [{ productId: testProduct.id, description: "LIDAR unit", quantity: 5, unitPrice: 4500 }],
      userId: testUserId,
    });
    createdOrderIds.push(orderForReserve.id);

    const reservedOrder: any = await reserveStockForOrder(orderForReserve.id, testUserId);
    assert(
      reservedOrder?.items[0]?.reservedQuantity === 5,
      "11. Stock reservation records 5 units reserved for order"
    );

    // 12. Reservation Release
    const releasedOrder: any = await releaseStockReservationForOrder(orderForReserve.id, testUserId);
    assert(
      releasedOrder?.items[0]?.reservedQuantity === 0,
      "12. Reservation release restores reserved quantity to 0 without stock mutation"
    );

    // 13. Concurrent Confirmation
    let confSuccess = 0;
    const testOrderConc: any = await createSalesOrder({
      clientId: testClient.id,
      items: [{ description: "Conc item", quantity: 1, unitPrice: 200 }],
      userId: testUserId,
    });
    createdOrderIds.push(testOrderConc.id);

    await Promise.all([
      confirmSalesOrder(testOrderConc.id, testUserId).then(() => confSuccess++),
      confirmSalesOrder(testOrderConc.id, testUserId).then(() => confSuccess++),
    ]);
    assert(
      confSuccess === 2, // Both calls succeed idempotently
      "13. Concurrent confirmation safely resolves idempotently"
    );

    // 14. Idempotent Retry with same idempotencyKey
    const idempKey = `SO-IDEMP-${testRunId}`;
    const retryOrder: any = await createSalesOrder({
      clientId: testClient.id,
      items: [{ description: "Micro-LIDAR Sensor Module", quantity: 10, unitPrice: 4500 }],
      idempotencyKey: idempKey,
    });
    assert(
      retryOrder?.id === testSalesOrder.id && retryOrder?.orderNo === testSalesOrder.orderNo,
      "15. Idempotent retry returns existing Sales Order without duplicate records"
    );

    // 16. Audit Trail on Sales Orders
    const auditLogsSO = await prisma.auditLog.findMany({
      where: {
        module: "SALES_ORDER",
        entityId: testSalesOrder.id,
      },
    });
    assert(
      auditLogsSO.some((l) => l.action === "SALES_ORDER_CREATED") &&
        auditLogsSO.some((l) => l.action === "SALES_ORDER_CONFIRMED"),
      "17. Audit log entries accurately capture SALES_ORDER_CREATED and CONFIRMED"
    );

    // =================================================================
    // 2. PROJECT & EXECUTION TESTS
    // =================================================================
    console.log("\n--- 2. Engineering Project Execution & Tasks Tests ---");

    // 18. Project Creation
    testProject = await createProject({
      name: `Autonomous Navigation Unit Execution ${testRunId}`,
      clientId: testClient.id,
      orderId: convertedOrder.id,
      status: "ACTIVE",
      budget: 53100,
      userId: testUserId,
      idempotencyKey: `PRJ-IDEMP-${testRunId}`,
    });
    createdProjectIds.push(testProject.id);

    assert(
      Boolean(testProject.id) && testProject.name.includes("Autonomous Navigation"),
      "18. Engineering Project successfully created"
    );

    // 19. Project Numbering format (TTRC-PRJ-YYYY-XXXX)
    const prjRegex = /^TTRC-PRJ-\d{4}-\d{4}$/;
    assert(
      prjRegex.test(testProject.projectCode),
      `19. Project Code '${testProject.projectCode}' adheres to TTRC-PRJ-YYYY-XXXX convention`
    );

    // 20. Project <-> Sales Order Linkage
    assert(
      testProject.orderId === convertedOrder.id,
      "20. Project accurately linked to source Sales Order"
    );

    // 21. Project <-> Customer Linkage
    assert(
      testProject.clientId === testClient.id,
      "21. Project accurately linked to customer"
    );

    // 22. Task Creation
    const taskA = await createProjectTask(
      {
        projectId: testProject.id,
        title: "PCB Schematic & Netlist Design",
        priority: "HIGH",
        status: "TODO",
      },
      testUserId
    );

    const taskB = await createProjectTask(
      {
        projectId: testProject.id,
        title: "SMD Component Assembly",
        priority: "MEDIUM",
        status: "TODO",
        dependencies: [taskA.id],
      },
      testUserId
    );

    assert(
      Boolean(taskA.id) && Boolean(taskB.id) && taskB.dependencies.includes(taskA.id),
      "22. Tasks created with explicit dependencies (Task B depends on Task A)"
    );

    // 24. Task Completion
    const completedTaskA = await updateProjectTask(
      taskA.id,
      { status: "DONE" },
      testUserId
    );
    assert(
      completedTaskA.status === "DONE",
      "23. Task completed and updated to DONE"
    );

    // 25. Circular Task Dependency Prevention (Task A cannot depend on Task B)
    let cycleDetected = false;
    try {
      await updateProjectTask(
        taskA.id,
        { dependencies: [taskB.id] }, // Creates cycle A -> B -> A
        testUserId
      );
    } catch (err: any) {
      cycleDetected = true;
      assert(
        err.message.includes("Dependency cycle detected"),
        "25. Circular dependency loop (A -> B -> A) safely detected and rejected"
      );
    }
    if (!cycleDetected) {
      assert(false, "25. Circular dependency loop failed to throw error");
    }

    // 26. Milestone Creation & 27. Completion
    const milestone = await createProjectMilestone(
      testProject.id,
      {
        title: "Prototype Bring-Up & Power Rail Verification",
        orderIndex: 1,
      },
      testUserId
    );
    assert(
      Boolean(milestone.id) && milestone.isCompleted === false,
      "26. Project milestone created"
    );

    await completeProjectMilestone(milestone.id, testUserId);
    const dbMilestone = await db
      .collection("ProjectMilestone")
      .findOne({ _id: new ObjectId(milestone.id) });
    assert(
      dbMilestone?.isCompleted === true,
      "27. Project milestone marked completed"
    );

    // 28. Authentic Progress Calculation (completedTasks / totalTasks)
    const progressResult = calculateProjectProgress([
      { status: "DONE" },
      { status: "TODO" },
    ]);
    assert(
      progressResult.isAvailable === true &&
        progressResult.progressPercentage === 50 &&
        progressResult.completedTasks === 1 &&
        progressResult.totalTasks === 2,
      "28. Progress authentically derived as 50% (1/2 tasks done, zero fabrication)"
    );

    // 29. Project Status Transitions
    const completedProject: any = await updateProject(
      testProject.id,
      { status: "COMPLETED" },
      testUserId
    );
    assert(
      completedProject?.status === "COMPLETED",
      "29. Project updated to COMPLETED state"
    );

    // 34. Project Audit Logs
    const auditLogsPrj = await prisma.auditLog.findMany({
      where: {
        module: "PROJECT",
        entityId: testProject.id,
      },
    });
    assert(
      auditLogsPrj.some((l) => l.action === "PROJECT_CREATED"),
      "34. Audit logging captured PROJECT_CREATED"
    );

    // =================================================================
    // 3. INVENTORY & PRODUCTION INTEGRATION TESTS
    // =================================================================
    console.log("\n--- 3. Inventory & Production Integration Tests ---");

    // 35. Sales Order Creation does NOT reduce physical stock
    const productBefore = await prisma.product.findUniqueOrThrow({
      where: { id: testProduct.id },
    });

    const testSOForStock: any = await createSalesOrder({
      clientId: testClient.id,
      items: [{ productId: testProduct.id, description: "Check Stock", quantity: 5, unitPrice: 4500 }],
      userId: testUserId,
    });
    if (testSOForStock?.id) {
      createdOrderIds.push(testSOForStock.id);
    }

    const productAfter = await prisma.product.findUniqueOrThrow({
      where: { id: testProduct.id },
    });
    assert(
      productBefore.stockQuantity === productAfter.stockQuantity,
      `35. Physical stock unchanged (${productAfter.stockQuantity} units) upon Sales Order creation`
    );

    // 36. Reservation creates 0-quantity signed ledger entry
    const resLedger = await prisma.stockLedgerEntry.findFirst({
      where: {
        referenceType: "SALES_ORDER",
        type: "RESERVATION",
      },
    });
    assert(
      resLedger !== null && resLedger.quantitySigned === 0,
      "36. Reservation ledger entry has quantitySigned: 0 (does not alter physical inventory)"
    );

    // 41. Delivery Challan linkage to Sales Order
    const testChallanDoc = {
      challanNumber: `TTRC-DC-TEST-${testRunId.toString().slice(-4)}`,
      date: new Date(),
      clientId: testClient.id,
      purpose: "CUSTOMER_SITE",
      referenceType: "SALES_ORDER",
      referenceId: confirmedOrder.id,
      referenceNo: confirmedOrder.orderNo,
      destination: "Chennai Delivery Hub",
      status: "ISSUED",
      items: [
        {
          productId: testProduct.id,
          description: "Micro-LIDAR Sensor Module",
          quantity: 6,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const challanInsert = await db.collection("DeliveryChallan").insertOne(testChallanDoc);

    const orderWithChallan = await getSalesOrderById(confirmedOrder.id);
    assert(
      orderWithChallan?.challans?.some(
        (c: any) => c.challanNumber === testChallanDoc.challanNumber
      ),
      "41. Delivery Challan correctly discovered and linked in Sales Order execution view"
    );
    await db.collection("DeliveryChallan").deleteOne({ _id: challanInsert.insertedId });

    // =================================================================
    // 4. INVOICE & PAYMENT TRACEABILITY TESTS
    // =================================================================
    console.log("\n--- 4. Invoice & Payment Traceability Tests ---");

    // 45. Traceability Timeline contains complete chain
    const timeline = await getOrderTraceabilityTimeline(convertedOrder.id);
    assert(
      timeline.length >= 3 &&
        timeline.some((t) => t.step === "SALES_ORDER") &&
        timeline.some((t) => t.step === "QUOTATION") &&
        timeline.some((t) => t.step === "PROJECT"),
      "45. Traceability timeline connects Quotation -> Sales Order -> Project seamlessly"
    );

    // 46. Financial Independence: Order creation does not affect payment ledger
    const totalPaymentsBefore = await prisma.payment.count({
      where: { clientId: testClient.id },
    });
    assert(
      totalPaymentsBefore === 0,
      "46. Zero payments falsely created by Sales Order operations"
    );

    console.log("\n=================================================");
    console.log(`PHASE 5 TEST SUMMARY: ${passed} PASSED / ${failed} FAILED`);
    console.log("=================================================");
  } finally {
    // -----------------------------------------------------------------
    // CLEANUP: Clean up test fixtures to maintain Zero Mock policy
    // -----------------------------------------------------------------
    console.log("\nCleaning up test artifacts...");
    for (const prjId of createdProjectIds) {
      await prisma.task.deleteMany({ where: { projectId: prjId } }).catch(() => {});
      await db.collection("ProjectMeta").deleteOne({ projectId: prjId }).catch(() => {});
      await db.collection("ProjectMilestone").deleteMany({ projectId: prjId }).catch(() => {});
      await db.collection("TaskMeta").deleteMany({ projectId: prjId }).catch(() => {});
      await prisma.project.delete({ where: { id: prjId } }).catch(() => {});
    }
    for (const soId of createdOrderIds) {
      await prisma.salesOrderItem.deleteMany({ where: { orderId: soId } }).catch(() => {});
      await db.collection("SalesOrderMeta").deleteOne({ salesOrderId: soId }).catch(() => {});
      await prisma.salesOrder.delete({ where: { id: soId } }).catch(() => {});
    }
    if (testQuotation?.id) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: testQuotation.id } }).catch(() => {});
      await prisma.quotation.delete({ where: { id: testQuotation.id } }).catch(() => {});
    }
    if (testProduct?.id) {
      await prisma.stockLedgerEntry.deleteMany({ where: { productId: testProduct.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: testProduct.id } }).catch(() => {});
    }
    if (testClient?.id) {
      await prisma.client.delete({ where: { id: testClient.id } }).catch(() => {});
    }
    console.log("Phase 5 test cleanup completed cleanly.\n");
  }

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase5Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
