import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startOfToday, subDays, format, isAfter, parseISO } from 'date-fns';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const [clients, invoices, followups, payments, applications] = await Promise.all([
      getSheetData('Clients'),
      getSheetData('Invoices'),
      getSheetData('FollowUps'),
      getSheetData('Payments'),
      getSheetData('Applications')
    ]);

    // 1. Client Stats
    const totalClients = clients.length;
    
    // 2. Revenue Stats
    const totalRevenue = invoices.reduce((acc: number, inv: any) => acc + (parseFloat(inv.total) || 0), 0);
    const totalCollected = payments.reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0);
    const outstanding = totalRevenue - totalCollected;

    // 3. Follow-up Stats (Next 7 days)
    const today = startOfToday();
    const next7Days = followups.filter((f: any) => {
        const fDate = parseISO(f.date);
        return isAfter(fDate, today) || f.status === 'Pending';
    }).slice(0, 5);

    // 4. Payment Breakdown (for Chart)
    const paidCount = invoices.filter((i: any) => i.paymentStatus === 'Paid').length;
    const partialCount = invoices.filter((i: any) => i.paymentStatus === 'Partial').length;
    const unpaidCount = invoices.filter((i: any) => i.paymentStatus === 'Unpaid').length;

    // 5. Recent Invoices
    const recentInvoices = invoices.sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 5);

    // 6. Lead Count
    const leadCount = applications.filter((a: any) => a.status === 'Applied').length;

    return NextResponse.json({
      success: true,
      data: {
        totalClients,
        totalRevenue,
        totalCollected,
        outstanding,
        upcomingFollowups: next7Days,
        recentInvoices,
        leadCount,
        paymentBreakdown: [
          { name: 'Paid', value: paidCount },
          { name: 'Partial', value: partialCount },
          { name: 'Unpaid', value: unpaidCount }
        ]
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
