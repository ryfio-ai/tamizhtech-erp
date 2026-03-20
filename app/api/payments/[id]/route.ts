import { NextRequest, NextResponse } from 'next/server';
import { findById, updateRow, deleteRow, getSheetData } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const payment = await findById('Payments', params.id);
    if (!payment) return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });

    const invoiceId = payment.invoiceId;

    // 1. Delete the payment
    await deleteRow('Payments', params.id);

    // 2. Re-calculate Invoice Status
    const invoice = await findById('Invoices', invoiceId);
    if (invoice) {
        const allPayments = await getSheetData('Payments');
        const invoicePayments = allPayments.filter((p: any) => p.invoiceId === invoiceId);
        const totalPaid = invoicePayments.reduce((acc: number, p: any) => acc + parseFloat(p.amount), 0);
        
        let newStatus = 'Unpaid';
        if (totalPaid >= parseFloat(invoice.total)) {
            newStatus = 'Paid';
        } else if (totalPaid > 0) {
            newStatus = 'Partial';
        }

        await updateRow('Invoices', invoiceId, { paymentStatus: newStatus });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
