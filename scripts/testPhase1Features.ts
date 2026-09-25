/**
 * TamizhTech ERP 2.0 - Phase 1 Automated Test Suite
 * 
 * Tests WhatsApp sharing, phone normalization, URL encoding, dynamic UPI QR generation,
 * state suppression, and financial immutability.
 * 
 * Strict production policy: NO production records are mutated.
 */

import {
  normalizeWhatsAppNumber,
  buildInvoiceWhatsAppMessage,
  buildPaymentWhatsAppMessage,
  generateWhatsAppLink,
} from "../lib/whatsapp";
import {
  isValidUpiVpa,
  buildUpiPaymentUri,
  generateInvoiceDynamicUpi,
} from "../lib/upi";
import prisma from "../lib/prisma";

async function runPhase1Tests() {
  console.log("=================================================");
  console.log("TAMIZHTECH ERP 2.0 — PHASE 1 TEST SUITE");
  console.log("WhatsApp Sharing & Dynamic UPI QR Validation");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: any, desc: string) {
    if (Boolean(condition)) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // ==========================================
  // SECTION 1: WHATSAPP PHONE NORMALIZATION
  // ==========================================
  console.log("--- 1. Testing WhatsApp Phone Number Normalization ---");

  // 1. Valid 10-digit Indian number
  const in10 = normalizeWhatsAppNumber("8148045030");
  assert(in10.isValid && in10.phone === "918148045030", "10-digit Indian number normalized to 918148045030");

  // 2. Indian number with leading 0
  const in0 = normalizeWhatsAppNumber("08148045030");
  assert(in0.isValid && in0.phone === "918148045030", "0-prefixed Indian number normalized to 918148045030");

  // 3. Indian number with +91 and spaces
  const inPlus91 = normalizeWhatsAppNumber("+91 81480 45030");
  assert(inPlus91.isValid && inPlus91.phone === "918148045030", "+91 with spaces normalized to 918148045030");

  // 4. International number
  const intl = normalizeWhatsAppNumber("+14155552671");
  assert(intl.isValid && intl.phone === "14155552671", "International E.164 number (+14155552671) normalized correctly");

  // 5. Missing / Empty mobile
  const missing = normalizeWhatsAppNumber("");
  assert(!missing.isValid && missing.error !== undefined, "Empty mobile marked invalid with error");

  const nullMobile = normalizeWhatsAppNumber(null);
  assert(!nullMobile.isValid && nullMobile.error !== undefined, "Null mobile marked invalid with error");

  // 6. Invalid mobile numbers
  const shortNum = normalizeWhatsAppNumber("12345");
  assert(!shortNum.isValid, "Short number (12345) rejected as invalid");

  const alphaNum = normalizeWhatsAppNumber("98765abcde");
  assert(!alphaNum.isValid, "Alphanumeric phone rejected as invalid");

  // ==========================================
  // SECTION 2: WHATSAPP MESSAGE TEMPLATES & URL ENCODING
  // ==========================================
  console.log("\n--- 2. Testing WhatsApp Message Templates & URL Encoding ---");

  // 1. Invoice message with special characters in customer name
  const invMsg = buildInvoiceWhatsAppMessage({
    customerName: "Sri & Sons <Robotics & Automation>",
    invoiceNo: "INV-2026-0042",
    invoiceDate: new Date("2026-09-25"),
    total: 50000,
    paidAmount: 20000,
    balance: 30000,
  });

  assert(invMsg.includes("Sri & Sons <Robotics & Automation>"), "Message contains exact customer name with special characters");
  assert(invMsg.includes("Invoice No: INV-2026-0042"), "Message contains real invoice number");
  assert(invMsg.includes("Invoice Total: ₹50,000.00"), "Message contains formatted total ₹50,000.00");
  assert(invMsg.includes("Paid Amount: ₹20,000.00"), "Message contains formatted paid amount ₹20,000.00");
  assert(invMsg.includes("Balance: ₹30,000.00"), "Message contains formatted balance ₹30,000.00");
  assert(invMsg.includes("Tamizh Tech Robotics Company"), "Message includes official company branding");

  // 2. URL encoding check
  const link = generateWhatsAppLink("918148045030", invMsg);
  assert(link.startsWith("https://api.whatsapp.com/send?phone=918148045030&text="), "Link starts with official WhatsApp API endpoint");
  assert(!link.includes(" "), "Link does not contain unencoded whitespace");
  assert(link.includes(encodeURIComponent("Sri & Sons <Robotics & Automation>")), "Special characters in link are safely URL encoded");

  // 3. Payment receipt message
  const payMsg = buildPaymentWhatsAppMessage({
    customerName: "Tamilselvan R.",
    paymentNo: "PAY-2026-0015",
    invoiceNo: "INV-2026-0042",
    amount: 20000,
    paymentDate: new Date("2026-09-25"),
    remainingBalance: 30000,
  });

  assert(payMsg.includes("Payment received successfully."), "Receipt has confirmation header");
  assert(payMsg.includes("Payment No: PAY-2026-0015"), "Receipt contains real payment number");
  assert(payMsg.includes("Amount Received: ₹20,000.00"), "Receipt contains formatted amount received");
  assert(payMsg.includes("Remaining Balance: ₹30,000.00"), "Receipt contains remaining balance ₹30,000.00");

  // ==========================================
  // SECTION 3: DYNAMIC UPI QR CODE
  // ==========================================
  console.log("\n--- 3. Testing Dynamic UPI QR Code Generation ---");

  // 1. VPA validation
  assert(isValidUpiVpa("ta9387643@okicici"), "Valid VPA 'ta9387643@okicici' recognized");
  assert(isValidUpiVpa("tamizhtech@hdfcbank"), "Valid VPA 'tamizhtech@hdfcbank' recognized");
  assert(!isValidUpiVpa("invalid-vpa"), "Malformed VPA without @ rejected");
  assert(!isValidUpiVpa(""), "Empty VPA rejected");

  // 2. UPI Intent URI generation
  const upiUri = buildUpiPaymentUri({
    vpa: "ta9387643@okicici",
    payeeName: "Tamizh Tech Robotics Company",
    amount: 30000.5,
    invoiceNo: "INV-2026-0042",
  });

  assert(upiUri.startsWith("upi://pay?"), "URI starts with upi://pay?");
  assert(upiUri.includes("pa=ta9387643%40okicici"), "URI contains encoded VPA");
  assert(upiUri.includes("am=30000.50"), "URI contains exact balance amount 30000.50");
  assert(upiUri.includes("tr=INV-2026-0042"), "URI contains invoice number as transaction reference");
  assert(upiUri.includes("cu=INR"), "URI specifies INR currency");

  // 3. Outstanding balance partial payment scenario
  const partialUpi = await generateInvoiceDynamicUpi({
    invoiceNo: "INV-2026-0042",
    status: "ISSUED",
    balanceAmount: 30000,
    configuredVpa: "ta9387643@okicici",
    configuredPayeeName: "Tamizh Tech Robotics Company",
  });

  assert(partialUpi.isPayable === true, "Partially paid invoice with balance > 0 is payable");
  assert(partialUpi.amount === 30000, "QR amount equals outstanding balance 30,000 (not original total)");
  assert(partialUpi.qrDataUri?.startsWith("data:image/png;base64,"), "QR Data URI generated as valid base64 PNG");

  // 4. Zero balance condition (Paid in Full)
  const fullUpi = await generateInvoiceDynamicUpi({
    invoiceNo: "INV-2026-0042",
    status: "ISSUED",
    balanceAmount: 0,
    configuredVpa: "ta9387643@okicici",
  });

  assert(fullUpi.isPayable === false, "Zero balance invoice is marked NOT payable");
  assert(fullUpi.isPaidInFull === true, "Zero balance invoice is flagged as isPaidInFull");
  assert(fullUpi.qrDataUri === undefined, "Zero balance invoice suppresses active QR");

  // 5. Cancelled invoice condition
  const cancelledUpi = await generateInvoiceDynamicUpi({
    invoiceNo: "INV-2026-0042",
    status: "CANCELLED",
    balanceAmount: 50000,
    configuredVpa: "ta9387643@okicici",
  });

  assert(cancelledUpi.isPayable === false, "Cancelled invoice is marked NOT payable");
  assert(cancelledUpi.qrDataUri === undefined, "Cancelled invoice suppresses payment QR");

  // 6. Draft invoice condition
  const draftUpi = await generateInvoiceDynamicUpi({
    invoiceNo: "INV-DRAFT-001",
    status: "DRAFT",
    balanceAmount: 15000,
    configuredVpa: "ta9387643@okicici",
  });

  assert(draftUpi.isPayable === false, "Draft invoice is marked NOT payable");
  assert(draftUpi.qrDataUri === undefined, "Draft invoice suppresses payment QR");

  // 7. Missing UPI configuration
  const unconfiguredUpi = await generateInvoiceDynamicUpi({
    invoiceNo: "INV-2026-0042",
    status: "ISSUED",
    balanceAmount: 25000,
    configuredVpa: "invalid", // invalid VPA
  });

  assert(unconfiguredUpi.isConfigured === false, "Invalid/missing VPA flags isConfigured: false");
  assert(unconfiguredUpi.isPayable === false, "Unconfigured VPA prevents payment QR generation");

  // ==========================================
  // SECTION 4: FINANCIAL INTEGRITY & ZERO MUTATION
  // ==========================================
  console.log("\n--- 4. Testing Financial Integrity & Zero Ledger Mutation ---");

  // Read current counts of invoices and payments in database
  const invoiceCountBefore = await prisma.invoice.count();
  const paymentCountBefore = await prisma.payment.count();

  // Run multiple QR and WhatsApp generation calls
  await generateInvoiceDynamicUpi({
    invoiceNo: "INV-TEST-CHECK",
    status: "ISSUED",
    balanceAmount: 45000,
    configuredVpa: "ta9387643@okicici",
  });

  buildInvoiceWhatsAppMessage({
    customerName: "Test Audit Client",
    invoiceNo: "INV-TEST-CHECK",
    invoiceDate: new Date(),
    total: 45000,
    paidAmount: 0,
    balance: 45000,
  });

  const invoiceCountAfter = await prisma.invoice.count();
  const paymentCountAfter = await prisma.payment.count();

  assert(invoiceCountBefore === invoiceCountAfter, "Invoice database records untouched by QR / WhatsApp operations");
  assert(paymentCountBefore === paymentCountAfter, "Payment ledger records untouched by QR / WhatsApp operations");

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
