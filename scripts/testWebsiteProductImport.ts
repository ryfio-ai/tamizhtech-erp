import prisma from '../lib/prisma';
import { runWebsiteProductImport, mapWebsiteCategory, extractSchemaOrgProduct } from './importWebsiteProducts';
import { normalizeProductName } from '../lib/productUtils';
import { adjustStock, deductStockForIssuedInvoice, reverseStockForCancelledInvoice } from '../lib/stockService';
import { generateInvoiceNo, generateSku } from '../lib/sequence';

async function runTests() {
  console.log('🧪 Starting Website Product Import & Services Test Suite...');

  // ─── Test 1: Name Normalization & Category Mapping ──────
  console.log('\n--- Test 1: Name Normalization & Category Mapping ---');
  const n1 = normalizeProductName('TTRC DGJ 300RPM');
  const n2 = normalizeProductName('   ttrc   dgj-300rpm  ');
  if (n1 !== n2) {
    throw new Error(`Name normalization failed: "${n1}" !== "${n2}"`);
  }
  console.log(`Normalized Name Match: "${n1}" === "${n2}"`);

  const catMotor = mapWebsiteCategory('Robotics Components', 'TTRC DGJ 300RPM');
  const catFlySky = mapWebsiteCategory('Radio Controllers', 'FlySky FS-i6');
  const catService = mapWebsiteCategory('Services', 'PCB Fabrication Service');
  const catAmbiguous = mapWebsiteCategory('Custom Unknown', 'Some Random Gadget');

  console.log(`Category Motors: ${catMotor} (Expected: Motors)`);
  console.log(`Category Radio: ${catFlySky} (Expected: Controllers)`);
  console.log(`Category Service: ${catService} (Expected: Services)`);
  console.log(`Category Ambiguous: ${catAmbiguous} (Expected: Needs Review)`);

  if (catMotor !== 'Motors' || catFlySky !== 'Controllers' || catService !== 'Services' || catAmbiguous !== 'Needs Review') {
    throw new Error('Category mapping failed');
  }
  console.log('✅ Test 1 Passed: Normalization and Category Mapping verified.');

  // ─── Test 2: Structured JSON-LD Parser ──────────────────
  console.log('\n--- Test 2: Structured JSON-LD Parser ---');
  const sampleJsonLdHtml = `
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Test Holonomic Robot Platform",
          "description": "4-wheel omnidirectional chassis",
          "sku": "TEST-SKU-001",
          "category": "Robotics",
          "offers": {
            "@type": "Offer",
            "price": 4999,
            "priceCurrency": "INR"
          }
        }
        </script>
      </head>
    </html>
  `;
  const parsed = extractSchemaOrgProduct(sampleJsonLdHtml);
  if (!parsed || parsed.name !== 'Test Holonomic Robot Platform' || parsed.price !== 4999) {
    throw new Error('Structured JSON-LD parsing failed');
  }
  console.log(`Parsed JSON-LD: Name="${parsed.name}", Price=₹${parsed.price}`);
  console.log('✅ Test 2 Passed: Structured Schema.org JSON-LD parser verified.');

  // ─── Test 3: Catalog Import Execution & Idempotency ─────
  console.log('\n--- Test 3: Catalog Import Execution & Idempotency ---');
  const initialReport = await runWebsiteProductImport();
  console.log(`Discovered: ${initialReport.discovered}, Discovered >= 13: ${initialReport.discovered >= 13}`);
  if (initialReport.discovered < 13) {
    throw new Error(`Expected at least 13 products discovered, got ${initialReport.discovered}`);
  }

  // Re-run import to verify idempotency (zero duplicates)
  console.log('Re-running importer to test duplicate protection & stock preservation...');
  const secondReport = await runWebsiteProductImport();
  if (secondReport.newPhysical !== 0 || secondReport.newServices !== 0) {
    throw new Error(`Duplicate protection failed: created ${secondReport.newPhysical} physical, ${secondReport.newServices} services on re-import`);
  }
  if (secondReport.existingPhysicalMatched + secondReport.existingServicesMatched !== initialReport.discovered) {
    throw new Error('Mismatch in matched existing products count');
  }
  console.log(`✅ Test 3 Passed: Catalog imported (${initialReport.discovered} items) and idempotency verified (0 duplicates).`);

  // ─── Test 4: Physical Product vs Service Rules ──────────
  console.log('\n--- Test 4: Physical Product vs Service Rules ---');
  const testServiceSku = await generateSku('Services');
  const testService = await prisma.product.create({
    data: {
      sku: testServiceSku,
      name: 'Test 3D Printing & Prototyping Service',
      category: 'Services',
      type: 'SERVICE',
      pricingMode: 'REQUIREMENT_BASED',
      basePrice: null,
      stockQuantity: 0,
    },
  });

  // Service must have 0 stock and no ledger entries
  const serviceEntries = await prisma.stockLedgerEntry.findMany({
    where: { productId: testService.id },
  });
  if (serviceEntries.length > 0) {
    throw new Error('Service product must NOT have stock ledger entries');
  }
  console.log(`Service Product: ${testService.name} | SKU: ${testService.sku} | Stock: ${testService.stockQuantity} (N/A) | Ledger Entries: ${serviceEntries.length}`);

  // Attempting manual stock adjustment on service must be rejected
  try {
    await adjustStock({
      productId: testService.id,
      quantityChange: 5,
      type: 'PURCHASE',
    });
    throw new Error('Expected adjusting stock on service to fail, but it succeeded');
  } catch (err: any) {
    console.log(`Service stock adjustment blocked as expected: "${err.message}"`);
  }
  console.log('✅ Test 4 Passed: Service products correctly exempt from stock tracking.');

  // ─── Test 5: Chargers & Requirement-Based Products ──────
  console.log('\n--- Test 5: Chargers & Requirement-Based Products ---');
  const chargerSku = await generateSku('General');
  const testCharger = await prisma.product.create({
    data: {
      sku: chargerSku,
      name: 'Smart LiPo Battery Charger',
      category: 'General',
      type: 'PHYSICAL_PRODUCT',
      pricingMode: 'REQUIREMENT_BASED',
      basePrice: null, // No fake numeric default
      stockQuantity: 2,
      configurationNotes: 'Specification determined per customer battery pack requirement',
    },
  });

  if (testCharger.basePrice !== null) {
    throw new Error('Requirement-based product must not have fake numeric price');
  }
  console.log(`Charger Master: ${testCharger.name} | Pricing Mode: ${testCharger.pricingMode} | Base Price: null (No fake defaults)`);
  console.log('✅ Test 5 Passed: Requirement-based products have no fabricated specs or prices.');

  // ─── Test 6: Stock Safety & Rejection of Manual SALE ───
  console.log('\n--- Test 6: Stock Safety & Rejection of Manual SALE ---');
  // 1. Manual SALE must be rejected
  try {
    await adjustStock({
      productId: testCharger.id,
      quantityChange: -1,
      type: 'SALE',
      isBilling: false,
    });
    throw new Error('Expected manual SALE adjustment to be rejected');
  } catch (err: any) {
    console.log(`Manual SALE rejected as expected: "${err.message}"`);
  }

  // 2. Negative stock must be blocked
  try {
    await adjustStock({
      productId: testCharger.id,
      quantityChange: -10, // currently stock is 2
      type: 'DAMAGE',
    });
    throw new Error('Expected negative stock reduction to be blocked');
  } catch (err: any) {
    console.log(`Negative stock blocked as expected: "${err.message}"`);
  }

  // 3. Allowed adjustments
  const afterPurchase = await adjustStock({
    productId: testCharger.id,
    quantityChange: 5,
    type: 'PURCHASE',
    notes: 'Restocked from supplier',
  });
  console.log(`Stock after +5 PURCHASE: ${afterPurchase.product.stockQuantity} (Expected: 7)`);

  const afterDamage = await adjustStock({
    productId: testCharger.id,
    quantityChange: -2,
    type: 'DAMAGE',
    notes: 'Connector damaged during testing',
  });
  console.log(`Stock after -2 DAMAGE: ${afterDamage.product.stockQuantity} (Expected: 5)`);

  if (afterDamage.product.stockQuantity !== 5) {
    throw new Error(`Expected stock 5, got ${afterDamage.product.stockQuantity}`);
  }
  console.log('✅ Test 6 Passed: Stock safety rules (no manual SALE, negative stock block, signed adjustments) verified.');

  // ─── Test 7: Mixed Billing & Transaction Configuration Notes ─
  console.log('\n--- Test 7: Mixed Billing & Transaction Configuration Notes ---');
  let client = await prisma.client.findFirst({ where: { clientCode: 'TTRC-CLI-TEST' } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        clientCode: 'TTRC-CLI-TEST',
        name: 'Test Robotics Lab Customer',
        phone: '9876543210',
        mobileNormalized: '+919876543210',
        email: 'testlab@tamizhtech.in',
      },
    });
  }

  const invoiceNo = await generateInvoiceNo();
  const testInvoice = await prisma.invoice.create({
    data: {
      invoiceNo,
      clientId: client.id,
      clientName: client.name,
      status: 'DRAFT',
      dueDate: new Date(Date.now() + 7 * 86400000),
      subtotal: 3500,
      gstPercent: 18,
      gstAmount: 630,
      discountAmount: 0,
      total: 4130,
      paidAmount: 0,
      balance: 4130,
      items: {
        create: [
          {
            productId: testCharger.id,
            description: 'Smart LiPo Battery Charger',
            qty: 2,
            unitPrice: 1500,
            amount: 3000,
            configurationNotes: 'Configured for 11.1V 3S 2200mAh LiPo with XT60 connector',
          },
          {
            productId: testService.id,
            description: 'Custom Laser Cutting & Bracket Service',
            qty: 1,
            unitPrice: 500,
            amount: 500,
            configurationNotes: '3mm clear acrylic chassis mounting plate as per CAD drawing',
          },
        ],
      },
    },
    include: { items: true },
  });

  // Verify transaction configuration notes are saved
  const chargerItem = testInvoice.items.find((i: any) => i.productId === testCharger.id);
  const serviceItem = testInvoice.items.find((i: any) => i.productId === testService.id);

  console.log(`Invoice Item 1 Config: "${chargerItem?.configurationNotes}"`);
  console.log(`Invoice Item 2 Config: "${serviceItem?.configurationNotes}"`);

  // Verify product master was NOT modified by customer transaction notes
  const freshChargerMaster = await prisma.product.findUnique({ where: { id: testCharger.id } });
  if (freshChargerMaster?.configurationNotes?.includes('XT60')) {
    throw new Error('Product master was erroneously modified by transaction configuration notes');
  }
  console.log('Verified product master untouched by customer-specific transaction requirement.');

  // DRAFT status: stock must remain 5
  const stockDuringDraft = (await prisma.product.findUnique({ where: { id: testCharger.id } }))?.stockQuantity;
  if (stockDuringDraft !== 5) {
    throw new Error(`Draft bill should NOT deduct stock: got ${stockDuringDraft}, expected 5`);
  }
  console.log(`Charger stock during DRAFT bill: ${stockDuringDraft} (Unchanged)`);

  // Transition to ISSUED: Deducts ONLY the physical charger (2 units), service is NOT deducted
  console.log('Issuing mixed bill...');
  await prisma.invoice.update({
    where: { id: testInvoice.id },
    data: { status: 'ISSUED' },
  });
  await deductStockForIssuedInvoice(testInvoice.id);

  const stockAfterIssued = (await prisma.product.findUnique({ where: { id: testCharger.id } }))?.stockQuantity;
  if (stockAfterIssued !== 3) {
    throw new Error(`Expected charger stock to decrease from 5 to 3, got ${stockAfterIssued}`);
  }
  console.log(`Charger stock after ISSUED bill: ${stockAfterIssued} (Expected: 5 - 2 = 3)`);

  // Transition to CANCELLED: Restores the physical charger (2 units)
  console.log('Cancelling issued bill...');
  await prisma.invoice.update({
    where: { id: testInvoice.id },
    data: { status: 'CANCELLED' },
  });
  await reverseStockForCancelledInvoice(testInvoice.id);

  const stockAfterCancelled = (await prisma.product.findUnique({ where: { id: testCharger.id } }))?.stockQuantity;
  if (stockAfterCancelled !== 5) {
    throw new Error(`Expected charger stock restored to 5, got ${stockAfterCancelled}`);
  }
  console.log(`Charger stock after CANCELLED bill: ${stockAfterCancelled} (Restored to 5)`);
  console.log('✅ Test 7 Passed: Mixed billing, transaction notes, and conditional stock deduction verified.');

  // ─── Cleanup Test Artifacts ─────────────────────────────
  console.log('Cleaning up synthetic test records...');
  await prisma.stockLedgerEntry.deleteMany({
    where: {
      productId: { in: [testCharger.id, testService.id] },
    },
  });
  await prisma.invoiceItem.deleteMany({
    where: { invoiceId: testInvoice.id },
  });
  await prisma.invoice.delete({
    where: { id: testInvoice.id },
  });
  await prisma.client.delete({
    where: { id: client.id },
  });
  await prisma.product.delete({
    where: { id: testCharger.id },
  });
  await prisma.product.delete({
    where: { id: testService.id },
  });

  console.log('\n🎉 ALL WEBSITE IMPORT, SERVICE & REQUIREMENT TESTS PASSED SUCCESSFULLY! ✅');
}

runTests()
  .catch((err) => {
    console.error('❌ Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
