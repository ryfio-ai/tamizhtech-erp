import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApiResponse } from "@/types";
import { fromPaise } from "@/lib/money";

export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [invoices, payments, followUps] = await Promise.all([
      prisma.invoice.findMany({ where: { clientId: params.id }, include: { items: true }, orderBy: { createdAt: 'desc' } }),
      prisma.payment.findMany({ where: { clientId: params.id }, orderBy: { createdAt: 'desc' } }),
      prisma.followUp.findMany({ where: { clientId: params.id }, orderBy: { date: 'desc' } })
    ]);
    
    return NextResponse.json<ApiResponse>({ 
      success: true, 
      data: {
        invoices: invoices.map(i => ({ 
          ...i, 
          subtotal: fromPaise(i.subtotal),
          gstAmount: fromPaise(i.gstAmount),
          discountAmount: fromPaise(i.discountAmount),
          total: fromPaise(i.total),
          paidAmount: fromPaise(i.paidAmount),
          balance: fromPaise(i.balance),
          createdAt: i.createdAt.toISOString() 
        })),
        payments: payments.map(p => ({ 
          ...p, 
          amount: fromPaise(p.amount),
          createdAt: p.createdAt.toISOString() 
        })),
        followUps: followUps.map(f => ({ ...f, date: f.date.toISOString() }))
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
