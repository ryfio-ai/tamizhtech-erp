import { PrismaClient } from "@prisma/client";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("STEP 9: FINAL PRODUCTION DATABASE VERIFICATION");
  console.log("Target: tamizhtech (Live Commercial DB)");
  console.log("==================================================");

  const [
    customerCount,
    billCount,
    quoteCount,
    paymentCount,
    expenseCount,
    productCount,
    sourcingCount,
    productionCount,
    userCount,
    settingsCount,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.invoice.count(),
    prisma.quotation.count(),
    prisma.payment.count(),
    prisma.expense.count(),
    prisma.product.count(),
    prisma.inventorySourcing.count(),
    prisma.productionRecord.count(),
    prisma.user.count(),
    prisma.systemSetting.count(),
  ]);

  const [seqInvoice, seqQuotation, seqClient] = await Promise.all([
    prisma.businessSequence.findUnique({ where: { name: "INVOICE_2026" } }),
    prisma.businessSequence.findUnique({ where: { name: "QUOTATION_2026" } }),
    prisma.businessSequence.findUnique({ where: { name: "CLIENT" } }),
  ]);

  const checks = [
    { entity: "Customers (Transactional)", count: customerCount, target: 0, status: customerCount === 0 ? "PASS" : "FAIL" },
    { entity: "Bills/Invoices (Transactional)", count: billCount, target: 0, status: billCount === 0 ? "PASS" : "FAIL" },
    { entity: "Quotations (Transactional)", count: quoteCount, target: 0, status: quoteCount === 0 ? "PASS" : "FAIL" },
    { entity: "Payments (Transactional)", count: paymentCount, target: 0, status: paymentCount === 0 ? "PASS" : "FAIL" },
    { entity: "Expenses (Transactional)", count: expenseCount, target: 0, status: expenseCount === 0 ? "PASS" : "FAIL" },
    { entity: "Product Master (Authentic)", count: productCount, target: 31, status: productCount === 31 ? "PASS" : "FAIL" },
    { entity: "Inventory Sourcings (Authentic)", count: sourcingCount, target: 4, status: sourcingCount === 4 ? "PASS" : "FAIL" },
    { entity: "Production Records (Authentic)", count: productionCount, target: 3, status: productionCount === 3 ? "PASS" : "FAIL" },
    { entity: "Admin Users (Authentic)", count: userCount, target: 2, status: userCount === 2 ? "PASS" : "FAIL" },
    { entity: "System Settings (Authentic)", count: settingsCount, target: 10, status: settingsCount >= 10 ? "PASS" : "FAIL" },
    { entity: "Sequence INVOICE_2026", count: seqInvoice?.lastNumber ?? -1, target: 0, status: seqInvoice?.lastNumber === 0 ? "PASS" : "FAIL" },
    { entity: "Sequence QUOTATION_2026", count: seqQuotation?.lastNumber ?? -1, target: 0, status: seqQuotation?.lastNumber === 0 ? "PASS" : "FAIL" },
    { entity: "Sequence CLIENT", count: seqClient?.lastNumber ?? -1, target: 0, status: seqClient?.lastNumber === 0 ? "PASS" : "FAIL" },
  ];

  console.table(checks);

  const allPassed = checks.every((c) => c.status === "PASS");

  if (!allPassed) {
    console.error("\n[CRITICAL BLOCKER] Production database does not meet launch criteria!");
    process.exit(1);
  }

  console.log("\n[SUCCESS] Production database is verified 100% READY for public commercial launch.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
