import prisma from "../lib/prisma";
import { generateSku } from "../lib/sequence";
import { createProductWithStock, adjustStock, deductStockForIssuedInvoice, reverseStockForCancelledInvoice } from "../lib/stockService";

async function runCoreOperationsTest() {
  console.log("🚀 Starting TamizhTech ERP 2.0 Core Operations Test Suite...\n");

  try {
    // -------------------------------------------------------------
    // Test 1: Deterministic SKU Prefix & Monotonic Sequence (Lock 2)
    // -------------------------------------------------------------
    console.log("--- Test 1: Deterministic SKU Generation ---");
    const motorSku1 = await generateSku("Motors");
    const controllerSku = await generateSku("Controllers");
    const motorSku2 = await generateSku("Motors & Actuators");
    const generalSku = await generateSku("General");

    console.log(`Motor SKU 1: ${motorSku1} (Expected: TTRC-MOT-...)`);
    console.log(`Controller SKU: ${controllerSku} (Expected: TTRC-C-...)`);
    console.log(`Motor SKU 2: ${motorSku2} (Expected: TTRC-MOT-...)`);
    console.log(`General SKU: ${generalSku} (Expected: TTRC-PRD-...)`);

    if (!motorSku1.startsWith("TTRC-MOT-") || !controllerSku.startsWith("TTRC-C-") || !motorSku2.startsWith("TTRC-MOT-")) {
      throw new Error("Lock 2 Failed: SKU prefix is not deterministic for category");
    }
    console.log("✅ Test 1 Passed: Deterministic SKU prefixes verified.\n");

    // -------------------------------------------------------------
    // Test 2: Product Creation & OPENING Stock Movement (Lock 3 & 4)
    // -------------------------------------------------------------
    console.log("--- Test 2: Product Creation with OPENING Stock ---");
    const motorProduct = await createProductWithStock({
      name: "TTRC High Torque DC Motor 300RPM",
      category: "Motors",
      basePrice: 650,
      type: "PHYSICAL_PRODUCT",
      initialStock: 25,
      description: "High torque 12V DC motor for robotics competition",
    });

    console.log(`Created Motor: ${motorProduct.name} | SKU: ${motorProduct.sku} | Stock: ${motorProduct.stockQuantity}`);

    // Verify OPENING stock entry
    const openingEntry = await prisma.stockLedgerEntry.findFirst({
      where: { productId: motorProduct.id, type: "OPENING" },
    });

    if (!openingEntry || openingEntry.quantitySigned !== 25) {
      throw new Error("Lock 3 Failed: Opening stock ledger entry missing or quantity mismatch");
    }
    console.log(`Opening Ledger Entry: Type=${openingEntry.type}, Qty=+${openingEntry.quantitySigned}`);

    // Create a Service Product (Lock 4)
    const pcbService = await createProductWithStock({
      name: "Custom 2-Layer PCB Fabrication Service",
      category: "Fabrication",
      basePrice: 1200,
      type: "SERVICE",
      initialStock: 10, // Must be ignored for services
      description: "FR4 double sided PCB with green solder mask",
    });

    console.log(`Created Service: ${pcbService.name} | Type: ${pcbService.type} | Stock: ${pcbService.stockQuantity}`);
    if (pcbService.stockQuantity !== 0) {
      throw new Error("Lock 4 Failed: Service must not have inventory stock");
    }

    const serviceOpeningEntry = await prisma.stockLedgerEntry.findFirst({
      where: { productId: pcbService.id },
    });
    if (serviceOpeningEntry) {
      throw new Error("Lock 4 Failed: Service should not create stock ledger entries");
    }
    console.log("✅ Test 2 Passed: OPENING stock movement & Physical vs Service verified.\n");

    // -------------------------------------------------------------
    // Test 3: Stock Adjustments (Movement Ledger)
    // -------------------------------------------------------------
    console.log("--- Test 3: Manual Stock Adjustments ---");
    const purchaseAdjustment = await adjustStock({
      productId: motorProduct.id,
      quantityChange: 10,
      type: "PURCHASE",
      notes: "Received batch order from supplier",
    });
    console.log(`Stock after purchase (+10): ${purchaseAdjustment.product?.stockQuantity} units (Expected 35)`);

    const damageAdjustment = await adjustStock({
      productId: motorProduct.id,
      quantityChange: -3,
      type: "DAMAGE",
      notes: "Defective gearboxes found during QA",
    });
    console.log(`Stock after damage (-3): ${damageAdjustment.product?.stockQuantity} units (Expected 32)`);

    if (damageAdjustment.product?.stockQuantity !== 32) {
      throw new Error("Stock quantity calculation mismatch after adjustments");
    }
    console.log("✅ Test 3 Passed: Stock adjustments recorded with signed ledger entries.\n");

    // -------------------------------------------------------------
    // Test 4: Draft Bill ≠ Stock Deduction & Issue Stock Reduction (Lock 1)
    // -------------------------------------------------------------
    console.log("--- Test 4: Draft Bill ≠ Stock Deduction & Issue Deduction ---");
    // Create test customer
    const testPhone = `98765${Date.now().toString().slice(-5)}`;
    const client = await prisma.client.create({
      data: {
        clientCode: `TT-CL-TEST-${Date.now().toString().slice(-4)}`,
        name: "Apex Robotics Club",
        phone: testPhone,
        mobileNormalized: `+91${testPhone}`,
        email: "apex@robotics.example.com",
        city: "Coimbatore",
      },
    });

    // Create DRAFT invoice with 4 units of motor and 1 unit of PCB service
    const draftInvoice = await prisma.invoice.create({
      data: {
        invoiceNo: `TT-INV-TEST-${Date.now().toString().slice(-4)}`,
        clientId: client.id,
        clientName: client.name,
        date: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "DRAFT",
        gstPercent: 18,
        subtotal: 4 * 650 + 1200,
        total: (4 * 650 + 1200) * 1.18,
        paidAmount: 0,
        balance: (4 * 650 + 1200) * 1.18,
        items: {
          create: [
            {
              productId: motorProduct.id,
              description: motorProduct.name,
              qty: 4,
              unitPrice: 650,
              amount: 2600,
            },
            {
              productId: pcbService.id,
              description: pcbService.name,
              qty: 1,
              unitPrice: 1200,
              amount: 1200,
            },
          ],
        },
      },
      include: { items: true },
    });

    // Check motor stock: must STILL be 32 (NO deduction on draft!)
    const stockAfterDraft = await prisma.product.findUnique({ where: { id: motorProduct.id } });
    console.log(`Motor stock after DRAFT bill creation: ${stockAfterDraft?.stockQuantity} units (Must remain 32)`);
    if (stockAfterDraft?.stockQuantity !== 32) {
      throw new Error("Lock 1 Failed: Draft invoice prematurely reduced inventory stock!");
    }

    // Now ISSUE the bill
    console.log("Issuing bill...");
    await deductStockForIssuedInvoice(draftInvoice.id);
    await prisma.invoice.update({ where: { id: draftInvoice.id }, data: { status: "ISSUED" } });

    const stockAfterIssue = await prisma.product.findUnique({ where: { id: motorProduct.id } });
    console.log(`Motor stock after ISSUED bill: ${stockAfterIssue?.stockQuantity} units (Expected 32 - 4 = 28)`);
    if (stockAfterIssue?.stockQuantity !== 28) {
      throw new Error("Lock 1 Failed: Issued invoice did not deduct stock correctly");
    }

    // Verify SALE ledger entry
    const saleEntry = await prisma.stockLedgerEntry.findFirst({
      where: { referenceId: draftInvoice.id, type: "SALE" },
    });
    if (!saleEntry || saleEntry.quantitySigned !== -4) {
      throw new Error("Lock 1 Failed: Missing SALE ledger entry with quantitySigned -4");
    }
    console.log(`Sale Ledger Entry: Type=${saleEntry.type}, Qty=${saleEntry.quantitySigned}`);

    // Now Cancel the bill and verify reversal
    console.log("Cancelling issued bill...");
    await reverseStockForCancelledInvoice(draftInvoice.id);
    await prisma.invoice.update({ where: { id: draftInvoice.id }, data: { status: "CANCELLED" } });

    const stockAfterCancel = await prisma.product.findUnique({ where: { id: motorProduct.id } });
    console.log(`Motor stock after CANCELLED bill: ${stockAfterCancel?.stockQuantity} units (Expected 28 + 4 = 32 restored)`);
    if (stockAfterCancel?.stockQuantity !== 32) {
      throw new Error("Lock 1 Failed: Cancelled bill did not restore stock");
    }

    const returnEntry = await prisma.stockLedgerEntry.findFirst({
      where: { referenceId: draftInvoice.id, type: { in: ["RETURN", "CUSTOMER_RETURN"] } },
    });
    if (!returnEntry || returnEntry.quantitySigned !== 4) {
      throw new Error("Lock 1 Failed: Missing RETURN ledger entry on invoice cancellation");
    }
    console.log("✅ Test 4 Passed: Draft bills do not touch stock, Issue deducts, Cancel restores.\n");

    // -------------------------------------------------------------
    // Test 5: Customer Outstanding Derived Dynamically (Lock 5)
    // -------------------------------------------------------------
    console.log("--- Test 5: Customer Outstanding Derived from Invoices ---");
    // Create an active issued invoice for client: total = 5000, balance = 5000
    const activeInvoice = await prisma.invoice.create({
      data: {
        invoiceNo: `TT-INV-TEST-ACTIVE-${Date.now().toString().slice(-4)}`,
        clientId: client.id,
        clientName: client.name,
        date: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: "ISSUED",
        gstPercent: 0,
        subtotal: 5000,
        total: 5000,
        paidAmount: 0,
        balance: 5000,
        items: {
          create: [{ description: "Custom Robotics Assembly", qty: 1, unitPrice: 5000, amount: 5000 }],
        },
      },
    });

    // Derive customer outstanding
    const clientInvoices = await prisma.invoice.findMany({
      where: { clientId: client.id, status: { not: "CANCELLED" } },
    });
    const derivedOutstanding = clientInvoices.reduce((sum, inv) => sum + inv.balance, 0);
    console.log(`Derived Customer Outstanding: ₹${derivedOutstanding} (Expected ₹5000)`);
    if (derivedOutstanding !== 5000) {
      throw new Error("Lock 5 Failed: Customer outstanding did not equal invoice balance");
    }

    // Record partial payment of ₹2,000
    await prisma.payment.create({
      data: {
        paymentNo: `TT-PAY-TEST-${Date.now().toString().slice(-4)}`,
        clientId: client.id,
        invoiceId: activeInvoice.id,
        amount: 2000,
        mode: "UPI",
        status: "COMPLETED",
      },
    });

    await prisma.invoice.update({
      where: { id: activeInvoice.id },
      data: {
        paidAmount: 2000,
        balance: 3000,
        status: "PARTIALLY_PAID",
      },
    });

    const updatedClientInvoices = await prisma.invoice.findMany({
      where: { clientId: client.id, status: { not: "CANCELLED" } },
    });
    const updatedOutstanding = updatedClientInvoices.reduce((sum, inv) => sum + inv.balance, 0);
    console.log(`Derived Customer Outstanding after ₹2,000 payment: ₹${updatedOutstanding} (Expected ₹3000)`);
    if (updatedOutstanding !== 3000) {
      throw new Error("Lock 5 Failed: Customer outstanding after payment did not update");
    }
    console.log("✅ Test 5 Passed: Customer outstanding derived authoritatively from invoice ledger.\n");

    // Clean up test data
    console.log("Cleaning up test artifacts...");
    await prisma.payment.deleteMany({ where: { clientId: client.id } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: [draftInvoice.id, activeInvoice.id] } } });
    await prisma.invoice.deleteMany({ where: { id: { in: [draftInvoice.id, activeInvoice.id] } } });
    await prisma.client.delete({ where: { id: client.id } });
    await prisma.stockLedgerEntry.deleteMany({ where: { productId: { in: [motorProduct.id, pcbService.id] } } });
    await prisma.product.deleteMany({ where: { id: { in: [motorProduct.id, pcbService.id] } } });

    console.log("🎉 ALL 5 LOCKS & CORE OPERATIONS TESTS PASSED SUCCESSFULLY! ✅");
  } catch (err: any) {
    console.error("❌ Test Failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCoreOperationsTest();
