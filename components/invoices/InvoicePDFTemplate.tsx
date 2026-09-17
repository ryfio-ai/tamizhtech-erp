import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { DEFAULT_COMPANY_SETTINGS, CompanySettings } from "@/lib/companyProfile";
import { CanonicalInvoiceFinancials } from "@/types";
import { formatIssueDateTime } from "@/lib/utils";

// Professional Single A4 Tax Invoice Stylesheet
const styles = StyleSheet.create({
  page: {
    padding: 28, // ~10mm margin for strict single A4 fit
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#111111",
    lineHeight: 1.35,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#FF6B00", // Tamizh Tech Orange accent
    paddingBottom: 10,
    marginBottom: 10,
  },
  logoContainer: {
    width: 140,
  },
  logo: {
    width: 130,
    height: 44,
    objectFit: "contain",
  },
  companyDetails: {
    width: 330,
    textAlign: "right",
  },
  companyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A", // Tamizh Tech Navy
    marginBottom: 2,
  },
  companyText: {
    fontSize: 7.5,
    color: "#444444",
    marginBottom: 1,
  },
  docTitleBanner: {
    textAlign: "center",
    backgroundColor: "#1B2A4A",
    paddingVertical: 4,
    marginBottom: 10,
    borderRadius: 2,
  },
  docTitleText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  metaGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    marginBottom: 10,
  },
  metaCol: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
  },
  metaColLast: {
    flex: 1,
    padding: 5,
  },
  metaLabel: {
    fontSize: 7,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 1.5,
  },
  metaValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  partiesGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 10,
  },
  partyCol: {
    width: "50%",
    padding: 8,
  },
  partyColBorder: {
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
  },
  partySectionHeader: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#FF6B00",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  partyName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    marginBottom: 2,
  },
  partyText: {
    fontSize: 7.5,
    color: "#444444",
    marginBottom: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1B2A4A",
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 8,
  },
  colSNo: { width: "7%", textAlign: "center" },
  colDesc: { width: "45%", paddingLeft: 4 },
  colHsn: { width: "12%", textAlign: "center" },
  colGst: { width: "10%", textAlign: "right" },
  colQty: { width: "8%", textAlign: "center" },
  colRate: { width: "18%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right", paddingRight: 4 },
  summarySection: {
    flexDirection: "row",
    marginBottom: 10,
  },
  amountInWordsBox: {
    width: "55%",
    padding: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    marginRight: 8,
  },
  wordsLabel: {
    fontSize: 7,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  wordsText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    lineHeight: 1.3,
  },
  totalsTable: {
    width: "45%",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    fontSize: 7.5,
  },
  totalsLabel: {
    color: "#555555",
  },
  totalsValue: {
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  totalsRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: "#1B2A4A",
    color: "#FFFFFF",
  },
  grandTotalText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: 8,
    marginBottom: 8,
  },
  paymentStatusBox: {
    width: "55%",
  },
  statusText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  signatureBox: {
    width: "40%",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingRight: 4,
  },
  signatureCompany: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    marginBottom: 24,
  },
  signatureLine: {
    fontSize: 7,
    color: "#555555",
    borderTopWidth: 1,
    borderTopColor: "#999999",
    paddingTop: 3,
    width: 110,
    textAlign: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 5,
    textAlign: "center",
  },
  footerText: {
    fontSize: 6.5,
    color: "#777777",
    marginBottom: 1,
  },
});

interface InvoicePDFTemplateProps {
  invoice: any;
  client?: any;
  financials?: CanonicalInvoiceFinancials;
  company?: CompanySettings;
  logoSrc?: string;
}

export function InvoicePDFTemplate({
  invoice,
  client,
  financials,
  company = DEFAULT_COMPANY_SETTINGS,
  logoSrc,
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

  // Issue Date & Time strictly from persisted database timestamp
  const issueDateTimeStr = formatIssueDateTime(
    (invoice as any).issuedAt || invoice.date || invoice.createdAt
  );

  const items = invoice.items || [];
  const resolvedLogo = logoSrc || company.logoUrl || "public/assets/ttrc-logo.png";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 1. Header with Official Logo & Centralized Company Info */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image src={resolvedLogo} style={styles.logo} />
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

        {/* 2. Document Title Banner */}
        <View style={styles.docTitleBanner}>
          <Text style={styles.docTitleText}>TAX INVOICE</Text>
        </View>

        {/* 3. Invoice Meta Information (NO DUE DATE - Only INVOICE NUMBER, ISSUE DATE & TIME, STATUS) */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>INVOICE NUMBER</Text>
            <Text style={styles.metaValue}>{invoice.invoiceNo}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>ISSUE DATE & TIME</Text>
            <Text style={styles.metaValue}>{issueDateTimeStr}</Text>
          </View>
          <View style={styles.metaColLast}>
            <Text style={styles.metaLabel}>STATUS</Text>
            <Text style={[styles.metaValue, { color: status === "PAID" ? "#16A34A" : status === "CANCELLED" ? "#DC2626" : "#D97706" }]}>
              {status}
            </Text>
          </View>
        </View>

        {/* 4. Billed By and Billed To Grid */}
        <View style={styles.partiesGrid}>
          {/* Billed By */}
          <View style={[styles.partyCol, styles.partyColBorder]}>
            <Text style={styles.partySectionHeader}>BILLED BY</Text>
            <Text style={styles.partyName}>{company.companyName}</Text>
            <Text style={styles.partyText}>{company.addressLine1}</Text>
            <Text style={styles.partyText}>
              {company.addressLine2}, {company.city}, {company.state} – {company.pincode}
            </Text>
            <Text style={styles.partyText}>Phone: {company.phone}</Text>
            <Text style={styles.partyText}>Email: {company.email}</Text>
            {company.gstin ? <Text style={styles.partyText}>GSTIN: {company.gstin}</Text> : null}
          </View>

          {/* Billed To */}
          <View style={styles.partyCol}>
            <Text style={styles.partySectionHeader}>BILLED TO</Text>
            <Text style={styles.partyName}>{client?.name || invoice.clientName || "Valued Customer"}</Text>
            {client?.company ? <Text style={styles.partyText}>{client.company}</Text> : null}
            {client?.address ? <Text style={styles.partyText}>{client.address}</Text> : null}
            {(client?.city || client?.state) ? (
              <Text style={styles.partyText}>
                {[client.city, client.state, client.pincode].filter(Boolean).join(", ")}
              </Text>
            ) : null}
            {client?.phone ? <Text style={styles.partyText}>Phone: {client.phone}</Text> : null}
            {client?.email ? <Text style={styles.partyText}>Email: {client.email}</Text> : null}
            {client?.gstin ? <Text style={styles.partyText}>GSTIN: {client.gstin}</Text> : null}
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
                <Text style={styles.colDesc}>
                  {item.description}
                  {item.configurationNotes ? `\n• ${item.configurationNotes}` : ""}
                </Text>
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
            {invoice.notes ? (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.wordsLabel}>Notes</Text>
                <Text style={{ fontSize: 7, color: "#555" }}>{invoice.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* Totals Table */}
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>₹{Number(subtotal).toFixed(2)}</Text>
            </View>

            {discountAmount > 0 ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount</Text>
                <Text style={[styles.totalsValue, { color: "#16A34A" }]}>
                  -₹{Number(discountAmount).toFixed(2)}
                </Text>
              </View>
            ) : null}

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
            <Text style={[styles.statusText, { color: balance <= 0 ? "#16A34A" : status === "CANCELLED" ? "#DC2626" : "#D97706" }]}>
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
            {company.companyName} • {company.addressLine1}, {company.city} – {company.pincode} • Phone: {company.phone}
          </Text>
          <Text style={styles.footerText}>
            This is an official computer-generated tax invoice issued by TamizhTech ERP.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
