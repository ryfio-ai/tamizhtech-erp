import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { BusinessDocumentModel } from "@/lib/businessDocumentData";

// Visual layout styles strictly matching reference document TNBEST26-27161.pdf
const styles = StyleSheet.create({
  page: {
    padding: 24, // Compact A4 margin
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1A202C",
    lineHeight: 1.3,
    backgroundColor: "#FFFFFF",
  },
  outerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    minHeight: "96%",
  },

  // Header: Logo & Company on Left, Document Title on Right
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "68%",
  },
  logo: {
    width: 65,
    height: 48,
    objectFit: "contain",
    marginRight: 10,
  },
  companyInfo: {
    flex: 1,
  },
  companyTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A", // Deep Navy
    marginBottom: 2,
  },
  companyAddress: {
    fontSize: 7.2,
    color: "#4B5563",
    lineHeight: 1.25,
  },
  companyContact: {
    fontSize: 7.2,
    color: "#4B5563",
    marginTop: 1,
  },
  companyGstin: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    marginTop: 1,
  },

  headerRight: {
    width: "30%",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  docTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A", // TamizhTech Navy
    letterSpacing: 0.5,
  },
  docSubTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#FF6B00", // TamizhTech Orange
    marginTop: 2,
  },

  // Document Identification & Place of Supply Row
  metaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  metaLeft: {
    width: "55%",
  },
  metaRight: {
    width: "45%",
    alignItems: "flex-end",
  },
  metaText: {
    fontSize: 8,
    color: "#374151",
    marginBottom: 2,
  },
  metaTextBold: {
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },

  // Bill To / Ship To Row
  partiesRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  partyCol: {
    width: "50%",
    padding: 8,
  },
  partyColDivider: {
    borderRightWidth: 1,
    borderRightColor: "#D1D5DB",
  },
  partyHeaderBar: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  partyHeaderTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    textTransform: "uppercase",
  },
  partyName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 2,
  },
  partyText: {
    fontSize: 7.2,
    color: "#4B5563",
    lineHeight: 1.25,
  },
  partyGstin: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    marginTop: 2,
  },

  // Main Item Table
  tableContainer: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tableHeaderCol: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 4,
    paddingHorizontal: 2,
    minHeight: 18,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },

  // Column Widths (matching reference grid)
  colIndex: { width: "4%", textAlign: "center" },
  colDescription: { width: "39%", paddingLeft: 4 },
  colHsn: { width: "11%", textAlign: "center" },
  colQty: { width: "8%", textAlign: "center" },
  colRate: { width: "11%", textAlign: "right", paddingRight: 4 },
  colTaxRate: { width: "7%", textAlign: "right", paddingRight: 4 },
  colTaxAmount: { width: "8%", textAlign: "right", paddingRight: 4 },
  colAmount: { width: "12%", textAlign: "right", paddingRight: 4 },

  itemTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  itemNotes: {
    fontSize: 6.5,
    color: "#6B7280",
    marginTop: 1,
  },

  // Split Bottom Section
  bottomContainer: {
    flexDirection: "row",
    flexGrow: 1,
  },
  bottomLeft: {
    width: "58%",
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#D1D5DB",
  },
  bottomRight: {
    width: "42%",
  },

  // Words & Terms
  sectionLabel: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  wordsBox: {
    backgroundColor: "#F9FAFB",
    padding: 5,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 6,
  },
  wordsText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  notesBox: {
    marginBottom: 6,
  },
  notesText: {
    fontSize: 7,
    color: "#4B5563",
  },
  termsBox: {
    marginTop: 2,
  },
  termItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  termBullet: {
    width: 12,
    fontSize: 6.8,
    color: "#4B5563",
  },
  termText: {
    flex: 1,
    fontSize: 6.8,
    color: "#4B5563",
    lineHeight: 1.25,
  },

  // Totals Table & Signature
  totalsTable: {
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  totalsLabel: {
    fontSize: 7.5,
    color: "#4B5563",
  },
  totalsValue: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  totalsRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  grandTotalLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
  },

  signatureContainer: {
    padding: 8,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 75,
  },
  signatureCompanyText: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    textAlign: "center",
  },
  signatureSpace: {
    height: 35,
  },
  signatureLine: {
    fontSize: 7,
    fontFamily: "Helvetica",
    color: "#6B7280",
    borderTopWidth: 1,
    borderTopColor: "#9CA3AF",
    paddingTop: 3,
    width: "80%",
    textAlign: "center",
  },
});

function formatRupee(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

export interface BusinessDocumentPDFTemplateProps {
  data: BusinessDocumentModel;
}

export function BusinessDocumentPDFTemplate({ data }: BusinessDocumentPDFTemplateProps) {
  const {
    title,
    documentNumber,
    documentNumberLabel,
    documentDate,
    documentDateLabel,
    validUntil,
    placeOfSupply,
    company,
    billTo,
    shipTo,
    items,
    financials,
    notes,
    terms,
    logoSrc,
  } = data;

  const isInvoice = data.docType === "INVOICE";

  return (
    <Document title={`${title}-${documentNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.outerContainer}>
          {/* 1. Header: Logo, Company Info, Large Document Title */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {logoSrc ? (
                <Image src={logoSrc} style={styles.logo} />
              ) : null}
              <View style={styles.companyInfo}>
                <Text style={styles.companyTitle}>{company.companyName}</Text>
                <Text style={styles.companyAddress}>
                  {[company.addressLine1, company.addressLine2, company.city, company.state, company.pincode].filter(Boolean).join(", ")}
                </Text>
                <Text style={styles.companyContact}>
                  Phone: {company.phone} | Email: {company.email}
                </Text>
                <Text style={styles.companyContact}>Website: {company.website}</Text>
                {company.gstin ? (
                  <Text style={styles.companyGstin}>GSTIN: {company.gstin}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.headerRight}>
              <Text style={styles.docTitle}>{title}</Text>
              {isInvoice ? (
                <Text style={styles.docSubTitle}>Original For Recipient</Text>
              ) : null}
            </View>
          </View>

          {/* 2. Metadata Identification Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <Text style={styles.metaText}>
                {documentNumberLabel} : <Text style={styles.metaTextBold}>{documentNumber}</Text>
              </Text>
              <Text style={styles.metaText}>
                {documentDateLabel} : <Text style={styles.metaTextBold}>{documentDate}</Text>
              </Text>
              {validUntil ? (
                <Text style={styles.metaText}>
                  Valid Until : <Text style={styles.metaTextBold}>{validUntil}</Text>
                </Text>
              ) : null}
            </View>
            <View style={styles.metaRight}>
              <Text style={styles.metaText}>
                Place Of Supply : <Text style={styles.metaTextBold}>{placeOfSupply}</Text>
              </Text>
            </View>
          </View>

          {/* 3. Bill To & Ship To Parties */}
          <View style={styles.partiesRow}>
            {/* Bill To */}
            <View style={[styles.partyCol, styles.partyColDivider]}>
              <View style={styles.partyHeaderBar}>
                <Text style={styles.partyHeaderTitle}>Bill To</Text>
              </View>
              <Text style={styles.partyName}>{billTo.name}</Text>
              {billTo.company ? <Text style={styles.partyText}>{billTo.company}</Text> : null}
              {billTo.address ? <Text style={styles.partyText}>{billTo.address}</Text> : null}
              {(billTo.city || billTo.state || billTo.pincode) ? (
                <Text style={styles.partyText}>
                  {[billTo.city, billTo.state, billTo.pincode].filter(Boolean).join(", ")}
                </Text>
              ) : null}
              {billTo.phone ? <Text style={styles.partyText}>Phone: {billTo.phone}</Text> : null}
              {billTo.email ? <Text style={styles.partyText}>Email: {billTo.email}</Text> : null}
              {billTo.gstin ? (
                <Text style={styles.partyGstin}>GSTIN: {billTo.gstin}</Text>
              ) : null}
            </View>

            {/* Ship To */}
            <View style={styles.partyCol}>
              <View style={styles.partyHeaderBar}>
                <Text style={styles.partyHeaderTitle}>Ship To</Text>
              </View>
              <Text style={styles.partyName}>{shipTo.name}</Text>
              {shipTo.company ? <Text style={styles.partyText}>{shipTo.company}</Text> : null}
              {shipTo.address ? <Text style={styles.partyText}>{shipTo.address}</Text> : null}
              {(shipTo.city || shipTo.state || shipTo.pincode) ? (
                <Text style={styles.partyText}>
                  {[shipTo.city, shipTo.state, shipTo.pincode].filter(Boolean).join(", ")}
                </Text>
              ) : null}
              {shipTo.phone ? <Text style={styles.partyText}>Phone: {shipTo.phone}</Text> : null}
              {shipTo.email ? <Text style={styles.partyText}>Email: {shipTo.email}</Text> : null}
              {shipTo.gstin ? (
                <Text style={styles.partyGstin}>GSTIN: {shipTo.gstin}</Text>
              ) : null}
            </View>
          </View>

          {/* 4. Main Items Table */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCol, styles.colIndex]}>#</Text>
              <Text style={[styles.tableHeaderCol, styles.colDescription]}>Item & Description</Text>
              <Text style={[styles.tableHeaderCol, styles.colHsn]}>HSN/SAC</Text>
              <Text style={[styles.tableHeaderCol, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderCol, styles.colRate]}>Rate</Text>
              <Text style={[styles.tableHeaderCol, styles.colTaxRate]}>Tax %</Text>
              <Text style={[styles.tableHeaderCol, styles.colTaxAmount]}>Tax Amt</Text>
              <Text style={[styles.tableHeaderCol, styles.colAmount]}>Amount</Text>
            </View>

            {items.map((item, idx) => (
              <View
                key={item.index || idx}
                style={[
                  styles.tableRow,
                  idx === items.length - 1 ? styles.tableRowLast : {},
                ]}
                wrap={false}
              >
                <Text style={[styles.colIndex, { fontSize: 7.2 }]}>{item.index}</Text>
                <View style={styles.colDescription}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  {item.description && item.description !== item.name ? (
                    <Text style={styles.itemNotes}>{item.description}</Text>
                  ) : null}
                  {item.configurationNotes ? (
                    <Text style={styles.itemNotes}>• {item.configurationNotes}</Text>
                  ) : null}
                </View>
                <Text style={[styles.colHsn, { fontSize: 7.2 }]}>{item.hsnSac || "-"}</Text>
                <Text style={[styles.colQty, { fontSize: 7.2 }]}>{item.qty}</Text>
                <Text style={[styles.colRate, { fontSize: 7.2 }]}>{formatRupee(item.rate)}</Text>
                <Text style={[styles.colTaxRate, { fontSize: 7.2 }]}>{item.taxPercent}%</Text>
                <Text style={[styles.colTaxAmount, { fontSize: 7.2 }]}>{formatRupee(item.taxAmount)}</Text>
                <Text style={[styles.colAmount, { fontSize: 7.2, fontFamily: "Helvetica-Bold" }]}>
                  {formatRupee(item.amount)}
                </Text>
              </View>
            ))}
          </View>

          {/* 5. Lower Section: Split between Left (Words/Terms) and Right (Totals/Sign) */}
          <View style={styles.bottomContainer}>
            {/* Left: Total in Words, Notes, Terms & Conditions */}
            <View style={styles.bottomLeft}>
              <View style={styles.wordsBox}>
                <Text style={styles.sectionLabel}>Total In Words</Text>
                <Text style={styles.wordsText}>{financials.totalInWords}</Text>
              </View>

              {notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.sectionLabel}>Notes</Text>
                  <Text style={styles.notesText}>{notes}</Text>
                </View>
              ) : null}

              {terms.length > 0 ? (
                <View style={styles.termsBox}>
                  <Text style={styles.sectionLabel}>Terms & Conditions</Text>
                  {terms.map((term, index) => (
                    <View key={index} style={styles.termItem}>
                      <Text style={styles.termBullet}>{index + 1}.</Text>
                      <Text style={styles.termText}>{term}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Right: Totals Table and Authorized Signature */}
            <View style={styles.bottomRight}>
              <View style={styles.totalsTable}>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Sub Total</Text>
                  <Text style={styles.totalsValue}>{formatRupee(financials.subtotal)}</Text>
                </View>

                {financials.discountAmount > 0 ? (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Discount</Text>
                    <Text style={[styles.totalsValue, { color: "#16A34A" }]}>
                      -{formatRupee(financials.discountAmount)}
                    </Text>
                  </View>
                ) : null}

                {financials.shippingCharge > 0 ? (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Shipping charge</Text>
                    <Text style={styles.totalsValue}>{formatRupee(financials.shippingCharge)}</Text>
                  </View>
                ) : null}

                {financials.isIntraState ? (
                  <>
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>CGST ({financials.cgstRate.toFixed(1)}%)</Text>
                      <Text style={styles.totalsValue}>{formatRupee(financials.cgstAmount)}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>SGST ({financials.sgstRate.toFixed(1)}%)</Text>
                      <Text style={styles.totalsValue}>{formatRupee(financials.sgstAmount)}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>IGST ({financials.igstRate.toFixed(1)}%)</Text>
                    <Text style={styles.totalsValue}>{formatRupee(financials.igstAmount)}</Text>
                  </View>
                )}

                <View style={styles.totalsRowGrand}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>{formatRupee(financials.grandTotal)}</Text>
                </View>

                {isInvoice && financials.paidAmount !== undefined && financials.paidAmount > 0 ? (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Payment Made</Text>
                    <Text style={[styles.totalsValue, { color: "#16A34A" }]}>
                      {formatRupee(financials.paidAmount)}
                    </Text>
                  </View>
                ) : null}

                {isInvoice && financials.balanceAmount !== undefined ? (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Balance Due</Text>
                    <Text style={[styles.totalsValue, { color: financials.balanceAmount > 0 ? "#DC2626" : "#16A34A" }]}>
                      {formatRupee(financials.balanceAmount)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Authorized Signatory Box */}
              <View style={styles.signatureContainer}>
                <Text style={styles.signatureCompanyText}>
                  For {company.companyName}
                </Text>
                <View style={styles.signatureSpace} />
                <Text style={styles.signatureLine}>Authorized Signature</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
