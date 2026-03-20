import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Invoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export const generateInvoicePDF = (invoice: Invoice) => {
  const doc = new jsPDF();
  const brandColor = [192, 57, 43]; // #C0392B
  const navyColor = [26, 26, 46]; // #1A1A2E

  // Header - Brand
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('TamizhTech', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Robotics & Tech Solutions', 20, 32);

  // Invoice Label
  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', 140, 28);

  // Company Details (Right side)
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TamizhTech Pvt Ltd', 140, 50);
  doc.setFont('helvetica', 'normal');
  doc.text('Coimbatore, Tamil Nadu, India', 140, 55);
  doc.text('+91 8148045030', 140, 60);
  doc.text('tamizhtechpvtltd@gmail.com', 140, 65);

  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 20, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(invoice.clientName, 20, 58);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Client ID: ${invoice.clientId}`, 20, 63);

  // Invoice Meta
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 75, 190, 75);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No:', 20, 85);
  doc.text('Date:', 80, 85);
  doc.text('Due Date:', 140, 85);
  
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceNo, 20, 92);
  doc.text(formatDate(invoice.date), 80, 92);
  doc.text(formatDate(invoice.dueDate), 140, 92);

  // Line Items Table
  const tableColumn = ["Description", "Qty", "Unit Price", "Amount"];
  const tableRows: any[] = [];

  const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;

  items.forEach((item: any) => {
    const rowData = [
      item.description,
      item.qty.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.amount)
    ];
    tableRows.push(rowData);
  });

  (doc as any).autoTable({
    startY: 105,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
        fillColor: brandColor, 
        textColor: [255, 255, 255],
        fontStyle: 'bold'
    },
    styles: { 
        fontSize: 9,
        cellPadding: 6 
    },
    columnStyles: {
      3: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 140, finalY);
  doc.text(formatCurrency(invoice.subtotal), 170, finalY, { align: 'right' });
  
  doc.text(`GST (${invoice.gstPercent}%):`, 140, finalY + 7);
  doc.text(formatCurrency(invoice.gstAmount), 170, finalY + 7, { align: 'right' });
  
  if (invoice.discountAmount > 0) {
    doc.text(`Discount (${invoice.discountPercent}%):`, 140, finalY + 14);
    doc.text(`-${formatCurrency(invoice.discountAmount)}`, 170, finalY + 14, { align: 'right' });
  }

  const grandTotalY = finalY + (invoice.discountAmount > 0 ? 25 : 18);
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.rect(135, grandTotalY - 7, 60, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TOTAL:', 140, grandTotalY);
  doc.text(formatCurrency(invoice.total), 190, grandTotalY, { align: 'right' });

  // Notes
  if (invoice.notes) {
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, grandTotalY + 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(invoice.notes, 20, grandTotalY + 27, { maxWidth: 100 });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer generated invoice and does not require a signature.', 105, 285, { align: 'center' });
  doc.text('www.tamizhtech.in | tamizhtechpvtltd@gmail.com', 105, 290, { align: 'center' });

  doc.save(`Invoice_${invoice.invoiceNo}_${invoice.clientName}.pdf`);
};
