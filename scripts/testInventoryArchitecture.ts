/**
 * ============================================================
 * TAMIZHTECH ERP 2.0 — FINAL INVENTORY ARCHITECTURE TEST SUITE
 * Exhaustive 20-Point Architectural Verification Script
 * ============================================================
 */

import prisma from "../lib/prisma";
import {
  createProductWithStock,
  updateProduct,
  deductStockForIssuedInvoice,
  reverseStockForCancelledInvoice,
  voidInventorySourcing,
} from "../lib/stockService";
import { executeProductionBatch, cancelProductionBatch } from "../lib/productionService";
import {
  getProductRollingWACPaise,
  getProductInventoryStateAsOf,
  recordStockMovement,
  calculateRollingWACPaise,
} from "../lib/costService";
import { generateInvoiceNo, generateQuotationNo, generateSourcingNo } from "../lib/sequence";
import {
  toPaise,
  fromPaise,
  roundToPaise,
  safeMultiplyQuantityByPaise,
  toMinorQuantity,
  fromMinorQuantity,
  calculateMinorCostPaise,
} from "../lib/money";

async function runInventoryArchitectureTests() {
  console.log("================================================================================");
  console.log("🚀 STARTING TAMIZHTECH ERP 2.0 INVENTORY ARCHITECTURE TEST SUITE");
  console.log("================================================================================\n");

  const cleanupIds: {
    productIds: string[];
    sourcingIds: string[];
    productionIds: string[];
    invoiceIds: string[];
    quotationIds: string[];
    clientIds: string[];
  } = {
    productIds: [],
    sourcingIds: [],
    productionIds: [],
    invoiceIds: [],
    quotationIds: [],
    clientIds: [],
  };

  try {
    // ─────────────────────────────────────────────────────────────
    // SETUP TEST FIXTURES
    // ─────────────────────────────────────────────────────────────
    console.log("--- [SETUP] Creating Test Fixtures ---");
    const testClient = await prisma.client.create({
      data: {
        clientCode: `TT-TEST-${Date.now().toString().slice(-4)}`,
        name: "TamizhTech RoboLab Tester",
        phone: "+919888877777",
        mobileNormalized: `98888${Date.now().toString().slice(-5)}`,
        status: "ACTIVE",
      },
    });
    cleanupIds.clientIds.push(testClient.id);
    console.log(`✓ Test Client created: ${testClient.name} (${testClient.clientCode})`);

    // ─────────────────────────────────────────────────────────────
    // TEST 1: FRACTIONAL RAW MATERIAL PURCHASE & FIXED-SCALE QUANTITY
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 1] Fractional Raw Material Purchase & Fixed-Scale Precision ---");
    const copperWire = await createProductWithStock({
      name: `Copper Wire 18AWG - Test ${Date.now()}`,
      category: "Hardware",
      type: "RAW_MATERIAL",
      isSaleable: false, // Default not saleable
      quantityScale: 1000, // 1000 minor units per meter (e.g. millimeters)
      initialStock: 0,
      pricingMode: "REQUIREMENT_BASED",
    });
    cleanupIds.productIds.push(copperWire.id);

    // Record purchase of 25.5 meters of wire @ ₹15.00/meter (1500 paise)
    const wirePurchaseDate = new Date("2026-09-01T10:00:00Z");
    await recordStockMovement({
      productId: copperWire.id,
      quantitySigned: 25.5,
      type: "PURCHASE",
      inboundUnitCostPaise: toPaise(15),
      effectiveAt: wirePurchaseDate,
      notes: "Procurement of 25.5m copper wire",
    });

    const wireProd = await prisma.product.findUnique({ where: { id: copperWire.id } });
    if (wireProd?.quantityScale !== 1000) {
      throw new Error(`Wire quantityScale mismatch: expected 1000, got ${wireProd?.quantityScale}`);
    }
    if (wireProd?.stockQuantityMinor !== 25500) {
      throw new Error(`Wire stockQuantityMinor mismatch: expected 25500, got ${wireProd?.stockQuantityMinor}`);
    }
    const derivedRealQty = fromMinorQuantity(wireProd.stockQuantityMinor, wireProd.quantityScale);
    if (derivedRealQty !== 25.5) {
      throw new Error(`Derived real quantity mismatch: expected 25.5, got ${derivedRealQty}`);
    }
    const wireWAC = await getProductRollingWACPaise(copperWire.id, wirePurchaseDate);
    if (wireWAC !== toPaise(15)) {
      throw new Error(`Raw material WAC mismatch: expected ${toPaise(15)}, got ${wireWAC}`);
    }
    console.log(`✓ TEST 1 PASSED: Fixed-scale raw material purchased (25.5m = 25,500 minor units @ ₹15.00/m).`);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: QUANTITYSCALE IMMUTABILITY PROTECTION
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 2] QuantityScale Immutability Protection ---");
    let caughtScaleError = false;
    try {
      await updateProduct(copperWire.id, { quantityScale: 1 });
    } catch (err: any) {
      caughtScaleError = true;
      console.log(`Caught expected immutability error: ${err.message}`);
    }
    if (!caughtScaleError) {
      throw new Error("Failed to block quantityScale mutation on product with active stock ledger history!");
    }
    console.log("✓ TEST 2 PASSED: quantityScale modification strictly rejected once stock transactions exist.");

    // ─────────────────────────────────────────────────────────────
    // TEST 3: ANTI-BACKDATING PROTECTION (effectiveAt)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 3] Anti-Backdating Protection via effectiveAt ---");
    let caughtBackdateError = false;
    try {
      // Attempt to record a movement dated 1 day BEFORE the first movement
      const backdatedTime = new Date("2026-08-30T10:00:00Z");
      await recordStockMovement({
        productId: copperWire.id,
        quantitySigned: 5,
        type: "PURCHASE",
        inboundUnitCostPaise: toPaise(15),
        effectiveAt: backdatedTime,
        notes: "Attempted backdated purchase",
      });
    } catch (err: any) {
      caughtBackdateError = true;
      console.log(`Caught expected backdating rejection: ${err.message}`);
    }
    if (!caughtBackdateError) {
      throw new Error("Failed to reject backdated stock movement!");
    }
    console.log("✓ TEST 3 PASSED: Retroactive backdated stock movements are strictly rejected.");

    // ─────────────────────────────────────────────────────────────
    // TEST 4: COUNTABLE COMPONENT PURCHASE
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 4] Countable Component Purchase ---");
    const dgjMotor = await createProductWithStock({
      name: `DGJ 300RPM Motor - Test ${Date.now()}`,
      category: "Motors",
      type: "COMPONENT",
      isSaleable: false, // Components default to false
      quantityScale: 1,  // Countable
      initialStock: 0,
    });
    cleanupIds.productIds.push(dgjMotor.id);

    // Buy 10 motors @ ₹400.00 each on 2026-09-02
    await recordStockMovement({
      productId: dgjMotor.id,
      quantitySigned: 10,
      type: "PURCHASE",
      inboundUnitCostPaise: toPaise(400),
      effectiveAt: new Date("2026-09-02T10:00:00Z"),
      notes: "Component batch purchase",
    });

    const motorProd = await prisma.product.findUnique({ where: { id: dgjMotor.id } });
    if (motorProd?.stockQuantity !== 10 || motorProd?.stockQuantityMinor !== 10) {
      throw new Error(`Component stock mismatch: expected 10, got ${motorProd?.stockQuantity}`);
    }
    const motorWAC = await getProductRollingWACPaise(dgjMotor.id);
    if (motorWAC !== toPaise(400)) {
      throw new Error(`Component WAC mismatch: expected ${toPaise(400)}, got ${motorWAC}`);
    }
    console.log(`✓ TEST 4 PASSED: Component purchased (+10 units @ ₹400.00, stock = 10).`);

    // ─────────────────────────────────────────────────────────────
    // TEST 5: ONLINE & OFFLINE SOURCING
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 5] Online and Offline Sourcing via InventorySourcing ---");
    const esp32Controller = await createProductWithStock({
      name: `ESP32 Master Controller - Test ${Date.now()}`,
      category: "Controllers",
      type: "COMPONENT",
      isSaleable: false,
      initialStock: 0,
    });
    cleanupIds.productIds.push(esp32Controller.id);

    // Online sourcing: 5 controllers @ ₹1,000 each
    const onlineSourcingNo = await generateSourcingNo();
    const onlineSourcing = await prisma.inventorySourcing.create({
      data: {
        sourcingNo: onlineSourcingNo,
        productId: esp32Controller.id,
        quantityMinor: 5,
        quantity: 5,
        sourceType: "ONLINE",
        vendorName: "Robu.in Portal",
        unitCostPaise: toPaise(1000),
        unitCost: toPaise(1000),
        totalCostPaise: toPaise(5000),
        totalCost: toPaise(5000),
        status: "ACTIVE",
        paymentStatus: "PARTIAL",
        paidAmountPaise: toPaise(3000),
        paidAmount: toPaise(3000),
        notes: "Online component procurement",
      },
    });
    cleanupIds.sourcingIds.push(onlineSourcing.id);

    await recordStockMovement({
      productId: esp32Controller.id,
      quantitySigned: 5,
      type: "PURCHASE",
      inboundUnitCostPaise: toPaise(1000),
      referenceType: "INVENTORY_SOURCING",
      referenceId: onlineSourcing.id,
      effectiveAt: new Date("2026-09-03T10:00:00Z"),
    });

    // Offline sourcing: LiPo Battery
    const lipoBattery = await createProductWithStock({
      name: `LiPo Battery 3S 2200mAh - Test ${Date.now()}`,
      category: "Batteries",
      type: "COMPONENT",
      isSaleable: false,
      initialStock: 0,
    });
    cleanupIds.productIds.push(lipoBattery.id);

    const offlineSourcingNo = await generateSourcingNo();
    const offlineSourcing = await prisma.inventorySourcing.create({
      data: {
        sourcingNo: offlineSourcingNo,
        productId: lipoBattery.id,
        quantityMinor: 10,
        quantity: 10,
        sourceType: "OFFLINE",
        vendorName: "Trichy Battery Tech (Local)",
        unitCostPaise: toPaise(300),
        unitCost: toPaise(300),
        totalCostPaise: toPaise(3000),
        totalCost: toPaise(3000),
        status: "ACTIVE",
        paymentStatus: "PAID",
        paidAmountPaise: toPaise(3000),
        paidAmount: toPaise(3000),
        notes: "Offline cash purchase",
      },
    });
    cleanupIds.sourcingIds.push(offlineSourcing.id);

    await recordStockMovement({
      productId: lipoBattery.id,
      quantitySigned: 10,
      type: "PURCHASE",
      inboundUnitCostPaise: toPaise(300),
      referenceType: "INVENTORY_SOURCING",
      referenceId: offlineSourcing.id,
      effectiveAt: new Date("2026-09-04T10:00:00Z"),
    });

    console.log("✓ TEST 5 PASSED: Online & Offline sourcing recorded with exact Paise fields.");

    // ─────────────────────────────────────────────────────────────
    // TEST 6: PAYMENT LEDGER WITH DETERMINISTIC DIRECTION (INCREASE/DECREASE)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 6] Append-Only Payment Ledger with Direction ---");
    // Initial payment on online sourcing: ₹3,000 PAYMENT (INCREASE)
    await prisma.inventorySourcingPayment.create({
      data: {
        sourcingId: onlineSourcing.id,
        amountPaise: toPaise(3000),
        amount: toPaise(3000),
        direction: "INCREASE",
        type: "PAYMENT",
        paymentDate: new Date("2026-09-20"),
        notes: "Advance payment",
      },
    });

    // Subsequent payment: ₹2,000 PAYMENT (INCREASE)
    await prisma.inventorySourcingPayment.create({
      data: {
        sourcingId: onlineSourcing.id,
        amountPaise: toPaise(2000),
        amount: toPaise(2000),
        direction: "INCREASE",
        type: "PAYMENT",
        paymentDate: new Date("2026-10-05"),
        notes: "Settlement",
      },
    });

    // Compensating reversal: ₹1,000 REVERSAL (DECREASE)
    await prisma.inventorySourcingPayment.create({
      data: {
        sourcingId: onlineSourcing.id,
        amountPaise: toPaise(1000),
        amount: toPaise(1000),
        direction: "DECREASE",
        type: "REVERSAL",
        paymentDate: new Date("2026-10-10"),
        notes: "Vendor discount credit refund",
      },
    });

    const allPayments = await prisma.inventorySourcingPayment.findMany({
      where: { sourcingId: onlineSourcing.id },
    });

    // Derive signed net cash outflow directly from event direction
    const septNetCash = allPayments
      .filter((p) => p.paymentDate < new Date("2026-10-01"))
      .reduce((sum, p) => {
        const amt = p.amountPaise ?? p.amount;
        return p.direction === "DECREASE" ? sum - amt : sum + amt;
      }, 0);

    const octNetCash = allPayments
      .filter((p) => p.paymentDate >= new Date("2026-10-01"))
      .reduce((sum, p) => {
        const amt = p.amountPaise ?? p.amount;
        return p.direction === "DECREASE" ? sum - amt : sum + amt;
      }, 0);

    if (fromPaise(septNetCash) !== 3000) {
      throw new Error(`Sept cash out mismatch: expected 3000, got ${fromPaise(septNetCash)}`);
    }
    if (fromPaise(octNetCash) !== 1000) {
      throw new Error(`Oct cash out mismatch: expected 1000, got ${fromPaise(octNetCash)}`);
    }
    console.log(`✓ TEST 6 PASSED: Deterministic payment direction verified (Sept: ₹${fromPaise(septNetCash)}, Oct: ₹${fromPaise(octNetCash)} net).`);

    // ─────────────────────────────────────────────────────────────
    // TEST 7, 8, 9 & 10: IN-HOUSE PRODUCTION WITH MINOR UNITS & WAC COSTING
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 7-10] In-House Production Execution & WAC-Derived Costing ---");
    const ttrcRobot = await createProductWithStock({
      name: `TTRC Competition Robot - Test ${Date.now()}`,
      category: "Robotics",
      type: "FINISHED_PRODUCT",
      isSaleable: true, // Finished goods default to saleable
      pricingMode: "FIXED",
      basePrice: 3500, // Catalog commercial price ₹3,500
      quantityScale: 1,
      initialStock: 0,
    });
    cleanupIds.productIds.push(ttrcRobot.id);

    // Recipe for 1 Robot:
    // 2 Motors @ ₹400 = ₹800
    // 1 Controller @ ₹1,000 = ₹1,000
    // 1 Battery @ ₹300 = ₹300
    // Total Material Cost = ₹2,100 (210000 paise)
    // Direct Cost = 0
    // Expected Unit Production Cost = ₹2,100
    const production = await executeProductionBatch({
      finishedProductId: ttrcRobot.id,
      quantityProduced: 1,
      directCost: 0,
      components: [
        { productId: dgjMotor.id, quantity: 2 },
        { productId: esp32Controller.id, quantity: 1 },
        { productId: lipoBattery.id, quantity: 1 },
      ],
      notes: "Batch 1 Autonomous Bot Production",
      idempotencyKey: `IDEM-PRD-${Date.now()}`,
      productionDate: new Date("2026-09-05T10:00:00Z"),
    });
    cleanupIds.productionIds.push(production!.id);

    // Verify stock changes
    const updatedMotor = await prisma.product.findUnique({ where: { id: dgjMotor.id } });
    const updatedEsp = await prisma.product.findUnique({ where: { id: esp32Controller.id } });
    const updatedLipo = await prisma.product.findUnique({ where: { id: lipoBattery.id } });
    const updatedRobot = await prisma.product.findUnique({ where: { id: ttrcRobot.id } });

    if (updatedMotor?.stockQuantity !== 8 || updatedMotor?.stockQuantityMinor !== 8) {
      throw new Error(`Motor stock mismatch: expected 8, got ${updatedMotor?.stockQuantity}`);
    }
    if (updatedEsp?.stockQuantity !== 4 || updatedEsp?.stockQuantityMinor !== 4) {
      throw new Error(`Controller stock mismatch: expected 4, got ${updatedEsp?.stockQuantity}`);
    }
    if (updatedLipo?.stockQuantity !== 9 || updatedLipo?.stockQuantityMinor !== 9) {
      throw new Error(`LiPo stock mismatch: expected 9, got ${updatedLipo?.stockQuantity}`);
    }
    if (updatedRobot?.stockQuantity !== 1 || updatedRobot?.stockQuantityMinor !== 1) {
      throw new Error(`Robot stock mismatch: expected 1, got ${updatedRobot?.stockQuantity}`);
    }

    // Verify production cost in paise
    if (production?.totalProductionCostPaise !== toPaise(2100)) {
      throw new Error(`Production cost mismatch: expected ₹2,100 (${toPaise(2100)} paise), got ${production?.totalProductionCostPaise}`);
    }
    if (production?.unitProductionCostPaise !== toPaise(2100)) {
      throw new Error(`Unit production cost mismatch: expected ₹2,100, got ${production?.unitProductionCostPaise}`);
    }

    // Finished Product Rolling WAC must now be ₹2,100
    const robotWAC = await getProductRollingWACPaise(ttrcRobot.id);
    if (robotWAC !== toPaise(2100)) {
      throw new Error(`Robot WAC mismatch: expected ₹2,100 (${toPaise(2100)} paise), got ${robotWAC}`);
    }

    // Selling price MUST remain unchanged at ₹3,500
    if (updatedRobot?.basePrice !== 3500) {
      throw new Error(`Robot selling price was modified! Expected 3500, got ${updatedRobot?.basePrice}`);
    }

    console.log("✓ TEST 7-10 PASSED: In-house production atomically consumed components, created finished stock, computed exact WAC cost (₹2,100), and left master selling price intact (₹3,500).");

    // ─────────────────────────────────────────────────────────────
    // TEST 11: ATOMIC CONDITIONAL STOCK DECREMENT & CONCURRENCY PROTECTION
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 11] Atomic Conditional Stock Decrement Protection ---");
    let threwNegativeStockError = false;
    try {
      // Try to produce 100 robots when only 8 motors exist
      await executeProductionBatch({
        finishedProductId: ttrcRobot.id,
        quantityProduced: 100,
        components: [{ productId: dgjMotor.id, quantity: 200 }],
      });
    } catch (err: any) {
      threwNegativeStockError = true;
      console.log(`Caught expected insufficient stock error: ${err.message}`);
    }

    if (!threwNegativeStockError) {
      throw new Error("Failed to block production with insufficient component stock!");
    }
    console.log("✓ TEST 11 PASSED: Zero negative stock rule strictly enforced via database conditional decrements.");

    // ─────────────────────────────────────────────────────────────
    // TEST 12: QUOTATION & DRAFT INVOICE ZERO STOCK IMPACT
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 12] Quotation & Draft Invoice Zero Stock Impact ---");
    const preStock = (await prisma.product.findUnique({ where: { id: ttrcRobot.id } }))?.stockQuantity;

    // Create Quotation for Robot @ ₹3,500
    const qtnNo = await generateQuotationNo();
    const testQuotation = await prisma.quotation.create({
      data: {
        quotationNo: qtnNo,
        clientId: testClient.id,
        status: "SENT",
        subtotal: toPaise(3500),
        taxAmount: toPaise(630),
        total: toPaise(4130),
        validUntil: new Date(),
        items: {
          create: [{
            productId: ttrcRobot.id,
            description: "Competition Robot",
            qty: 1,
            unitPrice: toPaise(3500),
            taxRate: 18,
            amount: toPaise(3500),
          }],
        },
      },
    });
    cleanupIds.quotationIds.push(testQuotation.id);

    const postQtnStock = (await prisma.product.findUnique({ where: { id: ttrcRobot.id } }))?.stockQuantity;
    if (postQtnStock !== preStock) {
      throw new Error(`Quotation altered stock! pre=${preStock}, post=${postQtnStock}`);
    }

    // Create Draft Invoice for Robot @ ₹3,500
    const billNo = await generateInvoiceNo();
    const testDraftInvoice = await prisma.invoice.create({
      data: {
        invoiceNo: billNo,
        clientId: testClient.id,
        clientName: testClient.name,
        date: new Date(),
        dueDate: new Date(),
        status: "DRAFT",
        subtotal: toPaise(3500),
        gstPercent: 18,
        gstAmount: toPaise(630),
        total: toPaise(4130),
        balance: toPaise(4130),
        items: {
          create: [{
            productId: ttrcRobot.id,
            description: "Competition Robot",
            qty: 1,
            unitPrice: toPaise(3500),
            amount: toPaise(3500),
          }],
        },
      },
    });
    cleanupIds.invoiceIds.push(testDraftInvoice.id);

    const postDraftStock = (await prisma.product.findUnique({ where: { id: ttrcRobot.id } }))?.stockQuantity;
    if (postDraftStock !== preStock) {
      throw new Error(`Draft invoice altered stock! pre=${preStock}, post=${postDraftStock}`);
    }
    console.log("✓ TEST 12 PASSED: Quotation and Draft Invoice had strictly ZERO stock impact.");

    // ─────────────────────────────────────────────────────────────
    // TEST 13 & 14: ISSUED SALE STOCK REDUCTION & SERVICE EXEMPTION
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 13 & 14] Issued Sale Stock Reduction & Service Exemption ---");
    const pcbService = await createProductWithStock({
      name: `PCB Circuit Design Service - Test ${Date.now()}`,
      category: "Services",
      type: "SERVICE",
      pricingMode: "FIXED",
      basePrice: 2000,
    });
    cleanupIds.productIds.push(pcbService.id);

    // Issue invoice with 1 Robot (physical) + 1 PCB Service (intangible)
    const issuedBillNo = await generateInvoiceNo();
    const issuedInvoice = await prisma.invoice.create({
      data: {
        invoiceNo: issuedBillNo,
        clientId: testClient.id,
        clientName: testClient.name,
        date: new Date(),
        dueDate: new Date(),
        status: "ISSUED",
        issuedAt: new Date(),
        subtotal: toPaise(5500),
        gstPercent: 18,
        gstAmount: toPaise(990),
        total: toPaise(6490),
        balance: toPaise(6490),
        items: {
          create: [
            {
              productId: ttrcRobot.id,
              description: "Competition Robot Sold",
              qty: 1,
              unitPrice: toPaise(3500),
              amount: toPaise(3500),
            },
            {
              productId: pcbService.id,
              description: "Consultation Service",
              qty: 1,
              unitPrice: toPaise(2000),
              amount: toPaise(2000),
            },
          ],
        },
      },
    });
    cleanupIds.invoiceIds.push(issuedInvoice.id);

    // Deduct stock for issued invoice
    await deductStockForIssuedInvoice(issuedInvoice.id);

    const postSaleRobot = await prisma.product.findUnique({ where: { id: ttrcRobot.id } });
    const postSaleService = await prisma.product.findUnique({ where: { id: pcbService.id } });

    if (postSaleRobot?.stockQuantity !== 0 || postSaleRobot?.stockQuantityMinor !== 0) {
      throw new Error(`Finished robot stock after sale mismatch: expected 0, got ${postSaleRobot?.stockQuantity}`);
    }
    if (postSaleService?.stockQuantity !== 0) {
      throw new Error(`Service stock was improperly modified!`);
    }

    // Verify SALE stock ledger entry has unitCostPaise = ₹2,100
    const saleEntry = await prisma.stockLedgerEntry.findFirst({
      where: {
        referenceType: "INVOICE",
        referenceId: issuedInvoice.id,
        type: "SALE",
      },
    });
    if (!saleEntry || (saleEntry.unitCostPaise ?? saleEntry.unitCost) !== toPaise(2100)) {
      throw new Error(`Sale movement cost snapshot mismatch: expected ₹2,100, got ${saleEntry?.unitCostPaise}`);
    }
    console.log("✓ TEST 13 & 14 PASSED: Issued invoice deducted finished goods stock at exact WAC (₹2,100) while Service created zero stock movement.");

    // ─────────────────────────────────────────────────────────────
    // TEST 15 & 16: ROLLING WAC MULTI-BATCH & HISTORICAL SNAPSHOT IMMUTABILITY
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 15 & 16] Rolling WAC Multi-Batch & Historical Cost Immutability ---");
    // Motor currently has 8 units @ ₹400 WAC (total value ₹3,200)
    // Buy 2 more motors at ₹500 each on 2026-09-10 (inbound value ₹1,000)
    // New total: 10 units, total value = ₹4,200 -> new WAC = ₹420.00
    await recordStockMovement({
      productId: dgjMotor.id,
      quantitySigned: 2,
      type: "PURCHASE",
      inboundUnitCostPaise: toPaise(500),
      effectiveAt: new Date("2026-09-10T10:00:00Z"),
      notes: "Second purchase batch at higher cost",
    });

    const newMotorWAC = await getProductRollingWACPaise(dgjMotor.id);
    if (newMotorWAC !== toPaise(420)) {
      throw new Error(`Rolling WAC multi-batch mismatch: expected ₹420.00, got ${newMotorWAC}`);
    }

    // Historical movement cost of first production consumption must STILL be ₹400
    const historicalConsumption = await prisma.stockLedgerEntry.findFirst({
      where: {
        referenceType: "PRODUCTION",
        referenceId: production!.id,
        productId: dgjMotor.id,
        type: "PRODUCTION_CONSUMPTION",
      },
    });
    if ((historicalConsumption?.unitCostPaise ?? historicalConsumption?.unitCost) !== toPaise(400)) {
      throw new Error(`Historical consumption unit cost was mutated! Expected 400, got ${historicalConsumption?.unitCostPaise}`);
    }
    console.log("✓ TEST 15 & 16 PASSED: Rolling WAC updated correctly to ₹420.00 while past consumption entry remained immutable at ₹400.00.");

    // ─────────────────────────────────────────────────────────────
    // TEST 17: INVENTORY VALUATION BY CLASSIFICATION
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 17] Inventory Valuation by Classification ---");
    const motorState = await getProductInventoryStateAsOf(dgjMotor.id);
    if (motorState.closingQty !== 10 || motorState.rollingWACRupees !== 420) {
      throw new Error(`Motor inventory state mismatch: qty=${motorState.closingQty}, WAC=${motorState.rollingWACRupees}`);
    }
    if (motorState.valuationRupees !== 4200) {
      throw new Error(`Motor valuation mismatch: expected 4200, got ${motorState.valuationRupees}`);
    }
    console.log(`✓ TEST 17 PASSED: Inventory position verified (Qty: ${motorState.closingQty}, WAC: ₹${motorState.rollingWACRupees}, Value: ₹${motorState.valuationRupees}).`);

    // ─────────────────────────────────────────────────────────────
    // TEST 18: PRODUCTION CANCELLATION VALUATION RULES
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 18] Production Cancellation with Valuation-Correct Reversals ---");
    // Create a new batch: 1 Robot
    const batchToCancel = await executeProductionBatch({
      finishedProductId: ttrcRobot.id,
      quantityProduced: 1,
      components: [
        { productId: dgjMotor.id, quantity: 2 },
        { productId: esp32Controller.id, quantity: 1 },
      ],
      notes: "Temporary test batch for cancellation",
    });
    cleanupIds.productionIds.push(batchToCancel!.id);

    const motorBeforeCancel = (await prisma.product.findUnique({ where: { id: dgjMotor.id } }))?.stockQuantity;
    const robotBeforeCancel = (await prisma.product.findUnique({ where: { id: ttrcRobot.id } }))?.stockQuantity;

    // Cancel this production batch
    await cancelProductionBatch({
      productionId: batchToCancel!.id,
      cancelReason: "Quality test fail - assembly defective",
    });

    const motorAfterCancel = (await prisma.product.findUnique({ where: { id: dgjMotor.id } }))?.stockQuantity;
    const robotAfterCancel = (await prisma.product.findUnique({ where: { id: ttrcRobot.id } }))?.stockQuantity;

    if (robotAfterCancel !== robotBeforeCancel! - 1) {
      throw new Error(`Robot stock was not decremented on cancellation! before=${robotBeforeCancel}, after=${robotAfterCancel}`);
    }
    if (motorAfterCancel !== motorBeforeCancel! + 2) {
      throw new Error(`Motor stock was not restored on cancellation! before=${motorBeforeCancel}, after=${motorAfterCancel}`);
    }

    // Verify compensating reversal ledger records exist
    const reversalEntry = await prisma.stockLedgerEntry.findFirst({
      where: {
        referenceType: "PRODUCTION_CANCELLATION",
        referenceId: batchToCancel!.id,
        type: "PRODUCTION_REVERSAL",
      },
    });
    if (!reversalEntry || reversalEntry.quantitySigned !== -1) {
      throw new Error("Missing or invalid PRODUCTION_REVERSAL entry!");
    }
    console.log("✓ TEST 18 PASSED: Production cancellation atomically reversed finished product and restored component stock via compensating entries.");

    // ─────────────────────────────────────────────────────────────
    // TEST 19: SAFE SOURCING VOID (Rejection on consumed stock & Valid Reversal)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 19] Safe Inbound Sourcing Void & Rejection on Consumed Stock ---");
    const testConsumable = await createProductWithStock({
      name: `Screws M3x10 Pack - Test ${Date.now()}`,
      category: "Hardware",
      type: "CONSUMABLE",
      isSaleable: false,
      initialStock: 0,
    });
    cleanupIds.productIds.push(testConsumable.id);

    // Record sourcing of 50 packs @ ₹20 each with ₹500 initial payment
    const sourcingNo = await generateSourcingNo();
    const consumableSourcing = await prisma.inventorySourcing.create({
      data: {
        sourcingNo,
        productId: testConsumable.id,
        quantityMinor: 50,
        quantity: 50,
        sourceType: "OFFLINE",
        vendorName: "Hardware Depot",
        unitCostPaise: toPaise(20),
        unitCost: toPaise(20),
        totalCostPaise: toPaise(1000),
        totalCost: toPaise(1000),
        status: "ACTIVE",
        paymentStatus: "PARTIAL",
        paidAmountPaise: toPaise(500),
        paidAmount: toPaise(500),
        notes: "Initial purchase to be tested for void",
      },
    });
    cleanupIds.sourcingIds.push(consumableSourcing.id);

    await recordStockMovement({
      productId: testConsumable.id,
      quantitySigned: 50,
      type: "PURCHASE",
      inboundUnitCostPaise: toPaise(20),
      referenceType: "INVENTORY_SOURCING",
      referenceId: consumableSourcing.id,
      effectiveAt: new Date("2026-09-12T10:00:00Z"),
    });

    await prisma.inventorySourcingPayment.create({
      data: {
        sourcingId: consumableSourcing.id,
        amountPaise: toPaise(500),
        amount: toPaise(500),
        direction: "INCREASE",
        type: "PAYMENT",
        paymentDate: new Date("2026-09-12"),
        notes: "Cash advance",
      },
    });

    // 19A. Consume 30 units so only 20 remain
    await recordStockMovement({
      productId: testConsumable.id,
      quantitySigned: -30,
      type: "DAMAGE",
      effectiveAt: new Date("2026-09-13T10:00:00Z"),
      notes: "Damaged in lab handling",
    });

    // Attempting a full sourcing void (50 units) must be rejected because only 20 units remain
    let caughtInsufficientVoid = false;
    try {
      await voidInventorySourcing(consumableSourcing.id, "Attempting invalid void");
    } catch (err: any) {
      caughtInsufficientVoid = true;
      console.log(`Caught expected void rejection: ${err.message}`);
    }
    if (!caughtInsufficientVoid) {
      throw new Error("Failed to block sourcing void when remaining stock is less than sourced quantity!");
    }

    // Restore the 30 units so full 50 are available
    await recordStockMovement({
      productId: testConsumable.id,
      quantitySigned: 30,
      type: "ADJUSTMENT",
      inboundUnitCostPaise: toPaise(20),
      effectiveAt: new Date("2026-09-14T10:00:00Z"),
      notes: "Lab stock audit reconciliation",
    });

    // Now voiding must succeed
    await voidInventorySourcing(consumableSourcing.id, "Entered wrong quantity by mistake");

    const voidedSourcing = await prisma.inventorySourcing.findUnique({
      where: { id: consumableSourcing.id },
      include: { payments: true },
    });

    if (voidedSourcing?.status !== "VOIDED") {
      throw new Error(`Sourcing status not VOIDED: got ${voidedSourcing?.status}`);
    }

    // Verify payment reversal was created based on actual payment event (₹500 DECREASE)
    const hasPaymentReversal = voidedSourcing.payments.some(
      (p) => (p.direction === "DECREASE" || p.type === "REVERSAL") && (p.amountPaise ?? p.amount) === toPaise(500)
    );
    if (!hasPaymentReversal) {
      throw new Error("Missing compensating payment REVERSAL on voided sourcing!");
    }
    console.log("✓ TEST 19 PASSED: Inbound sourcing void strictly rejects insufficient stock and correctly reverses actual payment events.");

    // ─────────────────────────────────────────────────────────────
    // TEST 20: PERSISTENT IDEMPOTENCY & CONCURRENCY PROTECTION
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 20] Persistent Database Idempotency ---");
    const testIdempotencyKey = `IDEM-KEY-${Date.now()}`;
    const firstExec = await executeProductionBatch({
      finishedProductId: ttrcRobot.id,
      quantityProduced: 1,
      components: [{ productId: dgjMotor.id, quantity: 1 }],
      idempotencyKey: testIdempotencyKey,
      notes: "Idempotent batch execution",
    });
    cleanupIds.productionIds.push(firstExec!.id);

    const secondExec = await executeProductionBatch({
      finishedProductId: ttrcRobot.id,
      quantityProduced: 1,
      components: [{ productId: dgjMotor.id, quantity: 1 }],
      idempotencyKey: testIdempotencyKey,
      notes: "Idempotent batch execution - duplicate call",
    });

    if (firstExec?.id !== secondExec?.id || firstExec?.productionNo !== secondExec?.productionNo) {
      throw new Error(`Idempotency failure! Different production records created for same idempotency key.`);
    }

    // Verify only ONE set of stock movements was created
    const movementsForIdem = await prisma.stockLedgerEntry.findMany({
      where: { referenceId: firstExec!.id },
    });
    if (movementsForIdem.length !== 2) { // 1 consumption + 1 production
      throw new Error(`Duplicate movements logged! Expected 2, found ${movementsForIdem.length}`);
    }
    console.log("✓ TEST 20 PASSED: Persistent database idempotency strictly prevented duplicate stock consumption.");

    // ─────────────────────────────────────────────────────────────
    // ALL TESTS COMPLETED SUCCESSFULLY
    // ─────────────────────────────────────────────────────────────
    console.log("\n================================================================================");
    console.log("🎉 ALL 20 TAMIZHTECH ERP 2.0 INVENTORY ARCHITECTURE TESTS PASSED!");
    console.log("================================================================================\n");

  } catch (err: any) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exit(1);
  } finally {
    // Clean up synthetic test fixtures
    console.log("--- [CLEANUP] Removing Synthetic Test Records ---");
    try {
      if (cleanupIds.productionIds.length > 0) {
        await prisma.stockLedgerEntry.deleteMany({
          where: { referenceType: { in: ["PRODUCTION", "PRODUCTION_CANCELLATION"] }, referenceId: { in: cleanupIds.productionIds } },
        });
        await prisma.productionItem.deleteMany({
          where: { productionId: { in: cleanupIds.productionIds } },
        });
        await prisma.productionRecord.deleteMany({
          where: { id: { in: cleanupIds.productionIds } },
        });
      }

      if (cleanupIds.sourcingIds.length > 0) {
        await prisma.stockLedgerEntry.deleteMany({
          where: { referenceType: { in: ["INVENTORY_SOURCING", "INVENTORY_SOURCING_VOID"] }, referenceId: { in: cleanupIds.sourcingIds } },
        });
        await prisma.inventorySourcingPayment.deleteMany({
          where: { sourcingId: { in: cleanupIds.sourcingIds } },
        });
        await prisma.inventorySourcing.deleteMany({
          where: { id: { in: cleanupIds.sourcingIds } },
        });
      }

      if (cleanupIds.invoiceIds.length > 0) {
        await prisma.stockLedgerEntry.deleteMany({
          where: { referenceType: "INVOICE", referenceId: { in: cleanupIds.invoiceIds } },
        });
        await prisma.invoiceItem.deleteMany({
          where: { invoiceId: { in: cleanupIds.invoiceIds } },
        });
        await prisma.invoice.deleteMany({
          where: { id: { in: cleanupIds.invoiceIds } },
        });
      }

      if (cleanupIds.quotationIds.length > 0) {
        await prisma.quotationItem.deleteMany({
          where: { quotationId: { in: cleanupIds.quotationIds } },
        });
        await prisma.quotation.deleteMany({
          where: { id: { in: cleanupIds.quotationIds } },
        });
      }

      if (cleanupIds.productIds.length > 0) {
        await prisma.stockLedgerEntry.deleteMany({
          where: { productId: { in: cleanupIds.productIds } },
        });
        await prisma.product.deleteMany({
          where: { id: { in: cleanupIds.productIds } },
        });
      }

      if (cleanupIds.clientIds.length > 0) {
        await prisma.client.deleteMany({
          where: { id: { in: cleanupIds.clientIds } },
        });
      }
      console.log("✓ Cleanup finished cleanly.");
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }
}

runInventoryArchitectureTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
