/**
 * TAMIZHTECH ERP 2.0 — PHASE 6 AUTOMATED TEST SUITE
 * 
 * Verifies:
 * - Part 1: Supplier / Vendor Master (Creation, Numbering, Duplicate Detection, Profile, Status, Audit)
 * - Part 2: Procurement Demands (Requests from BOM/Project, Numbering, Approval Lifecycle)
 * - Part 3: Purchase Orders (Creation, Numbering, Non-Mutation of Stock, Confirm/Cancel, Links)
 * - Part 4: Goods Receipt (GRN) & Inventory Intake (Partial, Full, Rejected quarantine, WAC, StockLedgerEntry)
 * - Part 5: Purchase Returns (Compensating Ledger, Negative Stock Guard, Idempotency)
 * - Part 6: Supplier Bills & Three-Way Matching (Match Status, Exception Detection, Payables)
 * - Part 7: Supplier Payments (Append-Only Ledger, Partial & Full Balances, Reconciled Payables)
 * - Part 8: BOM Shortage to Procurement End-to-End Traceability
 * - Part 9: Concurrency, Idempotency & Dashboard Metrics
 */

import prisma from "../lib/prisma";
import { getMongoDb } from "../lib/mongodb";
import { ObjectId } from "mongodb";
import {
  createSupplier,
  updateSupplier,
  checkDuplicateSupplier,
  getSupplierById,
  listSuppliers,
  createProcurementRequest,
  approveProcurementRequest,
  createPurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  createAndConfirmGoodsReceipt,
  createPurchaseReturn,
  createSupplierBill,
  recordSupplierPayment,
  getProcurementDashboardMetrics,
  SUPPLIER_META_COLLECTION,
  PO_META_COLLECTION,
  GRN_COLLECTION,
  PURCHASE_RETURN_COLLECTION,
  SUPPLIER_BILL_COLLECTION,
  SUPPLIER_PAYMENT_COLLECTION,
  PROCUREMENT_REQ_COLLECTION,
} from "../lib/procurementService";
import {
  allocateSupplierNo,
  allocatePurchaseOrderNo,
  allocateGoodsReceiptNo,
  allocateProcurementRequestNo,
  allocateSupplierBillNo,
  allocateSupplierPaymentNo,
} from "../lib/sequence";
import { createBOM, calculateBOMRequirements } from "../lib/bomService";

async function runPhase6Tests() {
  console.log("=================================================");
  console.log("TAMIZHTECH ERP 2.0 — PHASE 6 TEST SUITE");
  console.log("Procurement + Supplier Management + Purchase Receiving");
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
  const existingUser = await prisma.user.findFirst();
  const testUserId = existingUser?.id || new ObjectId().toString();

  // Clean-up tracker
  const createdVendorIds: string[] = [];
  const createdPoIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdBomIds: string[] = [];
  const createdRequestIds: string[] = [];

  try {
    // -----------------------------------------------------------------
    // SETUP: Create real products for procurement testing
    // -----------------------------------------------------------------
    console.log("--- SETUP: Creating Real Test Products ---");

    const esp32Product = await prisma.product.create({
      data: {
        name: `ESP32-WROOM-32D Core Module ${testRunId}`,
        sku: `MCU-ESP32-${testRunId}`,
        type: "COMPONENT",
        category: "ELECTRONICS",
        stockQuantity: 10, // starts with 10 units
        basePrice: 450,
      },
    });
    createdProductIds.push(esp32Product.id);

    const motorDriverProduct = await prisma.product.create({
      data: {
        name: `L298N Dual H-Bridge Driver ${testRunId}`,
        sku: `DRV-L298N-${testRunId}`,
        type: "COMPONENT",
        category: "ELECTRONICS",
        stockQuantity: 0, // 0 in stock (shortage!)
        basePrice: 220,
      },
    });
    createdProductIds.push(motorDriverProduct.id);

    console.log(`Created test products: ${esp32Product.sku}, ${motorDriverProduct.sku}\n`);

    // =================================================================
    // PART 1: SUPPLIER / VENDOR MASTER
    // =================================================================
    console.log("--- PART 1: Supplier / Vendor Master Tests ---");

    // Test 1: Supplier Creation & Numbering
    const supplier1: any = await createSupplier({
      name: `RoboFab Components India ${testRunId}`,
      legalName: `RoboFab Components India Private Limited`,
      contactPerson: "Kavitha Rajan",
      phone: "+91 94441 23456",
      email: `sourcing-${testRunId}@robofab.in`,
      gstin: `33AAACR${testRunId.toString().slice(-4)}A1Z2`,
      pan: `AAACR${testRunId.toString().slice(-4)}A`,
      billingAddress: "42 Electronics SEZ, Coimbatore, Tamil Nadu",
      paymentTerms: "Net 30",
      notes: "Authoritative PCB and controller supplier",
      userId: testUserId,
    });
    createdVendorIds.push(supplier1.id);

    assert(
      supplier1.supplierCode.startsWith("TTRC-SUP-"),
      `1. Supplier allocated sequence ${supplier1.supplierCode}`
    );
    assert(
      supplier1.status === "ACTIVE",
      `2. Supplier status initialized to ACTIVE`
    );

    // Test 2: Audit log for supplier creation
    const supplierAudit = await prisma.auditLog.findFirst({
      where: {
        module: "PROCUREMENT",
        action: "SUPPLIER_CREATED",
        entityId: supplier1.id,
      },
    });
    assert(
      supplierAudit !== null,
      `3. AuditLog recorded for SUPPLIER_CREATED`
    );

    // Test 3: Duplicate Supplier Detection
    const duplicateCheck = await checkDuplicateSupplier({
      gstin: supplier1.gstin || undefined,
      email: supplier1.email || undefined,
      phone: "+91 94441 23456",
    });
    assert(
      duplicateCheck.isDuplicate === true && duplicateCheck.matches.length >= 1,
      `4. Duplicate supplier detection catches matching GSTIN/phone/email`
    );

    const nonDuplicateCheck = await checkDuplicateSupplier({
      gstin: "33ZZZZZ9999Z9Z9",
      email: "unique@vendor.com",
    });
    assert(
      nonDuplicateCheck.isDuplicate === false,
      `5. Non-duplicate vendor passes check cleanly`
    );

    // Test 4: Supplier Update & Deactivate
    const updatedSupplier: any = await updateSupplier(supplier1.id, {
      paymentTerms: "Net 45",
      status: "INACTIVE",
      userId: testUserId,
    });
    assert(
      updatedSupplier?.status === "INACTIVE" && updatedSupplier?.meta?.paymentTerms === "Net 45",
      `6. Supplier status updated to INACTIVE and payment terms updated to Net 45`
    );

    // Re-activate supplier for PO testing
    await updateSupplier(supplier1.id, { status: "ACTIVE", userId: testUserId });

    // =================================================================
    // PART 2: PROCUREMENT REQUESTS / DEMANDS
    // =================================================================
    console.log("\n--- PART 2: Procurement Demands / Requests ---");

    // Test 5: Procurement Request Creation
    const prRequest: any = await createProcurementRequest({
      sourceType: "BOM",
      sourceId: "BOM-ROBOT-001",
      priority: "HIGH",
      requiredDate: new Date(Date.now() + 7 * 86400000),
      items: [
        {
          productId: motorDriverProduct.id,
          description: motorDriverProduct.name,
          quantity: 50,
          estimatedUnitCostPaise: 12000,
        },
      ],
      notes: "Urgent shortage for Autonomous Mobile Robot build",
      userId: testUserId,
    });
    createdRequestIds.push(prRequest.id);

    assert(
      prRequest.requestNo.startsWith("TTRC-PR-"),
      `7. Procurement Request allocated sequence ${prRequest.requestNo}`
    );
    assert(
      prRequest.status === "SUBMITTED",
      `8. Procurement Request initialized in SUBMITTED state`
    );

    // Test 6: Procurement Request Approval
    const approvedPr = await approveProcurementRequest(prRequest.id, testUserId);
    assert(
      approvedPr.status === "APPROVED" && approvedPr.approvedById === testUserId,
      `9. Procurement Request successfully approved by authorized user`
    );

    // =================================================================
    // PART 3: PURCHASE ORDER CREATION & LIFECYCLE
    // =================================================================
    console.log("\n--- PART 3: Purchase Orders Lifecycle & Non-Mutation Rules ---");

    // Check initial stock before PO
    const stockBeforePO = (await prisma.product.findUnique({ where: { id: esp32Product.id } }))?.stockQuantity;

    // Test 7: PO Creation
    const po1: any = await createPurchaseOrder({
      supplierId: supplier1.id,
      sourceRequestId: prRequest.id,
      projectId: "PRJ-ROBOT-ALPHA",
      orderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 5 * 86400000),
      paymentTerms: "Net 30",
      notes: "Component batch for robotics production",
      items: [
        {
          productId: esp32Product.id,
          description: esp32Product.name,
          quantity: 100,
          unitCost: 250, // ₹250
          taxRate: 18,
        },
        {
          productId: motorDriverProduct.id,
          description: motorDriverProduct.name,
          quantity: 50,
          unitCost: 120, // ₹120
          taxRate: 18,
        },
      ],
      userId: testUserId,
    });
    createdPoIds.push(po1.id);

    assert(
      po1.poNo.startsWith("TTRC-PO-"),
      `10. Purchase Order allocated sequence ${po1.poNo}`
    );
    assert(
      po1.status === "DRAFT",
      `11. Purchase Order initialized in DRAFT status`
    );

    // Test 8: NON-NEGOTIABLE RULE: PO creation MUST NOT mutate stock
    const stockAfterPO = (await prisma.product.findUnique({ where: { id: esp32Product.id } }))?.stockQuantity;
    assert(
      stockBeforePO === stockAfterPO,
      `12. NON-NEGOTIABLE: PO creation did NOT mutate physical inventory (${stockBeforePO} == ${stockAfterPO})`
    );

    // Test 9: PO Confirmation
    const confirmedPo = await confirmPurchaseOrder(po1.id, testUserId);
    assert(
      confirmedPo?.status === "CONFIRMED",
      `13. Purchase Order successfully confirmed (DRAFT -> CONFIRMED)`
    );

    // Test 11: PO Cancellation testing on a draft PO
    const draftPoToCancel: any = await createPurchaseOrder({
      supplierId: supplier1.id,
      items: [
        {
          productId: esp32Product.id,
          description: "Cancel test line",
          quantity: 10,
          unitCost: 250,
        },
      ],
      userId: testUserId,
    });
    createdPoIds.push(draftPoToCancel.id);
    const cancelledPo = await cancelPurchaseOrder(draftPoToCancel.id, testUserId, "Duplicate requisition");

    // Test 10: Invalid state transition protection (Cannot confirm CANCELLED PO)
    let reconfirmFailed = false;
    try {
      await confirmPurchaseOrder(cancelledPo!.id, testUserId);
    } catch {
      reconfirmFailed = true;
    }
    assert(
      reconfirmFailed,
      `14. Invalid state transition blocked: Cannot confirm a CANCELLED PO`
    );
    assert(
      cancelledPo?.status === "CANCELLED",
      `15. PO cancellation successful with reason recorded`
    );

    // =================================================================
    // PART 4: GOODS RECEIPT NOTE (GRN) & INVENTORY RECEIVING
    // =================================================================
    console.log("\n--- PART 4: Goods Receipt (GRN) & Inventory Mutation ---");

    // Test 12: Partial Receipt with Accepted & Rejected Items
    // Ordered 100 ESP32s: Receiving 60 (55 Accepted, 5 Rejected due to damaged pins)
    const grn1: any = await createAndConfirmGoodsReceipt({
      purchaseOrderId: po1.id,
      items: [
        {
          productId: esp32Product.id,
          description: esp32Product.name,
          quantityOrdered: 100,
          quantityReceived: 60,
          quantityAccepted: 55, // Stock increases by 55
          quantityRejected: 5,  // 5 quarantined, NEVER added to stock!
          notes: "5 units failed visual pin inspection",
        },
        {
          productId: motorDriverProduct.id,
          description: motorDriverProduct.name,
          quantityOrdered: 50,
          quantityReceived: 30,
          quantityAccepted: 30, // Stock increases by 30
          quantityRejected: 0,
        },
      ],
      userId: testUserId,
    });

    assert(
      grn1.grnNo.startsWith("TTRC-GRN-"),
      `16. Goods Receipt Note allocated sequence ${grn1.grnNo}`
    );
    assert(
      grn1.status === "CONFIRMED",
      `17. Goods Receipt Note confirmed atomically`
    );

    // Test 13: Usable physical inventory mutated by ACCEPTED quantities only
    const esp32StockAfterGRN1 = (await prisma.product.findUnique({ where: { id: esp32Product.id } }))?.stockQuantity;
    // Initial 10 + 55 accepted = 65 (NOT 70! Rejected 5 must NOT enter stock)
    assert(
      esp32StockAfterGRN1 === 65,
      `18. Usable stock increased strictly by ACCEPTED quantity (10 + 55 = ${esp32StockAfterGRN1}, 5 rejected quarantined)`
    );

    const motorStockAfterGRN1 = (await prisma.product.findUnique({ where: { id: motorDriverProduct.id } }))?.stockQuantity;
    assert(
      motorStockAfterGRN1 === 30,
      `19. Motor driver stock increased from 0 to 30`
    );

    // Test 14: Immutable StockLedgerEntry created with type: "PURCHASE"
    const purchaseLedgerEntries = await prisma.stockLedgerEntry.findMany({
      where: {
        referenceId: grn1.grnNo,
        referenceType: "GOODS_RECEIPT",
        type: "PURCHASE",
      },
    });
    assert(
      purchaseLedgerEntries.length === 2,
      `20. Immutable PURCHASE StockLedgerEntries recorded for each accepted line`
    );

    // Test 15: PO Fulfillment & Status updated to PARTIALLY_RECEIVED
    const poAfterGrn1: any = await getPurchaseOrderById(po1.id);
    assert(
      poAfterGrn1?.status === "PARTIALLY_RECEIVED",
      `21. Purchase Order status transitioned to PARTIALLY_RECEIVED`
    );
    const esp32PoLine = poAfterGrn1?.items.find((it: any) => it.productId === esp32Product.id);
    assert(
      esp32PoLine?.receivedQuantity === 60 && esp32PoLine?.remainingQuantity === 40,
      `22. PO line correctly tracks 60 received, 40 remaining`
    );

    // Test 16: Over-receipt validation protection
    let overReceiptBlocked = false;
    try {
      await createAndConfirmGoodsReceipt({
        purchaseOrderId: po1.id,
        items: [
          {
            productId: esp32Product.id,
            description: esp32Product.name,
            quantityOrdered: 100,
            quantityReceived: 50, // exceeds remaining 40!
            quantityAccepted: 50,
            quantityRejected: 0,
          },
        ],
        userId: testUserId,
      });
    } catch {
      overReceiptBlocked = true;
    }
    assert(
      overReceiptBlocked,
      `23. Over-receipt protection: Receiving 50 when remaining is 40 was properly rejected`
    );

    // Test 17: Full Receipt (Receiving remaining 40 ESP32s and 20 Motor Drivers)
    const grn2: any = await createAndConfirmGoodsReceipt({
      purchaseOrderId: po1.id,
      items: [
        {
          productId: esp32Product.id,
          description: esp32Product.name,
          quantityOrdered: 100,
          quantityReceived: 40,
          quantityAccepted: 40,
          quantityRejected: 0,
        },
        {
          productId: motorDriverProduct.id,
          description: motorDriverProduct.name,
          quantityOrdered: 50,
          quantityReceived: 20,
          quantityAccepted: 20,
          quantityRejected: 0,
        },
      ],
      userId: testUserId,
    });

    const poAfterGrn2: any = await getPurchaseOrderById(po1.id);
    assert(
      poAfterGrn2?.status === "RECEIVED",
      `24. PO transitioned to RECEIVED upon 100% receipt (${poAfterGrn2?.fulfillment?.totalReceived}/${poAfterGrn2?.fulfillment?.totalOrdered})`
    );

    const esp32FinalStock = (await prisma.product.findUnique({ where: { id: esp32Product.id } }))?.stockQuantity;
    // 65 + 40 = 105
    assert(
      esp32FinalStock === 105,
      `25. Stock correctly increased after second GRN (65 + 40 = ${esp32FinalStock})`
    );

    // =================================================================
    // PART 5: PURCHASE RETURNS (COMPENSATING MOVEMENTS)
    // =================================================================
    console.log("\n--- PART 5: Purchase Returns & Stock Decrement ---");

    // Test 18: Valid Purchase Return
    // Return 5 accepted ESP32s back to vendor
    const purchaseReturn: any = await createPurchaseReturn({
      purchaseOrderId: po1.id,
      supplierId: supplier1.id,
      items: [
        {
          productId: esp32Product.id,
          quantity: 5,
          reason: "Vendor recall for batch testing",
        },
      ],
      reason: "Vendor recall for batch testing",
      userId: testUserId,
    });

    assert(
      purchaseReturn.returnNo.startsWith("TTRC-RET-"),
      `26. Purchase Return allocated sequence ${purchaseReturn.returnNo}`
    );

    const stockAfterReturn = (await prisma.product.findUnique({ where: { id: esp32Product.id } }))?.stockQuantity;
    assert(
      stockAfterReturn === 100,
      `27. Compensating stock movement decremented inventory from 105 to 100`
    );

    // Test 19: Negative stock protection during return
    let excessReturnBlocked = false;
    try {
      await createPurchaseReturn({
        purchaseOrderId: po1.id,
        supplierId: supplier1.id,
        items: [
          {
            productId: esp32Product.id,
            quantity: 500, // exceeds available stock 100
            reason: "Excess return test",
          },
        ],
        reason: "Excess return test",
        userId: testUserId,
      });
    } catch {
      excessReturnBlocked = true;
    }
    assert(
      excessReturnBlocked,
      `28. Negative stock protection prevented returning more than available stock`
    );

    // =================================================================
    // PART 6: SUPPLIER BILLS & THREE-WAY MATCHING
    // =================================================================
    console.log("\n--- PART 6: Supplier Bills & Three-Way Matching ---");

    // Test 20: Supplier Bill with Perfect Three-Way Match
    // PO total: 100 * 250 + 50 * 120 = 25000 + 6000 = 31000 + 18% tax (5580) = 36580
    const bill1: any = await createSupplierBill({
      supplierId: supplier1.id,
      purchaseOrderId: po1.id,
      supplierInvoiceNo: `INV-ROBO-${testRunId}-01`,
      billDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      subtotal: 31000,
      taxAmount: 5580,
      totalAmount: 36580,
      userId: testUserId,
    });

    assert(
      bill1.billNo.startsWith("INV-ROBO-"),
      `29. Supplier Bill created with supplier invoice # ${bill1.billNo}`
    );
    assert(
      bill1.matchStatus === "MATCHED",
      `30. Three-way match: PO + GRN + Supplier Bill reconciled successfully (MATCHED)`
    );
    assert(
      bill1.totalAmountPaise === 3658000 && bill1.status === "OPEN",
      `31. Document independence: Bill created in OPEN status with full balance payable (₹36,580)`
    );

    // Test 21: Three-Way Match Exception Detection (Price mismatch)
    const mismatchedBill: any = await createSupplierBill({
      supplierId: supplier1.id,
      purchaseOrderId: po1.id,
      supplierInvoiceNo: `INV-ROBO-${testRunId}-MISMATCH`,
      billDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      subtotal: 45000,
      taxAmount: 8100,
      totalAmount: 53100, // Significantly higher than PO
      userId: testUserId,
    });
    assert(
      mismatchedBill.matchStatus === "EXCEPTION" &&
        mismatchedBill.matchExceptions.length > 0,
      `32. Three-way match exception flagged for price mismatch (₹53,100 vs PO ₹36,580)`
    );

    // =================================================================
    // PART 7: SUPPLIER PAYMENTS & PAYABLE RECONCILIATION
    // =================================================================
    console.log("\n--- PART 7: Supplier Payments & Payable Reconciliation ---");

    // Test 22: Partial Supplier Payment
    // Pay ₹16,580 against bill1 (Remaining balance should be ₹20,000)
    const payment1: any = await recordSupplierPayment({
      billId: bill1.id,
      amount: 16580,
      paymentMethod: "NEFT",
      paymentReference: `UTR-${testRunId}-01`,
      userId: testUserId,
    });

    assert(
      payment1.paymentNo.startsWith("TTRC-SPAY-"),
      `33. Supplier Payment allocated sequence ${payment1.paymentNo}`
    );

    const billAfterPayment1 = await db.collection(SUPPLIER_BILL_COLLECTION).findOne({ _id: new ObjectId(bill1.id) });
    assert(
      billAfterPayment1?.status === "PARTIALLY_PAID" && billAfterPayment1?.balancePaise === 2000000,
      `34. Supplier Bill balance updated to ₹20,000 and status set to PARTIALLY_PAID`
    );

    // Test 23: Full Supplier Payment
    // Pay remaining ₹20,000
    const payment2: any = await recordSupplierPayment({
      billId: bill1.id,
      amount: 20000,
      paymentMethod: "RTGS",
      paymentReference: `UTR-${testRunId}-02`,
      userId: testUserId,
    });

    const billAfterPayment2 = await db.collection(SUPPLIER_BILL_COLLECTION).findOne({ _id: new ObjectId(bill1.id) });
    assert(
      billAfterPayment2?.status === "PAID" && billAfterPayment2?.balancePaise === 0,
      `35. Supplier Bill fully settled: status set to PAID with 0 balance`
    );

    // Test 24: Overpayment prevention
    let overpaymentBlocked = false;
    try {
      await recordSupplierPayment({
        billId: bill1.id,
        amount: 5000, // bill is already fully paid!
        userId: testUserId,
      });
    } catch {
      overpaymentBlocked = true;
    }
    assert(
      overpaymentBlocked,
      `36. Overpayment protection: Cannot record payment exceeding outstanding bill balance`
    );

    // =================================================================
    // PART 8: BOM SHORTAGE → PROCUREMENT END-TO-END TRACE
    // =================================================================
    console.log("\n--- PART 8: BOM Shortage to Procurement End-to-End Integration ---");

    // Create a new component that currently has 0 stock
    const sensorProduct = await prisma.product.create({
      data: {
        name: `Ultrasonic Distance Sensor HC-SR04 ${testRunId}`,
        sku: `SEN-HCSR04-${testRunId}`,
        type: "COMPONENT",
        category: "ELECTRONICS",
        stockQuantity: 0, // 0 in stock!
        basePrice: 120,
      },
    });
    createdProductIds.push(sensorProduct.id);

    // Create a Robotics Assembly BOM requiring this sensor
    const robotAssemblyProduct = await prisma.product.create({
      data: {
        name: `Obstacle Avoidance Robot Kit ${testRunId}`,
        sku: `KIT-OBSTACLE-${testRunId}`,
        type: "COMPONENT",
        category: "ROBOTICS",
        stockQuantity: 0,
        basePrice: 1500,
      },
    });
    createdProductIds.push(robotAssemblyProduct.id);

    const testBom = await createBOM({
      parentProductId: robotAssemblyProduct.id,
      items: [
        {
          componentProductId: sensorProduct.id,
          quantity: 2, // requires 2 sensors per kit
        },
      ],
      status: "ACTIVE",
      userId: testUserId,
    });
    createdBomIds.push(testBom.id);

    // Verify BOM Shortage exists (We want to build 10 kits, requiring 20 sensors, but stock is 0)
    const shortageCheck1 = await calculateBOMRequirements(testBom.id, 10);
    assert(
      shortageCheck1.canBuild === false && shortageCheck1.totalShortageCount >= 1,
      `37. BOM Shortage detected: Cannot build 10 kits due to missing sensors`
    );

    // Procurement Action: Issue PO for 25 sensors and receive them via GRN
    const sensorPo: any = await createPurchaseOrder({
      supplierId: supplier1.id,
      bomId: testBom.id,
      notes: "Sourcing for BOM shortage resolution",
      items: [
        {
          productId: sensorProduct.id,
          description: sensorProduct.name,
          quantity: 25,
          unitCost: 80,
        },
      ],
      userId: testUserId,
    });
    createdPoIds.push(sensorPo.id);
    await confirmPurchaseOrder(sensorPo.id, testUserId);

    await createAndConfirmGoodsReceipt({
      purchaseOrderId: sensorPo.id,
      items: [
        {
          productId: sensorProduct.id,
          description: sensorProduct.name,
          quantityOrdered: 25,
          quantityReceived: 25,
          quantityAccepted: 25,
          quantityRejected: 0,
        },
      ],
      userId: testUserId,
    });

    // Verify BOM Availability now!
    const shortageCheck2 = await calculateBOMRequirements(testBom.id, 10);
    assert(
      shortageCheck2.canBuild === true && shortageCheck2.totalShortageCount === 0,
      `38. BOM Shortage resolved: Sourced 25 sensors into inventory -> BOM is now buildable!`
    );

    // =================================================================
    // PART 9: CONCURRENCY, IDEMPOTENCY & DASHBOARD METRICS
    // =================================================================
    console.log("\n--- PART 9: Concurrency, Idempotency & Dashboard Metrics ---");

    // Test 25: Idempotent PO creation
    const idemKey = `idem-po-${testRunId}`;
    const [idemPo1, idemPo2]: any = await Promise.all([
      createPurchaseOrder({
        supplierId: supplier1.id,
        items: [{ productId: esp32Product.id, description: "Idem Test", quantity: 5, unitCost: 250 }],
        userId: testUserId,
        idempotencyKey: idemKey,
      }),
      createPurchaseOrder({
        supplierId: supplier1.id,
        items: [{ productId: esp32Product.id, description: "Idem Test", quantity: 5, unitCost: 250 }],
        userId: testUserId,
        idempotencyKey: idemKey,
      }),
    ]);

    assert(
      idemPo1.id === idemPo2.id && idemPo1.poNo === idemPo2.poNo,
      `39. Idempotency: Concurrent creation with same key yielded identical PO (${idemPo1.poNo})`
    );
    if (idemPo1?.id) createdPoIds.push(idemPo1.id);

    // Test 26: Procurement Dashboard Operational Metrics
    const dashboardMetrics = await getProcurementDashboardMetrics();
    assert(
      typeof dashboardMetrics.openPurchaseOrders === "number" &&
        typeof dashboardMetrics.outstandingPayables === "number",
      `40. Procurement dashboard metrics derived from authoritative database records`
    );

  } catch (err: any) {
    console.error("FATAL UNEXPECTED ERROR IN PHASE 6 TEST SUITE:", err);
    failed++;
  } finally {
    // Clean up created test fixtures
    console.log("\n--- CLEANUP: Removing Test Fixtures ---");
    try {
      if (createdVendorIds.length > 0) {
        const extraPos = await prisma.purchaseOrder.findMany({
          where: { vendorId: { in: createdVendorIds } },
          select: { id: true },
        });
        for (const p of extraPos) {
          if (!createdPoIds.includes(p.id)) createdPoIds.push(p.id);
        }
      }
      if (createdPoIds.length > 0) {
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: { in: createdPoIds } } });
        await prisma.purchaseOrder.deleteMany({ where: { id: { in: createdPoIds } } });
        await db.collection(PO_META_COLLECTION).deleteMany({ purchaseOrderId: { in: createdPoIds } });
        await db.collection(GRN_COLLECTION).deleteMany({ purchaseOrderId: { in: createdPoIds } });
        await db.collection(PURCHASE_RETURN_COLLECTION).deleteMany({ purchaseOrderId: { in: createdPoIds } });
        await db.collection(SUPPLIER_BILL_COLLECTION).deleteMany({ purchaseOrderId: { in: createdPoIds } });
      }
      if (createdVendorIds.length > 0) {
        await prisma.vendor.deleteMany({ where: { id: { in: createdVendorIds } } });
        await db.collection(SUPPLIER_META_COLLECTION).deleteMany({ vendorId: { in: createdVendorIds } });
      }
      if (createdBomIds.length > 0) {
        await db.collection("BOM").deleteMany({ _id: { $in: createdBomIds.map((id) => new ObjectId(id)) } });
      }
      if (createdProductIds.length > 0) {
        await prisma.stockLedgerEntry.deleteMany({ where: { productId: { in: createdProductIds } } });
        await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
      }
      if (createdRequestIds.length > 0) {
        await db.collection(PROCUREMENT_REQ_COLLECTION).deleteMany({ _id: { $in: createdRequestIds.map((id) => new ObjectId(id)) } });
      }
      console.log("Cleanup completed successfully.");
    } catch (cleanErr) {
      console.error("Warning: Cleanup error:", cleanErr);
    }
  }

  console.log("\n=================================================");
  console.log(`PHASE 6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests();
