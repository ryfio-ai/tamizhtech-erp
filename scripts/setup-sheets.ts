import { google } from "googleapis";

// Ensure environment variables are loaded
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}'),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const REQUIRED_SHEETS = [
  {
    name: "Clients",
    headers: ["id", "name", "phone", "email", "city", "serviceType", "source", "status", "notes", "createdAt"]
  },
  {
    name: "Invoices",
    headers: ["id", "invoiceNo", "clientId", "clientName", "date", "dueDate", "items", "gstPercent", "discountPercent", "subtotal", "gstAmount", "discountAmount", "total", "paidAmount", "balance", "paymentStatus", "paymentMethod", "notes", "createdAt"]
  },
  {
    name: "Payments",
    headers: ["id", "paymentId", "invoiceId", "invoiceNo", "clientId", "amount", "date", "mode", "referenceNo", "notes", "createdAt"]
  },
  {
    name: "FollowUps",
    headers: ["id", "clientId", "clientName", "date", "time", "mode", "summary", "nextAction", "status", "createdAt"]
  },
  {
    name: "Applications",
    headers: ["id", "applicationNo", "name", "email", "phone", "city", "appliedFor", "appliedDate", "status", "source", "notes", "emailSent", "createdAt"]
  }
];

async function setupGoogleSheets() {
  if (!SPREADSHEET_ID) {
    console.error("❌ SPREADSHEET_ID is missing from .env.local");
    process.exit(1);
  }

  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existingSheets = response.data.sheets?.map(s => s.properties?.title) || [];

    for (const sheet of REQUIRED_SHEETS) {
      // 1. Create sheet if missing
      if (!existingSheets.includes(sheet.name)) {
        console.log(`Creating sheet: ${sheet.name}...`);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{
              addSheet: { properties: { title: sheet.name } }
            }]
          }
        });
      }

      // 2. Set headers
      console.log(`Setting headers for ${sheet.name}...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet.name}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [sheet.headers]
        }
      });
      
      // 3. Bold the headers for visibility
      const sheetId = response.data.sheets?.find(s => s.properties?.title === sheet.name)?.properties?.sheetId;
      if (sheetId !== undefined) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
              requests: [{
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                    }
                  },
                  fields: "userEnteredFormat(textFormat,backgroundColor)"
                }
              }]
            }
          });
      }
    }

    console.log("✅ Google Sheets setup complete! All required tabs and headers are ready.");

  } catch (error: any) {
    console.error("❌ Error setting up sheets:", error.message);
  }
}

setupGoogleSheets();
