import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { Invoice, Client } from "@/types";
import { numberToWords } from "@/lib/numToWords";

// Styling for professional Tax Invoice
const styles = StyleSheet.create({
  page: { 
    padding: 30, 
    fontFamily: "Helvetica", 
    fontSize: 9, 
    color: "#000",
    lineHeight: 1.4
  },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 20
  },
  logoContainer: {
    width: 150
  },
  titleContainer: {
    textAlign: "right"
  },
  invoiceTitle: { 
    fontSize: 22, 
    fontFamily: "Helvetica-Bold",
    color: "#000",
    letterSpacing: 1
  },
  companyName: {
     fontSize: 14,
     fontFamily: "Helvetica-Bold",
     marginBottom: 4
  },
  companyDetail: {
     fontSize: 9,
     color: "#333",
     marginBottom: 2
  },
  infoGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10
  },
  infoCol: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#ccc"
  },
  infoLabel: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2
  },
  infoValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9
  },
  addressGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ccc",
    borderTopWidth: 0,
    marginBottom: 15
  },
  addressCol: {
    width: "50%",
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#ccc"
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    backgroundColor: "#eee",
    padding: 4,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc"
  },
  table: { 
    width: "100%", 
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10
  },
  tableHeader: { 
    flexDirection: "row", 
    backgroundColor: "#eee", 
    borderBottomWidth: 1, 
    borderBottomColor: "#ccc",
    paddingVertical: 6
  },
  tableRow: { 
    flexDirection: "row", 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee", 
    paddingVertical: 6,
    minHeight: 25
  },
  colNo: { width: "5%", textAlign: "center", borderRightWidth: 1, borderRightColor: "#ccc", paddingHorizontal: 2 },
  colDesc: { width: "55%", borderRightWidth: 1, borderRightColor: "#ccc", paddingHorizontal: 6 },
  colQty: { width: "10%", textAlign: "right", borderRightWidth: 1, borderRightColor: "#ccc", paddingHorizontal: 4 },
  colRate: { width: "15%", textAlign: "right", borderRightWidth: 1, borderRightColor: "#ccc", paddingHorizontal: 4 },
  colAmount: { width: "15%", textAlign: "right", paddingHorizontal: 4 },
  
  tableCell: {
    fontSize: 8,
    paddingTop: 2
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  wordsSection: {
    width: "50%",
    padding: 8
  },
  totalsSection: {
    width: "50%",
    borderLeftWidth: 1,
    borderLeftColor: "#ccc"
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#f9f9f9"
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10
  },
  notesArea: {
    marginTop: 15,
    padding: 8,
    borderWidth: 1,
    borderColor: "#eee"
  },
  signatureArea: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  signatureBox: {
    width: 150,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#000",
    paddingTop: 4
  }
});

interface InvoicePDFTemplateProps {
  invoice: Invoice & { items: any[] };
  client: Client;
}

export function InvoicePDFTemplate({ invoice, client }: InvoicePDFTemplateProps) {
  const formatNum = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  return (
    <Document title={`Invoice_${invoice.invoiceNo}`}>
      <Page size="A4" style={styles.page}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.companyName}>Tamizh Tech Robotics Company</Text>
            <Text style={styles.companyDetail}>Tamil Nadu</Text>
            <Text style={styles.companyDetail}>India</Text>
            <Text style={styles.companyDetail}>91-8438686030</Text>
            <Text style={styles.companyDetail}>tamizharasank6030@gmail.com</Text>
            <Text style={styles.companyDetail}>www.tamizhtech.in</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={[styles.infoCol, { width: "45%" }]}>
             <View style={{ flexDirection: "row", marginBottom: 3 }}>
                <Text style={[styles.infoLabel, { width: 60 }]}>#</Text>
                <Text style={styles.infoValue}>: {String(invoice.invoiceNo)}</Text>
             </View>
             <View style={{ flexDirection: "row", marginBottom: 3 }}>
                <Text style={[styles.infoLabel, { width: 60 }]}>Invoice Date</Text>
                <Text style={styles.infoValue}>: {new Date(invoice.date).toLocaleDateString('en-GB')}</Text>
             </View>
             <View style={{ flexDirection: "row", marginBottom: 3 }}>
                <Text style={[styles.infoLabel, { width: 60 }]}>Terms</Text>
                <Text style={styles.infoValue}>: Due on Receipt</Text>
             </View>
             <View style={{ flexDirection: "row" }}>
                <Text style={[styles.infoLabel, { width: 60 }]}>Due Date</Text>
                <Text style={styles.infoValue}>: {new Date(invoice.dueDate).toLocaleDateString('en-GB')}</Text>
             </View>
          </View>
          <View style={{ width: "55%", padding: 8 }}>
            {/* Empty space as seen in reference */}
          </View>
        </View>

        {/* Address Grid */}
        <View style={styles.addressGrid}>
          <View style={styles.addressCol}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{client.name}</Text>
            <Text style={{ color: "#333", fontSize: 8 }}>{client.email}</Text>
            <Text style={{ color: "#333", fontSize: 8 }}>{client.phone}</Text>
            <Text style={{ color: "#333", fontSize: 8 }}>{client.city}, Tamil Nadu</Text>
            <Text style={{ color: "#333", fontSize: 8 }}>India</Text>
          </View>
          <View style={[styles.addressCol, { borderRightWidth: 0 }]}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{client.name}</Text>
            <Text style={{ color: "#333", fontSize: 8 }}>{client.city}, Tamil Nadu</Text>
            <Text style={{ color: "#333", fontSize: 8 }}>India</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colNo, styles.totalLabel]}>#</Text>
            <Text style={[styles.colDesc, styles.totalLabel]}>Item & Description</Text>
            <Text style={[styles.colQty, styles.totalLabel]}>Qty</Text>
            <Text style={[styles.colRate, styles.totalLabel]}>Rate</Text>
            <Text style={[styles.colAmount, styles.totalLabel]}>Amount</Text>
          </View>

          {invoice.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.colNo, styles.tableCell]}>{String(idx + 1)}</Text>
              <Text style={[styles.colDesc, styles.tableCell]}>{String(item.description || "")}</Text>
              <Text style={[styles.colQty, styles.tableCell]}>{String(item.qty.toFixed(2))}</Text>
              <Text style={[styles.colRate, styles.tableCell]}>{formatNum(item.unitPrice)}</Text>
              <Text style={[styles.colAmount, styles.tableCell]}>{formatNum(item.qty * item.unitPrice)}</Text>
            </View>
          ))}
        </View>

        {/* Footer Summary Section */}
        <View style={{ borderWidth: 1, borderColor: "#ccc" }}>
          <View style={styles.summaryContainer}>
            <View style={styles.wordsSection}>
               <Text style={{ fontSize: 7, color: "#666", marginBottom: 2 }}>Total In Words</Text>
               <Text style={{ fontFamily: "Helvetica-Oblique", fontSize: 8 }}>{numberToWords(invoice.total)}</Text>
               
               <View style={{ marginTop: 15 }}>
                  <Text style={{ fontSize: 7, color: "#666", marginBottom: 2 }}>Notes</Text>
                  <Text style={{ fontSize: 8 }}>{invoice.notes || "Thanks for your business."}</Text>
               </View>
            </View>

            <View style={styles.totalsSection}>
               <View style={styles.totalsRow}>
                  <Text>Sub Total</Text>
                  <Text>{formatNum(invoice.subtotal)}</Text>
               </View>
               {invoice.gstAmount > 0 && (
                 <View style={styles.totalsRow}>
                    <Text>GST ({invoice.gstPercent}%)</Text>
                    <Text>{formatNum(invoice.gstAmount)}</Text>
                 </View>
               )}
               <View style={styles.grandTotalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>Rs. {formatNum(invoice.total)}</Text>
               </View>
               <View style={[styles.grandTotalRow, { color: "#d32f2f" }]}>
                  <Text style={styles.totalLabel}>Balance Due</Text>
                  <Text style={styles.totalValue}>Rs. {formatNum(invoice.balance)}</Text>
               </View>

               <View style={{ height: 60 }} /> {/* Signature Space */}
               
               <View style={{ padding: 8, textAlign: "center" }}>
                  <Text style={{ fontSize: 8, borderTopWidth: 1, borderTopColor: "#000", paddingTop: 4 }}>Authorized Signature</Text>
               </View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 20, textAlign: "center" }}>
           <Text style={{ fontSize: 7, color: "#999" }}>Computer generated invoice. No physical signature required.</Text>
        </View>

      </Page>
    </Document>
  );
}
