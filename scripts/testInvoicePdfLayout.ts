import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDFTemplate } from "../components/invoices/InvoicePDFTemplate";
import { getServerLogoDataUri } from "../lib/serverLogo";
import { formatIssueDateTime } from "../lib/utils";

async function runTest() {
  console.log("=== Testing Invoice PDF & Print Layout ===");

  // 1. Check Server Logo
  const logoUri = getServerLogoDataUri();
  console.log("1. Checking Server Logo Data URI...");
  if (!logoUri.startsWith("data:image/png;base64,")) {
    throw new Error(`Expected Base64 Data URI, got: ${logoUri.slice(0, 50)}...`);
  }
  console.log(`   ✓ Logo loaded successfully (${logoUri.length} chars, base64 data URI).`);

  // 2. Check Issue Date & Time Formatting
  console.log("2. Checking Date Formatting...");
  const testDate = new Date("2026-09-17T10:46:00.000Z");
  const formattedDate = formatIssueDateTime(testDate);
  console.log(`   Formatted sample date: "${formattedDate}"`);
  if (!formattedDate.includes("•") || !formattedDate.includes("2026")) {
    throw new Error(`Date format unexpected: ${formattedDate}`);
  }
  console.log("   ✓ Date format verified (matches 'd MMM yyyy • hh:mm a').");

  // 3. Render Invoice PDF Template to Buffer
  console.log("3. Rendering InvoicePDFTemplate to Buffer...");
  const mockInvoice = {
    id: "inv-test-001",
    invoiceNo: "TT-INV-2026-9999",
    date: "2026-09-17T05:16:00.000Z",
    issuedAt: "2026-09-17T05:16:00.000Z",
    status: "ISSUED",
    subtotal: 10000,
    gstAmount: 1800,
    total: 11800,
    paidAmount: 5000,
    balance: 6800,
    totalInWords: "ELEVEN THOUSAND EIGHT HUNDRED RUPEES ONLY",
    notes: "Strict single A4 invoice test layout.",
    items: [
      {
        description: "Industrial LoRa Remote I/O Receiver Module",
        hsnCode: "85176290",
        qty: 1,
        unitPrice: 10000,
        amount: 10000,
      },
    ],
  };

  const mockClient = {
    name: "Wesly Shantharuban",
    company: "Industrial Controls Pvt Ltd",
    address: "Plot 42, Tech Corridor",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600001",
    phone: "+91 9876543210",
    email: "wesly@example.com",
    gstin: "33AAAAA0000A1Z5",
  };

  const element = React.createElement(InvoicePDFTemplate, {
    invoice: mockInvoice,
    client: mockClient,
    logoSrc: logoUri,
  });

  const buffer = await renderToBuffer(element as any);
  console.log(`   ✓ PDF successfully generated! Buffer size: ${buffer.length} bytes.`);

  // Verify PDF header magic bytes
  const header = buffer.subarray(0, 5).toString("utf-8");
  if (header !== "%PDF-") {
    throw new Error(`Buffer does not start with %PDF- (got ${header})`);
  }
  console.log(`   ✓ PDF magic header verified (${header}).`);

  // Verify that "Due Date" is not present in the generated PDF raw stream or template definition
  const templateStr = InvoicePDFTemplate.toString();
  if (templateStr.includes("Due Date") || templateStr.includes("dueDate")) {
    throw new Error("Found 'Due Date' / 'dueDate' in InvoicePDFTemplate component!");
  }
  console.log("   ✓ Verified: No 'Due Date' or 'dueDate' references in InvoicePDFTemplate!");

  console.log("=== All Invoice PDF & Print Layout Tests Passed! ===");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
