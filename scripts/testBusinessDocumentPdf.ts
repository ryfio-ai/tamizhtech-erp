import prisma from "../lib/prisma";
import {
  getNormalizedInvoiceData,
  getNormalizedQuotationData,
  resolvePlaceOfSupply,
  formatDocumentDateTime,
  formatDocumentDate,
} from "../lib/businessDocumentData";
import { BusinessDocumentPDFTemplate } from "../components/shared/BusinessDocumentPDFTemplate";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import fs from "fs";
import path from "path";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("   TTRC ERP 2.0 - BUSINESS DOCUMENT PDF & PRINT LAYOUT VERIFICATION SUITE       ");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: any, testName: string, detail?: string) {
    if (Boolean(condition)) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  try {
    // 1. Setup or find an active client for testing
    let testClient = await prisma.client.findFirst({
      where: { state: "Tamil Nadu" },
    });

    if (!testClient) {
      testClient = await prisma.client.create({
        data: {
          clientCode: `CL-TEST-PDF-${Date.now().toString().slice(-4)}`,
          name: "Coimbatore Automation Labs",
          company: "CAL Pvt Ltd",
          phone: "+91 98765 43210",
          mobileNormalized: `9876543210_${Date.now()}`,
          email: "procurement@cal-robotics.in",
          address: "100 Industrial Estate, Peelamedu",
          city: "Coimbatore",
          state: "Tamil Nadu",
          pincode: "641004",
          gstin: "33AAAAA1234A1Z5",
        },
      });
    }

    // 2. Setup or find an out-of-state client for IGST testing
    let outOfStateClient = await prisma.client.findFirst({
      where: { state: "Karnataka" },
    });

    if (!outOfStateClient) {
      outOfStateClient = await prisma.client.create({
        data: {
          clientCode: `CL-KA-PDF-${Date.now().toString().slice(-4)}`,
          name: "Bangalore Dynamics Corp",
          company: "BDC Corp",
          phone: "+91 99887 76655",
          mobileNormalized: `9988776655_${Date.now()}`,
          email: "orders@bangaloredynamics.in",
          address: "Plot 42, Electronic City Phase 1",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560100",
          gstin: "29BBBBB5678B1Z2",
        },
      });
    }

    // 3. Test Place of Supply Resolver
    const posTN = resolvePlaceOfSupply(testClient.gstin, testClient.state);
    assert(
      posTN.stateCode === "33" && posTN.label.includes("Tamil Nadu (33)"),
      "Place of Supply: Intra-state Tamil Nadu resolved to code 33"
    );

    const posKA = resolvePlaceOfSupply(outOfStateClient.gstin, outOfStateClient.state);
    assert(
      posKA.stateCode === "29" && posKA.label.includes("29"),
      "Place of Supply: Inter-state Karnataka resolved to code 29"
    );

    // 4. Create a test invoice with line items in exact paise
    const testInvoice = await prisma.invoice.create({
      data: {
        invoiceNo: `TTRC-BILL-TEST-${Date.now().toString().slice(-4)}`,
        clientId: testClient.id,
        clientName: testClient.name,
        status: "ISSUED",
        date: new Date(),
        dueDate: new Date(Date.now() + 15 * 86400000), // Persisted in DB, but MUST NOT be shown on bill
        subtotal: 5000, // ₹50.00
        gstPercent: 18,
        gstAmount: 900, // ₹9.00
        discountAmount: 0,
        total: 5900, // ₹59.00
        paidAmount: 5900,
        balance: 0,
        notes: "Goods inspected and dispatched under standard quality checks.",
        terms: "1. Payment is due upon receipt of invoice.\n2. Coimbatore jurisdiction.",
        items: {
          create: [
            {
              description: "Industrial DC Geared Motor 300 RPM",
              qty: 1,
              unitPrice: 5000, // ₹50.00
              amount: 5000,
              configurationNotes: "12V High Torque Metallic Gearbox",
            },
          ],
        },
      },
      include: { items: true },
    });

    // 5. Test getNormalizedInvoiceData
    const normInvoice = await getNormalizedInvoiceData(testInvoice.id);
    assert(normInvoice !== null, "Normalized Invoice Data loads successfully");
    assert(normInvoice?.title === "TAX INVOICE", "Invoice title is 'TAX INVOICE'");
    assert(normInvoice?.documentNumberLabel === "Bill No", "Invoice document label is 'Bill No'");
    assert(
      normInvoice?.documentDate.includes("IST"),
      "Invoice date includes authoritative IST indicator"
    );
    assert(
      normInvoice?.validUntil === undefined,
      "Invoice STRICTLY has NO Due Date or Valid Until displayed"
    );
    assert(
      normInvoice?.financials.isIntraState === true,
      "Intra-State invoice correctly flags isIntraState = true"
    );
    assert(
      normInvoice?.financials.cgstAmount === 4.5 && normInvoice?.financials.sgstAmount === 4.5,
      "Intra-State GST splits equally into CGST and SGST (₹4.50 each)"
    );
    assert(
      normInvoice?.financials.grandTotal === 59.0,
      "Invoice Grand Total is exact ₹59.00"
    );
    assert(
      normInvoice?.financials.totalInWords.includes("Fifty-Nine") ||
        normInvoice?.financials.totalInWords.includes("Fifty Nine"),
      `Invoice Amount in words is correct: "${normInvoice?.financials.totalInWords}"`
    );
    assert(
      normInvoice?.company.city === "Coimbatore" &&
        normInvoice?.company.companyName === "Tamizh Tech Robotics Company",
      "Company branding is authentic Tamizh Tech Robotics Company, Coimbatore"
    );

    // 6. Test PDF Rendering for Invoice
    console.log("\n  [Rendering React-PDF Invoice Stream...]");
    const invoiceStream = await renderToStream(
      React.createElement(BusinessDocumentPDFTemplate, { data: normInvoice! }) as any
    );
    const invoicePdfBuffer = await streamToBuffer(invoiceStream as any);
    assert(
      invoicePdfBuffer.length > 1000 && invoicePdfBuffer.subarray(0, 4).toString() === "%PDF",
      `Invoice PDF successfully rendered (${invoicePdfBuffer.length} bytes, valid %PDF header)`
    );

    // 7. Create and test Quotation
    const testQuotation = await prisma.quotation.create({
      data: {
        quotationNo: `TTRC-QTN-TEST-${Date.now().toString().slice(-4)}`,
        clientId: outOfStateClient.id,
        status: "SENT",
        validUntil: new Date(Date.now() + 30 * 86400000),
        subtotal: 100000, // ₹1,000.00
        discountAmount: 10000, // ₹100.00
        taxAmount: 16200, // 18% of 900 = ₹162.00
        total: 106200, // ₹1,062.00
        notes: "Valid for 30 calendar days from issue date.",
        terms: "1. 100% advance before dispatch.\n2. Delivery in 3-5 business days.",
        items: {
          create: [
            {
              description: "Line Follower Robot V5.0 Main Chassis",
              qty: 1,
              unitPrice: 100000,
              taxRate: 18,
              amount: 100000,
              itemType: "PHYSICAL_PRODUCT",
              configurationNotes: "Fiberglass matte black finish",
            },
          ],
        },
      },
      include: { items: true },
    });

    const normQuotation = await getNormalizedQuotationData(testQuotation.id);
    assert(normQuotation !== null, "Normalized Quotation Data loads successfully");
    assert(normQuotation?.title === "QUOTATION", "Quotation title is 'QUOTATION'");
    assert(normQuotation?.documentNumberLabel === "Quote#", "Quotation document label is 'Quote#'");
    assert(
      normQuotation?.validUntil !== undefined && normQuotation?.validUntil !== "-",
      `Quotation has valid Valid Until field: "${normQuotation?.validUntil}"`
    );
    assert(
      normQuotation?.financials.isIntraState === false,
      "Inter-state Karnataka Quotation flags isIntraState = false"
    );
    assert(
      normQuotation?.financials.igstAmount === 162.0,
      "Inter-state Quotation correctly charges IGST of ₹162.00"
    );
    assert(
      normQuotation?.financials.grandTotal === 1062.0,
      "Quotation Grand Total is exact ₹1,062.00"
    );

    // 8. Test PDF Rendering for Quotation
    console.log("\n  [Rendering React-PDF Quotation Stream...]");
    const quoteStream = await renderToStream(
      React.createElement(BusinessDocumentPDFTemplate, { data: normQuotation! }) as any
    );
    const quotePdfBuffer = await streamToBuffer(quoteStream as any);
    assert(
      quotePdfBuffer.length > 1000 && quotePdfBuffer.subarray(0, 4).toString() === "%PDF",
      `Quotation PDF successfully rendered (${quotePdfBuffer.length} bytes, valid %PDF header)`
    );

    // 9. Save generated test PDFs for inspection in docs/generated_samples/
    const sampleDir = path.join(process.cwd(), "docs", "generated_samples");
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir, { recursive: true });
    }
    const sampleInvoicePath = path.join(sampleDir, "sample_invoice.pdf");
    const sampleQuotePath = path.join(sampleDir, "sample_quotation.pdf");
    fs.writeFileSync(sampleInvoicePath, invoicePdfBuffer);
    fs.writeFileSync(sampleQuotePath, quotePdfBuffer);
    console.log(`\n  [Saved Sample Invoice PDF]: ${sampleInvoicePath}`);
    console.log(`  [Saved Sample Quotation PDF]: ${sampleQuotePath}`);

    // Clean up test documents
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: testInvoice.id } });
    await prisma.invoice.delete({ where: { id: testInvoice.id } });
    await prisma.quotationItem.deleteMany({ where: { quotationId: testQuotation.id } });
    await prisma.quotation.delete({ where: { id: testQuotation.id } });

    console.log("\n================================================================================");
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("FATAL TEST ERROR:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
