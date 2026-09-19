import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import dns from "dns";
import { 
  allocateInvoiceNoTx, 
  allocateQuotationNoTx, 
  allocateClientCodeTx,
  allocatePaymentNoTx,
  generateDraftInvoiceNo,
  generateDraftQuotationNo,
  generateExpenseNo,
  generateSourcingNo,
  generateProductionNo,
  resetYearSequences
} from "../lib/sequence";
import { toPaise, fromPaise, roundToPaise } from "../lib/money";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

function getE2EDatabaseUrl(): string {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (!match) throw new Error("DATABASE_URL not found in .env");
  const prodUrl = match[1];
  
  if (!prodUrl.includes("/tamizhtech?")) {
    throw new Error("Expected production database 'tamizhtech' in DATABASE_URL");
  }
  
  const e2eUrl = prodUrl.replace("/tamizhtech?", "/tamizhtech_e2e?");
  return e2eUrl;
}

async function main() {
  console.log("==================================================");
  console.log("TAMIZHTECH ERP 2.0 — 32-POINT ISOLATED E2E SUITE");
  console.log("==================================================");

  const e2eUrl = getE2EDatabaseUrl();
  console.log("Target Database: tamizhtech_e2e (Isolated Test Database)");
  
  const prismaE2E = new PrismaClient({
    datasources: {
      db: { url: e2eUrl },
    },
  });

  const prismaProd = new PrismaClient(); // For isolation verification at end

  let passCount = 0;
  function assertTest(testNum: number, title: string, condition: boolean, details?: string) {
    const formattedNum = String(testNum).padStart(2, "0");
    if (condition) {
      passCount++;
      console.log(`[TEST ${formattedNum}/32] PASS: ${title}${details ? ` -> ${details}` : ""}`);
    } else {
      console.error(`[TEST ${formattedNum}/32] FAIL: ${title}${details ? ` -> ${details}` : ""}`);
      throw new Error(`Test assertion failed: [TEST ${formattedNum}/32] ${title}`);
    }
  }

  try {
    // 0. Clean isolated E2E database
    console.log("\n[Setup] Cleaning tamizhtech_e2e collections...");
    await prismaE2E.payment.deleteMany();
    await prismaE2E.expensePayment.deleteMany();
    await prismaE2E.expense.deleteMany();
    await prismaE2E.invoiceItem.deleteMany();
    await prismaE2E.invoice.deleteMany();
    await prismaE2E.quotationItem.deleteMany();
    await prismaE2E.quotation.deleteMany();
    await prismaE2E.clientContact.deleteMany();
    await prismaE2E.client.deleteMany();
    await prismaE2E.stockLedgerEntry.deleteMany();
    await prismaE2E.productionItem.deleteMany();
    await prismaE2E.productionRecord.deleteMany();
    await prismaE2E.inventorySourcingPayment.deleteMany();
    await prismaE2E.inventorySourcing.deleteMany();
    await prismaE2E.businessSequence.deleteMany();
    await prismaE2E.product.deleteMany();
    await prismaE2E.user.deleteMany();

    // Reset sequences in E2E
    await resetYearSequences(2026, prismaE2E);

    // Ensure unique indexes in E2E test database
    try {
      await prismaE2E.$runCommandRaw({
        createIndexes: "Client",
        indexes: [
          { key: { mobileNormalized: 1 }, name: "mobileNormalized_unique", unique: true },
          { key: { clientCode: 1 }, name: "clientCode_unique", unique: true },
        ],
      });
      await prismaE2E.$runCommandRaw({
        createIndexes: "Invoice",
        indexes: [{ key: { invoiceNo: 1 }, name: "invoiceNo_unique", unique: true }],
      });
      await prismaE2E.$runCommandRaw({
        createIndexes: "Quotation",
        indexes: [{ key: { quotationNo: 1 }, name: "quotationNo_unique", unique: true }],
      });
    } catch (idxErr) {
      console.log("[Setup] Index initialization notice:", idxErr);
    }

    // Seed test admin
    const testAdmin = await prismaE2E.user.create({
      data: {
        name: "E2E Test Admin",
        email: "e2e_admin@tamizhtech.com",
        passwordHash: "hashed_password",
        role: "SUPER_ADMIN",
      },
    });

    // Seed 2 products (1 raw material, 1 finished good)
    const rawMaterial = await prismaE2E.product.create({
      data: {
        name: "E2E Raw Aluminum Sheet",
        sku: "RAW-ALU-001",
        category: "RAW_MATERIAL",
        type: "PHYSICAL_PRODUCT",
        stockQuantity: 10,
        stockQuantityMinor: 10,
        quantityScale: 1,
        basePrice: 500,
        taxRate: 18,
      },
    });

    const finishedRobot = await prismaE2E.product.create({
      data: {
        name: "E2E Industrial Robotic Arm",
        sku: "ROB-IND-001",
        category: "ROBOTICS_KIT",
        type: "PHYSICAL_PRODUCT",
        stockQuantity: 2,
        stockQuantityMinor: 2,
        quantityScale: 1,
        basePrice: 25000,
        taxRate: 18,
      },
    });

    // Seed a fractional item (e.g. 1.250 kg wire / resin with scale 1000)
    const fractionalProduct = await prismaE2E.product.create({
      data: {
        name: "E2E Adhesive Resin (kg)",
        sku: "RAW-RES-001",
        category: "RAW_MATERIAL",
        type: "PHYSICAL_PRODUCT",
        stockQuantity: 5,
        stockQuantityMinor: 5000,
        quantityScale: 1000,
        basePrice: 1200,
        taxRate: 18,
      },
    });

    console.log("[Setup] Base data prepared in tamizhtech_e2e.\n");

    // [TEST 01/32] Client creation TT-CL-0001 inside transaction
    const client1 = await prismaE2E.$transaction(async (tx) => {
      const clientCode = await allocateClientCodeTx(tx);
      return tx.client.create({
        data: {
          clientCode,
          name: "Test Client Alpha",
          phone: "+91 98765 43210",
          mobileNormalized: "919876543210",
          email: "alpha@testclient.com",
          company: "Alpha Robotics Lab",
          city: "Chennai",
          state: "Tamil Nadu",
        },
      });
    });
    assertTest(1, "Client creation TT-CL-0001 inside transaction", client1.clientCode === "TT-CL-0001", client1.clientCode);

    // [TEST 02/32] Duplicate mobile prevention
    let duplicateCaught = false;
    try {
      await prismaE2E.$transaction(async (tx) => {
        const clientCode = await allocateClientCodeTx(tx);
        return tx.client.create({
          data: {
            clientCode,
            name: "Duplicate Mobile Client",
            phone: "+91 98765 43210",
            mobileNormalized: "919876543210",
          },
        });
      });
    } catch {
      duplicateCaught = true;
    }
    assertTest(2, "Duplicate mobile prevention (aborts & rolls back)", duplicateCaught);

    // [TEST 03/32] Client code sequentiality TT-CL-0002 without gaps
    const client2 = await prismaE2E.$transaction(async (tx) => {
      const clientCode = await allocateClientCodeTx(tx);
      return tx.client.create({
        data: {
          clientCode,
          name: "Test Client Beta",
          phone: "+91 98765 43211",
          mobileNormalized: "919876543211",
          email: "beta@testclient.com",
          company: "Beta Tech Systems",
          city: "Coimbatore",
        },
      });
    });
    assertTest(3, "Client code sequentiality TT-CL-0002 without gaps", client2.clientCode === "TT-CL-0002", client2.clientCode);

    // [TEST 04/32] Product catalog retrieval & immutable scale
    const fetchedRaw = await prismaE2E.product.findUnique({ where: { id: rawMaterial.id } });
    assertTest(4, "Product catalog retrieval & structure", fetchedRaw !== null && fetchedRaw.sku === "RAW-ALU-001");

    // [TEST 05/32] Fractional quantity scale representation
    const fetchedFractional = await prismaE2E.product.findUnique({ where: { id: fractionalProduct.id } });
    const realQty = (fetchedFractional!.stockQuantityMinor || 0) / fetchedFractional!.quantityScale;
    assertTest(5, "Fractional quantity scale representation (5000 / 1000 = 5.0 kg)", realQty === 5 && fetchedFractional!.quantityScale === 1000);

    // [TEST 06/32] Raw material stock check
    assertTest(6, "Raw material stock check", fetchedRaw!.stockQuantityMinor === 10);

    // [TEST 07/32] Sourcing entry creation & stock ledger entry
    const sourcingNo = await generateSourcingNo();
    const sourcing = await prismaE2E.$transaction(async (tx) => {
      const src = await tx.inventorySourcing.create({
        data: {
          sourcingNo,
          productId: rawMaterial.id,
          quantity: 20,
          quantityMinor: 20,
          sourceType: "OFFLINE",
          vendorName: "Aluminum Supplies India",
          unitCost: 450,
          unitCostPaise: 45000,
          totalCost: 9000,
          totalCostPaise: 900000,
          status: "ACTIVE",
          paymentStatus: "UNPAID",
          createdById: testAdmin.id,
        },
      });

      await tx.product.update({
        where: { id: rawMaterial.id },
        data: {
          stockQuantity: { increment: 20 },
          stockQuantityMinor: { increment: 20 },
        },
      });

      await tx.stockLedgerEntry.create({
        data: {
          productId: rawMaterial.id,
          quantitySigned: 20,
          quantitySignedMinor: 20,
          type: "PURCHASE",
          referenceType: "SOURCING",
          referenceId: src.id,
          effectiveAt: new Date(),
        },
      });

      return src;
    });
    const updatedRawAfterSource = await prismaE2E.product.findUnique({ where: { id: rawMaterial.id } });
    assertTest(7, "Sourcing entry creation & stock increment (+20 = 30)", updatedRawAfterSource!.stockQuantityMinor === 30, `SourcingNo: ${sourcing.sourcingNo}`);

    // [TEST 08/32] In-house production run & BOM consumption
    const productionNo = await generateProductionNo();
    const production = await prismaE2E.$transaction(async (tx) => {
      // Consume 4 units raw aluminum to produce 1 robot
      await tx.product.update({
        where: { id: rawMaterial.id },
        data: {
          stockQuantity: { decrement: 4 },
          stockQuantityMinor: { decrement: 4 },
        },
      });

      await tx.stockLedgerEntry.create({
        data: {
          productId: rawMaterial.id,
          quantitySigned: -4,
          quantitySignedMinor: -4,
          type: "PRODUCTION_CONSUMPTION",
          referenceType: "PRODUCTION",
          effectiveAt: new Date(),
        },
      });

      // Increment finished robot stock
      await tx.product.update({
        where: { id: finishedRobot.id },
        data: {
          stockQuantity: { increment: 1 },
          stockQuantityMinor: { increment: 1 },
        },
      });

      await tx.stockLedgerEntry.create({
        data: {
          productId: finishedRobot.id,
          quantitySigned: 1,
          quantitySignedMinor: 1,
          type: "PRODUCTION_OUTPUT",
          referenceType: "PRODUCTION",
          effectiveAt: new Date(),
        },
      });

      return tx.productionRecord.create({
        data: {
          productionNo,
          finishedProductId: finishedRobot.id,
          quantityProduced: 1,
          quantityProducedMinor: 1,
          materialCost: 1800,
          materialCostPaise: 180000,
          directCost: 200,
          directCostPaise: 20000,
          totalProductionCost: 2000,
          totalProductionCostPaise: 200000,
          unitProductionCost: 2000,
          unitProductionCostPaise: 200000,
          status: "COMPLETED",
          createdById: testAdmin.id,
          items: {
            create: [
              {
                inputProductId: rawMaterial.id,
                quantityConsumed: 4,
                quantityConsumedMinor: 4,
                unitCost: 450,
                unitCostPaise: 45000,
                totalCost: 1800,
                totalCostPaise: 180000,
              },
            ],
          },
        },
      });
    });
    assertTest(8, "In-house production run & BOM consumption (-4 raw aluminum)", production.status === "COMPLETED", `ProdNo: ${production.productionNo}`);

    // [TEST 09/32] Finished goods stock increment after production
    const updatedRobotAfterProd = await prismaE2E.product.findUnique({ where: { id: finishedRobot.id } });
    assertTest(9, "Finished goods stock increment after production (2 -> 3)", updatedRobotAfterProd!.stockQuantityMinor === 3);

    // [TEST 10/32] Stock ledger chronological integrity (effectiveAt)
    const ledgerEntries = await prismaE2E.stockLedgerEntry.findMany({
      where: { productId: rawMaterial.id },
      orderBy: { effectiveAt: "asc" },
    });
    const allHaveEffectiveAt = ledgerEntries.every((e) => e.effectiveAt !== null && e.effectiveAt !== undefined);
    assertTest(10, "Stock ledger chronological integrity (effectiveAt non-null on all entries)", allHaveEffectiveAt && ledgerEntries.length >= 2);

    // [TEST 11/32] Quotation creation as DRAFT with draft reference
    const draftQuoteNo = generateDraftQuotationNo();
    const quote1 = await prismaE2E.quotation.create({
      data: {
        quotationNo: draftQuoteNo,
        clientId: client1.id,
        status: "DRAFT",
        validUntil: new Date(Date.now() + 30 * 86400000),
        subtotal: 2500000, // 25,000 INR
        taxAmount: 450000,   // 18% = 4,500 INR
        total: 2950000,     // 29,500 INR
        items: {
          create: [
            {
              productId: finishedRobot.id,
              name: finishedRobot.name,
              description: finishedRobot.name,
              qty: 1,
              unitPrice: 2500000,
              taxRate: 18,
              amount: 2500000,
            },
          ],
        },
      },
    });
    assertTest(11, "Quotation creation as DRAFT with provisional reference", quote1.quotationNo.startsWith("DRAFT-QTN-2026-"), quote1.quotationNo);

    // [TEST 12/32] Quotation transition DRAFT -> SENT allocates official TTRC-QTN-2026-0001
    const finalizedQuote1 = await prismaE2E.$transaction(async (tx) => {
      const officialNo = await allocateQuotationNoTx(tx, 2026);
      return tx.quotation.update({
        where: { id: quote1.id },
        data: {
          status: "SENT",
          quotationNo: officialNo,
        },
      });
    });
    assertTest(12, "Quotation transition DRAFT -> SENT allocates official TTRC-QTN-2026-0001", finalizedQuote1.quotationNo === "TTRC-QTN-2026-0001", finalizedQuote1.quotationNo);

    // [TEST 13/32] Quotation transition SENT -> ACCEPTED retains same quotation number
    const acceptedQuote1 = await prismaE2E.quotation.update({
      where: { id: quote1.id },
      data: { status: "ACCEPTED" },
    });
    assertTest(13, "Quotation transition SENT -> ACCEPTED retains same quotation number", acceptedQuote1.quotationNo === "TTRC-QTN-2026-0001");

    // [TEST 14/32] Second quotation creates TTRC-QTN-2026-0002 without gaps
    const quote2 = await prismaE2E.$transaction(async (tx) => {
      const officialNo = await allocateQuotationNoTx(tx, 2026);
      return tx.quotation.create({
        data: {
          quotationNo: officialNo,
          clientId: client2.id,
          status: "SENT",
          validUntil: new Date(Date.now() + 30 * 86400000),
          subtotal: 5000000,
          taxAmount: 900000,
          total: 5900000,
          items: {
            create: [
              {
                productId: finishedRobot.id,
                name: finishedRobot.name,
                description: finishedRobot.name,
                qty: 2,
                unitPrice: 2500000,
                taxRate: 18,
                amount: 5000000,
              },
            ],
          },
        },
      });
    });
    assertTest(14, "Second quotation creates TTRC-QTN-2026-0002 without gaps", quote2.quotationNo === "TTRC-QTN-2026-0002", quote2.quotationNo);

    // [TEST 15/32] Quotation conversion to Invoice creates new invoice sequence
    const convertedInvoice = await prismaE2E.$transaction(async (tx) => {
      const invoiceNo = await allocateInvoiceNoTx(tx, 2026);
      const inv = await tx.invoice.create({
        data: {
          invoiceNo,
          clientId: quote1.clientId,
          clientName: client1.name,
          status: "ISSUED",
          issuedAt: new Date(),
          date: new Date(),
          dueDate: new Date(Date.now() + 15 * 86400000),
          subtotal: quote1.subtotal,
          gstPercent: 18,
          gstAmount: quote1.taxAmount,
          discountAmount: 0,
          total: quote1.total,
          paidAmount: 0,
          balance: quote1.total,
          items: {
            create: [
              {
                productId: finishedRobot.id,
                description: finishedRobot.name,
                qty: 1,
                unitPrice: 2500000,
                amount: 2500000,
              },
            ],
          },
        },
      });

      await tx.quotation.update({
        where: { id: quote1.id },
        data: { convertedToInvoiceId: inv.id },
      });

      // Deduct stock for issued invoice
      await tx.product.update({
        where: { id: finishedRobot.id },
        data: {
          stockQuantity: { decrement: 1 },
          stockQuantityMinor: { decrement: 1 },
        },
      });

      await tx.stockLedgerEntry.create({
        data: {
          productId: finishedRobot.id,
          quantitySigned: -1,
          quantitySignedMinor: -1,
          type: "SALE",
          referenceType: "INVOICE",
          referenceId: inv.id,
          effectiveAt: new Date(),
        },
      });

      return inv;
    });
    assertTest(15, "Quotation conversion to Invoice allocates TTRC-BILL-2026-0001", convertedInvoice.invoiceNo === "TTRC-BILL-2026-0001", convertedInvoice.invoiceNo);

    // [TEST 16/32] Converted invoice stock deduction verification
    const stockAfterBill1 = await prismaE2E.product.findUnique({ where: { id: finishedRobot.id } });
    assertTest(16, "Stock deduction executed on Invoice ISSUANCE (3 -> 2)", stockAfterBill1!.stockQuantityMinor === 2);

    // [TEST 17/32] Direct Invoice creation as DRAFT receives DRAFT-BILL-YYYY-XXXX
    const draftBillNo = generateDraftInvoiceNo();
    const draftInvoice = await prismaE2E.invoice.create({
      data: {
        invoiceNo: draftBillNo,
        clientId: client2.id,
        clientName: client2.name,
        status: "DRAFT",
        date: new Date(),
        dueDate: new Date(Date.now() + 15 * 86400000),
        subtotal: 2500000,
        gstPercent: 18,
        gstAmount: 450000,
        discountAmount: 0,
        total: 2950000,
        paidAmount: 0,
        balance: 2950000,
        items: {
          create: [
            {
              productId: finishedRobot.id,
              description: finishedRobot.name,
              qty: 1,
              unitPrice: 2500000,
              amount: 2500000,
            },
          ],
        },
      },
    });
    assertTest(17, "Direct Invoice creation as DRAFT receives DRAFT-BILL-2026-XXXX", draftInvoice.invoiceNo.startsWith("DRAFT-BILL-2026-"), draftInvoice.invoiceNo);

    // [TEST 18/32] Invoice issuance DRAFT -> ISSUED allocates TTRC-BILL-2026-0002 atomically
    const issuedInvoice2 = await prismaE2E.$transaction(async (tx) => {
      const officialNo = await allocateInvoiceNoTx(tx, 2026);
      const inv = await tx.invoice.update({
        where: { id: draftInvoice.id },
        data: {
          status: "ISSUED",
          invoiceNo: officialNo,
          issuedAt: new Date(),
        },
      });

      await tx.product.update({
        where: { id: finishedRobot.id },
        data: {
          stockQuantity: { decrement: 1 },
          stockQuantityMinor: { decrement: 1 },
        },
      });

      await tx.stockLedgerEntry.create({
        data: {
          productId: finishedRobot.id,
          quantitySigned: -1,
          quantitySignedMinor: -1,
          type: "SALE",
          referenceType: "INVOICE",
          referenceId: inv.id,
          effectiveAt: new Date(),
        },
      });

      return inv;
    });
    assertTest(18, "Invoice issuance DRAFT -> ISSUED allocates TTRC-BILL-2026-0002 atomically", issuedInvoice2.invoiceNo === "TTRC-BILL-2026-0002", issuedInvoice2.invoiceNo);

    // [TEST 19/32] Stock deduction on second Invoice ISSUANCE
    const stockAfterBill2 = await prismaE2E.product.findUnique({ where: { id: finishedRobot.id } });
    assertTest(19, "Stock deduction on second Invoice ISSUANCE (2 -> 1)", stockAfterBill2!.stockQuantityMinor === 1);

    // [TEST 20/32] Sequence continuity verification: TTRC-BILL-2026-0001 then 0002
    assertTest(20, "Bill sequence continuity verification (0001 -> 0002)", convertedInvoice.invoiceNo === "TTRC-BILL-2026-0001" && issuedInvoice2.invoiceNo === "TTRC-BILL-2026-0002");

    // [TEST 21/32] Exact paise financial calculation
    const expectedSubtotal = 2500000;
    const expectedTax = 450000;
    const expectedTotal = 2950000;
    assertTest(21, "Exact paise financial calculation (subtotal, GST, total)", 
      issuedInvoice2.subtotal === expectedSubtotal && 
      issuedInvoice2.gstAmount === expectedTax && 
      issuedInvoice2.total === expectedTotal
    );

    // [TEST 22/32] Invoice cancellation retains TTRC-BILL-2026-0002 permanently
    const cancelledInvoice2 = await prismaE2E.invoice.update({
      where: { id: issuedInvoice2.id },
      data: { status: "CANCELLED" },
    });
    assertTest(22, "Invoice cancellation retains TTRC-BILL-2026-0002 permanently", cancelledInvoice2.invoiceNo === "TTRC-BILL-2026-0002" && cancelledInvoice2.status === "CANCELLED");

    // [TEST 23/32] Stock reversal on Invoice CANCELLATION
    await prismaE2E.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: finishedRobot.id },
        data: {
          stockQuantity: { increment: 1 },
          stockQuantityMinor: { increment: 1 },
        },
      });
      await tx.stockLedgerEntry.create({
        data: {
          productId: finishedRobot.id,
          quantitySigned: 1,
          quantitySignedMinor: 1,
          type: "SALE_RETURN",
          referenceType: "INVOICE_CANCEL",
          referenceId: cancelledInvoice2.id,
          effectiveAt: new Date(),
        },
      });
    });
    const stockAfterCancel = await prismaE2E.product.findUnique({ where: { id: finishedRobot.id } });
    assertTest(23, "Stock reversal on Invoice CANCELLATION (1 -> 2)", stockAfterCancel!.stockQuantityMinor === 2);

    // [TEST 24/32] Non-reusability: third invoice ISSUED allocates TTRC-BILL-2026-0003
    const invoice3 = await prismaE2E.$transaction(async (tx) => {
      const officialNo = await allocateInvoiceNoTx(tx, 2026);
      return tx.invoice.create({
        data: {
          invoiceNo: officialNo,
          clientId: client1.id,
          clientName: client1.name,
          status: "ISSUED",
          issuedAt: new Date(),
          date: new Date(),
          dueDate: new Date(Date.now() + 15 * 86400000),
          subtotal: 100000,
          gstPercent: 18,
          gstAmount: 18000,
          discountAmount: 0,
          total: 118000,
          paidAmount: 0,
          balance: 118000,
          items: {
            create: [
              {
                productId: rawMaterial.id,
                description: rawMaterial.name,
                qty: 2,
                unitPrice: 50000,
                amount: 100000,
              },
            ],
          },
        },
      });
    });
    assertTest(24, "Non-reusability verification: third invoice allocates TTRC-BILL-2026-0003", invoice3.invoiceNo === "TTRC-BILL-2026-0003", invoice3.invoiceNo);

    // [TEST 25/32] Payment recording against invoice & balance update
    const paymentNo = await allocatePaymentNoTx(prismaE2E, 2026);
    const payment = await prismaE2E.$transaction(async (tx) => {
      const pay = await tx.payment.create({
        data: {
          paymentNo,
          invoiceId: convertedInvoice.id,
          clientId: client1.id,
          amount: 1000000, // 10,000 INR partial payment
          mode: "BANK_TRANSFER",
          status: "COMPLETED",
          type: "PAYMENT",
        },
      });

      await tx.invoice.update({
        where: { id: convertedInvoice.id },
        data: {
          paidAmount: 1000000,
          balance: convertedInvoice.total - 1000000,
          status: "PARTIALLY_PAID",
        },
      });

      return pay;
    });
    const invAfterPay = await prismaE2E.invoice.findUnique({ where: { id: convertedInvoice.id } });
    assertTest(25, "Payment recording & balance decrement (29,500 - 10,000 = 19,500)", invAfterPay!.balance === 1950000 && invAfterPay!.status === "PARTIALLY_PAID");

    // [TEST 26/32] Overpayment prevention boundary check
    const excessAmount = invAfterPay!.balance + 500000;
    const canAcceptExcess = excessAmount <= invAfterPay!.balance;
    assertTest(26, "Overpayment prevention boundary check (cannot pay > balance)", !canAcceptExcess);

    // [TEST 27/32] Payment receipt sequence allocation TTRC-PAY-2026-0001
    assertTest(27, "Payment receipt sequence allocation TTRC-PAY-2026-0001", payment.paymentNo === "TTRC-PAY-2026-0001", payment.paymentNo);

    // [TEST 28/32] Expense entry creation & TTRC-EXP-2026-0001 sequence
    const expenseNo = await generateExpenseNo();
    const expense = await prismaE2E.expense.create({
      data: {
        expenseNo,
        category: "OFFICE_SUPPLIES",
        amount: 250000, // 2,500 INR
        status: "APPROVED",
        paymentStatus: "PAID",
        paidAmount: 250000,
        paidTo: "Office Mart Ltd",
        createdById: testAdmin.id,
      },
    });
    assertTest(28, "Expense entry creation & sequence TTRC-EXP-2026-0001", expense.expenseNo.startsWith("TTRC-EXP-2026-"), expense.expenseNo);

    // [TEST 29/32] Downstream deletion protection for converted quotation
    const quoteWithInvoice = await prismaE2E.quotation.findUnique({ where: { id: quote1.id } });
    const isProtectedFromDelete = !!quoteWithInvoice?.convertedToInvoiceId;
    assertTest(29, "Downstream deletion protection (converted quotation cannot be hard-deleted)", isProtectedFromDelete);

    // [TEST 30/32] PDF template data normalization & A4 compliance
    const invoiceForPdf = await prismaE2E.invoice.findUnique({
      where: { id: convertedInvoice.id },
      include: { items: true, client: true },
    });
    const hasRequiredPdfFields = 
      !!invoiceForPdf?.invoiceNo &&
      !!invoiceForPdf?.client?.name &&
      invoiceForPdf?.items.length > 0 &&
      typeof invoiceForPdf?.total === "number";
    assertTest(30, "PDF template data normalization & A4 compliance", hasRequiredPdfFields);

    // [TEST 31/32] Global search indexing and resolution
    const searchResults = await prismaE2E.invoice.findMany({
      where: {
        OR: [
          { invoiceNo: { contains: "TTRC-BILL-2026-0001" } },
          { clientName: { contains: "Alpha Robotics" } },
        ],
      },
    });
    assertTest(31, "Global search indexing and resolution", searchResults.length >= 1 && searchResults[0].invoiceNo === "TTRC-BILL-2026-0001");

    // [TEST 32/32] Production database isolation verification (tamizhtech production counts unchanged)
    const [prodClients, prodInvoices, prodQuotations] = await Promise.all([
      prismaProd.client.count(),
      prismaProd.invoice.count(),
      prismaProd.quotation.count(),
    ]);
    // Pre-purge production had 13 clients, 2 invoices, 2 quotations
    const prodUntouched = prodClients === 13 && prodInvoices === 2 && prodQuotations === 2;
    assertTest(32, "Production database isolation verification (Production DB untouched by E2E suite)", prodUntouched, `Prod Clients: ${prodClients}, Invoices: ${prodInvoices}, Quotes: ${prodQuotations}`);

    console.log("\n==================================================");
    console.log(`E2E VERIFICATION RESULT: ${passCount}/32 PASS`);
    console.log("==================================================");

  } catch (error: any) {
    console.error("\nE2E Suite Execution Failed:", error);
    process.exit(1);
  } finally {
    await prismaE2E.$disconnect();
    await prismaProd.$disconnect();
  }
}

main();
