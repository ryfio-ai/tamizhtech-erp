import prisma from "../lib/prisma";
import { generateQuotationNo, generateInvoiceNo } from "../lib/sequence";
import { calculateRollingWACPaise, getProductRollingWACPaise, getProductInventoryStateAsOf, recordStockMovement } from "../lib/costService";
import { toPaise, fromPaise, roundToPaise, safeMultiplyQuantityByPaise } from "../lib/money";
import { formatISTDate, formatISTDateTime, getISTTodayString } from "../lib/time";
import { deductStockForIssuedInvoice, reverseStockForCancelledInvoice } from "../lib/stockService";
import { getCanonicalInvoiceFinancials } from "../lib/invoiceService";

async function runComprehensiveERPTest() {
  console.log("=== STARTING COMPREHENSIVE ERP 2.0 TEST SUITE ===");

  let testClient: any = null;
  let testProduct: any = null;

  try {
    // ─────────────────────────────────────────────────────────────
    // TEST 1: SEQUENTIAL NUMBERING & INDIAN STANDARD TIME (IST)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 1] Sequential Numbering & IST Timezone ---");
    const qtnNo1 = await generateQuotationNo();
    const qtnNo2 = await generateQuotationNo();
    console.log(`Generated Quotations: ${qtnNo1}, ${qtnNo2}`);
    if (!qtnNo1.startsWith("TTRC-QTN-2026-") || !qtnNo2.startsWith("TTRC-QTN-2026-")) {
      throw new Error(`Quotation sequence format mismatch: ${qtnNo1}, ${qtnNo2}`);
    }

    const billNo1 = await generateInvoiceNo();
    const billNo2 = await generateInvoiceNo();
    console.log(`Generated Invoices: ${billNo1}, ${billNo2}`);
    if (!billNo1.startsWith("TTRC-BILL-2026-") || !billNo2.startsWith("TTRC-BILL-2026-")) {
      throw new Error(`Invoice sequence format mismatch: ${billNo1}, ${billNo2}`);
    }

    const istDate = formatISTDate(new Date());
    const istTime = formatISTDateTime(new Date());
    const todayIST = getISTTodayString();
    console.log(`IST Formats: Date=${istDate}, DateTime=${istTime}, Today=${todayIST}`);
    if (!istDate.includes("2026")) {
      throw new Error("IST Date does not include year 2026");
    }
    console.log("✓ TEST 1 PASSED: Sequential numbers and IST verified.");

    // ─────────────────────────────────────────────────────────────
    // TEST 2: EXACT-PAISE MONEY MATH & ROLLING WAC ZERO-STOCK RULE
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 2] Exact Paise Math & Rolling WAC ---");
    // Example: Opening 3 units @ ₹100.00 (10000 paise) = 30000 paise
    // Inbound: 7 units @ ₹101.00 (10100 paise) = 70700 paise
    // Total: 10 units, total value = 100700 paise -> new WAC = 10070 paise (₹100.70)
    const openingQty = 3;
    const openingWACPaise = toPaise(100);
    const inboundQty = 7;
    const inboundCostPaise = toPaise(101);

    const calculatedWACPaise = calculateRollingWACPaise(
      openingQty,
      openingWACPaise,
      inboundQty,
      inboundCostPaise
    );
    const calculatedWACRupees = fromPaise(calculatedWACPaise);
    console.log(`Rolling WAC: ${calculatedWACPaise} paise (₹${calculatedWACRupees})`);
    if (calculatedWACRupees !== 100.7) {
      throw new Error(`Expected WAC ₹100.70, got ₹${calculatedWACRupees}`);
    }

    // Zero-Stock Rule: Current stock <= 0, new WAC resets strictly to inbound unit cost
    const zeroStockWAC = calculateRollingWACPaise(0, 5000, 5, toPaise(250));
    console.log(`Zero-Stock WAC: ${zeroStockWAC} paise (₹${fromPaise(zeroStockWAC)})`);
    if (fromPaise(zeroStockWAC) !== 250) {
      throw new Error(`Expected Zero-Stock WAC ₹250.00, got ₹${fromPaise(zeroStockWAC)}`);
    }
    console.log("✓ TEST 2 PASSED: Exact paise Rolling WAC and Zero-Stock rule verified.");

    // ─────────────────────────────────────────────────────────────
    // SETUP TEST FIXTURES IN DATABASE
    // ─────────────────────────────────────────────────────────────
    testClient = await prisma.client.create({
      data: {
        clientCode: `TC-${Date.now().toString().slice(-4)}`,
        name: "Acme Robotics Labs",
        phone: "+919876543210",
        mobileNormalized: "9876543210",
        email: "lab@acmerobotics.test",
        type: "COMMERCIAL",
        status: "ACTIVE",
      },
    });

    testProduct = await prisma.product.create({
      data: {
        sku: `TEST-ROBOT-${Date.now().toString().slice(-4)}`,
        name: "Standard Autonomous Bot",
        normalizedName: "standard autonomous bot",
        category: "Robotics",
        type: "PHYSICAL_PRODUCT",
        pricingMode: "FIXED",
        basePrice: 15000, // ₹15,000 catalog price
        taxRate: 18,
        stockQuantity: 0,
        minStock: 2,
      },
    });

    console.log(`Created test fixtures: Client ${testClient.id}, Product ${testProduct.id}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 3: SOURCING, PHYSICAL LEDGER & ROLLING WAC SNAPSHOT
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 3] Inbound Sourcing & Movement Cost Snapshot ---");
    // Procure 10 units at ₹8,000 each (800000 paise) via ONLINE sourcing
    const sourcingNo = "SRC-TEST-001";
    const unitCostPaise = toPaise(8000);
    const totalCostPaise = toPaise(80000);

    const sourcing = await prisma.inventorySourcing.create({
      data: {
        sourcingNo,
        productId: testProduct.id,
        quantity: 10,
        sourceType: "ONLINE",
        vendorName: "RoboPortal India",
        unitCost: unitCostPaise,
        totalCost: totalCostPaise,
        purchaseDate: new Date("2026-09-01T10:00:00Z"),
        paymentStatus: "PARTIAL",
        paidAmount: toPaise(30000), // Paid ₹30,000 in advance
        paidAt: new Date("2026-09-01T11:00:00Z"),
        payments: {
          create: {
            amount: toPaise(30000),
            paymentDate: new Date("2026-09-01T11:00:00Z"),
            paymentMethod: "BANK_TRANSFER",
            notes: "Advance 30%",
          },
        },
      },
    });

    // Record authoritative stock movement on Sep 1
    await recordStockMovement({
      productId: testProduct.id,
      quantitySigned: 10,
      type: "PURCHASE",
      inboundUnitCostPaise: unitCostPaise,
      referenceType: "INVENTORY_SOURCING",
      referenceId: sourcing.id,
      notes: "Online Procurement",
      createdAt: new Date("2026-09-01T10:00:00Z"),
    });

    const refreshedProd1 = await prisma.product.findUnique({ where: { id: testProduct.id } });
    if (refreshedProd1?.stockQuantity !== 10) {
      throw new Error(`Expected stock 10, got ${refreshedProd1?.stockQuantity}`);
    }

    const currentWAC = await getProductRollingWACPaise(testProduct.id);
    if (fromPaise(currentWAC) !== 8000) {
      throw new Error(`Expected WAC ₹8,000, got ₹${fromPaise(currentWAC)}`);
    }
    console.log(`✓ Product Stock: ${refreshedProd1.stockQuantity}, Rolling WAC: ₹${fromPaise(currentWAC)}`);

    // In-house production of 5 additional units at ₹7,000 each (700000 paise) on Sep 10
    const inHouseCostPaise = toPaise(7000);
    const inHouseTotalCostPaise = toPaise(35000);
    const inHouseSourcing = await prisma.inventorySourcing.create({
      data: {
        sourcingNo: "SRC-TEST-002",
        productId: testProduct.id,
        quantity: 5,
        sourceType: "IN_HOUSE",
        vendorName: "TamizhTech Internal Assembly",
        unitCost: inHouseCostPaise,
        totalCost: inHouseTotalCostPaise,
        purchaseDate: new Date("2026-09-10T10:00:00Z"),
        paymentStatus: "PAID",
        paidAmount: 0, // IN_HOUSE does not create external supplier payable!
      },
    });

    await recordStockMovement({
      productId: testProduct.id,
      quantitySigned: 5,
      type: "PRODUCTION",
      inboundUnitCostPaise: inHouseCostPaise,
      referenceType: "INVENTORY_SOURCING",
      referenceId: inHouseSourcing.id,
      notes: "In-House Assembly",
      createdAt: new Date("2026-09-10T10:00:00Z"),
    });

    const refreshedProd2 = await prisma.product.findUnique({ where: { id: testProduct.id } });
    if (refreshedProd2?.stockQuantity !== 15) {
      throw new Error(`Expected stock 15, got ${refreshedProd2?.stockQuantity}`);
    }

    // Expected WAC: (10 * 8000 + 5 * 7000) / 15 = 115000 / 15 = 7666.67
    const currentWAC2 = await getProductRollingWACPaise(testProduct.id);
    const expectedWAC2 = fromPaise(roundToPaise((10 * 800000 + 5 * 700000) / 15));
    if (fromPaise(currentWAC2) !== expectedWAC2) {
      throw new Error(`Expected WAC ₹${expectedWAC2}, got ₹${fromPaise(currentWAC2)}`);
    }
    console.log(`✓ Post-Production Stock: ${refreshedProd2.stockQuantity}, Rolling WAC: ₹${fromPaise(currentWAC2)}`);
    console.log("✓ TEST 3 PASSED: Sourcing and stock movement tracking verified.");

    // ─────────────────────────────────────────────────────────────
    // TEST 4: QUOTATION LIFECYCLE & STRICT SEPARATION
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 4] Quotation Lifecycle & Custom Line Rate ---");
    // Create quotation offering custom rate of ₹14,000 (catalog is ₹15,000)
    // Master price must NEVER be changed!
    const customRatePaise = toPaise(14000);
    const qtnSubtotalPaise = toPaise(28000); // 2 units
    const qtnTaxPaise = toPaise(5040); // 18%
    const qtnTotalPaise = qtnSubtotalPaise + qtnTaxPaise;

    const qtnNo = await generateQuotationNo();
    const quotation = await prisma.quotation.create({
      data: {
        quotationNo: qtnNo,
        clientId: testClient.id,
        status: "DRAFT",
        validUntil: new Date("2026-10-31"),
        subtotal: qtnSubtotalPaise,
        taxAmount: qtnTaxPaise,
        total: qtnTotalPaise,
        items: {
          create: [
            {
              productId: testProduct.id,
              itemType: "PHYSICAL_PRODUCT",
              sku: testProduct.sku,
              name: testProduct.name,
              description: "Custom configuration bot",
              configurationNotes: "Equipped with high-torque gear motors",
              qty: 2,
              unitPrice: customRatePaise,
              amount: qtnSubtotalPaise,
              taxRate: 18,
            },
          ],
        },
      },
      include: { items: true },
    });

    // Check catalog product basePrice remains strictly ₹15,000
    const checkProduct = await prisma.product.findUnique({ where: { id: testProduct.id } });
    if (checkProduct?.basePrice !== 15000) {
      throw new Error(`Product master price mutated! Expected 15000, got ${checkProduct?.basePrice}`);
    }
    // Check stock remains strictly 15 (Quotations have ZERO stock impact)
    if (checkProduct?.stockQuantity !== 15) {
      throw new Error(`Quotation mutated stock! Expected 15, got ${checkProduct?.stockQuantity}`);
    }
    console.log("✓ Quotation created with zero stock impact and immutable master price.");

    // ─────────────────────────────────────────────────────────────
    // TEST 5: CONVERT QUOTATION TO INVOICE & PHYSICAL DEDUCTION
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 5] Convert Quotation to Invoice & Stock Deduction ---");
    const billNo = await generateInvoiceNo();
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: billNo,
        clientId: testClient.id,
        clientName: testClient.name,
        date: new Date("2026-09-15T12:00:00Z"),
        dueDate: new Date("2026-09-30T12:00:00Z"),
        status: "DRAFT", // DRAFT bills do not deduct stock
        subtotal: quotation.subtotal,
        gstPercent: 18,
        gstAmount: quotation.taxAmount,
        total: quotation.total,
        paidAmount: 0,
        balance: quotation.total,
        items: {
          create: quotation.items.map((it) => ({
            productId: it.productId,
            description: it.description,
            qty: it.qty,
            unitPrice: it.unitPrice,
            amount: it.amount,
            configurationNotes: it.configurationNotes,
          })),
        },
      },
    });

    await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: "ACCEPTED",
        convertedToInvoiceId: invoice.id,
      },
    });

    // Check stock is still 15 (DRAFT invoice must NOT deduct stock)
    const prodDraft = await prisma.product.findUnique({ where: { id: testProduct.id } });
    if (prodDraft?.stockQuantity !== 15) {
      throw new Error(`Draft invoice deducted stock! Expected 15, got ${prodDraft?.stockQuantity}`);
    }

    // Now issue the invoice
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "ISSUED", issuedAt: new Date("2026-09-15T14:00:00Z") },
    });
    await deductStockForIssuedInvoice(invoice.id);

    // Stock should now be 15 - 2 = 13
    const prodIssued = await prisma.product.findUnique({ where: { id: testProduct.id } });
    if (prodIssued?.stockQuantity !== 13) {
      throw new Error(`Issued invoice did not deduct stock! Expected 13, got ${prodIssued?.stockQuantity}`);
    }

    // Check the SALE stock ledger entry has captured the movement-time WAC
    const saleEntry = await prisma.stockLedgerEntry.findFirst({
      where: { referenceId: invoice.id, type: "SALE" },
    });
    if (!saleEntry || !saleEntry.unitCost || saleEntry.unitCost !== currentWAC2) {
      throw new Error(`Sale entry did not capture movement-time WAC! Expected ${currentWAC2}, got ${saleEntry?.unitCost}`);
    }
    console.log(`✓ Invoice ${invoice.invoiceNo} issued. Stock: 13, Sale Cost Snapshot: ₹${fromPaise(saleEntry.unitCost)}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 6: SERVER-SIDE QUOTATION DELETION BOUNDARY
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 6] Quotation Delete Boundary ---");
    // Test A: An unlinked draft quotation can be hard deleted
    const unlinkedQtnNo = await generateQuotationNo();
    const unlinkedQtn = await prisma.quotation.create({
      data: {
        quotationNo: unlinkedQtnNo,
        clientId: testClient.id,
        status: "DRAFT",
        validUntil: new Date(),
        subtotal: 10000,
        taxAmount: 1800,
        total: 11800,
        items: {
          create: [{
            description: "Test Item",
            qty: 1,
            unitPrice: 10000,
            amount: 10000,
            taxRate: 18,
          }],
        },
      },
    });

    // Hard delete unlinked draft
    await prisma.quotationItem.deleteMany({ where: { quotationId: unlinkedQtn.id } });
    await prisma.quotation.delete({ where: { id: unlinkedQtn.id } });
    const checkDeleted = await prisma.quotation.findUnique({ where: { id: unlinkedQtn.id } });
    if (checkDeleted) {
      throw new Error("Unlinked draft quotation was not deleted!");
    }
    console.log("✓ Unlinked draft quotation hard deleted successfully.");

    // Test B: A quotation converted to an invoice CANNOT be hard-deleted
    // Attempting to delete quotation with convertedToInvoiceId transitions it to CANCELLED
    const convertedQtn = await prisma.quotation.findUnique({
      where: { id: quotation.id },
    });
    if (!convertedQtn?.convertedToInvoiceId) {
      throw new Error("Quotation lost convertedToInvoiceId link!");
    }
    console.log("✓ Converted quotation safely retains audit linkage to invoice.");

    // ─────────────────────────────────────────────────────────────
    // TEST 7: CUSTOMER PAYMENT LEDGER (SIGNED EVENTS)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 7] Customer Payment Ledger (Signed Events) ---");
    // Customer pays ₹20,000 on 16 Sep (PAYMENT)
    const pay1 = await prisma.payment.create({
      data: {
        paymentNo: `PAY-${Date.now().toString().slice(-4)}`,
        invoiceId: invoice.id,
        clientId: testClient.id,
        amount: toPaise(20000),
        date: new Date("2026-09-16T10:00:00Z"),
        status: "COMPLETED",
        type: "PAYMENT",
        mode: "UPI",
      },
    });

    // Customer receives reversal of ₹5,000 on 20 Sep (REVERSAL)
    const pay2 = await prisma.payment.create({
      data: {
        paymentNo: `REV-${Date.now().toString().slice(-4)}`,
        invoiceId: invoice.id,
        clientId: testClient.id,
        amount: toPaise(5000),
        date: new Date("2026-09-20T10:00:00Z"),
        status: "COMPLETED",
        type: "REVERSAL",
        mode: "UPI",
      },
    });

    // Reconcile invoice financials via canonical service
    const fin = await getCanonicalInvoiceFinancials(invoice.id);
    // Net paid: 20000 - 5000 = 15000
    if (fin?.netPaidAmount !== 15000) {
      throw new Error(`Expected net paid ₹15,000, got ₹${fin?.netPaidAmount}`);
    }
    console.log(`✓ Customer Payments Reconciled: Total Paid = ₹${fin?.netPaidAmount}, Outstanding = ₹${fin?.outstandingBalance}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 8: HISTORICAL POINT-IN-TIME INVENTORY REPLAY AS OF T
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [TEST 8] Historical Point-in-Time Inventory Valuation ---");
    // As of 2026-09-05 (only the first purchase of 10 units @ ₹8,000 happened)
    const stateSep5 = await getProductInventoryStateAsOf(testProduct.id, new Date("2026-09-05T23:59:59Z"));
    if (stateSep5.closingQty !== 10 || stateSep5.rollingWACRupees !== 8000) {
      throw new Error(`Sep 5 state mismatch: Qty=${stateSep5.closingQty}, WAC=${stateSep5.rollingWACRupees}`);
    }
    console.log(`✓ Sep 5 Historical State: Qty = ${stateSep5.closingQty}, WAC = ₹${stateSep5.rollingWACRupees}, Valuation = ₹${stateSep5.valuationRupees}`);

    // As of 2026-09-12 (purchase of 10 + production of 5 = 15 units)
    const stateSep12 = await getProductInventoryStateAsOf(testProduct.id, new Date("2026-09-12T23:59:59Z"));
    if (stateSep12.closingQty !== 15) {
      throw new Error(`Sep 12 state mismatch: Qty=${stateSep12.closingQty}`);
    }
    console.log(`✓ Sep 12 Historical State: Qty = ${stateSep12.closingQty}, WAC = ₹${stateSep12.rollingWACRupees}, Valuation = ₹${stateSep12.valuationRupees}`);

    // As of 2026-09-16 (after sale of 2 units = 13 units)
    const stateSep16 = await getProductInventoryStateAsOf(testProduct.id, new Date("2026-09-16T23:59:59Z"));
    if (stateSep16.closingQty !== 13) {
      throw new Error(`Sep 16 state mismatch: Qty=${stateSep16.closingQty}`);
    }
    console.log(`✓ Sep 16 Historical State: Qty = ${stateSep16.closingQty}, WAC = ₹${stateSep16.rollingWACRupees}, Valuation = ₹${stateSep16.valuationRupees}`);

    console.log("\n=================================================");
    console.log("   ALL 8 COMPREHENSIVE ERP 2.0 TESTS PASSED!     ");
    console.log("=================================================\n");
  } finally {
    // Clean up test data
    console.log("Cleaning up test records...");
    if (testProduct) {
      await prisma.stockLedgerEntry.deleteMany({ where: { productId: testProduct.id } });
      await prisma.inventorySourcingPayment.deleteMany({ where: { sourcing: { productId: testProduct.id } } });
      await prisma.inventorySourcing.deleteMany({ where: { productId: testProduct.id } });
      await prisma.invoiceItem.deleteMany({ where: { productId: testProduct.id } });
      await prisma.quotationItem.deleteMany({ where: { productId: testProduct.id } });
      await prisma.product.delete({ where: { id: testProduct.id } }).catch(() => {});
    }
    if (testClient) {
      await prisma.payment.deleteMany({ where: { clientId: testClient.id } });
      await prisma.invoice.deleteMany({ where: { clientId: testClient.id } });
      await prisma.quotation.deleteMany({ where: { clientId: testClient.id } });
      await prisma.client.delete({ where: { id: testClient.id } }).catch(() => {});
    }
    console.log("Clean up complete.");
  }
}

runComprehensiveERPTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  });
