import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { DEFAULT_COMPANY_SETTINGS, CompanySettings } from "@/lib/companyProfile";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  borderWrapper: {
    borderWidth: 2,
    borderColor: "#1E293B", // Slate 800
    height: "100%",
    padding: 6,
  },
  innerBorder: {
    borderWidth: 1,
    borderColor: "#D97706", // Amber 600 gold accent
    height: "100%",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFCF5", // Warm off-white
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 6,
  },
  logo: {
    width: 65,
    height: 48,
    objectFit: "contain",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  companyTagline: {
    fontSize: 7.5,
    color: "#D97706",
    letterSpacing: 1.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginTop: 2,
  },

  // Certificate Title Section
  titleSection: {
    alignItems: "center",
    marginVertical: 4,
  },
  mainTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  titleUnderline: {
    width: 140,
    borderBottomWidth: 1.5,
    borderBottomColor: "#D97706",
    marginTop: 4,
    marginBottom: 8,
  },
  presentationText: {
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    color: "#475569",
    letterSpacing: 0.5,
  },

  // Recipient Name
  recipientName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    marginTop: 6,
    marginBottom: 4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  nameUnderline: {
    width: 320,
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    marginBottom: 8,
  },

  // Completion Statement & Program Name
  statementText: {
    fontSize: 8.5,
    color: "#475569",
    textAlign: "center",
    marginBottom: 4,
  },
  programTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  periodText: {
    fontSize: 8.5,
    color: "#334155",
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 6,
  },

  // Bottom Columns: Verification / Details / Signature
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    width: "100%",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  metaCol: {
    width: "35%",
    alignItems: "flex-start",
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    marginBottom: 4,
  },

  qrCol: {
    width: "30%",
    alignItems: "center",
  },
  qrImage: {
    width: 52,
    height: 52,
    objectFit: "contain",
  },
  qrLabel: {
    fontSize: 6.5,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },

  signatureCol: {
    width: "35%",
    alignItems: "flex-end",
  },
  signatureImage: {
    width: 130,
    height: 38,
    objectFit: "contain",
    marginBottom: 2,
  },
  signaturePlaceholder: {
    height: 38,
  },
  signatureLine: {
    width: 140,
    borderBottomWidth: 1,
    borderBottomColor: "#0F172A",
    marginBottom: 3,
  },
  signatoryTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  signatorySubtitle: {
    fontSize: 6.8,
    color: "#64748B",
  },

  // Void Watermark
  voidOverlay: {
    position: "absolute",
    top: "35%",
    left: "20%",
    transform: "rotate(-25deg)",
    borderWidth: 5,
    borderColor: "#DC2626",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    opacity: 0.35,
  },
  voidText: {
    fontSize: 48,
    fontFamily: "Helvetica-Bold",
    color: "#DC2626",
    letterSpacing: 6,
    textTransform: "uppercase",
  },
});

export interface CertificatePDFTemplateProps {
  certificate: any;
  company?: CompanySettings;
  logoSrc?: string;
  signatureSrc?: string;
  qrDataUri?: string;
}

export function CertificatePDFTemplate({
  certificate,
  company = DEFAULT_COMPANY_SETTINGS,
  logoSrc = "",
  signatureSrc = "",
  qrDataUri = "",
}: CertificatePDFTemplateProps) {
  if (!certificate) return null;

  const isVoid = certificate.status === "VOID";
  const completionDateStr = new Date(certificate.completionDate || certificate.createdAt).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <Document title={`TamizhTech-Certificate-${certificate.certificateNo}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.borderWrapper}>
          <View style={styles.innerBorder}>
            {/* VOID Watermark if voided */}
            {isVoid && (
              <View style={styles.voidOverlay}>
                <Text style={styles.voidText}>VOID / CANCELLED</Text>
              </View>
            )}

            {/* Header */}
            <View style={styles.header}>
              {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
              <Text style={styles.companyName}>{company.companyName}</Text>
              <Text style={styles.companyTagline}>Center for Robotics & STEM Innovation</Text>
            </View>

            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.mainTitle}>Certificate of Completion</Text>
              <View style={styles.titleUnderline} />
              <Text style={styles.presentationText}>This certificate is proudly presented to</Text>
            </View>

            {/* Student Name */}
            <Text style={styles.recipientName}>
              {certificate.studentNameSnapshot || certificate.studentName || "Participant"}
            </Text>
            <View style={styles.nameUnderline} />

            {/* Completion Statement */}
            <Text style={styles.statementText}>
              for successfully completing the hands-on engineering training program in
            </Text>

            <Text style={styles.programTitle}>
              {certificate.programNameSnapshot || certificate.programName || "Robotics Workshop"}
            </Text>

            <Text style={styles.periodText}>
              Completed on {completionDateStr}
              {certificate.duration ? ` • Duration: ${certificate.duration}` : ""}
            </Text>

            {/* Bottom Meta & Signatures */}
            <View style={styles.bottomSection}>
              {/* Meta Left */}
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Certificate Number</Text>
                <Text style={styles.metaValue}>{certificate.certificateNo}</Text>

                <Text style={styles.metaLabel}>Verification ID</Text>
                <Text style={[styles.metaValue, { fontFamily: "Courier-Bold", fontSize: 8 }]}>
                  {certificate.verificationId}
                </Text>

                {certificate.trainer ? (
                  <>
                    <Text style={styles.metaLabel}>Lead Trainer</Text>
                    <Text style={[styles.metaValue, { fontSize: 7.5 }]}>{certificate.trainer}</Text>
                  </>
                ) : null}
              </View>

              {/* QR Code Center */}
              <View style={styles.qrCol}>
                {qrDataUri ? <Image src={qrDataUri} style={styles.qrImage} /> : null}
                <Text style={styles.qrLabel}>Scan to verify certificate</Text>
              </View>

              {/* Signature Right */}
              <View style={styles.signatureCol}>
                {signatureSrc ? (
                  <Image src={signatureSrc} style={styles.signatureImage} />
                ) : (
                  <View style={styles.signaturePlaceholder} />
                )}
                <View style={styles.signatureLine} />
                <Text style={styles.signatoryTitle}>Authorized Signatory</Text>
                <Text style={styles.signatorySubtitle}>Tamizh Tech Robotics Company</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
