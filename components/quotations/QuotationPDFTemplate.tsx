import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { DEFAULT_COMPANY_SETTINGS, CompanySettings } from "@/lib/companyProfile";
import { formatINR } from "@/lib/money";
import { formatISTDate } from "@/lib/time";

const styles = StyleSheet.create({
  page: {
    padding: 28,
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
    borderBottomColor: "#FF6B00",
    paddingBottom: 8,
    marginBottom: 8,
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
    color: "#1B2A4A",
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
    marginBottom: 8,
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
    marginBottom: 8,
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
    marginBottom: 8,
  },
  partyCol: {
    width: "50%",
    padding: 6,
  },
  partyColBorder: {
    width: "50%",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
  },
  partyHeading: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  partyText: {
    fontSize: 7.5,
    color: "#333333",
    marginBottom: 1.5,
  },
  partyTextBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 1.5,
  },
  table: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F4F5F7",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#1B2A4A",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingVertical: 3.5,
    minHeight: 18,
  },
  colNo: { width: "6%", textAlign: "center" },
  colDesc: { width: "46%", paddingLeft: 6 },
  colType: { width: "12%", textAlign: "center" },
  colQty: { width: "8%", textAlign: "center" },
  colRate: { width: "13%", textAlign: "right", paddingRight: 4 },
  colAmount: { width: "15%", textAlign: "right", paddingRight: 6 },
  itemTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#111111",
  },
  itemNotes: {
    fontSize: 6.8,
    color: "#666666",
    marginTop: 1,
  },
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  totalsBox: {
    width: 220,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
  },
  totalRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: "#1B2A4A",
  },
  totalLabel: {
    fontSize: 7.5,
    color: "#555555",
  },
  totalValue: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  totalLabelGrand: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  totalValueGrand: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  termsBox: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: 6,
    backgroundColor: "#FAFAFA",
    marginBottom: 8,
  },
  termsTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1B2A4A",
    marginBottom: 2,
  },
  termsText: {
    fontSize: 6.8,
    color: "#444444",
    lineHeight: 1.3,
  },
  footerSign: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 4,
    paddingTop: 4,
  },
  signBox: {
    width: 170,
    textAlign: "center",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#111111",
  },
  signText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
});

export interface QuotationPDFTemplateProps {
  quotation: any;
  client: any;
  company?: CompanySettings;
  logoSrc?: string | null;
}

export const QuotationPDFTemplate: React.FC<QuotationPDFTemplateProps> = ({
  quotation,
  client,
  company = DEFAULT_COMPANY_SETTINGS,
  logoSrc,
}) => {
  const issueDateStr = formatISTDate(quotation.createdAt);
  const validUntilStr = formatISTDate(quotation.validUntil);


  return (
    <Document title={`Quotation-${quotation.quotationNo}`}>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {logoSrc ? (
              <Image src={logoSrc} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{company.companyName || "TAMIZHTECH"}</Text>
            )}
          </View>
          <View style={styles.companyDetails}>
            <Text style={styles.companyName}>{company.companyName || "TAMIZHTECH ROBOTICS"}</Text>
            <Text style={styles.companyText}>
              {[company.addressLine1, company.addressLine2, company.city, company.state, company.pincode].filter(Boolean).join(", ")}
            </Text>
            <Text style={styles.companyText}>
              Phone: {company.phone} | Email: {company.email}
            </Text>
            {company.gstin && <Text style={styles.companyText}>GSTIN: {company.gstin}</Text>}
          </View>
        </View>

        {/* BANNER */}
        <View style={styles.docTitleBanner}>
          <Text style={styles.docTitleText}>COMMERCIAL QUOTATION</Text>
        </View>

        {/* METADATA GRID */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Quotation Number</Text>
            <Text style={styles.metaValue}>{quotation.quotationNo}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Issue Date</Text>
            <Text style={styles.metaValue}>{issueDateStr}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Valid Until</Text>
            <Text style={styles.metaValue}>{validUntilStr}</Text>
          </View>
          <View style={styles.metaColLast}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{quotation.status}</Text>
          </View>
        </View>

        {/* PARTIES GRID */}
        <View style={styles.partiesGrid}>
          <View style={styles.partyColBorder}>
            <Text style={styles.partyHeading}>Quotation For:</Text>
            <Text style={styles.partyTextBold}>{client?.name || "Valued Client"}</Text>
            {client?.company && <Text style={styles.partyText}>{client.company}</Text>}
            <Text style={styles.partyText}>Mobile: {client?.phone || client?.mobileNormalized || "-"}</Text>
            {client?.email && <Text style={styles.partyText}>Email: {client.email}</Text>}
            {client?.address && <Text style={styles.partyText}>Address: {client.address}</Text>}
            {client?.gstin && <Text style={styles.partyText}>GSTIN: {client.gstin}</Text>}
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.partyHeading}>Commercial Terms:</Text>
            <Text style={styles.partyText}>Currency: INR (₹)</Text>
            <Text style={styles.partyText}>Pricing: Quoted rates snapshot</Text>
            <Text style={styles.partyText}>Inventory Impact: Nil (Non-binding offer)</Text>
            <Text style={styles.partyText}>Tax Treatment: Applicable GST</Text>
          </View>
        </View>

        {/* LINE ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colDesc}>Item & Specification</Text>
            <Text style={styles.colType}>Type</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Quoted Rate (₹)</Text>
            <Text style={styles.colAmount}>Amount (₹)</Text>
          </View>
          {(quotation.items || []).map((item: any, idx: number) => (
            <View style={styles.tableRow} key={item.id || idx}>
              <Text style={styles.colNo}>{idx + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.itemTitle}>{item.description || item.name || "Item"}</Text>
                {item.configurationNotes && (
                  <Text style={styles.itemNotes}>{item.configurationNotes}</Text>
                )}
              </View>
              <Text style={styles.colType}>
                {item.itemType === "SERVICE" ? "Service" : "Product"}
              </Text>
              <Text style={styles.colQty}>{item.qty}</Text>
              <Text style={styles.colRate}>{formatINR(item.unitPrice)}</Text>
              <Text style={styles.colAmount}>{formatINR(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatINR(quotation.subtotal)}</Text>
            </View>
            {quotation.discountAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>-{formatINR(quotation.discountAmount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax Amount (GST)</Text>
              <Text style={styles.totalValue}>{formatINR(quotation.taxAmount)}</Text>
            </View>
            <View style={styles.totalRowGrand}>
              <Text style={styles.totalLabelGrand}>Total Quoted Amount</Text>
              <Text style={styles.totalValueGrand}>{formatINR(quotation.total)}</Text>
            </View>
          </View>
        </View>

        {/* TERMS & CONDITIONS */}
        <View style={styles.termsBox}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            {quotation.terms ||
              "1. Quotation valid for 30 days.\n2. Payment terms: 50% advance, balance on delivery.\n3. Goods remain company property until paid in full."}
          </Text>
        </View>

        {/* SIGNATURE SECTION */}
        <View style={styles.footerSign}>
          <View>
            <Text style={styles.partyText}>This quotation does not constitute a tax invoice.</Text>
            <Text style={styles.partyText}>Accepted quotations can be converted into active orders.</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signText}>For {company.companyName || "TAMIZHTECH"}</Text>
            <Text style={{ fontSize: 6.8, color: "#666666", marginTop: 2 }}>Authorised Signatory</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
