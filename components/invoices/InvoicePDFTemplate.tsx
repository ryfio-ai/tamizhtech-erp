import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { DEFAULT_COMPANY_SETTINGS, CompanySettings } from "@/lib/companyProfile";
import { CanonicalInvoiceFinancials } from "@/types";

// Professional A4 Tax Invoice Stylesheet
const styles = StyleSheet.create({
  page: {
    padding: 36, // ~13mm margin
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111111",
    lineHeight: 1.4,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#FF6B00", // Tamizh Tech Orange accent
    paddingBottom: 16,
    marginBottom: 16,
  },
  logoContainer: {
    width: 140,
  },
  logo: {
    width: 130,
    height: 48,
    objectFit: "contain",
  },
  companyDetails: {
    width: 320,
    textAlign: "right",
  },
  companyName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A", // Tamizh Tech Navy
    marginBottom: 3,
  },
  companyText: {
    fontSize: 8,
    color: "#444444",
    marginBottom: 1.5,
  },
  docTitleBanner: {
    textAlign: "center",
    backgroundColor: "#1B2A4A",
    paddingVertical: 5,
    marginBottom: 14,
    borderRadius: 2,
  },
  docTitleText: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  metaGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    marginBottom: 14,
  },
  metaCol: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
  },
  metaColLast: {
    flex: 1,
    padding: 6,
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  partiesGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 16,
  },
  partyCol: {
    width: "50%",
    padding: 10,
  },
  partyColBorder: {
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
  },
  partySectionHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#FF6B00",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  partyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    marginBottom: 2,
  },
  partyText: {
    fontSize: 8.5,
    color: "#444444",
    marginBottom: 1.5,
  },
  // Table styles
  table: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1B2A4A",
    color: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 8,
  },
  colSNo: { width: "6%", textAlign: "center" },
  colDesc: { width: "44%", paddingRight: 6 },
  colHsn: { width: "12%", textAlign: "center" },
  colGst: { width: "8%", textAlign: "center" },
  colQty: { width: "8%", textAlign: "center" },
  colRate: { width: "11%", textAlign: "right" },
  colAmount: { width: "11%", textAlign: "right", fontFamily: "Helvetica-Bold" },

  // Summary and Totals
  summarySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  amountInWordsBox: {
    width: "52%",
    padding: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    justifyContent: "flex-start",
  },
  wordsLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  wordsText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    lineHeight: 1.3,
  },
  totalsTable: {
    width: "44%",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  totalsRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#1B2A4A",
    color: "#FFFFFF",
  },
  totalsLabel: {
    fontSize: 8,
    color: "#555555",
  },
  totalsValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  grandTotalText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },

  // Payment Status & Signature
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 10,
    marginBottom: 16,
    paddingTop: 8,
  },
  paymentStatusBox: {
    width: "45%",
    padding: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
  },
  statusText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  signatureBox: {
    width: "45%",
    textAlign: "right",
    alignItems: "flex-end",
  },
  signatureCompany: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    marginBottom: 40, // Space for physical stamp / signature
  },
  signatureLine: {
    fontSize: 8.5,
    color: "#333333",
    borderTopWidth: 1,
    borderTopColor: "#999999",
    paddingTop: 3,
    width: 140,
    textAlign: "center",
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 8,
    marginTop: "auto",
    textAlign: "center",
  },
  footerText: {
    fontSize: 7.5,
    color: "#777777",
    marginBottom: 1.5,
  },
});

interface InvoicePDFTemplateProps {
  invoice: any;
  client?: any;
  financials?: CanonicalInvoiceFinancials;
  company?: CompanySettings;
}

export function InvoicePDFTemplate({
  invoice,
  client,
  financials,
  company = DEFAULT_COMPANY_SETTINGS,
}: InvoicePDFTemplateProps) {
  // Use canonical financials if passed, otherwise use authoritative invoice record
  const subtotal = financials?.subtotal ?? invoice.subtotal ?? 0;
  const discountAmount = financials?.discountAmount ?? invoice.discountAmount ?? 0;
  const totalGst = financials?.totalGst ?? invoice.gstAmount ?? 0;
  const cgst = financials?.cgstAmount ?? totalGst / 2;
  const sgst = financials?.sgstAmount ?? totalGst / 2;
  const grandTotal = financials?.totalAmount ?? invoice.total ?? 0;
  const paidAmount = financials?.netPaidAmount ?? invoice.paidAmount ?? 0;
  const balance = financials?.outstandingBalance ?? invoice.balance ?? 0;
  const totalInWords = financials?.totalInWords ?? "ZERO RUPEES ONLY";
  const status = financials?.paymentStatus ?? invoice.status ?? "UNPAID";

  const invoiceDateStr = invoice.date
    ? new Date(invoice.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN");

  const dueDateStr = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "-";

  const items = invoice.items || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 1. Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {/* Absolute relative path to public asset */}
            <Image src="public/assets/ttrc-logo.png" style={styles.logo} />
          </View>
          <View style={styles.companyDetails}>
            <Text style={styles.companyName}>{company.companyName}</Text>
            <Text style={styles.companyText}>{company.addressLine1}</Text>
            <Text style={styles.companyText}>
              {company.addressLine2}, {company.city} – {company.pincode}
            </Text>
            <Text style={styles.companyText}>Phone: {company.phone} | Email: {company.email}</Text>
            <Text style={styles.companyText}>{company.website}</Text>
          </View>
        </View>

        {/* 2. Document Title */}
        <View style={styles.docTitleBanner}>
          <Text style={styles.docTitleText}>TAX INVOICE</Text>
        </View>

        {/* 3. Invoice Meta Information */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Invoice Number</Text>
            <Text style={styles.metaValue}>{invoice.invoiceNo}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Invoice Date</Text>
            <Text style={styles.metaValue}>{invoiceDateStr}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Due Date</Text>
            <Text style={styles.metaValue}>{dueDateStr}</Text>
          </View>
          <View style={styles.metaColLast}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={[styles.metaValue, { color: status === "PAID" ? "#16A34A" : "#D97706" }]}>
              {status}
            </Text>
          </View>
        </View>

        {/* 4. Billed By and Billed To Grid */}
        <View style={styles.partiesGrid}>
          {/* Billed By */}
          <View style={[styles.partyCol, styles.partyColBorder]}>
            <Text style={styles.partySectionHeader}>Billed By</Text>
            <Text style={styles.partyName}>{company.companyName}</Text>
            <Text style={styles.partyText}>{company.addressLine1}</Text>
            <Text style={styles.partyText}>
              {company.addressLine2}, {company.city}, {company.state} – {company.pincode}
            </Text>
            <Text style={styles.partyText}>Phone: {company.phone}</Text>
            <Text style={styles.partyText}>Email: {company.email}</Text>
            {company.gstin && <Text style={styles.partyText}>GSTIN: {company.gstin}</Text>}
          </View>

          {/* Billed To */}
          <View style={styles.partyCol}>
            <Text style={styles.partySectionHeader}>Billed To</Text>
            <Text style={styles.partyName}>{client?.name || invoice.clientName || "Valued Customer"}</Text>
            {client?.company && <Text style={styles.partyText}>{client.company}</Text>}
            {client?.address && <Text style={styles.partyText}>{client.address}</Text>}
            {(client?.city || client?.state) && (
              <Text style={styles.partyText}>
                {[client.city, client.state, client.pincode].filter(Boolean).join(", ")}
              </Text>
            )}
            {client?.phone && <Text style={styles.partyText}>Phone: {client.phone}</Text>}
            {client?.email && <Text style={styles.partyText}>Email: {client.email}</Text>}
            {client?.gstin && <Text style={styles.partyText}>GSTIN: {client.gstin}</Text>}
          </View>
        </View>

        {/* 5. Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colSNo}>S.No</Text>
            <Text style={styles.colDesc}>Item / Service Description</Text>
            <Text style={styles.colHsn}>HSN/SAC</Text>
            <Text style={styles.colGst}>GST %</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate (₹)</Text>
            <Text style={styles.colAmount}>Amount (₹)</Text>
          </View>

          {items.map((item: any, index: number) => {
            const lineAmt = item.amount || item.qty * item.unitPrice;
            return (
              <View key={index} style={styles.tableRow} wrap={false}>
                <Text style={styles.colSNo}>{index + 1}</Text>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colHsn}>{item.hsnCode || item.sacCode || "-"}</Text>
                <Text style={styles.colGst}>{invoice.gstPercent || 18}%</Text>
                <Text style={styles.colQty}>{item.qty}</Text>
                <Text style={styles.colRate}>{Number(item.unitPrice).toFixed(2)}</Text>
                <Text style={styles.colAmount}>{Number(lineAmt).toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {/* 6. Summary & Amount in Words */}
        <View style={styles.summarySection}>
          {/* Amount In Words */}
          <View style={styles.amountInWordsBox}>
            <Text style={styles.wordsLabel}>Total Amount in Words</Text>
            <Text style={styles.wordsText}>{totalInWords}</Text>
            {invoice.notes && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.wordsLabel}>Notes</Text>
                <Text style={{ fontSize: 7.5, color: "#555" }}>{invoice.notes}</Text>
              </View>
            )}
          </View>

          {/* Totals Table */}
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>₹{Number(subtotal).toFixed(2)}</Text>
            </View>

            {discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount</Text>
                <Text style={[styles.totalsValue, { color: "#16A34A" }]}>
                  -₹{Number(discountAmount).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>CGST ({((invoice.gstPercent || 18) / 2).toFixed(1)}%)</Text>
              <Text style={styles.totalsValue}>₹{Number(cgst).toFixed(2)}</Text>
            </View>

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>SGST ({((invoice.gstPercent || 18) / 2).toFixed(1)}%)</Text>
              <Text style={styles.totalsValue}>₹{Number(sgst).toFixed(2)}</Text>
            </View>

            <View style={styles.totalsRowGrand}>
              <Text style={styles.grandTotalText}>GRAND TOTAL</Text>
              <Text style={styles.grandTotalText}>₹{Number(grandTotal).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* 7. Payment Ledger & Signatory */}
        <View style={styles.bottomSection}>
          <View style={styles.paymentStatusBox}>
            <Text style={styles.wordsLabel}>Payment Ledger Summary</Text>
            <Text style={styles.partyText}>Paid Amount: ₹{Number(paidAmount).toFixed(2)}</Text>
            <Text style={styles.partyText}>
              Outstanding Balance: ₹{Number(balance).toFixed(2)}
            </Text>
            <Text style={[styles.statusText, { color: balance <= 0 ? "#16A34A" : "#D97706" }]}>
              {balance <= 0 ? "Payment Settled (Full)" : `Status: ${status}`}
            </Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureCompany}>For {company.companyName}</Text>
            <Text style={styles.signatureLine}>Authorised Signatory</Text>
          </View>
        </View>

        {/* 8. Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {company.companyName} • {company.addressLine1}, {company.city} • {company.phone}
          </Text>
          <Text style={styles.footerText}>
            This is a computer-generated tax invoice issued by TamizhTech ERP.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
