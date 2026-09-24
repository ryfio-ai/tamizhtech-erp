import { PrismaClient } from "@prisma/client";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const prisma = new PrismaClient();

async function purgeAllProducts() {
  console.log("==================================================");
  console.log("TAMIZHTECH ERP: PURGE ALL PRODUCTS & STOCK DATA");
  console.log("Target Database: tamizhtech");
  console.log("Reason: Client handover - fresh start");
  console.log("==================================================");

  // 1. Audit current counts
  const initialProducts = await prisma.product.count();
  const initialStockEntries = await prisma.stockLedgerEntry.count();
  const initialSourcings = await prisma.inventorySourcing.count();
  const initialSourcingPayments = await prisma.inventorySourcingPayment.count();
  const initialProductionRecords = await prisma.productionRecord.count();
  const initialProductionItems = await prisma.productionItem.count();

  console.log(`Current Records Before Purge:`);
  console.log(`  - Products: ${initialProducts}`);
  console.log(`  - Stock Ledger Entries: ${initialStockEntries}`);
  console.log(`  - Inventory Sourcings: ${initialSourcings}`);
  console.log(`  - Inventory Sourcing Payments: ${initialSourcingPayments}`);
  console.log(`  - Production Records: ${initialProductionRecords}`);
  console.log(`  - Production Items: ${initialProductionItems}`);

  // 2. Cascade delete dependent transactional inventory records
  console.log("\n[1] Deleting Production Items & Records...");
  const delProdItems = await prisma.productionItem.deleteMany();
  const delProdRecords = await prisma.productionRecord.deleteMany();
  console.log(`  Deleted ${delProdItems.count} production items, ${delProdRecords.count} production records.`);

  console.log("\n[2] Deleting Inventory Sourcing Payments & Sourcings...");
  const delSrcPayments = await prisma.inventorySourcingPayment.deleteMany();
  const delSourcings = await prisma.inventorySourcing.deleteMany();
  console.log(`  Deleted ${delSrcPayments.count} sourcing payments, ${delSourcings.count} sourcings.`);

  console.log("\n[3] Deleting Stock Ledger Entries...");
  const delStockEntries = await prisma.stockLedgerEntry.deleteMany();
  console.log(`  Deleted ${delStockEntries.count} stock ledger entries.`);

  console.log("\n[4] Deleting Quotation, Sales Order, Invoice, & PO product links if any...");
  // Clear any product references in draft items if they exist
  await prisma.quotationItem.deleteMany({ where: { productId: { not: null } } });
  await prisma.salesOrderItem.deleteMany({ where: { productId: { not: null } } });
  await prisma.invoiceItem.deleteMany({ where: { productId: { not: null } } });
  await prisma.purchaseOrderItem.deleteMany({ where: { productId: { not: null } } });

  console.log("\n[5] Deleting All Products...");
  const delProducts = await prisma.product.deleteMany();
  console.log(`  Deleted ${delProducts.count} products.`);

  console.log("\n[6] Resetting SKU Sequence Counters to 0...");
  const skuSequences = await prisma.businessSequence.findMany({
    where: { name: { startsWith: "SKU_" } },
  });

  for (const seq of skuSequences) {
    await prisma.businessSequence.update({
      where: { id: seq.id },
      data: { lastNumber: 0 },
    });
    console.log(`  Reset ${seq.name} -> lastNumber = 0`);
  }

  // 3. Verification
  console.log("\n[7] Verifying Zero Product State...");
  const finalProducts = await prisma.product.count();
  const finalStockEntries = await prisma.stockLedgerEntry.count();
  const finalSourcings = await prisma.inventorySourcing.count();
  const finalProdRecords = await prisma.productionRecord.count();

  console.log(`Final Database State:`);
  console.log(`  - Products: ${finalProducts}`);
  console.log(`  - Stock Entries: ${finalStockEntries}`);
  console.log(`  - Sourcings: ${finalSourcings}`);
  console.log(`  - Production Records: ${finalProdRecords}`);

  if (finalProducts === 0 && finalStockEntries === 0 && finalSourcings === 0 && finalProdRecords === 0) {
    console.log("\nSUCCESS: All products and inventory records completely wiped!");
    console.log("The client can now enter all their products fresh from SKU 001.");
  } else {
    throw new Error("Verification failed! Some product records remain.");
  }
}

purgeAllProducts()
  .catch((err) => {
    console.error("Purge Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
