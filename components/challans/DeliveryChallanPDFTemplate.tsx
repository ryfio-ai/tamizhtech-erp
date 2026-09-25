import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { DEFAULT_COMPANY_SETTINGS, CompanySettings } from "@/lib/companyProfile";
import { formatDocumentDateTime } from "@/lib/businessDocumentData";

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1A202C",
    lineHeight: 1.3,
    backgroundColor: "#FFFFFF",
  },
  outerContainer: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    minHeight: "97%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "65%",
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
    color: "#0F172A",
    marginBottom: 2,
  },
  companyAddress: {
    fontSize: 7.2,
    color: "#475569",
    lineHeight: 1.25,
  },
  companyContact: {
    fontSize: 7.2,
    color: "#475569",
    marginTop: 1,
  },
  headerRight: {
    width: "35%",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  docTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  docSubTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#D97706", // Amber 600
    marginTop: 2,
    letterSpacing: 0.3,
  },
  docNotice: {
    fontSize: 6.5,
    color: "#64748B",
    marginTop: 2,
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  metaLeft: {
    width: "50%",
  },
  metaRight: {
    width: "50%",
    alignItems: "flex-end",
  },
  metaText: {
    fontSize: 8,
    color: "#334155",
    marginBottom: 2,
  },
  metaTextBold: {
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  partiesRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  partyCol: {
    width: "50%",
    padding: 8,
  },
  partyColDivider: {
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
  },
  partyHeaderBar: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  partyHeaderTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  partyName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    marginBottom: 2,
  },
  partyText: {
    fontSize: 7.2,
    color: "#475569",
    lineHeight: 1.25,
  },
  transportBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingVertical: 5,
    paddingHorizontal: 10,
    justifyContent: "space-between",
  },
  transportCol: {
    width: "32%",
  },
  transportLabel: {
    fontSize: 6.5,
    color: "#64748B",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  transportValue: {
    fontSize: 7.5,
    color: "#0F172A",
    fontFamily: "Helvetica",
    marginTop: 1,
  },
  tableContainer: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCol: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 5,
    paddingHorizontal: 4,
    minHeight: 20,
  },
  colIndex: { width: "6%", textAlign: "center" },
  colDescription: { width: "50%", paddingLeft: 4 },
  colSku: { width: "16%", textAlign: "center" },
  colQty: { width: "12%", textAlign: "center" },
  colUnit: { width: "16%", textAlign: "center" },
  itemTitle: {
    fontSize: 7.8,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  itemNotes: {
    fontSize: 6.8,
    color: "#64748B",
    marginTop: 1,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    paddingVertical: 5,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  disclaimerBox: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    backgroundColor: "#FFFBEB", // Amber 50
  },
  disclaimerTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#B45309",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  disclaimerText: {
    fontSize: 6.8,
    color: "#78350F",
    lineHeight: 1.25,
  },
  signatureSection: {
    flexDirection: "row",
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#CBD5E1",
  },
  signatureBox: {
    width: "50%",
    padding: 10,
    minHeight: 90,
    justifyContent: "space-between",
  },
  signatureDivider: {
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
  },
  signatureTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  signatureImage: {
    width: 140,
    height: 45,
    objectFit: "contain",
    marginVertical: 4,
  },
  signatureNote: {
    fontSize: 6.8,
    color: "#64748B",
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#94A3B8",
    width: "80%",
    marginTop: 40,
    marginBottom: 4,
  },
  footerText: {
    textAlign: "center",
    fontSize: 6.5,
    color: "#94A3B8",
    padding: 4,
  },
});

export interface DeliveryChallanPDFTemplateProps {
  challan: any;
  client?: any;
  company?: CompanySettings;
  logoSrc?: string;
  signatureSrc?: string;
}

export function DeliveryChallanPDFTemplate({
  challan,
  client,
  company = DEFAULT_COMPANY_SETTINGS,
  logoSrc = "",
  signatureSrc = "",
}: DeliveryChallanPDFTemplateProps) {
  if (!challan) return null;

  const docDate = formatDocumentDateTime(challan.issuedAt || challan.date || challan.createdAt);
  const totalQty = (challan.items || []).reduce(
    (sum: number, it: any) => sum + (Number(it.quantity) || 0),
    0
  );

  return (
    <Document title={`Delivery-Challan-${challan.challanNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.outerContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
              <View style={styles.companyInfo}>
                <Text style={styles.companyTitle}>{company.companyName}</Text>
                <Text style={styles.companyAddress}>
                  {company.addressLine1}, {company.addressLine2}, {company.city}, {company.state} -{" "}
                  {company.pincode}, {company.country}
                </Text>
                <Text style={styles.companyContact}>
                  Phone: {company.phone} • Email: {company.email} • {company.website}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.docTitle}>DELIVERY CHALLAN</Text>
              <Text style={styles.docSubTitle}>GATE PASS / DISPATCH</Text>
              <Text style={styles.docNotice}>Non-Financial Goods Movement</Text>
            </View>
          </View>

          {/* Meta Information */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <Text style={styles.metaText}>
                Challan No: <Text style={styles.metaTextBold}>{challan.challanNumber}</Text>
              </Text>
              <Text style={styles.metaText}>
                Issue Date: <Text style={styles.metaTextBold}>{docDate}</Text>
              </Text>
              <Text style={styles.metaText}>
                Movement Purpose:{" "}
                <Text style={styles.metaTextBold}>{challan.purpose?.replace(/_/g, " ")}</Text>
              </Text>
            </View>
            <View style={styles.metaRight}>
              <Text style={styles.metaText}>
                Document Status: <Text style={styles.metaTextBold}>{challan.status}</Text>
              </Text>
              {challan.referenceNo ? (
                <Text style={styles.metaText}>
                  Reference ({challan.referenceType}):{" "}
                  <Text style={styles.metaTextBold}>{challan.referenceNo}</Text>
                </Text>
              ) : (
                <Text style={styles.metaText}>
                  Reference: <Text style={styles.metaTextBold}>Direct Dispatch</Text>
                </Text>
              )}
            </View>
          </View>

          {/* Parties & Destination */}
          <View style={styles.partiesRow}>
            <View style={[styles.partyCol, styles.partyColDivider]}>
              <View style={styles.partyHeaderBar}>
                <Text style={styles.partyHeaderTitle}>Consignee / Customer Details</Text>
              </View>
              <Text style={styles.partyName}>{client?.name || challan.contactPerson || "Valued Client"}</Text>
              {client?.company ? <Text style={styles.partyText}>{client.company}</Text> : null}
              {client?.phone || challan.contactPhone ? (
                <Text style={styles.partyText}>Contact: {challan.contactPhone || client?.phone}</Text>
              ) : null}
              {client?.email ? <Text style={styles.partyText}>Email: {client.email}</Text> : null}
              {client?.gstin ? <Text style={styles.partyText}>GSTIN: {client.gstin}</Text> : null}
            </View>

            <View style={styles.partyCol}>
              <View style={styles.partyHeaderBar}>
                <Text style={styles.partyHeaderTitle}>Shipping / Destination Address</Text>
              </View>
              <Text style={styles.partyText}>
                {challan.destination || "Destination address not available."}
              </Text>
            </View>
          </View>

          {/* Transport Bar */}
          <View style={styles.transportBar}>
            <View style={styles.transportCol}>
              <Text style={styles.transportLabel}>Mode of Transport</Text>
              <Text style={styles.transportValue}>{challan.transportMode || "Hand Delivery / Road"}</Text>
            </View>
            <View style={styles.transportCol}>
              <Text style={styles.transportLabel}>Vehicle / Carrier No</Text>
              <Text style={styles.transportValue}>{challan.vehicleNo || "—"}</Text>
            </View>
            <View style={styles.transportCol}>
              <Text style={styles.transportLabel}>LR / Docket / Tracking No</Text>
              <Text style={styles.transportValue}>{challan.lrNumber || "—"}</Text>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCol, styles.colIndex]}>S.No</Text>
              <Text style={[styles.tableHeaderCol, styles.colDescription]}>Item & Description</Text>
              <Text style={[styles.tableHeaderCol, styles.colSku]}>Part / SKU</Text>
              <Text style={[styles.tableHeaderCol, styles.colQty]}>Quantity</Text>
              <Text style={[styles.tableHeaderCol, styles.colUnit]}>Unit</Text>
            </View>

            {(challan.items || []).map((item: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.colIndex, { fontSize: 7.5 }]}>{idx + 1}</Text>
                <View style={styles.colDescription}>
                  <Text style={styles.itemTitle}>{item.description}</Text>
                  {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
                </View>
                <Text style={[styles.colSku, { fontSize: 7.2, color: "#475569" }]}>
                  {item.sku || "—"}
                </Text>
                <Text style={[styles.colQty, { fontSize: 7.8, fontFamily: "Helvetica-Bold" }]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.colUnit, { fontSize: 7.2, color: "#475569" }]}>
                  {item.unit || "pcs"}
                </Text>
              </View>
            ))}
          </View>

          {/* Items Summary */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Total Distinct Items: {(challan.items || []).length}</Text>
            <Text style={styles.summaryText}>Total Dispatched Units: {totalQty}</Text>
          </View>

          {/* Non-financial disclaimer */}
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerTitle}>IMPORTANT NOTICE — NON-FINANCIAL DOCUMENT</Text>
            <Text style={styles.disclaimerText}>
              1. This Delivery Challan / Gate Pass is an internal goods dispatch document and is NOT an invoice, sale deed, or proof of payment.
            </Text>
            <Text style={styles.disclaimerText}>
              2. Goods dispatched under this challan remain the property of Tamizh Tech Robotics Company unless covered by a valid commercial tax invoice.
            </Text>
            {challan.notes ? (
              <Text style={[styles.disclaimerText, { marginTop: 2, fontFamily: "Helvetica-Bold" }]}>
                Challan Remarks: {challan.notes}
              </Text>
            ) : null}
          </View>

          {/* Signatures */}
          <View style={styles.signatureSection}>
            <View style={[styles.signatureBox, styles.signatureDivider]}>
              <Text style={styles.signatureTitle}>{"Receiver's Acknowledgment"}</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureNote}>
                Received goods in good condition & verified quantity
              </Text>
              <Text style={styles.signatureNote}>Name, Date & Company Seal</Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>For Tamizh Tech Robotics Company</Text>
              {signatureSrc ? (
                <Image src={signatureSrc} style={styles.signatureImage} />
              ) : (
                <View style={{ height: 45 }} />
              )}
              <Text style={[styles.signatureTitle, { fontSize: 7 }]}>Authorized Signatory</Text>
              <Text style={styles.signatureNote}>Operations / Dispatch Department</Text>
            </View>
          </View>

          <Text style={styles.footerText}>
            Tamizh Tech ERP 2.0 • Authoritative Dispatch Record • Generated on {docDate}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
