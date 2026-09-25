/**
 * TAMIZHTECH ERP 2.0 — PHASE 3 AUTOMATED TEST SUITE
 * 
 * Verifies:
 * - Part A: Robotics BOM / Kit Assembly (Versioning, Circular Protection, Shortages, Atomic Production, Costing)
 * - Part B: Delivery Challan / Gate Pass (Authoritative Sequences, Lifecycle, PDF, Stock Isolation)
 * - Zero-Mock Policy, Financial Integrity, and Audit Logging
 */

import prisma from "../lib/prisma";
import { getMongoDb } from "../lib/mongodb";
import { ObjectId } from "mongodb";
import {
  createBOM,
  activateBOM,
  archiveBOM,
  getBOMById,
  calculateBOMRequirements,
  executeBOMAssembly,
  detectCircularDependency,
} from "../lib/bomService";
import {
  createDeliveryChallan,
  issueDeliveryChallan,
  cancelDeliveryChallan,
  getDeliveryChallanById,
} from "../lib/challanService";
import { allocateChallanNo, generateDraftChallanNo } from "../lib/sequence";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { DeliveryChallanPDFTemplate } from "../components/challans/DeliveryChallanPDFTemplate";

async function runPhase3Tests() {
  console.log("=================================================");
  console.log("TAMIZHTECH ERP 2.0 — PHASE 3 TEST SUITE");
  console.log("Robotics BOM Kit Assembly & Delivery Challans");
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
  let testParentProduct: any = null;
  let testCompA: any = null;
  let testCompB: any = null;
  let testClient: any = null;
  let testBom1: any = null;
  let testBom2: any = null;
  let createdChallanId: string | null = null;

  try {
    // -----------------------------------------------------------------
    // SETUP: Create isolated test product and components
    // -----------------------------------------------------------------
    testParentProduct = await prisma.product.create({
      data: {
        name: `Robotics Autonomous Rover ${testRunId}`,
        sku: `TEST-ROV-${testRunId}`,
        type: "FINISHED_PRODUCT",
        category: "ROBOTICS",
        basePrice: 25000,
        stockQuantity: 0,
        stockQuantityMinor: 0,
        quantityScale: 1,
      },
    });

    testCompA = await prisma.product.create({
      data: {
        name: `High-Torque DC Motor ${testRunId}`,
        sku: `TEST-MTR-${testRunId}`,
        type: "COMPONENT",
        category: "ELECTRONICS",
        basePrice: 850,
        stockQuantity: 10,
        stockQuantityMinor: 10,
        quantityScale: 1,
      },
    });

    testCompB = await prisma.product.create({
      data: {
        name: `Motor Driver Board ${testRunId}`,
        sku: `TEST-DRV-${testRunId}`,
        type: "COMPONENT",
        category: "ELECTRONICS",
        basePrice: 1200,
        stockQuantity: 5,
        stockQuantityMinor: 5,
        quantityScale: 1,
      },
    });

    testClient = await prisma.client.create({
      data: {
        name: `Test Client Robotics Lab ${testRunId}`,
        clientCode: `TT-TEST-${testRunId}`,
        phone: "+919876543210",
        mobileNormalized: `9876543210_${testRunId}`,
        email: `test-${testRunId}@tamizhtech.in`,
        address: "Site 42, Aerodrome Tech Park",
        city: "Coimbatore",
        state: "Tamil Nadu",
        pincode: "641014",
      },
    });

    // =================================================================
    // PART A: ROBOTICS BILL OF MATERIALS (BOM) TESTS
    // =================================================================
    console.log("--- PART A.1: BOM Creation, Versioning & Lifecycle ---");

    // 1. Create DRAFT BOM
    testBom1 = await createBOM({
      parentProductId: testParentProduct.id,
      status: "DRAFT",
      notes: "Initial prototype recipe",
      items: [
        { componentProductId: testCompA.id, quantity: 2, unit: "nos" },
        { componentProductId: testCompB.id, quantity: 1, unit: "pcs" },
      ],
    });

    assert(testBom1.id && testBom1.version === 1, "BOM v1 created with version 1");
    assert(testBom1.status === "DRAFT", "BOM initially created with DRAFT status");
    assert(testBom1.items.length === 2, "BOM contains exactly 2 components");

    // 2. Activate BOM
    const activatedBom1 = await activateBOM(testBom1.id);
    assert(activatedBom1.status === "ACTIVE", "BOM status transitions to ACTIVE upon activation");
    assert(activatedBom1.effectiveFrom instanceof Date, "EffectiveFrom timestamp recorded");

    // 3. Versioning: Create BOM v2 for the same parent product
    testBom2 = await createBOM({
      parentProductId: testParentProduct.id,
      status: "ACTIVE",
      notes: "Upgraded v2 recipe",
      items: [
        { componentProductId: testCompA.id, quantity: 4, unit: "nos" },
        { componentProductId: testCompB.id, quantity: 1, unit: "pcs" },
      ],
    });

    assert(testBom2.version === 2, "New BOM automatically increments version to 2");
    assert(testBom2.status === "ACTIVE", "BOM v2 is now ACTIVE");

    // Check that BOM v1 was automatically archived
    const fetchedBom1 = await getBOMById(testBom1.id);
    assert(fetchedBom1?.status === "ARCHIVED", "Previous BOM v1 automatically archived on v2 activation");
    assert(fetchedBom1?.effectiveTo instanceof Date, "Historical effectiveTo recorded on archived BOM v1");

    // 4. Archive BOM
    const archivedBom2 = await archiveBOM(testBom2.id);
    assert(archivedBom2.status === "ARCHIVED", "BOM v2 successfully archived on demand");

    // Re-activate BOM v1 for subsequent production tests
    await activateBOM(testBom1.id);
    const reactivatedBom1 = await getBOMById(testBom1.id);
    assert(reactivatedBom1?.status === "ACTIVE", "BOM v1 successfully reactivated");

    console.log("\n--- PART A.2: Circular Dependency Protection ---");

    // 5. Direct Self-Dependency Rejection
    let selfDepFailed = false;
    try {
      await createBOM({
        parentProductId: testParentProduct.id,
        items: [{ componentProductId: testParentProduct.id, quantity: 1 }],
      });
    } catch (err: any) {
      selfDepFailed = err.message.includes("Parent product cannot be its own component") ||
                      err.message.includes("Circular dependency");
    }
    assert(selfDepFailed, "Direct self-dependency (A -> A) rejected with clear error");

    // 6. Deep Circular Dependency: Parent A uses Component B; Component B has active BOM using Parent A
    let deepCycleFailed = false;
    try {
      await detectCircularDependency(testCompA.id, [
        { componentProductId: testParentProduct.id, quantity: 1 },
      ]);
    } catch (err: any) {
      deepCycleFailed = err.message.includes("Circular dependency detected");
    }
    assert(deepCycleFailed, "Indirect cycle (A -> B -> A) rejected via DFS graph cycle detection");

    console.log("\n--- PART A.3: Component Requirements & Live Shortage Calculation ---");

    // 7. Calculate requirements for Build Quantity = 2
    // BOM v1: CompA = 2 per unit, CompB = 1 per unit
    // Available: CompA = 10, CompB = 5
    // Required for 2 units: CompA = 4, CompB = 2
    const reqsSufficient = await calculateBOMRequirements(testBom1.id, 2);
    assert(reqsSufficient.buildQuantity === 2, "Target build quantity recorded as 2");
    assert(reqsSufficient.canBuild === true, "canBuild is TRUE when stock is sufficient");
    assert(reqsSufficient.totalShortageCount === 0, "Zero shortage count when stock is sufficient");

    const compAReq = reqsSufficient.components.find((c) => c.componentProductId === testCompA.id);
    assert(compAReq?.totalRequiredQty === 4, "Comp A requires exactly 4 units (2 x 2)");
    assert(compAReq?.shortageQty === 0, "Comp A shortage is 0");

    // 8. Calculate requirements for Build Quantity = 10 (Insufficient Stock)
    // Required for 10 units: CompA = 20 (avail 10 -> short 10), CompB = 10 (avail 5 -> short 5)
    const reqsInsufficient = await calculateBOMRequirements(testBom1.id, 10);
    assert(reqsInsufficient.canBuild === false, "canBuild is FALSE when stock is insufficient");
    assert(reqsInsufficient.totalShortageCount === 2, "Identified shortages in both components");
    const compAShortage = reqsInsufficient.components.find((c) => c.componentProductId === testCompA.id);
    assert(compAShortage?.shortageQty === 10, "Comp A correctly flags shortage of 10 units");

    console.log("\n--- PART A.4: Atomic Kit Assembly & Stock Ledger Immutability ---");

    // 9. Rejection on Insufficient Stock
    let assemblyShortageBlocked = false;
    try {
      await executeBOMAssembly({
        bomId: testBom1.id,
        buildQuantity: 10, // Exceeds available stock
      });
    } catch (err: any) {
      assemblyShortageBlocked = err.message.includes("Insufficient stock");
    }
    assert(assemblyShortageBlocked, "Assembly blocked when components have insufficient inventory");

    // 10. Successful Atomic Assembly for 2 units
    // Initial Stock: Parent = 0, CompA = 10, CompB = 5
    const prodRecord = await executeBOMAssembly({
      bomId: testBom1.id,
      buildQuantity: 2,
      directCost: 500, // ₹500 direct assembly cost
      notes: "Test Assembly Run #1",
      userId: "000000000000000000000001",
      idempotencyKey: `IDEM-BOM-${testRunId}`,
    });

    assert(prodRecord && (prodRecord as any).productionNo, "Production record created with official productionNo");

    // Check Parent Product Stock Incremented
    const updatedParent = await prisma.product.findUnique({ where: { id: testParentProduct.id } });
    assert(updatedParent?.stockQuantity === 2, "Parent product stock atomically increased by 2");

    // Check Component Stocks Decremented
    const updatedCompA = await prisma.product.findUnique({ where: { id: testCompA.id } });
    const updatedCompB = await prisma.product.findUnique({ where: { id: testCompB.id } });
    assert(updatedCompA?.stockQuantity === 6, "Comp A stock decremented from 10 to 6 (-4)");
    assert(updatedCompB?.stockQuantity === 3, "Comp B stock decremented from 5 to 3 (-2)");

    // 11. Verify Stock Ledger Entries (Immutable Audit)
    const parentLedger = await prisma.stockLedgerEntry.findFirst({
      where: { productId: testParentProduct.id, referenceId: prodRecord.id },
    });
    assert(parentLedger?.type === "PRODUCTION", "Parent product received PRODUCTION stock ledger entry");
    assert(parentLedger?.quantitySigned === 2, "Parent product ledger signed quantity is positive (+2)");

    const compALedger = await prisma.stockLedgerEntry.findFirst({
      where: { productId: testCompA.id, referenceId: prodRecord.id },
    });
    assert(compALedger?.type === "PRODUCTION_CONSUMPTION", "Component A received PRODUCTION_CONSUMPTION ledger entry");
    assert(compALedger?.quantitySigned === -4, "Component A ledger signed quantity is negative (-4)");

    // 12. Idempotency Check: Calling with identical idempotencyKey returns existing record without double-decrement
    const idemProd = await executeBOMAssembly({
      bomId: testBom1.id,
      buildQuantity: 2,
      userId: "000000000000000000000001",
      idempotencyKey: `IDEM-BOM-${testRunId}`,
    });
    assert(idemProd.id === prodRecord.id, "Idempotent assembly call safely returns existing production record");

    const recheckParent = await prisma.product.findUnique({ where: { id: testParentProduct.id } });
    assert(recheckParent?.stockQuantity === 2, "Parent stock was NOT duplicated on idempotent retry");

    // 13. Financial Integrity: Selling price is never mutated by production
    assert(updatedParent?.basePrice === 25000, "Selling price (basePrice) preserved untouched by production costing");

    // =================================================================
    // PART B: DELIVERY CHALLAN / GATE PASS TESTS
    // =================================================================
    console.log("\n--- PART B.1: Delivery Challan Lifecycle & Sequence Allocation ---");

    // 14. Draft Challan Number Format
    const draftNo = generateDraftChallanNo();
    assert(draftNo.startsWith("DRAFT-DC-"), "Draft challan allocated provisional DRAFT-DC-YYYY-XXXX number");

    // 15. Create Draft Delivery Challan
    const draftChallan = await createDeliveryChallan({
      clientId: testClient.id,
      purpose: "DEMONSTRATION",
      status: "DRAFT",
      transportMode: "Hand Delivery",
      destination: "Client Innovation Hub, Peelamedu, Coimbatore",
      items: [
        {
          productId: testParentProduct.id,
          sku: testParentProduct.sku,
          description: "Autonomous Rover Demo Unit",
          quantity: 1,
          unit: "unit",
        },
      ],
      deductStock: false, // Paperwork only
    });
    createdChallanId = draftChallan.id;

    assert(draftChallan.status === "DRAFT", "Delivery Challan created in DRAFT status");
    assert(draftChallan.challanNumber.startsWith("DRAFT-DC-"), "Draft challan retains provisional draft number");
    assert(draftChallan.destination === "Client Innovation Hub, Peelamedu, Coimbatore", "Custom destination preserved");

    // 16. Issue Delivery Challan (Allocates official permanent TTRC-DC-YYYY-XXXX)
    const issuedChallan = await issueDeliveryChallan(draftChallan.id);
    assert(issuedChallan.status === "ISSUED", "Challan status transitioned to ISSUED");
    assert(issuedChallan.challanNumber.startsWith("TTRC-DC-"), "Official TTRC-DC-YYYY-XXXX number assigned atomically");
    assert(issuedChallan.issuedAt instanceof Date, "Issue timestamp permanently recorded");

    // 17. Sequence Uniqueness: Next allocated challan number is sequential and distinct
    const nextOfficialNo = await allocateChallanNo();
    assert(nextOfficialNo.startsWith("TTRC-DC-"), "Second allocated challan number follows official prefix");
    assert(nextOfficialNo !== issuedChallan.challanNumber, "Allocated challan numbers are strictly unique");

    // 18. Cancel Delivery Challan
    const cancelledChallan = await cancelDeliveryChallan(draftChallan.id, "Client rescheduled demo");
    assert(cancelledChallan.status === "CANCELLED", "Challan status transitioned to CANCELLED");
    assert(cancelledChallan.challanNumber === issuedChallan.challanNumber, "Cancelled challan permanently retains its number");
    assert(cancelledChallan.cancelReason === "Client rescheduled demo", "Cancel reason recorded");

    console.log("\n--- PART B.2: Stock Impact & Duplicate Deduction Isolation ---");

    // 19. Paperwork Challan: When deductStock = false, stock is NOT decremented
    const stockBeforePaperwork = (await prisma.product.findUnique({ where: { id: testParentProduct.id } }))?.stockQuantity;
    const paperworkChallan = await createDeliveryChallan({
      clientId: testClient.id,
      purpose: "PROJECT_DELIVERY",
      status: "ISSUED",
      deductStock: false, // Paperwork only
      items: [
        {
          productId: testParentProduct.id,
          description: "Rover Unit Paperwork",
          quantity: 1,
        },
      ],
    });
    const stockAfterPaperwork = (await prisma.product.findUnique({ where: { id: testParentProduct.id } }))?.stockQuantity;
    assert(stockBeforePaperwork === stockAfterPaperwork, "Paperwork challan (deductStock=false) did NOT mutate stock");

    // 20. Physical Dispatch Challan: When deductStock = true, stock IS decremented atomically
    const stockBeforeDispatch = (await prisma.product.findUnique({ where: { id: testParentProduct.id } }))?.stockQuantity ?? 0;
    const dispatchChallan = await createDeliveryChallan({
      clientId: testClient.id,
      purpose: "CUSTOMER_SITE",
      status: "ISSUED",
      deductStock: true, // Physical Dispatch
      items: [
        {
          productId: testParentProduct.id,
          description: "Rover Unit Physical Dispatch",
          quantity: 1,
        },
      ],
    });

    const stockAfterDispatch = (await prisma.product.findUnique({ where: { id: testParentProduct.id } }))?.stockQuantity ?? 0;
    assert(stockAfterDispatch === stockBeforeDispatch - 1, "Physical dispatch challan decremented product stock by 1");

    // Verify DISPATCH ledger entry created
    const dispatchLedger = await prisma.stockLedgerEntry.findFirst({
      where: { referenceType: "DELIVERY_CHALLAN", referenceId: dispatchChallan.id, type: "DISPATCH" },
    });
    assert(dispatchLedger?.quantitySigned === -1, "DISPATCH stock ledger entry created with negative signed quantity (-1)");

    // 21. Reversal on Cancellation: Cancelling physical dispatch returns stock
    await cancelDeliveryChallan(dispatchChallan.id, "Gate entry permit denied");
    const stockAfterCancel = (await prisma.product.findUnique({ where: { id: testParentProduct.id } }))?.stockQuantity ?? 0;
    assert(stockAfterCancel === stockBeforeDispatch, "Cancelling physical dispatch safely restored inventory to original count");

    const returnLedger = await prisma.stockLedgerEntry.findFirst({
      where: { referenceType: "DELIVERY_CHALLAN", referenceId: dispatchChallan.id, type: "DISPATCH_RETURN" },
    });
    assert(returnLedger?.quantitySigned === 1, "Compensating DISPATCH_RETURN stock ledger entry recorded (+1)");

    console.log("\n--- PART B.3: Delivery Challan PDF Generation ---");

    // 22. PDF Render Test
    const fetchedDetailChallan = await getDeliveryChallanById(dispatchChallan.id);
    const pdfStream = await renderToStream(
      React.createElement(DeliveryChallanPDFTemplate, {
        challan: fetchedDetailChallan,
        client: testClient,
      }) as any
    );

    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream as any) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    assert(pdfBuffer.length > 5000, `Delivery Challan PDF generated (${pdfBuffer.length} bytes)`);
    assert(pdfBuffer.subarray(0, 5).toString("utf-8") === "%PDF-", "PDF output starts with valid %PDF- magic header");

    console.log("\n--- PART C: Audit Trail & Negative Stock Protection ---");

    // 23. BOM & Challan Audit Entries
    const auditEntries = await prisma.auditLog.findMany({
      where: {
        module: { in: ["BOM", "DELIVERY_CHALLAN"] },
      },
      take: 10,
    });
    assert(auditEntries.length > 0, "Audit trail records captured for BOM and Delivery Challan operations");

    // 24. Negative Stock Protection Verification
    let negDispatchBlocked = false;
    try {
      await createDeliveryChallan({
        clientId: testClient.id,
        purpose: "CUSTOMER_SITE",
        status: "ISSUED",
        deductStock: true,
        items: [
          {
            productId: testParentProduct.id,
            description: "Excess Quantity",
            quantity: 9999, // Exceeds all inventory
          },
        ],
      });
    } catch (err: any) {
      negDispatchBlocked = err.message.includes("Insufficient stock");
    }
    assert(negDispatchBlocked, "Negative stock physically blocked during dispatch issuance");

  } finally {
    // -----------------------------------------------------------------
    // CLEANUP: Clean up test fixtures to maintain zero-mock policy
    // -----------------------------------------------------------------
    try {
      if (testBom1?.id) await db.collection("BOM").deleteOne({ _id: new ObjectId(testBom1.id) });
      if (testBom2?.id) await db.collection("BOM").deleteOne({ _id: new ObjectId(testBom2.id) });
      if (createdChallanId) await db.collection("DeliveryChallan").deleteOne({ _id: new ObjectId(createdChallanId) });
      await db.collection("DeliveryChallan").deleteMany({ clientId: testClient?.id });
      await db.collection("BOM").deleteMany({ parentProductId: testParentProduct?.id });

      if (testParentProduct?.id) {
        await prisma.stockLedgerEntry.deleteMany({
          where: { productId: { in: [testParentProduct.id, testCompA?.id, testCompB?.id].filter(Boolean) } },
        });
        await prisma.productionItem.deleteMany({
          where: { inputProductId: { in: [testCompA?.id, testCompB?.id].filter(Boolean) } },
        });
        await prisma.productionRecord.deleteMany({
          where: { finishedProductId: testParentProduct.id },
        });
        await prisma.product.deleteMany({
          where: { id: { in: [testParentProduct.id, testCompA?.id, testCompB?.id].filter(Boolean) } },
        });
      }
      if (testClient?.id) {
        await prisma.client.delete({ where: { id: testClient.id } }).catch(() => null);
      }
    } catch (cleanErr) {
      console.error("Cleanup error:", cleanErr);
    }
  }

  console.log("\n=================================================");
  console.log(`PHASE 3 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase3Tests().catch((err) => {
  console.error("Phase 3 Test Suite Unhandled Error:", err);
  process.exit(1);
});
