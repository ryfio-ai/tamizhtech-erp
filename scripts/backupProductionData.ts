import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("STEP 1: BACKING UP PRODUCTION DATABASE (tamizhtech)");
  console.log("==================================================");

  const backupDir = path.join(process.cwd(), "docs", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const [
    users,
    products,
    sourcings,
    productionRecords,
    productionItems,
    stockLedgerEntries,
    clients,
    invoices,
    invoiceItems,
    quotations,
    quotationItems,
    payments,
    expenses,
    systemSettings,
    businessSequences,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.product.findMany(),
    prisma.inventorySourcing.findMany(),
    prisma.productionRecord.findMany(),
    prisma.productionItem.findMany(),
    prisma.stockLedgerEntry.findMany(),
    prisma.client.findMany(),
    prisma.invoice.findMany(),
    prisma.invoiceItem.findMany(),
    prisma.quotation.findMany(),
    prisma.quotationItem.findMany(),
    prisma.payment.findMany(),
    prisma.expense.findMany(),
    prisma.systemSetting.findMany(),
    prisma.businessSequence.findMany(),
  ]);

  const backupData = {
    timestamp: new Date().toISOString(),
    database: "tamizhtech (Production)",
    summary: {
      users: users.length,
      products: products.length,
      sourcings: sourcings.length,
      productionRecords: productionRecords.length,
      productionItems: productionItems.length,
      stockLedgerEntries: stockLedgerEntries.length,
      clients: clients.length,
      invoices: invoices.length,
      invoiceItems: invoiceItems.length,
      quotations: quotations.length,
      quotationItems: quotationItems.length,
      payments: payments.length,
      expenses: expenses.length,
      systemSettings: systemSettings.length,
      businessSequences: businessSequences.length,
    },
    data: {
      users,
      products,
      sourcings,
      productionRecords,
      productionItems,
      stockLedgerEntries,
      clients,
      invoices,
      invoiceItems,
      quotations,
      quotationItems,
      payments,
      expenses,
      systemSettings,
      businessSequences,
    },
  };

  const backupFile = path.join(backupDir, `pre_launch_production_backup_${Date.now()}.json`);
  const latestBackupFile = path.join(backupDir, `pre_launch_production_backup.json`);

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  fs.writeFileSync(latestBackupFile, JSON.stringify(backupData, null, 2));

  console.log(`[OK] Backup successfully saved to:\n  - ${backupFile}\n  - ${latestBackupFile}`);
  console.log("Summary of production assets captured:");
  console.table(backupData.summary);
}

main()
  .catch((e) => {
    console.error("Backup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
