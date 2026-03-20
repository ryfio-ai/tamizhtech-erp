import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, getNextInvoiceNo, findById } from '@/lib/sheets';
import { invoiceSchema } from '@/lib/validations';
import { generateId, formatCurrency, formatDate } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, getInvoiceEmailTemplate } from '@/lib/mail';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');

  try {
    let invoices = await getSheetData('Invoices');
    if (clientId) {
      invoices = invoices.filter((inv: any) => inv.clientId === clientId);
    }
    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validatedData = invoiceSchema.parse(body);
    
    const invoiceNo = await getNextInvoiceNo();
    const newInvoice = {
      id: generateId(),
      invoiceNo,
      ...validatedData,
      paymentStatus: 'Unpaid',
      createdAt: new Date().toISOString(),
      // Serializing items to JSON string for Sheets
      items: JSON.stringify(validatedData.items),
    };

    await appendRow('Invoices', newInvoice);

    // Email Notification
    try {
        const client = await findById('Clients', validatedData.clientId);
        if (client && client.email) {
            await sendEmail({
                to: client.email,
                subject: `New Invoice from TamizhTech - ${invoiceNo}`,
                html: getInvoiceEmailTemplate(
                    client.name, 
                    invoiceNo, 
                    formatCurrency(validatedData.total), 
                    formatDate(validatedData.dueDate)
                )
            });
        }
    } catch (err) {
        console.error('Failed to send invoice email', err);
    }

    return NextResponse.json({ success: true, data: newInvoice });
  } catch (error: any) {
    console.error('Invoice Creation Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
