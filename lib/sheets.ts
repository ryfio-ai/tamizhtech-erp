import { google } from 'googleapis';
import { 
  Client, 
  Invoice, 
  Payment, 
  FollowUp, 
  Application, 
  DashboardStats, 
  MonthlyRevenue, 
  PaymentStatusBreakdown 
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

const getAuthClient = () => {
  if (!GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not defined');
  }
  
  const credentials = JSON.parse(Buffer.from(GOOGLE_SERVICE_ACCOUNT_JSON, 'base64').toString());
  
  return new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
};

const sheets = google.sheets('v4');

// Generic Helpers
export async function getSheetData(sheetName: string): Promise<any[]> {
  const auth = getAuthClient();
  const response = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];

  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}

export async function appendRow(sheetName: string, data: any): Promise<void> {
  const auth = getAuthClient();
  const headersResponse = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z1`,
  });

  const headers = headersResponse.data.values?.[0];
  if (!headers) throw new Error(`Sheet ${sheetName} not found or has no headers`);

  const row = headers.map(header => {
    const value = data[header];
    return typeof value === 'object' ? JSON.stringify(value) : value;
  });

  await sheets.spreadsheets.values.append({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
}

export async function updateRow(sheetName: string, id: string, data: any): Promise<void> {
  const auth = getAuthClient();
  const rows = await getSheetData(sheetName);
  const headersResponse = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z1`,
  });

  const headers = headersResponse.data.values?.[0];
  if (!headers) throw new Error(`Sheet ${sheetName} not found or has no headers`);

  const rowIndex = rows.findIndex(r => r.id === id);
  if (rowIndex === -1) throw new Error(`Row with id ${id} not found in ${sheetName}`);

  const rowNumber = rowIndex + 2; // +1 for 0-indexing, +1 for headers
  const updatedRow = headers.map(header => {
    const value = data[header] !== undefined ? data[header] : rows[rowIndex][header];
    return typeof value === 'object' ? JSON.stringify(value) : value;
  });

  await sheets.spreadsheets.values.update({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowNumber}:Z${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [updatedRow],
    },
  });
}

export async function deleteRow(sheetName: string, id: string): Promise<void> {
  const auth = getAuthClient();
  const rows = await getSheetData(sheetName);
  const rowIndex = rows.findIndex(r => r.id === id);
  if (rowIndex === -1) throw new Error(`Row with id ${id} not found in ${sheetName}`);

  const sheetResponse = await sheets.spreadsheets.get({
    auth,
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = sheetResponse.data.sheets?.find(s => s.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId;

  await sheets.spreadsheets.batchUpdate({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex + 1,
              endIndex: rowIndex + 2,
            },
          },
        },
      ],
    },
  });
}

export async function findById(sheetName: string, id: string): Promise<any> {
  const rows = await getSheetData(sheetName);
  return rows.find(r => r.id === id);
}

export async function findByField(sheetName: string, field: string, value: any): Promise<any[]> {
  const rows = await getSheetData(sheetName);
  return rows.filter(r => r[field] === value);
}

// Specific Helpers
export async function getNextInvoiceNo(): Promise<string> {
  const invoices = await getSheetData('Invoices');
  if (invoices.length === 0) return 'INV-001';
  
  const lastNo = invoices[invoices.length - 1].invoiceNo;
  const num = parseInt(lastNo.split('-')[1]) + 1;
  return `INV-${num.toString().padStart(3, '0')}`;
}

export async function getNextPaymentId(): Promise<string> {
  const payments = await getSheetData('Payments');
  if (payments.length === 0) return 'PAY-001';
  
  const lastId = payments[payments.length - 1].paymentId;
  const num = parseInt(lastId.split('-')[1]) + 1;
  return `PAY-${num.toString().padStart(3, '0')}`;
}

export async function getNextApplicationNo(): Promise<string> {
  const apps = await getSheetData('Applications');
  if (apps.length === 0) return 'APP-001';
  
  const lastNo = apps[apps.length - 1].applicationNo;
  const num = parseInt(lastNo.split('-')[1]) + 1;
  return `APP-${num.toString().padStart(3, '0')}`;
}

export async function getClientInvoices(clientId: string): Promise<Invoice[]> {
  const results = await findByField('Invoices', 'clientId', clientId);
  return results.map(row => ({
    ...row,
    items: JSON.parse(row.items || '[]'),
    gstPercent: parseFloat(row.gstPercent),
    discountPercent: parseFloat(row.discountPercent),
    subtotal: parseFloat(row.subtotal),
    gstAmount: parseFloat(row.gstAmount),
    discountAmount: parseFloat(row.discountAmount),
    total: parseFloat(row.total),
    paidAmount: parseFloat(row.paidAmount),
    balance: parseFloat(row.balance),
  }));
}

export async function getClientPayments(clientId: string): Promise<Payment[]> {
  const results = await findByField('Payments', 'clientId', clientId);
  return results.map(row => ({
    ...row,
    amount: parseFloat(row.amount),
  }));
}

export async function getClientFollowUps(clientId: string): Promise<FollowUp[]> {
  return findByField('FollowUps', 'clientId', clientId);
}

export async function getOverdueFollowUps(): Promise<FollowUp[]> {
  const rows = await getSheetData('FollowUps');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.filter(r => {
    const fDate = new Date(r.date);
    return r.status === 'Pending' && fDate < today;
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const clients = await getSheetData('Clients');
  const invoices = await getSheetData('Invoices');
  const followUps = await getSheetData('FollowUps');
  
  const now = new Date();
  const startOfThisMonth = startOfMonth(now);
  const endOfThisMonth = endOfMonth(now);

  const activeClients = clients.filter(c => c.status === 'Active').length;
  
  const revenueThisMonth = invoices
    .filter(inv => {
      const invDate = new Date(inv.date);
      return inv.paymentStatus !== 'Unpaid' && isWithinInterval(invDate, { start: startOfThisMonth, end: endOfThisMonth });
    })
    .reduce((acc, inv) => acc + parseFloat(inv.paidAmount || '0'), 0);

  const totalOutstanding = invoices.reduce((acc, inv) => acc + parseFloat(inv.balance || '0'), 0);
  
  const pendingFollowUps = followUps.filter(f => f.status === 'Pending').length;
  const overdueFollowUps = (await getOverdueFollowUps()).length;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const overdueInvoicesCount = invoices.filter(inv => inv.paymentStatus !== 'Paid' && new Date(inv.dueDate) < today).length;

  // Monthly Revenue Chart Data (Last 6 months)
  const monthlyRevenue: MonthlyRevenue[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(monthDate);
    const mLabel = format(monthDate, 'MMM');
    
    const mRevenue = invoices
      .filter(inv => {
        const invDate = new Date(inv.date);
        return inv.paymentStatus !== 'Unpaid' && isWithinInterval(invDate, { start: mStart, end: mEnd });
      })
      .reduce((acc, inv) => acc + parseFloat(inv.paidAmount || '0'), 0);
      
    monthlyRevenue.push({ month: mLabel, revenue: mRevenue });
  }

  const breakdown: PaymentStatusBreakdown = {
    Paid: invoices.filter(inv => inv.paymentStatus === 'Paid').length,
    Partial: invoices.filter(inv => inv.paymentStatus === 'Partial').length,
    Unpaid: invoices.filter(inv => inv.paymentStatus === 'Unpaid').length,
  };

  const recentInvoices = invoices
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(inv => ({
      ...inv,
      items: JSON.parse(inv.items || '[]'),
      total: parseFloat(inv.total),
      balance: parseFloat(inv.balance),
    }));

  const upcomingFollowUps = followUps
    .filter(f => f.status === 'Pending' && new Date(f.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);

  return {
    totalActiveClients: activeClients,
    totalRevenueThisMonth: revenueThisMonth,
    totalOutstandingBalance: totalOutstanding,
    pendingFollowUps,
    overdueFollowUps,
    overdueInvoices: overdueInvoicesCount,
    monthlyRevenue,
    paymentStatusBreakdown: breakdown,
    recentInvoices: recentInvoices as any,
    upcomingFollowUps: upcomingFollowUps as any,
  };
}
