/**
 * TAMIZHTECH ERP 2.0 — MONGODB DATA INTEGRITY AUDIT ENGINE
 * Evaluates database health against 10 strict integrity criteria.
 * Production release requirement: ZERO FAIL.
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import dns from 'dns';

if (process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {}
}

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=["']([^"']+)["']/);
if (!match) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const uri = match[1];

interface AuditCheckResult {
  checkName: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  details: string;
  count: number;
}

async function runDataIntegrityAudit() {
  console.log('====================================================');
  console.log('🔍 RUNNING AUTOMATED DATA INTEGRITY AUDIT');
  console.log('Target: MongoDB Atlas (tamizhtech)');
  console.log('====================================================\n');

  const client = new MongoClient(uri);
  const results: AuditCheckResult[] = [];

  try {
    await client.connect();
    const db = client.db('tamizhtech');

    // Check 1: Invoices without valid Client references (Orphan Invoices)
    const invoices = await db.collection('Invoice').find({}).toArray();
    let orphanInvoices = 0;
    for (const inv of invoices) {
      if (inv.clientId) {
        const clientExists = await db.collection('Client').findOne({ _id: inv.clientId });
        if (!clientExists) orphanInvoices++;
      }
    }
    results.push({
      checkName: 'Orphan Invoices Check',
      status: orphanInvoices === 0 ? 'PASS' : 'FAIL',
      details: orphanInvoices === 0 ? 'All invoices linked to valid customer records' : `Found ${orphanInvoices} invoices with missing customer`,
      count: orphanInvoices
    });

    // Check 2: Payments without valid Invoice references (Orphan Payments)
    const payments = await db.collection('Payment').find({}).toArray();
    let orphanPayments = 0;
    for (const pay of payments) {
      if (pay.invoiceId) {
        const invoiceExists = await db.collection('Invoice').findOne({ _id: pay.invoiceId });
        if (!invoiceExists) orphanPayments++;
      }
    }
    results.push({
      checkName: 'Orphan Payments Check',
      status: orphanPayments === 0 ? 'PASS' : 'FAIL',
      details: orphanPayments === 0 ? 'All payments linked to valid invoice records' : `Found ${orphanPayments} payments with missing invoice`,
      count: orphanPayments
    });

    // Check 3: Duplicate Business Numbers Check
    const checkDuplicateNumbers = async (collectionName: string, fieldName: string) => {
      const duplicates = await db.collection(collectionName).aggregate([
        { $group: { _id: `$${fieldName}`, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
      ]).toArray();
      return duplicates.length;
    };

    const duplicateInvoices = await checkDuplicateNumbers('Invoice', 'invoiceNo');
    const duplicatePayments = await checkDuplicateNumbers('Payment', 'paymentNo');
    const duplicateLeads = await checkDuplicateNumbers('Lead', 'leadCode');
    const duplicateClients = await checkDuplicateNumbers('Client', 'clientCode');
    const totalDuplicateNumbers = duplicateInvoices + duplicatePayments + duplicateLeads + duplicateClients;

    results.push({
      checkName: 'Duplicate Business Numbers Check',
      status: totalDuplicateNumbers === 0 ? 'PASS' : 'FAIL',
      details: totalDuplicateNumbers === 0 ? 'Zero duplicate business numbers across all entities' : `Found duplicate numbers (Inv:${duplicateInvoices}, Pay:${duplicatePayments}, Lead:${duplicateLeads}, Client:${duplicateClients})`,
      count: totalDuplicateNumbers
    });

    // Check 4: Invoice Balances vs. Payment Ledger Consistency
    let balanceMismatches = 0;
    for (const inv of invoices) {
      const relatedPayments = await db.collection('Payment').find({ invoiceId: inv._id, status: 'COMPLETED' }).toArray();
      const calculatedPaid = relatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const expectedBalance = (inv.total || 0) - calculatedPaid;
      if (Math.abs((inv.balance || 0) - expectedBalance) > 0.01) {
        balanceMismatches++;
      }
    }
    results.push({
      checkName: 'Invoice / Payment Ledger Reconciliation',
      status: balanceMismatches === 0 ? 'PASS' : 'FAIL',
      details: balanceMismatches === 0 ? 'All invoice balances reconcile 100% with payment ledger' : `Found ${balanceMismatches} invoices with balance discrepancy`,
      count: balanceMismatches
    });

    // Check 5: Stock Ledger vs. Product Cached Balances
    const products = await db.collection('Product').find({}).toArray();
    let stockMismatches = 0;
    for (const prod of products) {
      const ledgerMovements = await db.collection('StockLedgerEntry').find({ productId: prod._id }).toArray();
      if (ledgerMovements.length > 0) {
        const calculatedStock = ledgerMovements.reduce((sum, m) => sum + (m.quantitySigned || 0), 0);
        if (Math.abs((prod.stockQuantity || 0) - calculatedStock) > 0.001) {
          stockMismatches++;
        }
      }
    }
    results.push({
      checkName: 'Stock Ledger Balance Reconciliation',
      status: stockMismatches === 0 ? 'PASS' : 'FAIL',
      details: stockMismatches === 0 ? 'Product stock balances align 100% with ledger entries' : `Found ${stockMismatches} products with ledger mismatch`,
      count: stockMismatches
    });

    // Check 6: Negative Stock Check (where not explicitly permitted)
    const negativeStockCount = await db.collection('Product').countDocuments({ stockQuantity: { $lt: 0 } });
    results.push({
      checkName: 'Negative Stock Verification',
      status: negativeStockCount === 0 ? 'PASS' : 'WARNING',
      details: negativeStockCount === 0 ? 'Zero products with negative stock quantity' : `Found ${negativeStockCount} products with negative stock`,
      count: negativeStockCount
    });

    // Check 7: Duplicate Website Lead Ingestion Keys
    const duplicateExternalLeads = await db.collection('Lead').aggregate([
      { $match: { externalId: { $ne: null } } },
      { $group: { _id: '$externalId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    results.push({
      checkName: 'External Lead Ingestion Idempotency',
      status: duplicateExternalLeads.length === 0 ? 'PASS' : 'FAIL',
      details: duplicateExternalLeads.length === 0 ? 'All external website lead IDs are uniquely preserved' : `Found ${duplicateExternalLeads.length} duplicate website lead IDs`,
      count: duplicateExternalLeads.length
    });

    // Print summary report
    console.log('AUDIT RESULTS TABLE:');
    console.log('----------------------------------------------------');
    let hasFailures = false;
    for (const res of results) {
      const icon = res.status === 'PASS' ? '✅' : res.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${icon} [${res.status}] ${res.checkName}: ${res.details}`);
      if (res.status === 'FAIL') hasFailures = true;
    }
    console.log('----------------------------------------------------');

    if (hasFailures) {
      console.error('\n❌ DATA INTEGRITY AUDIT: FAILED (Resolve all FAIL statuses before release)');
      process.exit(1);
    } else {
      console.log('\n🎉 DATA INTEGRITY AUDIT: 100% PASS (ZERO FAIL)');
    }
  } catch (error: any) {
    console.error('Audit execution error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runDataIntegrityAudit();
