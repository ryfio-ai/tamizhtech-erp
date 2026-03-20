import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateRow, findById, getNextPaymentId } from '@/lib/sheets';
import { paymentSchema } from '@/lib/validations';
import { generateId, formatCurrency } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, getPaymentEmailTemplate } from '@/lib/mail';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const invoiceId = searchParams.get('invoiceId');

  try {
    let payments = await getSheetData('Payments');
    if (clientId) {
      payments = payments.filter((p: any) => p.clientId === clientId);
    }
    if (invoiceId) {
      payments = payments.filter((p: any) => p.invoiceId === invoiceId);
    }
    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validatedData = paymentSchema.parse(body);
    
    // 1. Record the payment
    const paymentId = await getNextPaymentId();
    const newPayment = {
      id: generateId(),
      paymentId,
      ...validatedData,
      createdAt: new Date().toISOString(),
    };

    await appendRow('Payments', newPayment);

    // 2. Update the Invoice Status
    const invoice = await findById('Invoices', validatedData.invoiceId);
    if (invoice) {
        const allPayments = await getSheetData('Payments');
        const invoicePayments = allPayments.filter((p: any) => p.invoiceId === validatedData.invoiceId);
        const totalPaid = invoicePayments.reduce((acc: number, p: any) => acc + parseFloat(p.amount), 0);
        
        let newStatus = 'Unpaid';
        if (totalPaid >= parseFloat(invoice.total)) {
            newStatus = 'Paid';
        } else if (totalPaid > 0) {
            newStatus = 'Partial';
        }

        await updateRow('Invoices', validatedData.invoiceId, { paymentStatus: newStatus });

        // Email Notification
        try {
            const client = await findById('Clients', validatedData.clientId);
            if (client && client.email) {
                await sendEmail({
                    to: client.email,
                    subject: `Payment Receipt from TamizhTech - #${paymentId}`,
                    html: getPaymentEmailTemplate(
                        client.name, 
                        formatCurrency(validatedData.amount), 
                        paymentId, 
                        validatedData.invoiceNo
                    )
                });
            }
        } catch (err) {
            console.error('Failed to send payment email', err);
        }
    }

    return NextResponse.json({ success: true, data: newPayment });
  } catch (error: any) {
    console.error('Payment Recording Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
