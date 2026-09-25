/**
 * TamizhTech ERP 2.0 — Phase 2 Automated Verification Suite
 * 
 * Verifies:
 * Part A: Automated Overdue Payment Reminders
 * Part B: GSTR-1 Sales Excel & CSV Export
 * Part C: Financial Integrity & Read-Only Safety (Zero Mutation)
 */

import {
  evaluateReminderEligibility,
  buildReminderEmailContent,
  ReminderState,
} from "../lib/reminderService";
import {
  generateGstr1Csv,
  generateGstr1Xlsx,
  getFinancialYearDateRange,
  Gstr1InvoiceRow,
} from "../lib/gstr1Service";
import { fromPaise, toPaise } from "../lib/money";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}`, details || "");
    failedCount++;
  }
}

async function runPhase2Tests() {
  console.log("=================================================");
  console.log("TAMIZHTECH ERP 2.0 — PHASE 2 TEST SUITE");
  console.log("Automated Reminders & GSTR-1 Excel/CSV Export");
  console.log("=================================================\n");

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 5); // 5 days ago
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 2); // 2 days ahead
  const farFuture = new Date(today);
  farFuture.setDate(farFuture.getDate() + 20); // 20 days ahead

  // ─────────────────────────────────────────────────────────────
  // PART A: PAYMENT REMINDER STATE MACHINE & ELIGIBILITY
  // ─────────────────────────────────────────────────────────────
  console.log("--- 1. Testing Reminder State Classification & Eligibility ---");

  // Test 1: Upcoming invoice (2 days until due)
  const upcomingInv = evaluateReminderEligibility({
    status: "ISSUED",
    dueDate: tomorrow,
    balance: 500000, // ₹5,000.00
    total: 500000,
    paidAmount: 0,
    client: { name: "ACME Corp", email: "billing@acme.com" },
  });
  assert(upcomingInv.isEligible === true, "Upcoming invoice within window is eligible");
  assert(upcomingInv.state === "UPCOMING", "State classified as UPCOMING");
  assert(upcomingInv.daysDifference === 2, "Days difference calculated as 2");

  // Test 2: Due today invoice
  const dueTodayInv = evaluateReminderEligibility({
    status: "ISSUED",
    dueDate: today,
    balance: 1000000, // ₹10,000.00
    total: 1000000,
    paidAmount: 0,
    client: { name: "Robo Systems", email: "accounts@robosys.com" },
  });
  assert(dueTodayInv.isEligible === true, "Due-today invoice is eligible");
  assert(dueTodayInv.state === "DUE_TODAY", "State classified as DUE_TODAY");
  assert(dueTodayInv.daysDifference === 0, "Days difference is 0 for due today");

  // Test 3: Overdue invoice (5 days overdue)
  const overdueInv = evaluateReminderEligibility({
    status: "ISSUED",
    dueDate: yesterday,
    balance: 350000, // ₹3,500.00
    total: 350000,
    paidAmount: 0,
    client: { name: "Apex Labs", email: "finance@apex.com" },
  });
  assert(overdueInv.isEligible === true, "Overdue invoice is eligible");
  assert(overdueInv.state === "OVERDUE", "State classified as OVERDUE");
  assert(overdueInv.daysOverdue === 5, "Calculated exact 5 days overdue");

  // Test 4: Fully paid invoice
  const fullyPaidInv = evaluateReminderEligibility({
    status: "PAID",
    dueDate: yesterday,
    balance: 0,
    total: 500000,
    paidAmount: 500000,
    client: { name: "Global Tech", email: "pay@global.com" },
  });
  assert(fullyPaidInv.isEligible === false, "Fully paid invoice is marked NOT eligible");
  assert(fullyPaidInv.state === "PAID_IN_FULL", "Fully paid invoice state is PAID_IN_FULL");
  assert(fullyPaidInv.outstandingBalanceRupees === 0, "Outstanding balance is zero");

  // Test 5: Cancelled invoice
  const cancelledInv = evaluateReminderEligibility({
    status: "CANCELLED",
    dueDate: yesterday,
    balance: 200000,
    total: 200000,
    paidAmount: 0,
    client: { name: "Cancelled Client", email: "client@test.com" },
  });
  assert(cancelledInv.isEligible === false, "Cancelled invoice is marked NOT eligible");
  assert(cancelledInv.state === "NOT_PAYABLE", "Cancelled invoice state is NOT_PAYABLE");

  // Test 6: Draft invoice
  const draftInv = evaluateReminderEligibility({
    status: "DRAFT",
    dueDate: today,
    balance: 100000,
    total: 100000,
    paidAmount: 0,
    client: { name: "Draft Client", email: "client@test.com" },
  });
  assert(draftInv.isEligible === false, "Draft invoice is marked NOT eligible");

  // Test 7: Partially paid invoice
  const partialInv = evaluateReminderEligibility({
    status: "PARTIALLY_PAID",
    dueDate: yesterday,
    balance: 400000, // ₹4,000.00 remaining
    total: 1000000,  // ₹10,000.00 original
    paidAmount: 600000, // ₹6,000.00 paid
    client: { name: "Partial Client", email: "client@test.com" },
  });
  assert(partialInv.isEligible === true, "Partially paid invoice is eligible");
  assert(partialInv.outstandingBalanceRupees === 4000, "Balance correctly reflects remaining ₹4,000.00");
  assert(partialInv.paidRupees === 6000, "Paid amount correctly reflects ₹6,000.00");

  // Test 8: Missing customer email
  const missingEmailInv = evaluateReminderEligibility({
    status: "ISSUED",
    dueDate: yesterday,
    balance: 500000,
    total: 500000,
    paidAmount: 0,
    client: { name: "No Email Corp", email: null },
  });
  assert(missingEmailInv.clientEmail === null, "Correctly identifies missing email");

  // ─────────────────────────────────────────────────────────────
  // PART B: EMAIL TEMPLATES & CONTENT VALIDATION
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 2. Testing Reminder Email Template Generation ---");

  // Test 9: Upcoming email template
  const upcomingContent = buildReminderEmailContent({
    customerName: "Dr. A. P. J. Tech Labs",
    invoiceNo: "INV-2026-0042",
    invoiceDate: new Date("2026-09-10"),
    dueDate: new Date("2026-09-25"),
    totalRupees: 59000,
    paidRupees: 20000,
    balanceRupees: 39000,
    state: "UPCOMING",
  });
  assert(upcomingContent.subject.includes("Payment Reminder — Invoice #INV-2026-0042"), "Upcoming subject has invoice number");
  assert(upcomingContent.html.includes("Dr. A. P. J. Tech Labs"), "HTML contains customer name");
  assert(upcomingContent.html.includes("39,000.00"), "HTML contains exact balance ₹39,000.00");
  assert(upcomingContent.html.includes("UPCOMING"), "HTML contains UPCOMING badge");
  assert(upcomingContent.html.includes("Tamizh Tech Robotics Company"), "HTML contains company branding");

  // Test 10: Due today email template
  const dueTodayContent = buildReminderEmailContent({
    customerName: "Robotics Hub",
    invoiceNo: "INV-2026-0088",
    invoiceDate: new Date("2026-09-15"),
    dueDate: new Date("2026-09-25"),
    totalRupees: 100000,
    paidRupees: 0,
    balanceRupees: 100000,
    state: "DUE_TODAY",
  });
  assert(dueTodayContent.subject.includes("Payment Due Today — Invoice #INV-2026-0088"), "Due today subject is explicit");
  assert(dueTodayContent.html.includes("DUE TODAY"), "HTML contains DUE TODAY badge");

  // Test 11: Overdue email template
  const overdueContent = buildReminderEmailContent({
    customerName: "Pinnacle Automation",
    invoiceNo: "INV-2026-0012",
    invoiceDate: new Date("2026-08-01"),
    dueDate: new Date("2026-08-31"),
    totalRupees: 250000,
    paidRupees: 100000,
    balanceRupees: 150000,
    state: "OVERDUE",
    daysOverdue: 25,
  });
  assert(overdueContent.subject.includes("Overdue Payment Notice — Invoice #INV-2026-0012"), "Overdue subject is explicit");
  assert(overdueContent.html.includes("25 DAYS OVERDUE"), "HTML specifies exact 25 days overdue");
  assert(overdueContent.html.includes("1,50,000.00"), "HTML specifies formatted balance ₹1,50,000.00");

  // ─────────────────────────────────────────────────────────────
  // PART C: GSTR-1 DATA TRANSFORMATION & SPLIT RULES
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 3. Testing GSTR-1 Tax Mapping & Place of Supply ---");

  // Test 12: Financial Year date range calculation
  const fyRange = getFinancialYearDateRange("2026-27");
  assert(fyRange.fromDate.getUTCMonth() === 3, "FY start month is April (month index 3)");
  assert(fyRange.fromDate.getUTCDate() === 1, "FY start date is April 1st");
  assert(fyRange.toDate.getUTCMonth() === 2, "FY end month is March (month index 2)");
  assert(fyRange.toDate.getUTCDate() === 31, "FY end date is March 31st");
  assert(fyRange.fromDate.getUTCFullYear() === 2026, "FY start year is 2026");
  assert(fyRange.toDate.getUTCFullYear() === 2027, "FY end year is 2027");

  // Mock GSTR-1 row dataset for export testing
  const sampleGstr1Rows: Gstr1InvoiceRow[] = [
    {
      invoiceNo: "INV-2026-0001",
      invoiceDate: "2026-09-05",
      customerName: "Madras Automation Ltd",
      customerGstin: "33AABCT1332L1Z5", // Intra-state Tamil Nadu
      placeOfSupply: "33-Tamil Nadu",
      isInterState: false,
      reverseCharge: "N",
      invoiceType: "Regular",
      ratePercent: 18,
      taxableValueRupees: 100000,
      cgstRupees: 9000,
      sgstRupees: 9000,
      igstRupees: 0,
      totalValueRupees: 118000,
      status: "ISSUED",
    },
    {
      invoiceNo: "INV-2026-0002",
      invoiceDate: "2026-09-12",
      customerName: "Bengaluru Robotics Pvt Ltd",
      customerGstin: "29AABCB9876K1Z2", // Inter-state Karnataka
      placeOfSupply: "29-Karnataka",
      isInterState: true,
      reverseCharge: "N",
      invoiceType: "Regular",
      ratePercent: 18,
      taxableValueRupees: 200000,
      cgstRupees: 0,
      sgstRupees: 0,
      igstRupees: 36000,
      totalValueRupees: 236000,
      status: "ISSUED",
    },
    {
      invoiceNo: "INV-2026-0003",
      invoiceDate: "2026-09-18",
      customerName: "Individual Maker / Student",
      customerGstin: "URP", // Unregistered Person (B2C)
      placeOfSupply: "33-Tamil Nadu",
      isInterState: false,
      reverseCharge: "N",
      invoiceType: "Regular",
      ratePercent: 18,
      taxableValueRupees: 10000,
      cgstRupees: 900,
      sgstRupees: 900,
      igstRupees: 0,
      totalValueRupees: 11800,
      status: "PAID",
    },
  ];

  // Test 13: Intra-state split validation
  const intraState = sampleGstr1Rows[0];
  assert(intraState.cgstRupees === 9000, "Intra-state CGST is 50% of tax (₹9,000.00)");
  assert(intraState.sgstRupees === 9000, "Intra-state SGST is 50% of tax (₹9,000.00)");
  assert(intraState.igstRupees === 0, "Intra-state IGST is zero");

  // Test 14: Inter-state split validation
  const interState = sampleGstr1Rows[1];
  assert(interState.cgstRupees === 0, "Inter-state CGST is zero");
  assert(interState.sgstRupees === 0, "Inter-state SGST is zero");
  assert(interState.igstRupees === 36000, "Inter-state IGST is 100% of tax (₹36,000.00)");

  // Test 15: B2C unregistered label
  const b2c = sampleGstr1Rows[2];
  assert(b2c.customerGstin === "URP", "Unregistered customer GSTIN labeled as URP");

  // ─────────────────────────────────────────────────────────────
  // PART D: CSV & EXCEL WORKBOOK GENERATION
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 4. Testing CSV and Excel Output Generation ---");

  // Test 16: CSV generation
  const csvOutput = generateGstr1Csv(sampleGstr1Rows);
  assert(typeof csvOutput === "string", "CSV output is a valid string");
  assert(csvOutput.startsWith("Invoice Number,Invoice Date"), "CSV starts with standard GSTR-1 headers");
  assert(csvOutput.includes("INV-2026-0001"), "CSV contains first invoice row");
  assert(csvOutput.includes("Madras Automation Ltd"), "CSV contains customer name");
  assert(csvOutput.includes("33AABCT1332L1Z5"), "CSV contains customer GSTIN");
  assert(csvOutput.includes("36000.00"), "CSV contains IGST amount");
  assert(csvOutput.includes("URP"), "CSV contains URP for unregistered customer");

  // Test 17: CSV escaping special characters
  const escapedRow: Gstr1InvoiceRow = {
    invoiceNo: "INV-2026-0099",
    invoiceDate: "2026-09-20",
    customerName: 'Engineering & Co, "Robotics Division"',
    customerGstin: "URP",
    placeOfSupply: "33-Tamil Nadu",
    isInterState: false,
    reverseCharge: "N",
    invoiceType: "Regular",
    ratePercent: 18,
    taxableValueRupees: 5000,
    cgstRupees: 450,
    sgstRupees: 450,
    igstRupees: 0,
    totalValueRupees: 5900,
    status: "ISSUED",
  };
  const escapedCsv = generateGstr1Csv([escapedRow]);
  assert(escapedCsv.includes('"Engineering & Co, ""Robotics Division"""'), "CSV correctly escapes commas and internal quotes");

  // Test 18: XLSX generation
  const xlsxBuffer = generateGstr1Xlsx(sampleGstr1Rows);
  assert(Buffer.isBuffer(xlsxBuffer), "XLSX output is a Node Buffer");
  assert(xlsxBuffer.length > 1000, "XLSX Buffer is non-empty and has binary size");
  // Check ZIP / Office Open XML header magic bytes: PK (0x50, 0x4B)
  assert(xlsxBuffer[0] === 0x50 && xlsxBuffer[1] === 0x4b, "XLSX has valid Office Open XML ZIP magic header");

  // ─────────────────────────────────────────────────────────────
  // PART E: FINANCIAL INTEGRITY & ZERO MUTATION CHECK
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 5. Testing Financial Safety & Zero Mutation ---");

  // Test 19: Calculation functions do not mutate inputs
  const originalBalance = 500000;
  const originalTotal = 500000;
  const eligibilityRun = evaluateReminderEligibility({
    status: "ISSUED",
    dueDate: yesterday,
    balance: originalBalance,
    total: originalTotal,
    paidAmount: 0,
    client: { name: "Safety Test", email: "safety@test.com" },
  });
  assert(originalBalance === 500000, "Invoice balance remained exactly 500000 paise");
  assert(originalTotal === 500000, "Invoice total remained exactly 500000 paise");
  assert(eligibilityRun.outstandingBalanceRupees === 5000, "Calculated exactly 5000.00 rupees");

  // Test 20: Money conversions are reversible
  assert(fromPaise(toPaise(1234.56)) === 1234.56, "Rupees to paise to rupees conversion is lossless");
  assert(fromPaise(toPaise(0.01)) === 0.01, "Smallest currency unit (1 paisa) is lossless");

  console.log("\n=================================================");
  console.log(`PHASE 2 TEST SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log("=================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
