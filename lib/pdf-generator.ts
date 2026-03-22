import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Font 
} from '@react-pdf/renderer';
import { Invoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

// Styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1A1A2E',
  },
  header: {
    backgroundColor: '#C0392B',
    padding: 20,
    margin: -30,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 100,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  brandSub: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 5,
  },
  invoiceLabel: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  box: {
    width: '45%',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#C0392B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    marginBottom: 2,
  },
  table: {
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  tableHeader: {
    backgroundColor: '#C0392B',
    flexDirection: 'row',
    padding: 8,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    padding: 8,
  },
  tableCell: {
    flex: 1,
  },
  amountCell: {
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalBox: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  grandTotal: {
    marginTop: 10,
    backgroundColor: '#C0392B',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#999999',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
  }
});

const InvoiceDocument = ({ invoice }: { invoice: Invoice }) => {
  const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>TamizhTech</Text>
            <Text style={styles.brandSub}>Robotics & Tech Solutions</Text>
          </View>
          <Text style={styles.invoiceLabel}>INVOICE</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.box}>
            <Text style={styles.label}>Bill To:</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 12 }}>{invoice.clientName}</Text>
            <Text style={styles.value}>Client ID: {invoice.clientId}</Text>
          </View>
          <View style={[styles.box, { textAlign: 'right' }]}>
            <Text style={styles.label}>Company Details:</Text>
            <Text style={styles.value}>TamizhTech Pvt Ltd</Text>
            <Text style={styles.value}>Coimbatore, Tamil Nadu, India</Text>
            <Text style={styles.value}>+91 8148045030</Text>
          </View>
        </View>

        <View style={[styles.section, { borderTop: 1, borderColor: '#EEE', paddingTop: 10 }]}>
          <View>
            <Text style={styles.label}>Invoice No</Text>
            <Text>{invoice.invoiceNo}</Text>
          </View>
          <View>
            <Text style={styles.label}>Date</Text>
            <Text>{formatDate(invoice.date)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Due Date</Text>
            <Text>{formatDate(invoice.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Description</Text>
            <Text style={[styles.tableHeaderCell, { flex: 0.3 }]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCell]}>Amount</Text>
          </View>
          {items.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.description}</Text>
              <Text style={[styles.tableCell, { flex: 0.3 }]}>{item.qty}</Text>
              <Text style={[styles.tableCell, { flex: 0.5 }]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.amountCell]}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>GST ({invoice.gstPercent}%):</Text>
              <Text>{formatCurrency(invoice.gstAmount)}</Text>
            </View>
            {invoice.discountAmount > 0 && (
              <View style={styles.totalRow}>
                <Text>Discount ({invoice.discountPercent}%):</Text>
                <Text>-{formatCurrency(invoice.discountAmount)}</Text>
              </View>
            )}
            <View style={styles.grandTotal}>
              <Text>TOTAL:</Text>
              <Text>{formatCurrency(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {invoice.notes && (
          <View style={{ marginTop: 40 }}>
            <Text style={styles.label}>Notes:</Text>
            <Text style={{ fontSize: 8 }}>{invoice.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>This is a computer generated invoice and does not require a signature.</Text>
          <Text>www.tamizhtech.in | tamizhtechpvtltd@gmail.com</Text>
        </View>
      </Page>
    </Document>
  );
};

export const generateInvoicePDF = async (invoice: Invoice) => {
  const blob = await pdf(<InvoiceDocument invoice={invoice} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice_${invoice.invoiceNo}_${invoice.clientName}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
