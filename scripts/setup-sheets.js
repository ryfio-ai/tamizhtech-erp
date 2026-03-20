const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

const SHEETS = [
  {
    name: 'Clients',
    headerValues: ['id', 'name', 'email', 'phone', 'address', 'serviceType', 'status', 'source', 'notes', 'createdAt']
  },
  {
    name: 'Invoices',
    headerValues: ['id', 'invoiceNo', 'clientId', 'clientName', 'date', 'dueDate', 'subtotal', 'gst', 'discount', 'total', 'paymentStatus', 'notes', 'lineItems', 'createdAt']
  },
  {
    name: 'Payments',
    headerValues: ['id', 'paymentId', 'invoiceId', 'invoiceNo', 'clientId', 'clientName', 'amount', 'date', 'mode', 'reference', 'notes', 'createdAt']
  },
  {
    name: 'FollowUps',
    headerValues: ['id', 'clientId', 'clientName', 'date', 'time', 'type', 'notes', 'status', 'createdAt']
  },
  {
    name: 'Applications',
    headerValues: ['id', 'name', 'email', 'phone', 'course', 'city', 'status', 'notes', 'createdAt']
  }
];

async function setup() {
  console.log('🚀 Initializing TamizhTech Account System Sheets...');

  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

  try {
    await doc.loadInfo();
    console.log(`✅ Connected to Spreadsheet: ${doc.title}`);

    for (const sheetDef of SHEETS) {
      let sheet = doc.sheetsByTitle[sheetDef.name];
      if (!sheet) {
        console.log(`+ Creating sheet: ${sheetDef.name}...`);
        sheet = await doc.addSheet({ title: sheetDef.name, headerValues: sheetDef.headerValues });
      } else {
        console.log(`- Sheet ${sheetDef.name} already exists. Setting headers...`);
        await sheet.setHeaderRow(sheetDef.headerValues);
      }
    }

    console.log('✨ All sheets initialized successfully!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setup();
