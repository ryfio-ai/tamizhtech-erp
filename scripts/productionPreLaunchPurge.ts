import { PrismaClient } from "@prisma/client";
import dns from "dns";
import { resetYearSequences } from "../lib/sequence";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("STEP 5: PRODUCTION PRE-LAUNCH PURGE & INTEGRITY AUDIT");
  console.log("Database: tamizhtech (Production)");
  console.log("==================================================");

  // 1. Capture Pre-Purge Authentic Retained Assets
  console.log("\n[1] Capturing Pre-Purge Authentic Retained Assets...");
  const preProducts = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, stockQuantity: true, stockQuantityMinor: true, quantityScale: true, basePrice: true },
    orderBy: { sku: "asc" },
  });
  const preSourcings = await prisma.inventorySourcing.findMany({
    select: { id: true, sourcingNo: true, productId: true, quantity: true, totalCost: true, unitCost: true },
    orderBy: { sourcingNo: "asc" },
  });
  const preProductions = await prisma.productionRecord.findMany({
    select: { id: true, productionNo: true, finishedProductId: true, quantityProduced: true, totalProductionCost: true },
    orderBy: { productionNo: "asc" },
  });
  const preUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true, name: true },
    orderBy: { email: "asc" },
  });

  const preClientsCount = await prisma.client.count();
  const preInvoicesCount = await prisma.invoice.count();
  const preQuotationsCount = await prisma.quotation.count();

  console.log(`Pre-Purge Baseline:`);
  console.log(`  - Products: ${preProducts.length}`);
  console.log(`  - Inventory Sourcings: ${preSourcings.length}`);
  console.log(`  - Production Records: ${preProductions.length}`);
  console.log(`  - Admin Users: ${preUsers.length}`);
  console.log(`  - Test Clients (to purge): ${preClientsCount}`);
  console.log(`  - Test Invoices (to purge): ${preInvoicesCount}`);
  console.log(`  - Test Quotations (to purge): ${preQuotationsCount}`);

  if (preProducts.length !== 31 || preSourcings.length !== 4 || preProductions.length !== 3 || preUsers.length !== 2) {
    throw new Error(`Pre-purge baseline mismatch! Expected: 31 products, 4 sourcings, 3 productions, 2 users. Got: ${preProducts.length}, ${preSourcings.length}, ${preProductions.length}, ${preUsers.length}`);
  }

  // 2. Perform Pre-Launch Purge of Test Data
  console.log("\n[2] Executing Pre-Launch Purge of Test/Demo Records...");
  const delInvItems = await prisma.invoiceItem.deleteMany();
  const delInvoices = await prisma.invoice.deleteMany();
  const delQuotItems = await prisma.quotationItem.deleteMany();
  const delQuotations = await prisma.quotation.deleteMany();
  const delClientContacts = await prisma.clientContact.deleteMany();
  const delClients = await prisma.client.deleteMany();
  const delPayments = await prisma.payment.deleteMany();
  const delExpensePayments = await prisma.expensePayment.deleteMany();
  const delExpenses = await prisma.expense.deleteMany();

  console.log(`Purged Records:`);
  console.log(`  - Invoices: ${delInvoices.count} (Items: ${delInvItems.count})`);
  console.log(`  - Quotations: ${delQuotations.count} (Items: ${delQuotItems.count})`);
  console.log(`  - Clients: ${delClients.count} (Contacts: ${delClientContacts.count})`);
  console.log(`  - Payments: ${delPayments.count}`);
  console.log(`  - Expenses: ${delExpenses.count} (Payments: ${delExpensePayments.count})`);

  // 3. Verify Retained Authentic Assets Unchanged
  console.log("\n[3] Verifying Retained Authentic Assets Exact Match...");
  const postProducts = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, stockQuantity: true, stockQuantityMinor: true, quantityScale: true, basePrice: true },
    orderBy: { sku: "asc" },
  });
  const postSourcings = await prisma.inventorySourcing.findMany({
    select: { id: true, sourcingNo: true, productId: true, quantity: true, totalCost: true, unitCost: true },
    orderBy: { sourcingNo: "asc" },
  });
  const postProductions = await prisma.productionRecord.findMany({
    select: { id: true, productionNo: true, finishedProductId: true, quantityProduced: true, totalProductionCost: true },
    orderBy: { productionNo: "asc" },
  });
  const postUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true, name: true },
    orderBy: { email: "asc" },
  });

  // Strict count comparison
  console.log(`Comparison Matrix:`);
  console.log(`  - Products:            ${preProducts.length} → ${postProducts.length} (Expected 31 → 31)`);
  console.log(`  - Inventory Sourcings: ${preSourcings.length} → ${postSourcings.length} (Expected 4 → 4)`);
  console.log(`  - Production Records:  ${preProductions.length} → ${postProductions.length} (Expected 3 → 3)`);
  console.log(`  - Admin Users:         ${preUsers.length} → ${postUsers.length} (Expected 2 → 2)`);

  if (postProducts.length !== 31 || postSourcings.length !== 4 || postProductions.length !== 3 || postUsers.length !== 2) {
    throw new Error("Post-purge count verification failed! Retained asset counts modified!");
  }

  // Exact ID and field equality verification
  for (let i = 0; i < preProducts.length; i++) {
    const pre = preProducts[i];
    const post = postProducts.find((p) => p.id === pre.id);
    if (!post || post.sku !== pre.sku || post.stockQuantity !== pre.stockQuantity || post.quantityScale !== pre.quantityScale) {
      throw new Error(`Product ${pre.sku} modified during purge!`);
    }
  }
  console.log("[OK] All 31 product IDs, SKUs, and stock quantities verified intact.");

  for (let i = 0; i < preSourcings.length; i++) {
    const pre = preSourcings[i];
    const post = postSourcings.find((s) => s.id === pre.id);
    if (!post || post.sourcingNo !== pre.sourcingNo || post.totalCost !== pre.totalCost) {
      throw new Error(`Inventory sourcing ${pre.sourcingNo} modified during purge!`);
    }
  }
  console.log("[OK] All 4 authentic inventory sourcings verified intact.");

  for (let i = 0; i < preProductions.length; i++) {
    const pre = preProductions[i];
    const post = postProductions.find((p) => p.id === pre.id);
    if (!post || post.productionNo !== pre.productionNo || post.quantityProduced !== pre.quantityProduced) {
      throw new Error(`Production record ${pre.productionNo} modified during purge!`);
    }
  }
  console.log("[OK] All 3 production records verified intact.");

  for (let i = 0; i < preUsers.length; i++) {
    const pre = preUsers[i];
    const post = postUsers.find((u) => u.id === pre.id);
    if (!post || post.email !== pre.email || post.role !== pre.role) {
      throw new Error(`Admin user ${pre.email} modified during purge!`);
    }
  }
  console.log("[OK] All 2 admin users verified intact.");

  // 4. Verify Zero Transaction State
  console.log("\n[4] Verifying Complete Transactional Zero State...");
  const postClientsCount = await prisma.client.count();
  const postInvoicesCount = await prisma.invoice.count();
  const postQuotationsCount = await prisma.quotation.count();
  const postPaymentsCount = await prisma.payment.count();
  const postExpensesCount = await prisma.expense.count();

  console.log(`Current Transaction Counts:`);
  console.log(`  - Customers:  ${postClientsCount} (Required: 0)`);
  console.log(`  - Bills:      ${postInvoicesCount} (Required: 0)`);
  console.log(`  - Quotations: ${postQuotationsCount} (Required: 0)`);
  console.log(`  - Payments:   ${postPaymentsCount} (Required: 0)`);
  console.log(`  - Expenses:   ${postExpensesCount} (Required: 0)`);

  if (postClientsCount !== 0 || postInvoicesCount !== 0 || postQuotationsCount !== 0 || postPaymentsCount !== 0 || postExpensesCount !== 0) {
    throw new Error("Zero transaction verification failed! Test records remain in production!");
  }
  console.log("[OK] Genuinely ZERO customers, bills, quotations, payments, and expenses verified.");

  // 5. Initialize Sequences for 2026 Commercial Launch
  console.log("\n[5] Initializing Sequences for 2026 Commercial Launch...");
  await resetYearSequences(2026, prisma);

  const seqInvoice = await prisma.businessSequence.findUnique({ where: { name: "INVOICE_2026" } });
  const seqQuotation = await prisma.businessSequence.findUnique({ where: { name: "QUOTATION_2026" } });
  const seqClient = await prisma.businessSequence.findUnique({ where: { name: "CLIENT" } });

  console.log(`Verified Sequence Registers:`);
  console.log(`  - INVOICE_2026:   lastNumber = ${seqInvoice?.lastNumber} (Next will be TTRC-BILL-2026-0001)`);
  console.log(`  - QUOTATION_2026: lastNumber = ${seqQuotation?.lastNumber} (Next will be TTRC-QTN-2026-0001)`);
  console.log(`  - CLIENT:         lastNumber = ${seqClient?.lastNumber} (Next will be TT-CL-0001)`);

  if (seqInvoice?.lastNumber !== 0 || seqQuotation?.lastNumber !== 0 || seqClient?.lastNumber !== 0) {
    throw new Error("Sequence initialization failed! Sequences must start at 0 before launch.");
  }
  console.log("[OK] All 2026 sequences initialized to 0 cleanly.");

  console.log("\n==================================================");
  console.log("PRODUCTION PRE-LAUNCH PURGE & AUDIT SUCCESSFUL!");
  console.log("Database is clean, authentic, and verified ready.");
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("\n[PURGE FAILED]", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
